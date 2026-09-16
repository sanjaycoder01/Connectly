const { getCommandClient } = require("../config/redis");

/**
 * Atomic INCR + set PEXPIRE only on first hit in the window.
 * Returns { count, ttlMs }.
 */
const INCR_WITH_EXPIRE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

const memoryHits = new Map();

const normalizeKey = (key) => {
  const raw = String(key || "anonymous");
  return raw.startsWith("ratelimit:") ? raw : `ratelimit:${raw}`;
};

const memoryConsume = (key, windowMs) => {
  const now = Date.now();
  let record = memoryHits.get(key);

  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryHits.set(key, record);
  } else {
    record.count += 1;
  }

  return {
    count: record.count,
    ttlMs: Math.max(0, record.resetTime - now),
    backend: "memory",
  };
};

/**
 * Consume one hit against a rate-limit key.
 * @returns {Promise<{ count: number, ttlMs: number, backend: 'redis'|'memory' }>}
 */
const consumeRateLimit = async (key, windowMs) => {
  const redisKey = normalizeKey(key);
  const client = getCommandClient();

  if (!client) {
    return memoryConsume(redisKey, windowMs);
  }

  try {
    const result = await client.eval(INCR_WITH_EXPIRE_LUA, {
      keys: [redisKey],
      arguments: [String(windowMs)],
    });

    const count = Number(result[0]);
    let ttlMs = Number(result[1]);

    // PTTL can briefly return -1/-2; fall back to full window
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      ttlMs = windowMs;
    }

    return { count, ttlMs, backend: "redis" };
  } catch (err) {
    console.error(
      "[RateLimit] Redis error, falling back to memory:",
      err.message
    );
    return memoryConsume(redisKey, windowMs);
  }
};

const memoryReset = (keyPrefix) => {
  if (!keyPrefix) {
    memoryHits.clear();
    return;
  }

  const normalized = normalizeKey(keyPrefix);
  for (const key of memoryHits.keys()) {
    if (key === normalized || key.startsWith(normalized)) {
      memoryHits.delete(key);
    }
  }
};

/**
 * Reset counters for tests. Optionally scopes by key prefix.
 */
const resetRateLimitKeys = async (keyPrefix) => {
  memoryReset(keyPrefix);

  const client = getCommandClient();
  if (!client) {
    return;
  }

  try {
    const pattern = keyPrefix
      ? `${normalizeKey(keyPrefix)}*`
      : "ratelimit:*";

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.error("[RateLimit] resetRateLimitKeys error:", err.message);
  }
};

module.exports = {
  consumeRateLimit,
  resetRateLimitKeys,
  normalizeKey,
};
