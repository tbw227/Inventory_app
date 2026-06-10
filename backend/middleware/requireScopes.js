/** Enforce OAuth-style scopes when present on delegated/agent tokens. Human sessions skip scope checks. */
function requireScopes(...required) {
  return (req, res, next) => {
    const scopes = req.auth?.scopes;
    if (!scopes?.length) return next();

    const missing = required.filter((scope) => !scopes.includes(scope));
    if (missing.length) {
      return res.status(403).json({
        error: 'Insufficient scope',
        code: 'INSUFFICIENT_SCOPE',
        missing,
      });
    }
    return next();
  };
}

module.exports = { requireScopes };
