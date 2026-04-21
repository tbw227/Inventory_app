import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setTimeout(() => setCooldownSeconds(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldownSeconds])

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()
    if (cooldownSeconds > 0) return
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setMessage(res.data?.message || 'If that email exists, a reset link has been sent.')
      setSent(true)
      setCooldownSeconds(60)
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to process request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Forgot password</h1>

        {!sent ? (
          <>
            <p className="text-sm text-gray-500 mb-5">Enter your email and we will send a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {message}
            </div>
            <p className="text-sm text-gray-600">
              Check your inbox for the reset link. If you do not see it, check spam/junk.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="mailto:"
                className="text-center text-sm bg-white border border-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-50"
              >
                Open Mail App
              </a>
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm bg-white border border-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-50"
              >
                Open Gmail
              </a>
              <a
                href="https://outlook.live.com/mail/"
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm bg-white border border-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-50"
              >
                Open Outlook
              </a>
              <a
                href="https://mail.yahoo.com"
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm bg-white border border-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-50"
              >
                Open Yahoo
              </a>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || cooldownSeconds > 0}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? 'Sending...' : cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend email'}
            </button>
          </div>
        )}

        <Link to="/login" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
