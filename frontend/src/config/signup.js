import { ROUTES } from './routes'
import { MARKETING_SIGNUP_URL } from './marketing'
import { PUBLIC_REGISTRATION_ENABLED } from './security'

/** True when VITE_MARKETING_URL points at a real deployed marketing site (not local default). */
export function isMarketingSiteConfigured() {
  const raw = (import.meta.env.VITE_MARKETING_URL || '').trim()
  if (!raw) return false
  return !/localhost|127\.0\.0\.1/i.test(raw)
}

/** In-app /register during beta; marketing /signup when marketing site is live and in-app signup is off. */
export function getSignupHref() {
  if (PUBLIC_REGISTRATION_ENABLED) return ROUTES.REGISTER
  return MARKETING_SIGNUP_URL
}

export function useInAppSignupLink() {
  return PUBLIC_REGISTRATION_ENABLED
}
