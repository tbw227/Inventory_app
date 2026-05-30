/** Public marketing site (separate repo: ../platform-marketing). Signup is only on this site. */
export const MARKETING_SITE_URL = (import.meta.env.VITE_MARKETING_URL || 'http://localhost:5175').replace(
  /\/$/,
  ''
)

export const MARKETING_SIGNUP_URL = `${MARKETING_SITE_URL}/signup`
