import React, { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../config/routes'
import api, { getApiErrorMessage } from '../services/api'
import BrandLogo from '../components/ui/BrandLogo'
import { PRODUCT_NAME } from '../config/brand'
import { isClerkEnabled } from '../config/clerk'
import ClerkSignUpPanel from '../components/auth/ClerkSignUpPanel'

export default function Register() {
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { user, applySession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const clerkProvision = isClerkEnabled() && location.state?.clerkProvision === true

  if (user) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  async function handleClerkProvision(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.post('/auth/clerk/provision', { companyName, name: name || undefined })
      applySession(res.data.user, { provider: 'clerk' })
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create your company. Sign in with Clerk first.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (clerkProvision) {
      return handleClerkProvision(e)
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/auth/register', { companyName, name, email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      window.location.href = ROUTES.DASHBOARD
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (isClerkEnabled() && !clerkProvision) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 flex flex-col items-center">
            <BrandLogo size="lg" showName nameClassName="text-blue-600" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Create your company</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign up with Clerk, then we&apos;ll ask for your company name
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <ClerkSignUpPanel />
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" showName nameClassName="text-blue-600" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Create your company</h1>
          <p className="mt-1 text-sm text-gray-500">
            {clerkProvision
              ? 'Finish setup — link your Clerk account to a new company workspace'
              : `Join ${PRODUCT_NAME} — set up your business in under a minute`}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme First Aid Services"
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Jane Smith"
            />
          </div>
          {!clerkProvision && (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Re-enter your password"
                />
              </div>
            </>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="text-blue-600 hover:text-blue-800 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
