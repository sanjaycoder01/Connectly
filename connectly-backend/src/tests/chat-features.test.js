const http = require("http");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const mongoose = require("mongoose");

require("../config/env");
const app = require("../app");
const connectDB = require("../config/db");
const initSocket = require("../sockets");
const {
  createHttpClient,
  signupOrLogin,
  connectSocket,
  emitWithAck,
  waitForEvent,
  uniqueName,
  randomUUID,
  connectSocketWithPresence,
} = require("./helpers");

let server;
let io;
let baseUrl;
let client;

before(async () => {
  await connectDB();

  server = http.createServer(app);
  io = await initSocket(server);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  client = createHttpClient(baseUrl);
});

after(async () => {
  if (io) {
    await new Promise((resolve) => io.close(resolve));
    // Allow Socket.IO Redis adapter in-flight ops to settle before quitting clients
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  const { disconnectRedis } = require("../config/redis");
  await disconnectRedis();
  await mongoose.disconnect();
});

test("1. presence: user_online / user_offline with multi-socket support", async () => {
  const aliceName = uniqueName("alice_presence");
  const bobName = uniqueName("bob_presence");

  const alice = await signupOrLogin(
    client,
    aliceName,
    `${aliceName}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    bobName,
    `${bobName}@example.com`,
    "secret123"
  );

  const bobSocket = await connectSocket(baseUrl, bob.token);
  const onlinePromise = waitForEvent(bobSocket, "user_online");

  const aliceSocket1 = await connectSocket(baseUrl, alice.token);
  const onlineEvent = await onlinePromise;
  assert.equal(onlineEvent.userId, alice.user.id);

  // Second device/socket for Alice — must not emit another user_online
  let duplicateOnline = false;
  bobSocket.once("user_online", (payload) => {
    if (payload.userId === alice.user.id) {
      duplicateOnline = true;
    }
  });

  const aliceSocket2 = await connectSocket(baseUrl, alice.token);
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(duplicateOnline, false);

  const presenceService = require("../services/presence.service");
  assert.equal(await presenceService.getSocketCount(alice.user.id), 2);
  assert.equal(await presenceService.isOnline(alice.user.id), true);

  const onlineIds = await presenceService.getOnlineUserIds();
  assert.ok(onlineIds.includes(alice.user.id.toString()));

  const offlinePromise = waitForEvent(bobSocket, "user_offline");
  aliceSocket1.close();
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Still one socket online — should NOT emit offline yet
  let prematureOffline = false;
  bobSocket.once("user_offline", () => {
    prematureOffline = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(prematureOffline, false);
  assert.equal(await presenceService.getSocketCount(alice.user.id), 1);

  aliceSocket2.close();
  const offlineEvent = await offlinePromise;
  assert.equal(offlineEvent.userId, alice.user.id);
  assert.equal(await presenceService.isOnline(alice.user.id), false);

  bobSocket.close();
});

test("1b. presence: Redis-backed snapshot and set membership", async () => {
  const presenceService = require("../services/presence.service");
  const { getCommandClient } = require("../config/redis");

  const clientRedis = getCommandClient();
  assert.ok(clientRedis, "REDIS_URL must be set for Redis presence tests");

  const userId = `test-user-${uniqueName("uid")}`;
  const socketA = `socket-a-${uniqueName("s")}`;
  const socketB = `socket-b-${uniqueName("s")}`;

  const becameOnline = await presenceService.addSocket(userId, socketA);
  assert.equal(becameOnline, true);

  const stillOnline = await presenceService.addSocket(userId, socketB);
  assert.equal(stillOnline, false);

  const members = await clientRedis.sMembers(
    `${presenceService.USER_KEY_PREFIX}${userId}`
  );
  assert.equal(members.sort().join(","), [socketA, socketB].sort().join(","));

  const snapshot = await presenceService.getOnlineUserIds();
  assert.ok(snapshot.includes(userId));

  assert.equal(await presenceService.removeSocket(userId, socketA), false);
  assert.equal(await presenceService.removeSocket(userId, socketB), true);

  const after = await clientRedis.sMembers(
    `${presenceService.USER_KEY_PREFIX}${userId}`
  );
  assert.equal(after.length, 0);
  assert.equal(await presenceService.isOnline(userId), false);
});

test("2. typing indicators require membership and are not persisted", async () => {
  const aliceName = uniqueName("alice_typing");
  const bobName = uniqueName("bob_typing");
  const johnName = uniqueName("john_typing");

  const alice = await signupOrLogin(
    client,
    aliceName,
    `${aliceName}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    bobName,
    `${bobName}@example.com`,
    "secret123"
  );
  const john = await signupOrLogin(
    client,
    johnName,
    `${johnName}@example.com`,
    "secret123"
  );

  const conversation = await client.request(
    "POST",
    "/api/conversations",
    { participantId: bob.user.id },
    `token=${alice.token}`
  );
  const conversationId = conversation.body.conversation._id;

  const aliceSocket = await connectSocket(baseUrl, alice.token);
  const bobSocket = await connectSocket(baseUrl, bob.token);
  const johnSocket = await connectSocket(baseUrl, john.token);

  await emitWithAck(aliceSocket, "join_conversation", conversationId);
  await emitWithAck(bobSocket, "join_conversation", conversationId);

  const typingPromise = waitForEvent(bobSocket, "typing_start");
  const typingAck = await emitWithAck(aliceSocket, "typing_start", {
    conversationId,
  });
  assert.equal(typingAck.ok, true);

  const typingEvent = await typingPromise;
  assert.equal(typingEvent.userId, alice.user.id);
  assert.equal(typingEvent.conversationId, conversationId);

  const stopPromise = waitForEvent(bobSocket, "typing_stop");
  await emitWithAck(aliceSocket, "typing_stop", { conversationId });
  const stopEvent = await stopPromise;
  assert.equal(stopEvent.userId, alice.user.id);

  const outsider = await emitWithAck(johnSocket, "typing_start", {
    conversationId,
  });
  assert.equal(outsider.ok, false);
  assert.equal(outsider.statusCode, 403);

  aliceSocket.close();
  bobSocket.close();
  johnSocket.close();
});

test("3. message delivery: sent → delivered", async () => {
  const aliceName = uniqueName("alice_deliver");
  const bobName = uniqueName("bob_deliver");

  const alice = await signupOrLogin(
    client,
    aliceName,
    `${aliceName}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    bobName,
    `${bobName}@example.com`,
    "secret123"
  );

  const conversation = await client.request(
    "POST",
    "/api/conversations",
    { participantId: bob.user.id },
    `token=${alice.token}`
  );
  const conversationId = conversation.body.conversation._id;

  const aliceSocket = await connectSocket(baseUrl, alice.token);
  const bobSocket = await connectSocket(baseUrl, bob.token);

  await emitWithAck(aliceSocket, "join_conversation", conversationId);
  await emitWithAck(bobSocket, "join_conversation", conversationId);

  const bobMessagePromise = waitForEvent(bobSocket, "new_message");
  const sendAck = await emitWithAck(aliceSocket, "send_message", {
    conversationId,
    content: "Delivery check",
    clientMessageId: randomUUID(),
  });

  assert.equal(sendAck.ok, true);
  assert.equal(sendAck.message.status, "sent");

  const received = await bobMessagePromise;
  assert.equal(received._id, sendAck.message._id);

  const deliveredPromise = waitForEvent(aliceSocket, "message_delivered");
  const deliverAck = await emitWithAck(bobSocket, "message_delivered", {
    messageId: received._id,
  });

  assert.equal(deliverAck.ok, true);
  assert.equal(deliverAck.updated, true);
  assert.equal(deliverAck.message.status, "delivered");

  const deliveredEvent = await deliveredPromise;
  assert.equal(deliveredEvent.messageId, received._id);
  assert.equal(deliveredEvent.status, "delivered");

  const senderCannotDeliver = await emitWithAck(
    aliceSocket,
    "message_delivered",
    { messageId: received._id }
  );
  assert.equal(senderCannotDeliver.ok, false);
  assert.equal(senderCannotDeliver.statusCode, 403);

  aliceSocket.close();
  bobSocket.close();
});

test("4. read/seen: delivered → read on conversation open", async () => {
  const aliceName = uniqueName("alice_read");
  const bobName = uniqueName("bob_read");

  const alice = await signupOrLogin(
    client,
    aliceName,
    `${aliceName}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    bobName,
    `${bobName}@example.com`,
    "secret123"
  );

  const conversation = await client.request(
    "POST",
    "/api/conversations",
    { participantId: bob.user.id },
    `token=${alice.token}`
  );
  const conversationId = conversation.body.conversation._id;

  const aliceSocket = await connectSocket(baseUrl, alice.token);
  await emitWithAck(aliceSocket, "join_conversation", conversationId);

  // Bob is NOT in the room — messages should stay unread for Bob
  const send1 = await emitWithAck(aliceSocket, "send_message", {
    conversationId,
    content: "Msg 1",
    clientMessageId: randomUUID(),
  });
  const send2 = await emitWithAck(aliceSocket, "send_message", {
    conversationId,
    content: "Msg 2",
    clientMessageId: randomUUID(),
  });
  assert.equal(send1.ok, true);
  assert.equal(send2.ok, true);

  const bobSocket = await connectSocket(baseUrl, bob.token);
  const readPromise = waitForEvent(aliceSocket, "message_read");

  await emitWithAck(bobSocket, "join_conversation", conversationId);
  const readEvent = await readPromise;

  assert.equal(readEvent.conversationId, conversationId);
  assert.equal(readEvent.readBy, bob.user.id);
  assert.ok(readEvent.messageIds.length >= 2);

  const history = await client.request(
    "GET",
    `/api/messages/${conversationId}?limit=20`,
    null,
    `token=${alice.token}`
  );

  const statuses = history.body.messages.map((m) => m.status);
  assert.ok(statuses.every((status) => status === "read"));

  aliceSocket.close();
  bobSocket.close();
});

test("5. unread count increments when chat closed and resets on read", async () => {
  const aliceName = uniqueName("alice_unread");
  const bobName = uniqueName("bob_unread");

  const alice = await signupOrLogin(
    client,
    aliceName,
    `${aliceName}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    bobName,
    `${bobName}@example.com`,
    "secret123"
  );

  const conversation = await client.request(
    "POST",
    "/api/conversations",
    { participantId: bob.user.id },
    `token=${alice.token}`
  );
  const conversationId = conversation.body.conversation._id;
  assert.equal(conversation.body.conversation.unreadCount, 0);

  const aliceSocket = await connectSocket(baseUrl, alice.token);
  await emitWithAck(aliceSocket, "join_conversation", conversationId);

  // Bob has chat closed → unread should increase
  await emitWithAck(aliceSocket, "send_message", {
    conversationId,
    content: "Unread 1",
    clientMessageId: randomUUID(),
  });
  await emitWithAck(aliceSocket, "send_message", {
    conversationId,
    content: "Unread 2",
    clientMessageId: randomUUID(),
  });

  const bobList = await client.request(
    "GET",
    "/api/conversations",
    null,
    `token=${bob.token}`
  );
  const bobConversation = bobList.body.conversations.find(
    (c) => c._id === conversationId
  );
  assert.ok(bobConversation);
  assert.equal(bobConversation.unreadCount, 2);

  const bobSocket = await connectSocket(baseUrl, bob.token);
  await emitWithAck(bobSocket, "join_conversation", conversationId);

  const bobListAfter = await client.request(
    "GET",
    "/api/conversations",
    null,
    `token=${bob.token}`
  );
  const bobConversationAfter = bobListAfter.body.conversations.find(
    (c) => c._id === conversationId
  );
  assert.equal(bobConversationAfter.unreadCount, 0);

  // While Bob has chat open, new messages should NOT increase unread
  await emitWithAck(aliceSocket, "send_message", {
    conversationId,
    content: "While open",
    clientMessageId: randomUUID(),
  });

  const bobListOpen = await client.request(
    "GET",
    "/api/conversations",
    null,
    `token=${bob.token}`
  );
  const bobConversationOpen = bobListOpen.body.conversations.find(
    (c) => c._id === conversationId
  );
  assert.equal(bobConversationOpen.unreadCount, 0);

  aliceSocket.close();
  bobSocket.close();
});

test("6. reconnect recovery: rejoin room, resync missed Mongo messages, live again", async () => {
  const aliceName = uniqueName("alice_reconn");
  const bobName = uniqueName("bob_reconn");

  const alice = await signupOrLogin(
    client,
    aliceName,
    `${aliceName}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    bobName,
    `${bobName}@example.com`,
    "secret123"
  );

  const conversation = await client.request(
    "POST",
    "/api/conversations",
    { participantId: bob.user.id },
    `token=${alice.token}`
  );
  const conversationId = conversation.body.conversation._id;

  // Alice joins, then disconnects (simulates network drop)
  let aliceConn = await connectSocketWithPresence(baseUrl, alice.token);
  let aliceSocket = aliceConn.socket;
  assert.ok(Array.isArray(aliceConn.snapshot.onlineUserIds));

  await emitWithAck(aliceSocket, "join_conversation", conversationId);
  aliceSocket.close();
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Bob sends while Alice is offline — message lands in Mongo only for Alice
  const bobSocket = await connectSocket(baseUrl, bob.token);
  await emitWithAck(bobSocket, "join_conversation", conversationId);

  const missedContent = "Missed while Alice offline";
  const sendAck = await emitWithAck(bobSocket, "send_message", {
    conversationId,
    content: missedContent,
    clientMessageId: randomUUID(),
  });
  assert.equal(sendAck.ok, true);
  assert.equal(sendAck.created, true);

  // Alice reconnects → presence snapshot + rejoin + HTTP resync (Mongo source of truth)
  aliceConn = await connectSocketWithPresence(baseUrl, alice.token);
  aliceSocket = aliceConn.socket;
  assert.ok(Array.isArray(aliceConn.snapshot.onlineUserIds));
  assert.ok(
    aliceConn.snapshot.onlineUserIds.includes(bob.user.id.toString()) ||
      aliceConn.snapshot.onlineUserIds.includes(alice.user.id.toString())
  );

  await emitWithAck(aliceSocket, "join_conversation", conversationId);

  const history = await client.request(
    "GET",
    `/api/messages/${conversationId}?limit=50`,
    null,
    `token=${alice.token}`
  );
  assert.equal(history.status, 200);
  const missed = (history.body.messages || []).find(
    (m) => m.content === missedContent
  );
  assert.ok(missed, "missed message should be recoverable from Mongo after reconnect");

  // Dedupes: fetching again still yields a single message with that id
  const historyAgain = await client.request(
    "GET",
    `/api/messages/${conversationId}?limit=50`,
    null,
    `token=${alice.token}`
  );
  const matches = (historyAgain.body.messages || []).filter(
    (m) => m._id === missed._id
  );
  assert.equal(matches.length, 1);

  // After rejoin, live room delivery works again
  const livePromise = waitForEvent(aliceSocket, "new_message");
  await emitWithAck(bobSocket, "send_message", {
    conversationId,
    content: "Live after reconnect",
    clientMessageId: randomUUID(),
  });
  const liveMsg = await livePromise;
  assert.equal(liveMsg.content, "Live after reconnect");

  // Conversations/unread API still works post-reconnect
  const aliceConversations = await client.request(
    "GET",
    "/api/conversations",
    null,
    `token=${alice.token}`
  );
  assert.equal(aliceConversations.status, 200);
  assert.ok(
    aliceConversations.body.conversations.some((c) => c._id === conversationId)
  );

  aliceSocket.close();
  bobSocket.close();
});
