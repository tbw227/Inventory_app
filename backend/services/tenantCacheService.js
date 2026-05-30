/**
 * Per-tenant (company) response cache — reduces duplicate Prisma load on hot GETs.
 *
 * - Default: in-process memory (single API instance).
 * - Scale-out: set REDIS_URL so all replicas share the same cache.
 * - Writes call invalidateCompany() so lists/dashboard stay fresh.
 */
const crypto = require('crypto');
const { KEY_PREFIX, getStore, getDefaultTtlMs } = require('../lib/cacheStore');

const BUCKETS = {
  INVENTORY_OVERVIEW: 'inventory-overview',
  DASHBOARD: 'dashboard',
  CLIENTS: 'clients',
  LOCATIONS: 'locations',
  JOBS: 'jobs',
  CALENDAR: 'calendar',
};

function companyPrefix(companyId) {
  return `${KEY_PREFIX}${String(companyId)}:`;
}

function buildKey(companyId, bucket, suffix = '') {
  const base = `${companyPrefix(companyId)}${bucket}`;
  return suffix ? `${base}:${suffix}` : base;
}

function stableSuffix(parts) {
  const raw = typeof parts === 'string' ? parts : JSON.stringify(parts);
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function parseDashboardTtlMs() {
  const raw = process.env.DASHBOARD_CACHE_TTL_MS;
  if (raw === undefined || raw === '') return 20_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 20_000;
  return n;
}

function parseInventoryTtlMs() {
  const raw = process.env.INVENTORY_OVERVIEW_CACHE_TTL_MS;
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return getDefaultTtlMs();
}

function queryCacheSuffix(query) {
  if (!query || typeof query !== 'object') return 'default';
  const keys = ['page', 'limit', 'sort', 'order', 'search', 'q', 'status', 'client_id', 'days'];
  const slice = {};
  for (const k of keys) {
    if (query[k] !== undefined) slice[k] = query[k];
  }
  return stableSuffix(slice);
}

async function getOrSet(key, ttlMs, loader) {
  if (ttlMs <= 0) return loader();
  const store = await getStore();
  const hit = await store.get(key);
  if (hit !== null) return hit;
  const value = await loader();
  await store.set(key, value, ttlMs);
  return value;
}

async function invalidateCompany(companyId) {
  if (companyId == null || companyId === '') return;
  const store = await getStore();
  await store.deleteByPrefix(companyPrefix(companyId));
}

/** Fire-and-forget cache bust after a tenant write (supplies, clients, jobs, etc.). */
function bustCompanyCache(companyId) {
  invalidateCompany(companyId).catch((err) => {
    console.warn('[cache] invalidateCompany failed:', err.message);
  });
}

async function getInventoryOverviewCached(companyId, includePricing, loader) {
  const suffix = includePricing ? 'pricing' : 'nopricing';
  const key = buildKey(companyId, BUCKETS.INVENTORY_OVERVIEW, suffix);
  return getOrSet(key, parseInventoryTtlMs(), loader);
}

async function getDashboardCached(companyId, role, userId, days, includeHeavy, demoRevenue, loader) {
  const suffix = stableSuffix({
    role,
    userId,
    days,
    includeHeavy: includeHeavy ? 'full' : 'summary',
    demoRevenue: demoRevenue ? '1' : '0',
  });
  const key = buildKey(companyId, BUCKETS.DASHBOARD, suffix);
  return getOrSet(key, parseDashboardTtlMs(), loader);
}

async function getClientsListCached(companyId, query, loader) {
  const key = buildKey(companyId, BUCKETS.CLIENTS, queryCacheSuffix(query));
  return getOrSet(key, getDefaultTtlMs(), loader);
}

async function getLocationsListCached(companyId, clientId, query, loader) {
  const key = buildKey(companyId, BUCKETS.LOCATIONS, stableSuffix({ clientId: clientId || '', q: queryCacheSuffix(query) }));
  return getOrSet(key, getDefaultTtlMs(), loader);
}

async function getJobsListCached(companyId, role, userId, query, loader) {
  const key = buildKey(companyId, BUCKETS.JOBS, stableSuffix({ role, userId, q: queryCacheSuffix(query) }));
  return getOrSet(key, getDefaultTtlMs(), loader);
}

async function getCalendarCached(companyId, loader) {
  const key = buildKey(companyId, BUCKETS.CALENDAR, 'events');
  return getOrSet(key, getDefaultTtlMs(), loader);
}

module.exports = {
  BUCKETS,
  buildKey,
  getOrSet,
  invalidateCompany,
  bustCompanyCache,
  getInventoryOverviewCached,
  getDashboardCached,
  getClientsListCached,
  getLocationsListCached,
  getJobsListCached,
  getCalendarCached,
};
