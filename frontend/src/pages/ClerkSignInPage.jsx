import { SignIn } from '@clerk/clerk-react'
import { ROUTES } from '../config/routes'

/** Full-page Clerk sign-in — no custom form wrapper. */
export default function ClerkSignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn
        routing="path"
        path={ROUTES.SIGN_IN}
        signUpUrl={ROUTES.SIGN_UP}
        fallbackRedirectUrl={ROUTES.DASHBOARD}
        forceRedirectUrl={ROUTES.DASHBOARD}
      />
    </div>
  )
}
