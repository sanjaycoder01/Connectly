require("dotenv").config();

const { randomUUID } = require("crypto");
const http = require("http");
const { io } = require("socket.io-client");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const httpRequest = (method, path, body, cookieHeader) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const req = http.request(
      {
        hostname: "localhost",
        port: Number(new URL(BASE_URL).port) || 5000,
        path,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: raw ? JSON.parse(raw) : null,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

const getTokenFromSetCookie = (setCookieHeader) => {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];

  for (const entry of cookies) {
    const match = entry?.match(/token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
};

const signupOrLogin = async (username, email, password) => {
  let response = await httpRequest("POST", "/api/auth/login", { email, password });

  if (response.status === 401) {
    response = await httpRequest("POST", "/api/auth/signup", {
      username,
      email,
      password,
    });
  }

  const token = getTokenFromSetCookie(response.headers["set-cookie"]);
  return { token, user: response.body.user };
};

const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      extraHeaders: { Cookie: `token=${token}` },
    });

    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });

const sendMessage = (socket, payload) =>
  new Promise((resolve, reject) => {
    socket.emit("send_message", payload, (response) => {
      if (!response) reject(new Error("No acknowledgement received"));
      else resolve(response);
    });
  });

const joinConversation = (socket, conversationId) =>
  new Promise((resolve, reject) => {
    socket.emit("join_conversation", conversationId, (response) => {
      if (response?.ok === false) reject(new Error(response.message));
      else resolve(response);
    });
  });

const main = async () => {
  try {
    const alice = await signupOrLogin(
      "alice_idem",
      "alice_idem@example.com",
      "secret123"
    );
    const bob = await signupOrLogin(
      "bob_idem",
      "bob_idem@example.com",
      "secret123"
    );

    const conversationResponse = await httpRequest(
      "POST",
      "/api/conversations",
      { participantId: bob.user.id },
      `token=${alice.token}`
    );

    const conversationId = conversationResponse.body.conversation._id;
    const aliceSocket = await connectSocket(alice.token);
    const bobSocket = await connectSocket(bob.token);

    await joinConversation(aliceSocket, conversationId);
    await joinConversation(bobSocket, conversationId);

    let bobNewMessageCount = 0;
    bobSocket.on("new_message", () => {
      bobNewMessageCount += 1;
    });

    const clientMessageId = randomUUID();
    const payload = {
      conversationId,
      content: "Hello Bob (idempotent)",
      clientMessageId,
    };

    const firstAck = await sendMessage(aliceSocket, payload);
    const retryAck = await sendMessage(aliceSocket, payload);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("First created:", firstAck.created, firstAck.message?._id);
    console.log("Retry created:", retryAck.created, retryAck.message?._id);
    console.log("Bob events:", bobNewMessageCount);

    aliceSocket.close();
    bobSocket.close();

    if (
      firstAck.ok &&
      firstAck.created &&
      !retryAck.created &&
      firstAck.message?._id === retryAck.message?._id &&
      bobNewMessageCount === 1
    ) {
      console.log("Idempotent send_message test passed");
      process.exit(0);
    }

    throw new Error("Idempotent send_message test failed");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

main();
