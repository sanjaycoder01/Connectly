import type { Message } from '../types/conversation';

const messageKey = (message: Message): string =>
  (message._id || message.id || message.clientMessageId || '').toString();

/**
 * Merge existing UI messages with MongoDB-fetched messages after reconnect.
 * Dedupes by `_id` / `id`, then by `clientMessageId`, preferring server fields.
 */
export const mergeMessages = (
  existing: Message[],
  incoming: Message[]
): Message[] => {
  const byKey = new Map<string, Message>();
  const clientIdToKey = new Map<string, string>();

  const upsert = (message: Message) => {
    const idKey = messageKey(message);
    if (!idKey) return;

    if (message.clientMessageId && clientIdToKey.has(message.clientMessageId)) {
      const priorKey = clientIdToKey.get(message.clientMessageId)!;
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

  for (const message of existing) {
    upsert(message);
  }
  for (const message of incoming) {
    upsert(message);
  }

  return Array.from(byKey.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};
