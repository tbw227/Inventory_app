/** True when Clerk API keys are set (hybrid auth enabled alongside legacy JWT). */
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
