/** True when VITE_MARKETING_URL points at a real deployed marketing site (not local default). */
export function isMarketingSiteConfigured() {
  const raw = (import.meta.env.VITE_MARKETING_URL || '').trim()
  if (!raw) return false
  return !/localhost|127\.0\.0\.1/i.test(raw)
}
