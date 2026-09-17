const { createClient } = require("redis");
const { redisUrl } = require("./env");

let pubClient = null;
let subClient = null;
let connecting = null;

const attachClientLogging = (client, label) => {
  client.on("error", (err) => {
    console.error(`[Redis:${label}] error:`, err.message);
  });

  client.on("reconnecting", () => {
    console.warn(`[Redis:${label}] reconnecting...`);
  });

  client.on("end", () => {
    console.log(`[Redis:${label}] connection closed`);
  });
};

/**
 * Connects publisher + subscriber Redis clients for the Socket.IO adapter.
 * Returns null when REDIS_URL is unset (single-instance / in-memory adapter).
 */
const connectRedis = async () => {
  if (pubClient?.isOpen && subClient?.isOpen) {
    return { pubClient, subClient };
  }

  if (connecting) {
    return connecting;
  }

  if (!redisUrl) {
    console.warn(
      "[Redis] REDIS_URL not set — Socket.IO will use the in-memory adapter (single instance only)"
    );
    return null;
  }

  connecting = (async () => {
    pubClient = createClient({ url: redisUrl });
    subClient = pubClient.duplicate();

    attachClientLogging(pubClient, "pub");
    attachClientLogging(subClient, "sub");

    await Promise.all([pubClient.connect(), subClient.connect()]);

    console.log("[Redis] pub/sub clients connected");
    return { pubClient, subClient };
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
};

const getRedisClients = () => ({
  pubClient,
  subClient,
  isConnected: !!(pubClient?.isOpen && subClient?.isOpen),
});

/** Shared command client (pub) for presence and other Redis data ops. */
const getCommandClient = () => {
  if (pubClient?.isOpen) {
    return pubClient;
  }
  return null;
};

const disconnectRedis = async () => {
  const clients = [pubClient, subClient].filter(Boolean);

  await Promise.all(
    clients.map(async (client) => {
      try {
        client.removeAllListeners("error");
        client.on("error", () => {
          // Ignore post-shutdown noise from Socket.IO adapter cleanup
        });
        if (client.isOpen) {
          await client.quit();
        }
      } catch (err) {
        try {
          await client.disconnect();
        } catch {
          // ignore force-disconnect errors during shutdown
        }
      }
    })
  );

  pubClient = null;
  subClient = null;
  console.log("[Redis] disconnected");
};

module.exports = {
  connectRedis,
  getRedisClients,
  getCommandClient,
  disconnectRedis,
};
