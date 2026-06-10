const { isClerkConfigured } = require('../config/clerk');

/** Block legacy password login/register when Clerk is the production auth provider. */
function rejectLegacyAuthWhenClerk(req, res, next) {
  if (!isClerkConfigured()) return next();
  return res.status(403).json({
    error: 'Password login is disabled. Sign in with Clerk.',
    code: 'LEGACY_AUTH_DISABLED',
  });
}

module.exports = { rejectLegacyAuthWhenClerk };
