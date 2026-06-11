import React, { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, {
  getApiDeploymentInfo,
  getApiErrorMessage,
} from '../services/api'
import { ROUTES } from '../config/routes'
import { safeRedirect } from '../utils/safeRedirect'
import { MARKETING_SITE_URL } from '../config/marketing'
import { getSignupHref, isMarketingSiteConfigured, useInAppSignupLink } from '../config/signup'
import BrandLogo from '../components/ui/BrandLogo'
import { PRODUCT_NAME } from '../config/brand'
import { isClerkEnabled } from '../config/clerk'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const clerkAuth = isClerkEnabled()
  const apiInfo = getApiDeploymentInfo()
  const signupHref = getSignupHref()
  const inAppSignup = useInAppSignupLink()

  if (user) {
    return <Navigate to={safeRedirect(location.state?.from?.pathname, ROUTES.DASHBOARD)} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(safeRedirect(location.state?.from?.pathname, ROUTES.DASHBOARD), { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed. Please check your credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (clerkAuth) {
    return <Navigate to={ROUTES.SIGN_IN} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" showName nameClassName="text-blue-600" />
          <p className="mt-3 text-sm text-gray-500">Sign in to {PRODUCT_NAME}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          {import.meta.env.PROD && (
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                apiInfo.misconfigured
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <p className="font-medium text-slate-800">API connection</p>
              <p className="mt-1 break-all">
                Requests go to: <code className="rounded bg-white px-1">{apiInfo.baseURL}/auth/login</code>
              </p>
              {apiInfo.configuredOrigin && (
                <p className="mt-1 break-all">
                  VITE_API_URL: <code className="rounded bg-white px-1">{apiInfo.configuredOrigin}</code>
                  {apiInfo.sameOriginProxy ? ' (proxied on Vercel)' : ' (direct cross-origin)'}
                </p>
              )}
              {apiInfo.misconfigured && (
                <p className="mt-1">
                  Set <code className="rounded bg-white px-1">VITE_API_URL</code> to your{' '}
                  <strong>Express API host</strong> (not this Vercel URL, not Supabase), then redeploy.
                </p>
              )}
            </div>
          )}
          {import.meta.env.DEV && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <p className="font-medium text-slate-700 dark:text-slate-200">Local dev</p>
              <p className="mt-1">
                After <code className="rounded bg-white px-1 dark:bg-slate-900">npm run seed</code> in{' '}
                <code className="rounded bg-white px-1 dark:bg-slate-900">backend/</code>, use seed users (same DB as{' '}
                <code className="rounded bg-white px-1 dark:bg-slate-900">DATABASE_URL</code> in backend{' '}
                <code className="rounded bg-white px-1 dark:bg-slate-900">.env</code>):
              </p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li>
                  <code>alice@example.com</code> / <code>Admin123!</code> (admin)
                </li>
                <li>
                  <code>bob@example.com</code> / <code>Tech123!</code> (technician)
                </li>
              </ul>
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
            <div className="mt-1 text-right">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-800">
                Forgot password?
              </Link>
            </div>
          </div>
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
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            {inAppSignup ? (
              <Link to={signupHref} className="text-blue-600 hover:text-blue-800 font-medium">
                Create your company
              </Link>
            ) : (
              <a href={signupHref} className="text-blue-600 hover:text-blue-800 font-medium">
                Create your company
              </a>
            )}
          </p>
          {isMarketingSiteConfigured() && MARKETING_SITE_URL && (
            <p className="text-center text-xs text-gray-500 pt-1">
              <a href={MARKETING_SITE_URL} className="text-blue-600 hover:underline font-medium">
                ← Back to website
              </a>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
