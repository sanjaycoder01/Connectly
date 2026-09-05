// In-memory presence: userId -> Set of socketIds (supports multiple devices)

const onlineUsers = new Map();

const addSocket = (userId, socketId) => {
  const id = userId.toString();
  const existing = onlineUsers.get(id);
  const wasOffline = !existing || existing.size === 0;

  if (!existing) {
    onlineUsers.set(id, new Set([socketId]));
  } else {
    existing.add(socketId);
  }

  return wasOffline;
};

const removeSocket = (userId, socketId) => {
  const id = userId.toString();
  const sockets = onlineUsers.get(id);

  if (!sockets) {
    return false;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(id);
    return true; // became offline
  }

  return false;
};

const isOnline = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return !!(sockets && sockets.size > 0);
};

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const getSocketCount = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return sockets ? sockets.size : 0;
};

module.exports = {
  addSocket,
  removeSocket,
  isOnline,
  getOnlineUserIds,
  getSocketCount,
};
