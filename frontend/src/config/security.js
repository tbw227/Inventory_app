/**
 * Public signup is enabled on the marketing site; backend must allow POST /auth/register.
 * Set VITE_ALLOW_PUBLIC_REGISTRATION=false to hide signup CTAs in the app shell.
 */
export const PUBLIC_REGISTRATION_ENABLED =
  import.meta.env.VITE_ALLOW_PUBLIC_REGISTRATION === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_ALLOW_PUBLIC_REGISTRATION !== 'false')

/** @deprecated Use PUBLIC_REGISTRATION_ENABLED */
export const isPublicRegistrationAllowed = PUBLIC_REGISTRATION_ENABLED
