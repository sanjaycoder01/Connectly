const assert = require("node:assert/strict");
const { test } = require("node:test");

/**
 * Mirrors connectly-frontend/src/utils/messageMerge.ts — keep in sync.
 * Ensures reconnect resync does not duplicate messages in UI state.
 */
const messageKey = (message) =>
  (message._id || message.id || message.clientMessageId || "").toString();

const mergeMessages = (existing, incoming) => {
  const byKey = new Map();
  const clientIdToKey = new Map();

  const upsert = (message) => {
    const idKey = messageKey(message);
    if (!idKey) return;

    if (message.clientMessageId && clientIdToKey.has(message.clientMessageId)) {
      const priorKey = clientIdToKey.get(message.clientMessageId);
      const prior = byKey.get(priorKey);
      byKey.delete(priorKey);
      const merged = prior ? { ...prior, ...message } : message;
      const nextKey = messageKey(merged) || priorKey;
      byKey.set(nextKey, merged);
      clientIdToKey.set(message.clientMessageId, nextKey);
      return;
    }

    const prior = byKey.get(idKey);
    byKey.set(idKey, prior ? { ...prior, ...message } : message);
    if (message.clientMessageId) {
      clientIdToKey.set(message.clientMessageId, idKey);
    }
  };

  for (const message of existing) upsert(message);
  for (const message of incoming) upsert(message);

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

test("message merge: dedupes by _id and clientMessageId after reconnect resync", () => {
  const existing = [
    {
      _id: "m1",
      clientMessageId: "c1",
      content: "Hello",
      status: "sent",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      _id: "temp-c2",
      clientMessageId: "c2",
      content: "Pending",
      status: "sent",
      createdAt: "2026-01-01T10:01:00.000Z",
    },
  ];

  const incoming = [
    {
      _id: "m1",
      clientMessageId: "c1",
      content: "Hello",
      status: "delivered",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      _id: "m2",
      clientMessageId: "c2",
      content: "Pending",
      status: "sent",
      createdAt: "2026-01-01T10:01:00.000Z",
    },
    {
      _id: "m3",
      clientMessageId: "c3",
      content: "Missed offline",
      status: "sent",
      createdAt: "2026-01-01T10:02:00.000Z",
    },
  ];

  const merged = mergeMessages(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged[0]._id, "m1");
  assert.equal(merged[0].status, "delivered");
  assert.equal(merged[1]._id, "m2");
  assert.equal(merged[1].clientMessageId, "c2");
  assert.equal(merged[2].content, "Missed offline");
});
