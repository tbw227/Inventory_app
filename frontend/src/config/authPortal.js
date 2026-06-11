import { ROUTES } from './routes'
import { isClerkEnabled } from './clerk'
import { PUBLIC_REGISTRATION_ENABLED } from './security'

/**
 * App portal auth entry points. Returning users sign in here — not on the marketing site.
 * Point marketing "Sign in" buttons at getPortalSignInUrl() (set VITE_APP_URL in prod).
 */
export const APP_PORTAL_ORIGIN = (import.meta.env.VITE_APP_URL || '').replace(/\/$/, '')

export function isPortalAuthEnabled() {
  return isClerkEnabled() || PUBLIC_REGISTRATION_ENABLED
}

export function getSignInPath() {
  return isClerkEnabled() ? ROUTES.SIGN_IN : ROUTES.LOGIN
}

export function getSignUpPath() {
  if (isClerkEnabled()) return ROUTES.SIGN_UP
  if (PUBLIC_REGISTRATION_ENABLED) return ROUTES.REGISTER
  return null
}

export function resolvePortalOrigin() {
  if (APP_PORTAL_ORIGIN) return APP_PORTAL_ORIGIN
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function getPortalSignInUrl() {
  const origin = resolvePortalOrigin()
  const path = getSignInPath()
  return origin ? `${origin}${path}` : path
}

export function getPortalSignUpUrl() {
  const path = getSignUpPath()
  if (!path) return null
  const origin = resolvePortalOrigin()
  return origin ? `${origin}${path}` : path
}
