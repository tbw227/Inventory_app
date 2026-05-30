import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import api from '../services/api'

/**
 * Accepts JWT from marketing site via URL hash (#token=...) and opens the app logged in.
 */
export default function AuthHandoff() {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(hash)
    const token = params.get('token')

    if (!token) {
      setError('Missing sign-in token. Use the marketing site or app login.')
      setStatus('error')
      return
    }

    localStorage.setItem('token', token)
    window.history.replaceState(null, '', window.location.pathname)

    ;(async () => {
      try {
        const res = await api.get('/auth/me')
        localStorage.setItem('user', JSON.stringify(res.data))
        window.location.replace(ROUTES.DASHBOARD)
        return
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setError('Session could not be started. Please sign in again.')
        setStatus('error')
      }
    })()
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-slate-600">Opening your workspace…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 max-w-sm text-center">
          {error}
        </p>
        <Link to={ROUTES.LOGIN} className="mt-4 text-sm font-medium text-blue-600 hover:underline">
          Go to login
        </Link>
      </div>
    )
  }

  return null
}
