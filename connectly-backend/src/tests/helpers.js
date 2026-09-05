const http = require("http");
const { randomUUID } = require("crypto");
const { io } = require("socket.io-client");

const createHttpClient = (baseUrl) => {
  const url = new URL(baseUrl);

  const request = (method, path, body, cookieHeader) =>
    new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path,
          method,
          headers: {
            "Content-Type": "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            ...(payload
              ? { "Content-Length": Buffer.byteLength(payload) }
              : {}),
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

  return { request };
};

const getTokenFromSetCookie = (setCookieHeader) => {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];

  for (const entry of cookies) {
    if (!entry) continue;
    const match = entry.match(/token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
};

const signupOrLogin = async (client, username, email, password) => {
  let response = await client.request("POST", "/api/auth/login", {
    email,
    password,
  });

  if (response.status === 401) {
    response = await client.request("POST", "/api/auth/signup", {
      username,
      email,
      password,
    });
  }

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Auth failed for ${username}: ${response.body?.message || response.status}`
    );
  }

  const token = getTokenFromSetCookie(response.headers["set-cookie"]);

  if (!token) {
    throw new Error(`No auth cookie for ${username}`);
  }

  return { token, user: response.body.user };
};

const connectSocket = (baseUrl, token) =>
  new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      extraHeaders: { Cookie: `token=${token}` },
      forceNew: true,
    });

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Socket connection timed out"));
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      socket.close();
      reject(error);
    });
  });

const emitWithAck = (socket, event, payload, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${event} acknowledgement timed out`));
    }, timeoutMs);

    socket.emit(event, payload, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });

const waitForEvent = (socket, event, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    socket.once(event, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

const uniqueName = (prefix) => {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return `${prefix}_${suffix}`.slice(0, 30);
};

module.exports = {
  createHttpClient,
  signupOrLogin,
  connectSocket,
  emitWithAck,
  waitForEvent,
  uniqueName,
  randomUUID,
};
