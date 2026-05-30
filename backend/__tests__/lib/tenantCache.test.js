const { resetStoreForTests, createMemoryStore } = require('../../lib/cacheStore');
const {
  buildKey,
  getOrSet,
  invalidateCompany,
  bustCompanyCache,
} = require('../../services/tenantCacheService');

describe('tenantCacheService', () => {
  beforeEach(() => {
    resetStoreForTests();
    process.env.REDIS_URL = '';
    process.env.TENANT_CACHE_TTL_MS = '60000';
    process.env.DASHBOARD_CACHE_TTL_MS = '60000';
  });

  afterAll(() => {
    resetStoreForTests();
  });

  it('caches loader result per company key', async () => {
    let calls = 0;
    const key = buildKey('company-a', 'test', 'x');
    const load = async () => {
      calls += 1;
      return { n: calls };
    };

    const first = await getOrSet(key, 60_000, load);
    const second = await getOrSet(key, 60_000, load);

    expect(first).toEqual({ n: 1 });
    expect(second).toEqual({ n: 1 });
    expect(calls).toBe(1);
  });

  it('invalidateCompany clears tenant keys', async () => {
    const companyId = 'company-b';
    const key = buildKey(companyId, 'test', 'y');
    let calls = 0;

    await getOrSet(key, 60_000, async () => {
      calls += 1;
      return 'v1';
    });
    await invalidateCompany(companyId);

    const again = await getOrSet(key, 60_000, async () => {
      calls += 1;
      return 'v2';
    });

    expect(again).toBe('v2');
    expect(calls).toBe(2);
  });
});

describe('cacheStore memory deleteByPrefix', () => {
  it('removes keys with prefix', async () => {
    const store = createMemoryStore({ defaultTtlMs: 60_000 });
    await store.set('ft:co1:a', 1);
    await store.set('ft:co1:b', 2);
    await store.set('ft:co2:c', 3);
    await store.deleteByPrefix('ft:co1:');
    expect(await store.get('ft:co1:a')).toBeNull();
    expect(await store.get('ft:co2:c')).toBe(3);
  });
});
