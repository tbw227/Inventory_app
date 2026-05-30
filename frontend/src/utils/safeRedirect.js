/**
 * Validates a redirect path to prevent open-redirect attacks.
 * Only allows relative paths that start with "/" and blocks
 * protocol-relative URLs ("//evil.com") and other schemes.
 */
export function safeRedirect(path, fallback = '/') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return fallback
  }
  return path
}
