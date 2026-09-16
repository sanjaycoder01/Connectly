const { getCommandClient } = require("../config/redis");

/**
 * Redis key layout:
 *   presence:user:{userId}  → SET of active socketIds for that user
 *   presence:online         → SET of userIds that currently have ≥1 socket
 *
 * Falls back to an in-memory Map when Redis is unavailable (local/single-node).
 */

const USER_KEY_PREFIX = "presence:user:";
const ONLINE_SET_KEY = "presence:online";

const ADD_SOCKET_LUA = `
local userKey = KEYS[1]
local onlineKey = KEYS[2]
local socketId = ARGV[1]
local userId = ARGV[2]
redis.call('SADD', userKey, socketId)
local count = redis.call('SCARD', userKey)
if count == 1 then
  redis.call('SADD', onlineKey, userId)
  return 1
end
return 0
`;

const REMOVE_SOCKET_LUA = `
local userKey = KEYS[1]
local onlineKey = KEYS[2]
local socketId = ARGV[1]
local userId = ARGV[2]
redis.call('SREM', userKey, socketId)
local count = redis.call('SCARD', userKey)
if count == 0 then
  redis.call('DEL', userKey)
  redis.call('SREM', onlineKey, userId)
  return 1
end
return 0
`;

// --- in-memory fallback (single instance / Redis down) ---
const memoryOnlineUsers = new Map();

const memoryAddSocket = (userId, socketId) => {
  const id = userId.toString();
  const existing = memoryOnlineUsers.get(id);
  const wasOffline = !existing || existing.size === 0;

  if (!existing) {
    memoryOnlineUsers.set(id, new Set([socketId]));
  } else {
    existing.add(socketId);
  }

  return wasOffline;
};

const memoryRemoveSocket = (userId, socketId) => {
  const id = userId.toString();
  const sockets = memoryOnlineUsers.get(id);

  if (!sockets) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    memoryOnlineUsers.delete(id);
    return true;
  }

  return false;
};

const memoryIsOnline = (userId) => {
  const sockets = memoryOnlineUsers.get(userId.toString());
  return !!(sockets && sockets.size > 0);
};

const memoryGetOnlineUserIds = () => Array.from(memoryOnlineUsers.keys());

const memoryGetSocketCount = (userId) => {
  const sockets = memoryOnlineUsers.get(userId.toString());
  return sockets ? sockets.size : 0;
};

const userSocketsKey = (userId) => `${USER_KEY_PREFIX}${userId.toString()}`;

/**
 * @returns {Promise<boolean>} true if this was the user's first socket (became online)
 */
const addSocket = async (userId, socketId) => {
  const client = getCommandClient();
  const id = userId.toString();

  if (!client) {
    return memoryAddSocket(id, socketId);
  }

  try {
    const result = await client.eval(ADD_SOCKET_LUA, {
      keys: [userSocketsKey(id), ONLINE_SET_KEY],
      arguments: [socketId.toString(), id],
    });
    return Number(result) === 1;
  } catch (err) {
    console.error("[Presence] addSocket Redis error, falling back to memory:", err.message);
    return memoryAddSocket(id, socketId);
  }
};

/**
 * @returns {Promise<boolean>} true if the user has no remaining sockets (became offline)
 */
const removeSocket = async (userId, socketId) => {
  const client = getCommandClient();
  const id = userId.toString();

  if (!client) {
    return memoryRemoveSocket(id, socketId);
  }

  try {
    const result = await client.eval(REMOVE_SOCKET_LUA, {
      keys: [userSocketsKey(id), ONLINE_SET_KEY],
      arguments: [socketId.toString(), id],
    });
    return Number(result) === 1;
  } catch (err) {
    console.error("[Presence] removeSocket Redis error, falling back to memory:", err.message);
    return memoryRemoveSocket(id, socketId);
  }
};

const isOnline = async (userId) => {
  const client = getCommandClient();
  const id = userId.toString();

  if (!client) {
    return memoryIsOnline(id);
  }

  try {
    const count = await client.sCard(userSocketsKey(id));
    return count > 0;
  } catch (err) {
    console.error("[Presence] isOnline Redis error:", err.message);
    return memoryIsOnline(id);
  }
};

const getOnlineUserIds = async () => {
  const client = getCommandClient();

  if (!client) {
    return memoryGetOnlineUserIds();
  }

  try {
    return await client.sMembers(ONLINE_SET_KEY);
  } catch (err) {
    console.error("[Presence] getOnlineUserIds Redis error:", err.message);
    return memoryGetOnlineUserIds();
  }
};

const getSocketCount = async (userId) => {
  const client = getCommandClient();
  const id = userId.toString();

  if (!client) {
    return memoryGetSocketCount(id);
  }

  try {
    return await client.sCard(userSocketsKey(id));
  } catch (err) {
    console.error("[Presence] getSocketCount Redis error:", err.message);
    return memoryGetSocketCount(id);
  }
};

/** Test helper: clear Redis + memory presence keys. */
const resetForTests = async () => {
  memoryOnlineUsers.clear();

  const client = getCommandClient();
  if (!client) {
    return;
  }

  try {
    const keys = await client.keys(`${USER_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
    await client.del(ONLINE_SET_KEY);
  } catch (err) {
    console.error("[Presence] resetForTests error:", err.message);
  }
};

module.exports = {
  addSocket,
  removeSocket,
  isOnline,
  getOnlineUserIds,
  getSocketCount,
  resetForTests,
  USER_KEY_PREFIX,
  ONLINE_SET_KEY,
};
