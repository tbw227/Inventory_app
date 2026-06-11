import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { MARKETING_SIGNUP_URL } from '../../config/marketing'
import { getSignUpPath, isPortalAuthEnabled } from '../../config/authPortal'

function MarketingExternalSignupRedirect() {
  useEffect(() => {
    window.location.replace(MARKETING_SIGNUP_URL)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-600">Redirecting to sign up…</p>
    </div>
  )
}

/**
 * Signup fallback when in-app portal signup is off — forwards to marketing.
 * When Clerk or VITE_ALLOW_PUBLIC_REGISTRATION is on, use the app portal instead.
 */
export default function RedirectToMarketingSignup() {
  if (isPortalAuthEnabled()) {
    const path = getSignUpPath()
    if (path) return <Navigate to={path} replace />
  }

  return <MarketingExternalSignupRedirect />
}
