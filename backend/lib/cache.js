const NodeCache = require('node-cache');

function createInMemoryCache({
  ttlMs = 0,
  maxKeys = 200,
  now = () => Date.now(),
} = {}) {
  const store = new Map();

  function get(key) {
    if (ttlMs <= 0) return null;
    const entry = store.get(key);
    if (!entry) return null;
    if (now() - entry.storedAt > ttlMs) {
      store.delete(key);
      return null;
    }
    return entry.payload;
  }

  function set(key, payload) {
    if (ttlMs <= 0) return;
    store.set(key, { storedAt: now(), payload });
    if (store.size > maxKeys) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
  }

  function del(key) {
    store.delete(key);
  }

  function clear() {
    store.clear();
  }

  return { get, set, del, clear };
}

function createNodeCacheAdapter({
  ttlSec = 600,
  maxKeys = 500,
  useClones = false,
} = {}) {
  const cache = new NodeCache({
    stdTTL: ttlSec,
    maxKeys,
    useClones,
  });

  return {
    get(key) {
      const value = cache.get(key);
      return value == null ? null : value;
    },
    set(key, payload) {
      cache.set(key, payload);
    },
    del(key) {
      cache.del(key);
    },
    clear() {
      cache.flushAll();
    },
  };
}

module.exports = { createInMemoryCache, createNodeCacheAdapter };
