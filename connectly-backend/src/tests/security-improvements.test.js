const http = require("http");
const assert = require("node:assert/strict");
const { test, before, after } = require("node:test");
const mongoose = require("mongoose");

require("../config/env");
const app = require("../app");
const connectDB = require("../config/db");
const initSocket = require("../sockets");
const { createRateLimiter } = require("../middleware/rateLimit.middleware");
const { checkSocketRateLimit, resetAll: resetSocketRateLimits } = require("../utils/socketRateLimiter");
const {
  createHttpClient,
  signupOrLogin,
  connectSocket,
  emitWithAck,
  waitForEvent,
  uniqueName,
  randomUUID,
} = require("./helpers");

let server;
let baseUrl;
let client;

before(async () => {
  await connectDB();

  server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  client = createHttpClient(baseUrl);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test("1. REST Input Validation rejects invalid inputs", async () => {
  // Invalid email
  const badEmail = await client.request("POST", "/api/auth/signup", {
    username: "validuser",
    email: "not-an-email",
    password: "password123",
  });
  assert.equal(badEmail.status, 400);
  assert.match(badEmail.body.message, /valid email/i);

  // Short password
  const shortPass = await client.request("POST", "/api/auth/signup", {
    username: "validuser2",
    email: "valid2@example.com",
    password: "123",
  });
  assert.equal(shortPass.status, 400);
  assert.match(shortPass.body.message, /at least 6 characters|between 6 and 128/i);

  // Invalid username characters
  const badUser = await client.request("POST", "/api/auth/signup", {
    username: "bad user with spaces!",
    email: "valid3@example.com",
    password: "password123",
  });
  assert.equal(badUser.status, 400);
  assert.match(badUser.body.message, /letters, numbers/i);

  // Valid user for authenticated tests
  const userA = await signupOrLogin(
    client,
    uniqueName("valid_user"),
    `${uniqueName("valid_user")}@example.com`,
    "password123"
  );

  // Invalid ObjectId for create conversation
  const badConv = await client.request(
    "POST",
    "/api/conversations",
    { participantId: "not-an-objectid" },
    `token=${userA.token}`
  );
  assert.equal(badConv.status, 400);
  assert.match(badConv.body.message, /invalid participantid/i);

  // Self conversation
  const selfConv = await client.request(
    "POST",
    "/api/conversations",
    { participantId: userA.user.id },
    `token=${userA.token}`
  );
  assert.equal(selfConv.status, 400);
  assert.match(selfConv.body.message, /yourself/i);

  // Non-existent participant
  const nonExistentParticipant = await client.request(
    "POST",
    "/api/conversations",
    { participantId: "507f1f77bcf86cd799439011" },
    `token=${userA.token}`
  );
  assert.equal(nonExistentParticipant.status, 404);
  assert.match(nonExistentParticipant.body.message, /participant not found/i);

  // Invalid ObjectId on get messages
  const badMsgConv = await client.request(
    "GET",
    "/api/messages/invalid-conv-id",
    null,
    `token=${userA.token}`
  );
  assert.equal(badMsgConv.status, 400);
  assert.match(badMsgConv.body.message, /invalid conversationid/i);

  // Empty content on create message
  const emptyMsg = await client.request(
    "POST",
    "/api/messages",
    {
      conversationId: "507f1f77bcf86cd799439011",
      content: "   ",
    },
    `token=${userA.token}`
  );
  assert.equal(emptyMsg.status, 400);
  assert.match(emptyMsg.body.message, /cannot be empty|content are required/i);
});

test("2. Socket.IO Input Validation rejects invalid event payloads", async () => {
  const alice = await signupOrLogin(
    client,
    uniqueName("alice_sock_val"),
    `${uniqueName("alice_sock_val")}@example.com`,
    "secret123"
  );

  const socket = await connectSocket(baseUrl, alice.token);

  // Invalid join_conversation
  const badJoin = await emitWithAck(socket, "join_conversation", "invalid-id");
  assert.equal(badJoin.ok, false);
  assert.equal(badJoin.statusCode, 400);
  assert.match(badJoin.message, /invalid conversationid format/i);

  // Invalid send_message (missing content)
  const badSend = await emitWithAck(socket, "send_message", {
    conversationId: "507f1f77bcf86cd799439011",
    content: "  ",
    clientMessageId: randomUUID(),
  });
  assert.equal(badSend.ok, false);
  assert.equal(badSend.statusCode, 400);

  // Invalid typing_start
  const badTyping = await emitWithAck(socket, "typing_start", {
    conversationId: "not-an-id",
  });
  assert.equal(badTyping.ok, false);
  assert.equal(badTyping.statusCode, 400);

  // Invalid message_delivered
  const badDelivery = await emitWithAck(socket, "message_delivered", {
    messageId: "not-an-id",
  });
  assert.equal(badDelivery.ok, false);
  assert.equal(badDelivery.statusCode, 400);

  // Invalid message_read
  const badRead = await emitWithAck(socket, "message_read", {
    conversationId: "not-an-id",
  });
  assert.equal(badRead.ok, false);
  assert.equal(badRead.statusCode, 400);

  socket.close();
});

test("3. API Rate Limiting triggers 429 Too Many Requests when limit exceeded", async () => {
  const testLimiter = createRateLimiter({
    windowMs: 5000,
    max: 3,
    message: "Rate limit reached for test",
    keyGenerator: () => "test_key",
  });

  let hitCount = 0;
  let lastStatus = 200;
  const mockReq = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
  const mockRes = {
    headers: {},
    setHeader(name, val) {
      this.headers[name] = val;
    },
    status(code) {
      lastStatus = code;
      return {
        json: (data) => data,
      };
    },
  };

  const next = () => {
    hitCount += 1;
  };

  // 3 allowed hits
  testLimiter(mockReq, mockRes, next);
  testLimiter(mockReq, mockRes, next);
  testLimiter(mockReq, mockRes, next);
  assert.equal(hitCount, 3);
  assert.equal(mockRes.headers["RateLimit-Remaining"], 0);

  // 4th hit should be blocked with 429
  testLimiter(mockReq, mockRes, next);
  assert.equal(hitCount, 3);
  assert.equal(lastStatus, 429);
  assert.ok(mockRes.headers["Retry-After"] > 0);
});

test("4. Socket.IO Event Rate Limiter throttles excessive send_message and typing events", async () => {
  resetSocketRateLimits();

  const mockSocket = { id: "socket_rate_test_1" };

  // Rapidly trigger send_message up to the limit (10 allowed per 5s)
  for (let i = 0; i < 10; i++) {
    const result = checkSocketRateLimit(mockSocket, "send_message");
    assert.equal(result.allowed, true);
  }

  // 11th call exceeds limit
  const exceededSend = checkSocketRateLimit(mockSocket, "send_message");
  assert.equal(exceededSend.allowed, false);
  assert.equal(exceededSend.statusCode, 429);
  assert.match(exceededSend.message, /sending messages too fast/i);

  // Test typing_start limit (8 allowed per 5s)
  for (let i = 0; i < 8; i++) {
    const result = checkSocketRateLimit(mockSocket, "typing_start");
    assert.equal(result.allowed, true);
  }

  const exceededTyping = checkSocketRateLimit(mockSocket, "typing_start");
  assert.equal(exceededTyping.allowed, false);
  assert.equal(exceededTyping.statusCode, 429);

  resetSocketRateLimits();
});

test("5. Authorization Hardening protects conversations and messages from unauthorized users", async () => {
  const alice = await signupOrLogin(
    client,
    uniqueName("auth_alice"),
    `${uniqueName("auth_alice")}@example.com`,
    "secret123"
  );
  const bob = await signupOrLogin(
    client,
    uniqueName("auth_bob"),
    `${uniqueName("auth_bob")}@example.com`,
    "secret123"
  );
  const eve = await signupOrLogin(
    client,
    uniqueName("auth_eve"),
    `${uniqueName("auth_eve")}@example.com`,
    "secret123"
  );

  // Alice and Bob have a conversation
  const convRes = await client.request(
    "POST",
    "/api/conversations",
    { participantId: bob.user.id },
    `token=${alice.token}`
  );
  const conversationId = convRes.body.conversation._id;

  // Eve tries to view Alice & Bob's messages via REST
  const eveGet = await client.request(
    "GET",
    `/api/messages/${conversationId}`,
    null,
    `token=${eve.token}`
  );
  assert.equal(eveGet.status, 403);
  assert.match(eveGet.body.message, /not a participant/i);

  // Eve tries to post a message into Alice & Bob's conversation via REST
  const evePost = await client.request(
    "POST",
    "/api/messages",
    {
      conversationId,
      content: "Eve intruder message",
    },
    `token=${eve.token}`
  );
  assert.equal(evePost.status, 403);
  assert.match(evePost.body.message, /not a participant/i);

  // Eve tries to join Alice & Bob's conversation room via Socket
  const eveSocket = await connectSocket(baseUrl, eve.token);
  const joinAck = await emitWithAck(eveSocket, "join_conversation", conversationId);
  assert.equal(joinAck.ok, false);
  assert.equal(joinAck.statusCode, 403);
  assert.match(joinAck.message, /not a participant/i);

  // Eve tries to send typing indicator into Alice & Bob's conversation
  const typingAck = await emitWithAck(eveSocket, "typing_start", { conversationId });
  assert.equal(typingAck.ok, false);
  assert.equal(typingAck.statusCode, 403);

  eveSocket.close();
});

test("6. Centralized Error Handling sanitizes internal errors without crashing", async () => {
  const errorHandler = require("../middleware/error.middleware");

  let statusSent = 0;
  let jsonSent = null;
  const mockRes = {
    status(s) {
      statusSent = s;
      return this;
    },
    json(data) {
      jsonSent = data;
    },
  };

  // Mongoose CastError -> 400
  const castErr = new Error("Cast failed");
  castErr.name = "CastError";
  castErr.path = "_id";
  errorHandler(castErr, {}, mockRes, () => {});
  assert.equal(statusSent, 400);
  assert.match(jsonSent.message, /invalid format for resource identifier/i);

  // Unexpected 500 error in production
  process.env.NODE_ENV = "production";
  const internalErr = new Error("Sensitive database table connection failed at mongodb://admin:secret@db.internal");
  errorHandler(internalErr, {}, mockRes, () => {});
  assert.equal(statusSent, 500);
  assert.equal(jsonSent.message, "Internal server error");
  assert.equal(jsonSent.debug, undefined);
  process.env.NODE_ENV = "test";
});
