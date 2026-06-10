import { SignUp } from '@clerk/clerk-react'
import { ROUTES } from '../../config/routes'

export default function ClerkSignUpPanel() {
  return (
    <div className="flex justify-center">
      <SignUp
        routing="hash"
        signInUrl={ROUTES.LOGIN}
        fallbackRedirectUrl={ROUTES.DASHBOARD}
        forceRedirectUrl={ROUTES.DASHBOARD}
      />
    </div>
  )
}
