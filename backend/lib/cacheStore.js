/**
 * Shared cache store — in-memory (default) or Redis when REDIS_URL is set.
 * Used by tenantCacheService for per-company API response caching.
 */
const { createInMemoryCache } = require('./cache');

const KEY_PREFIX = 'ft:';

function parsePositiveInt(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function createMemoryStore({ defaultTtlMs = 30_000, maxKeys = 1000 } = {}) {
  const inner = createInMemoryCache({ ttlMs: defaultTtlMs, maxKeys });
  const keyIndex = new Set();

  return {
    backend: 'memory',
    async get(key) {
      return inner.get(key);
    },
    async set(key, value, ttlMs = defaultTtlMs) {
      keyIndex.add(key);
      if (ttlMs > 0) {
        inner.set(key, value);
      }
    },
    async del(key) {
      keyIndex.delete(key);
      inner.del(key);
    },
    async deleteByPrefix(prefix) {
      for (const key of [...keyIndex]) {
        if (key.startsWith(prefix)) {
          keyIndex.delete(key);
          inner.del(key);
        }
      }
    },
    async ping() {
      return 'PONG';
    },
  };
}

function createRedisStore(redisUrl, { defaultTtlMs = 30_000 } = {}) {
  const { createClient } = require('redis');
  const client = createClient({ url: redisUrl });
  let connectPromise = null;

  async function ensureConnected() {
    if (!connectPromise) {
      connectPromise = client.connect().catch((err) => {
        connectPromise = null;
        throw err;
      });
    }
    await connectPromise;
  }

  return {
    backend: 'redis',
    async get(key) {
      await ensureConnected();
      const raw = await client.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    async set(key, value, ttlMs = defaultTtlMs) {
      await ensureConnected();
      const payload = JSON.stringify(value);
      if (ttlMs > 0) {
        await client.set(key, payload, { PX: ttlMs });
      } else {
        await client.set(key, payload);
      }
    },
    async del(key) {
      await ensureConnected();
      await client.del(key);
    },
    async deleteByPrefix(prefix) {
      await ensureConnected();
      const match = `${prefix}*`;
      const batch = [];
      for await (const key of client.scanIterator({ MATCH: match, COUNT: 100 })) {
        batch.push(key);
        if (batch.length >= 100) {
          await client.del(batch);
          batch.length = 0;
        }
      }
      if (batch.length) await client.del(batch);
    },
    async ping() {
      await ensureConnected();
      return client.ping();
    },
    async disconnect() {
      if (client.isOpen) await client.quit();
    },
  };
}

let storeInstance = null;
let storeInitPromise = null;

function getDefaultTtlMs() {
  return parsePositiveInt(process.env.TENANT_CACHE_TTL_MS, 30_000);
}

async function initStore() {
  const ttlMs = getDefaultTtlMs();
  const redisUrl = (process.env.REDIS_URL || '').trim();

  if (redisUrl) {
    try {
      const redisStore = createRedisStore(redisUrl, { defaultTtlMs: ttlMs });
      await redisStore.ping();
      console.info('[cache] Using Redis tenant cache');
      return redisStore;
    } catch (err) {
      console.warn(`[cache] Redis unavailable (${err.message}); falling back to in-memory`);
    }
  }

  console.info('[cache] Using in-memory tenant cache');
  return createMemoryStore({ defaultTtlMs: ttlMs, maxKeys: 1000 });
}

async function getStore() {
  if (storeInstance) return storeInstance;
  if (!storeInitPromise) {
    storeInitPromise = initStore().then((store) => {
      storeInstance = store;
      return store;
    });
  }
  return storeInitPromise;
}

function resetStoreForTests() {
  if (storeInstance?.disconnect) {
    storeInstance.disconnect().catch(() => {});
  }
  storeInstance = null;
  storeInitPromise = null;
}

module.exports = {
  KEY_PREFIX,
  getStore,
  resetStoreForTests,
  createMemoryStore,
  createRedisStore,
  getDefaultTtlMs,
};
