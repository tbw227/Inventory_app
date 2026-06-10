/** Clerk is optional — legacy email/password login remains when unset. */
export function isClerkEnabled() {
  const key = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim()
  return key.length > 0
}

export function getClerkPublishableKey() {
  return (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim()
}
