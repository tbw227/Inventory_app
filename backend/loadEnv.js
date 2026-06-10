/**
 * Load .env from the backend package directory (not process.cwd()).
 * Fixes missing OPENWEATHER_API_KEY / MONGODB_URI when the shell cwd is elsewhere.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/** Strip optional surrounding quotes from .env values (common on Windows). */
function unquote(value) {
  const s = String(value ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * Supabase session pooler allows ~15 clients total (shared with Railway, Studio, local dev).
 * Prisma must use connection_limit=1 or parallel dashboard requests exhaust the pool.
 */
function normalizeSupabasePoolerUrl(rawUrl) {
  let url = unquote(rawUrl);
  if (!url || !/pooler\.supabase\.com/i.test(url)) return url;

  const params = [];
  if (!/[?&]pgbouncer=/i.test(url)) params.push('pgbouncer=true');
  if (!/[?&]connection_limit=/i.test(url)) params.push('connection_limit=1');
  if (!/[?&]pool_timeout=/i.test(url)) params.push('pool_timeout=60');
  if (!/[?&]sslmode=/i.test(url)) params.push('sslmode=require');
  if (!params.length) return url;

  return `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`;
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizeSupabasePoolerUrl(process.env.DATABASE_URL);
}
