/**
 * Security-related feature flags (env-driven).
 */

function isPublicRegistrationAllowed() {
  if (process.env.ALLOW_PUBLIC_REGISTRATION === 'true') return true;
  if (process.env.ALLOW_PUBLIC_REGISTRATION === 'false') return false;
  // Default on outside production (local dev + marketing signup).
  return process.env.NODE_ENV !== 'production';
}

function isLanCorsAllowed() {
  return process.env.ALLOW_LAN_CORS === 'true';
}

/** Comma-separated browser origins from FRONTEND_URL and MARKETING_URL. */
function getConfiguredBrowserOrigins() {
  const parts = [process.env.FRONTEND_URL, process.env.MARKETING_URL]
    .filter(Boolean)
    .flatMap((s) => s.split(',').map((x) => x.trim()).filter(Boolean));
  return [...new Set(parts)];
}

module.exports = {
  isPublicRegistrationAllowed,
  isLanCorsAllowed,
  getConfiguredBrowserOrigins,
};
