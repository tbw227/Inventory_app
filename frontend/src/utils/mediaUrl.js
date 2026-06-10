/**
 * Resolve API-relative upload paths for fetch / <img> (works with Vite proxy or absolute API URL).
 * Rewrites legacy /api/uploads/* to versioned /api/v1/uploads/* for authenticated file routes.
 */
import { API_VERSION_PREFIX, resolveApiBaseURL } from '../services/api'

export function mediaUrl(path) {
  if (!path) return ''
  let p = String(path).trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  if (p.startsWith('/api/uploads/')) {
    p = `${API_VERSION_PREFIX}/uploads/${p.slice('/api/uploads/'.length)}`
  }
  const rel = p.startsWith('/') ? p : `/${p}`
  const base = resolveApiBaseURL()
  if (/^https?:\/\//i.test(base)) {
    const origin = base.replace(/\/api\/v1\/?$/i, '')
    return `${origin}${rel}`
  }
  return rel
}

/** User-uploaded photos are served only with Authorization — use AuthedImg or fetch+blob. */
export function isProtectedUploadPath(path) {
  if (!path) return false
  const p = String(path).trim()
  return /\/uploads\/photos\//.test(p)
}

/**
 * Allow only relative app paths, http(s), or blob URLs (from URL.createObjectURL).
 * Blocks javascript:, data:, and other schemes that can enable DOM XSS in img src.
 */
export function isSafeImageSrc(url) {
  if (url == null || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('blob:')) {
    return /^blob:[^"'<>]*$/i.test(trimmed)
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return !/[\0-\x1f\x7f]/.test(trimmed)
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
