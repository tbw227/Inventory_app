const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const { getJwtSecret } = require('../utils/auth');

function getIntuitConfig() {
  const clientId = process.env.INTUIT_CLIENT_ID?.trim();
  const clientSecret = process.env.INTUIT_CLIENT_SECRET?.trim();
  const redirectUri = process.env.INTUIT_REDIRECT_URI?.trim();
  return { clientId, clientSecret, redirectUri };
}

function assertIntuitConfigured() {
  const { clientId, clientSecret, redirectUri } = getIntuitConfig();
  if (!clientId || !clientSecret || !redirectUri) {
    const err = new Error('QuickBooks OAuth is not configured (INTUIT_CLIENT_ID / INTUIT_CLIENT_SECRET / INTUIT_REDIRECT_URI)');
    err.code = 'INTUIT_NOT_CONFIGURED';
    throw err;
  }
  return { clientId, clientSecret, redirectUri };
}

function apiBaseUrl() {
  const env = (process.env.INTUIT_ENVIRONMENT || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

function buildAuthorizeUrl(companyId, userId) {
  const { clientId, redirectUri } = assertIntuitConfigured();
  const state = jwt.sign(
    { companyId: String(companyId), userId: String(userId) },
    getJwtSecret(),
    { expiresIn: '10m' }
  );
  const scope = [
    'com.intuit.quickbooks.accounting',
    'openid',
    'profile',
    'email',
  ].join(' ');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

function verifyOAuthState(state) {
  return jwt.verify(String(state), getJwtSecret());
}

async function postToken(bodyParams) {
  const { clientId, clientSecret } = assertIntuitConfigured();
  const body = new URLSearchParams(bodyParams);
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.error || `Token request failed (${res.status})`;
    const err = new Error(msg);
    err.status = 400;
    throw err;
  }
  return data;
}

async function exchangeAuthorizationCode(code) {
  const { redirectUri } = assertIntuitConfigured();
  return postToken({
    grant_type: 'authorization_code',
    code: String(code),
    redirect_uri: redirectUri,
  });
}

async function refreshAccessToken(refreshToken) {
  return postToken({
    grant_type: 'refresh_token',
    refresh_token: String(refreshToken),
  });
}

async function upsertConnection(companyId, realmId, tokenPayload) {
  const cid = String(companyId);
  const expiresInSec = Number(tokenPayload.expires_in) || 3600;
  const accessTokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);
  const accessToken = String(tokenPayload.access_token || '');
  const refreshToken = String(tokenPayload.refresh_token || '');
  if (!accessToken || !refreshToken) {
    const err = new Error('Token response missing access or refresh token');
    err.status = 400;
    throw err;
  }
  await prisma.quickBooksConnection.upsert({
    where: { companyId: cid },
    create: {
      id: randomUUID(),
      companyId: cid,
      realmId: String(realmId),
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
    },
    update: {
      realmId: String(realmId),
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
    },
  });
}

async function getValidConnection(companyId) {
  const cid = String(companyId);
  const row = await prisma.quickBooksConnection.findUnique({ where: { companyId: cid } });
  if (!row) return null;
  const skewMs = 120_000;
  if (row.accessTokenExpiresAt.getTime() > Date.now() + skewMs) {
    return row;
  }
  const tokens = await refreshAccessToken(row.refreshToken);
  const expiresInSec = Number(tokens.expires_in) || 3600;
  const accessTokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);
  return prisma.quickBooksConnection.update({
    where: { companyId: cid },
    data: {
      accessToken: String(tokens.access_token),
      refreshToken: tokens.refresh_token ? String(tokens.refresh_token) : row.refreshToken,
      accessTokenExpiresAt,
    },
  });
}

async function disconnect(companyId) {
  await prisma.quickBooksConnection.deleteMany({ where: { companyId: String(companyId) } });
}

async function runQuery(connectionRow, query) {
  const base = apiBaseUrl();
  const q = encodeURIComponent(query);
  const url = `${base}/v3/company/${encodeURIComponent(connectionRow.realmId)}/query?query=${q}&minorversion=65`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${connectionRow.accessToken}`,
      Accept: 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.Fault?.Error?.[0]?.Message || data.fault?.error?.[0]?.message || `QBO query failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status >= 400 && res.status < 500 ? res.status : 502;
    throw err;
  }
  return data;
}

module.exports = {
  buildAuthorizeUrl,
  verifyOAuthState,
  exchangeAuthorizationCode,
  upsertConnection,
  getValidConnection,
  disconnect,
  runQuery,
  assertIntuitConfigured,
};
