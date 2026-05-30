import { useEffect } from 'react'
import { MARKETING_SIGNUP_URL } from '../../config/marketing'

/** Signup lives on the marketing site — /register in the app forwards there. */
export default function RedirectToMarketingSignup() {
  useEffect(() => {
    window.location.replace(MARKETING_SIGNUP_URL)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <p className="text-sm text-gray-600">Redirecting to sign up…</p>
    </div>
  )
}
