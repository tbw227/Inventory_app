/**
 * Central route path constants used by React Router, Link components,
 * and ProtectedRoute guards. Keep in sync with App.jsx <Route> definitions.
 */
export const ROUTES = {
  REGISTER: '/register',
  LOGIN: '/login',
  AUTH_HANDOFF: '/auth/handoff',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  JOBS: '/jobs',
  JOB_DETAIL: '/jobs/:id',
  JOB_LABEL: '/jobs/:id/label',
  LABELS: '/labels',
  SCAN: '/scan',
  HISTORY: '/history',
  SUPPLIES: '/supplies',
  PRINT_LABELS: '/print-labels',
  CLIENTS: '/clients',
  LOCATIONS: '/locations',
  SCAN_STATION: '/scan-station',
  USERS: '/users',
  FINANCIALS: '/financials',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  WEATHER_DEMO: '/weather-demo',
}
