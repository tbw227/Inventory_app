const { getAuth } = require('@clerk/express');
const { isClerkConfigured } = require('../config/clerk');

/** Requires a valid Clerk session (Bearer token from @clerk/clerk-react). */
function requireClerkSession(req, res, next) {
  if (!isClerkConfigured()) {
    return res.status(503).json({ error: 'Clerk authentication is not configured' });
  }
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Clerk authentication required' });
  }
  req.clerkUserId = auth.userId;
  next();
}

module.exports = { requireClerkSession };
