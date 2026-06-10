/**
 * AuthContext — global authentication state for the SPA.
 *
 * Auth modes:
 *   - Clerk (when VITE_CLERK_PUBLISHABLE_KEY is set) — Bearer from @clerk/clerk-react
 *   - Legacy JWT (local dev) — email/password → localStorage token
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { isAbortError } from '../utils/isAbortError'
import { isClerkEnabled } from '../config/clerk'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isClerkEnabled()) {
      return undefined
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await api.get('/auth/me', { signal: controller.signal })
        setUser({ ...res.data, authProvider: 'legacy' })
        localStorage.setItem('user', JSON.stringify({ ...res.data, authProvider: 'legacy' }))
      } catch (e) {
        if (isAbortError(e)) return
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  const applySession = useCallback((userData, { provider = 'legacy' } = {}) => {
    const next = { ...userData, authProvider: provider }
    setUser(next)
    localStorage.setItem('user', JSON.stringify(next))
    if (provider !== 'clerk') {
      return
    }
    localStorage.removeItem('token')
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: userData } = res.data
    localStorage.setItem('token', token)
    applySession(userData, { provider: 'legacy' })
    return userData
  }, [applySession])

  const logout = useCallback(
    ({ clerkSignOut } = {}) => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      if (clerkSignOut) void clerkSignOut()
    },
    []
  )

  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me')
    const provider = user?.authProvider || (isClerkEnabled() ? 'clerk' : 'legacy')
    applySession(res.data, { provider })
  }, [applySession, user?.authProvider])

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    applySession,
    setAuthLoading: setLoading,
    isAdmin: user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
