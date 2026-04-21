import axios from 'axios'
import { ROUTES } from '../config/routes'

/** Preferred API prefix; legacy unversioned /api/* remains on the server for older clients. */
export const API_VERSION_PREFIX = '/api/v1'

const rawBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const axiosBaseURL = rawBase ? `${rawBase}${API_VERSION_PREFIX}` : API_VERSION_PREFIX

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
    url.includes('/auth/reset-password')
  )
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
  (response) => response,
  (error) => {
    const status = error.response?.status
    const reqUrl = error.config?.url || ''
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
