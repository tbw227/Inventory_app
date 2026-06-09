/**
 * Axios API client — central HTTP layer for all backend calls.
 *
 * Base URL:
 *   - Dev (default): `/api/v1` → Vite proxies `/api` to the backend (run from `frontend/`).
 *   - Production: set `VITE_API_URL` to the API origin only, e.g. `https://api.example.com`
 *     (do not include `/api/v1` unless that is literally your only path prefix).
 *
 * Interceptors:
 *   - Request: attaches Bearer token from localStorage (skipped for login/reset).
 *   - Response: on 401 (except login/reset), clears token and redirects to /login.
 */
import axios from 'axios'
import { ROUTES } from '../config/routes'

/** Preferred API prefix; legacy unversioned /api/* remains on the server for older clients. */
export const API_VERSION_PREFIX = '/api/v1'

/**
 * Build axios baseURL from VITE_API_URL without duplicating `/api/v1`.
 * @returns {string}
 */
/** Vercel build sets this when /api is proxied to VITE_API_URL (see scripts/vercel-build-setup.mjs). */
function useSameOriginApiOnVercel() {
  return import.meta.env.VITE_USE_SAME_ORIGIN_API === 'true'
}

export function resolveApiBaseURL() {
  if (useSameOriginApiOnVercel()) return API_VERSION_PREFIX

  const raw = (import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/^VITE_API_URL=/i, '')
    .replace(/\/$/, '')
  if (!raw) return API_VERSION_PREFIX
  if (/\/api\/v1$/i.test(raw)) return raw
  if (/\/api$/i.test(raw)) return `${raw}/v1`
  return `${raw}${API_VERSION_PREFIX}`
}

/** For diagnostics (login page, support). */
export function getApiDeploymentInfo() {
  const baseURL = resolveApiBaseURL()
  const configuredOrigin = (import.meta.env.VITE_API_URL || '').trim().replace(/^VITE_API_URL=/i, '')
  return {
    baseURL,
    configuredOrigin,
    sameOriginProxy: useSameOriginApiOnVercel(),
    misconfigured: isApiMisconfiguredInProduction(),
  }
}

const axiosBaseURL = resolveApiBaseURL()

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info('[api] baseURL →', axiosBaseURL || '(same origin)')
}

const api = axios.create({
  baseURL: axiosBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

/** Paths where 401 is expected (wrong password, etc.) — must not trigger global logout. */
function isAnonymousAuthRequest(url) {
  if (!url) return false
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/register')
  )
}

/** True when a production build has no backend origin (requests hit the static host → 404). */
export function isApiMisconfiguredInProduction() {
  return import.meta.env.PROD && !(import.meta.env.VITE_API_URL || '').trim()
}

/** Human-readable message from axios error (validation details, network, etc.). */
export function getApiErrorMessage(err, fallback = 'Request failed') {
  if (!err) return fallback
  const data = err.response?.data
  if (data?.details && Array.isArray(data.details)) {
    const parts = data.details.map((d) => d.message || d.field).filter(Boolean)
    if (parts.length) return parts.join('; ')
  }
  if (typeof data?.error === 'string' && data.error.trim()) return data.error
  if (data?.error && typeof data.error === 'object') {
    const nested = data.error.message || data.error.error
    if (typeof nested === 'string' && nested.trim()) return nested
  }
  if (typeof data?.message === 'string' && data.message.trim()) return data.message
  if (err.response?.status === 404 && isApiMisconfiguredInProduction()) {
    return (
      'API not found on this site. Set VITE_API_URL in Vercel to your backend URL ' +
      '(e.g. https://your-api.example.com), redeploy the frontend, and ensure the API is running.'
    )
  }
  if (err.code === 'ERR_NETWORK') {
    if (isApiMisconfiguredInProduction()) {
      return (
        'Cannot reach the API. Set VITE_API_URL in Vercel to your deployed backend origin and redeploy.'
      )
    }
    return 'Cannot reach the API. Start the backend (port 5000) and use npm run dev:frontend from the repo root.'
  }
  if (err.message) return err.message
  return fallback
}

function looksLikeHtmlPayload(data) {
  return typeof data === 'string' && /^\s*</.test(data)
}

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  const path = config.url || ''
  if (isAnonymousAuthRequest(path)) {
    return config
  }
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV && looksLikeHtmlPayload(response.data)) {
      // eslint-disable-next-line no-console
      console.error(
        '[api] Got HTML instead of JSON for',
        response.config?.url,
        '— run the backend and use the frontend dev server (npm run dev:frontend), not root vite without proxy.'
      )
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const reqUrl = error.config?.url || ''
    if (import.meta.env.DEV && looksLikeHtmlPayload(error.response?.data)) {
      // eslint-disable-next-line no-console
      console.error('[api] Non-JSON error body (often means API proxy is misconfigured):', reqUrl)
    }
    if (status === 401 && !isAnonymousAuthRequest(reqUrl)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== ROUTES.LOGIN) {
        window.location.href = ROUTES.LOGIN
      }
    }
    return Promise.reject(error)
  }
)

export default api
