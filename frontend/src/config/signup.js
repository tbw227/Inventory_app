import { MARKETING_SIGNUP_URL } from './marketing'
import { isMarketingSiteConfigured } from './marketingSite'
import { getSignUpPath, isPortalAuthEnabled } from './authPortal'

export { isMarketingSiteConfigured } from './marketingSite'

/** Sign-up: app portal when Clerk or in-app registration is enabled; else marketing site. */
export function getSignupHref() {
  if (isPortalAuthEnabled()) {
    const path = getSignUpPath()
    if (path) return path
  }
  return MARKETING_SIGNUP_URL
}

export function useInAppSignupLink() {
  return isPortalAuthEnabled()
}
