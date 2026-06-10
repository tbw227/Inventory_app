import { SignIn } from '@clerk/clerk-react'
import { ROUTES } from '../../config/routes'

export default function ClerkSignInPanel() {
  return (
    <div className="flex justify-center">
      <SignIn
        routing="hash"
        signUpUrl={ROUTES.REGISTER}
        fallbackRedirectUrl={ROUTES.DASHBOARD}
        forceRedirectUrl={ROUTES.DASHBOARD}
      />
    </div>
  )
}
