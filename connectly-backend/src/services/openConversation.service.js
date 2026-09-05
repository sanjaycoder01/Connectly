// Tracks which sockets currently have a conversation "open" (joined the room).
// conversationId -> Map(userId -> Set(socketId))

const openRooms = new Map();

const open = (conversationId, userId, socketId) => {
  const cid = conversationId.toString();
  const uid = userId.toString();

  if (!openRooms.has(cid)) {
    openRooms.set(cid, new Map());
  }

  const users = openRooms.get(cid);

  if (!users.has(uid)) {
    users.set(uid, new Set());
  }

  users.get(uid).add(socketId);
};

const close = (conversationId, userId, socketId) => {
  const cid = conversationId.toString();
  const uid = userId.toString();
  const users = openRooms.get(cid);

  if (!users) {
    return;
  }

  const sockets = users.get(uid);

  if (!sockets) {
    return;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    users.delete(uid);
  }

  if (users.size === 0) {
    openRooms.delete(cid);
  }
};

const closeAllForSocket = (socketId) => {
  const closed = [];

  for (const [cid, users] of openRooms.entries()) {
    for (const [uid, sockets] of users.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        closed.push({ conversationId: cid, userId: uid });

        if (sockets.size === 0) {
          users.delete(uid);
        }
      }
    }

    if (users.size === 0) {
      openRooms.delete(cid);
    }
  }

  return closed;
};

const isOpen = (conversationId, userId) => {
  const users = openRooms.get(conversationId.toString());
  const sockets = users?.get(userId.toString());
  return !!(sockets && sockets.size > 0);
};

module.exports = {
  open,
  close,
  closeAllForSocket,
  isOpen,
};
