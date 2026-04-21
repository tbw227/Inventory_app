/**
 * Resolve API-relative upload paths for fetch / <img> (works with Vite proxy or absolute API URL).
 * Rewrites legacy /api/uploads/* to versioned /api/v1/uploads/* for authenticated file routes.
 */
export function mediaUrl(path) {
  if (!path) return ''
  let p = String(path).trim()
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  if (p.startsWith('/api/uploads/')) {
    p = `/api/v1/uploads/${p.slice('/api/uploads/'.length)}`
  }
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const rel = p.startsWith('/') ? p : `/${p}`
  return `${base}${rel}`
}

/** User-uploaded photos are served only with Authorization — use AuthedImg or fetch+blob. */
export function isProtectedUploadPath(path) {
  if (!path) return false
  const p = String(path).trim()
  return /\/uploads\/photos\//.test(p)
}
