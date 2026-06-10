import { useEffect } from 'react'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import api, { setAuthTokenGetter } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../config/routes'

/** Sync Clerk session tokens into the API client and app user state. */
export default function ClerkAuthBridge({ children }) {
  const { isSignedIn, isLoaded, getToken, signOut } = useClerkAuth()
  const { applySession, logout, user, setAuthLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (!isSignedIn) return null
      try {
        return await getToken()
      } catch {
        return null
      }
    })
    return () => setAuthTokenGetter(null)
  }, [isSignedIn, getToken])

  useEffect(() => {
    if (!isLoaded) {
      setAuthLoading(true)
      return undefined
    }

    if (!isSignedIn) {
      setAuthLoading(false)
      if (user?.authProvider === 'clerk') logout({ clerkSignOut: signOut })
      return undefined
    }

    let cancelled = false
    setAuthLoading(true)
    ;(async () => {
      try {
        const res = await api.get('/auth/me')
        if (cancelled) return
        applySession(res.data, { provider: 'clerk' })
      } catch (err) {
        if (cancelled) return
        const code = err?.response?.data?.code
        if (code === 'CLERK_NEEDS_PROVISIONING') {
          setAuthLoading(false)
          navigate(ROUTES.REGISTER, { replace: true, state: { clerkProvision: true } })
          return
        }
        await signOut()
        logout()
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, applySession, logout, navigate, signOut, setAuthLoading, user?.authProvider])

  return children
}
