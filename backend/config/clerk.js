/** True when Clerk API keys are set (Clerk-only auth; legacy JWT login is disabled). */
function isClerkConfigured() {
  const secret = process.env.CLERK_SECRET_KEY;
  const publishable = process.env.CLERK_PUBLISHABLE_KEY;
  return (
    typeof secret === 'string' &&
    secret.trim().length > 0 &&
    typeof publishable === 'string' &&
    publishable.trim().length > 0
  );
}

module.exports = { isClerkConfigured };
