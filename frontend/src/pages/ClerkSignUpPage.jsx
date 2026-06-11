import { SignUp } from '@clerk/clerk-react'
import { ROUTES } from '../config/routes'

/** Full-page Clerk sign-up — no custom form wrapper. */
export default function ClerkSignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp
        routing="path"
        path={ROUTES.SIGN_UP}
        signInUrl={ROUTES.SIGN_IN}
        fallbackRedirectUrl={ROUTES.DASHBOARD}
        forceRedirectUrl={ROUTES.DASHBOARD}
      />
    </div>
  )
}
