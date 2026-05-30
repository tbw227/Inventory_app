/** SaaS product branding — not tenant/client names (those come from company.name after login). */
export const PRODUCT_NAME = (import.meta.env.VITE_PRODUCT_NAME || 'FieldOps').trim()

export const LOGO_URL = (import.meta.env.VITE_LOGO_URL || '').trim()

export function productInitials(name = PRODUCT_NAME) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
