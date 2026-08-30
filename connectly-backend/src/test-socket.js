require("dotenv").config();

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
    const match = entry.match(/token=([^;]+)/);
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

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Auth failed for ${username} (${response.status}): ${response.body?.message || "unknown error"}`
    );
  }

  const token = getTokenFromSetCookie(response.headers["set-cookie"]);

  if (!token) {
    throw new Error(`Login succeeded for ${username} but no token cookie was returned`);
  }

  return { token, user: response.body.user };
};

const tryJoinConversation = (token, conversationId) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      extraHeaders: {
        Cookie: `token=${token}`,
      },
    });

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Socket room join test timed out"));
    }, 5000);

    socket.on("connect", () => {
      socket.emit("join_conversation", conversationId);
    });

    socket.on("join_conversation_success", (payload) => {
      clearTimeout(timeout);
      socket.close();
      resolve({ ok: true, payload });
    });

    socket.on("join_conversation_error", (payload) => {
      clearTimeout(timeout);
      socket.close();
      resolve({ ok: false, payload });
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error(`Socket auth failed: ${error.message}`));
    });
  });

const main = async () => {
  try {
    const alice = await signupOrLogin(
      "alice_secure",
      "alice_secure@example.com",
      "secret123"
    );
    const bob = await signupOrLogin(
      "bob_secure",
      "bob_secure@example.com",
      "secret123"
    );
    const john = await signupOrLogin(
      "john_secure",
      "john_secure@example.com",
      "secret123"
    );

    const conversationResponse = await httpRequest(
      "POST",
      "/api/conversations",
      { participantId: bob.user.id },
      `token=${alice.token}`
    );

    const conversationId = conversationResponse.body.conversation._id;
    console.log("Conversation created:", conversationId);

    const participantJoin = await tryJoinConversation(alice.token, conversationId);
    console.log(
      "1. Participant join:",
      participantJoin.ok ? "success" : participantJoin.payload.message
    );

    const outsiderJoin = await tryJoinConversation(john.token, conversationId);
    console.log(
      "2. Non-participant join:",
      outsiderJoin.ok ? "unexpected success" : outsiderJoin.payload.message,
      `(status ${outsiderJoin.payload.statusCode})`
    );

    const invalidJoin = await tryJoinConversation(
      alice.token,
      "000000000000000000000000"
    );
    console.log(
      "3. Invalid conversation:",
      invalidJoin.ok ? "unexpected success" : invalidJoin.payload.message,
      `(status ${invalidJoin.payload.statusCode})`
    );

    if (
      participantJoin.ok &&
      !outsiderJoin.ok &&
      outsiderJoin.payload.statusCode === 403 &&
      !invalidJoin.ok &&
      invalidJoin.payload.statusCode === 404
    ) {
      console.log("Secure room join test passed");
      process.exit(0);
    }

    throw new Error("Secure room join test failed");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

main();
