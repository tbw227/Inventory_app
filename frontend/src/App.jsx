import React, { Suspense, lazy, useEffect } from 'react'
import { clearStaleAppRecoveryState } from './utils/recoverStaleApp'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/shared/ProtectedRoute'
import { ROUTES } from './config/routes'
import { PUBLIC_REGISTRATION_ENABLED } from './config/security'
import { Toaster } from 'react-hot-toast'

const Layout = lazy(() => import('./components/layout/Layout'))
const Login = lazy(() => import('./pages/Login'))
const RedirectToMarketingSignup = lazy(() => import('./components/auth/RedirectToMarketingSignup'))
const Register = lazy(() => import('./pages/Register'))
const AuthHandoff = lazy(() => import('./pages/AuthHandoff'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard.new'))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const JobLabel = lazy(() => import('./pages/JobLabel'))
const JobHistory = lazy(() => import('./pages/JobHistory'))
const Labels = lazy(() => import('./pages/Labels'))
const ScanJob = lazy(() => import('./pages/ScanJob'))
const Supplies = lazy(() => import('./pages/Supplies'))
const PrintLabels = lazy(() => import('./pages/PrintLabels'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Locations = lazy(() => import('./pages/Locations'))
const StationDetail = lazy(() => import('./pages/StationDetail'))
const ScanStation = lazy(() => import('./pages/ScanStation'))
const Financials = lazy(() => import('./pages/Financials'))
const Users = lazy(() => import('./pages/Users'))
const UserDetail = lazy(() => import('./pages/UserDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const WeatherDemo = lazy(() => import('./pages/WeatherDemo'))
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}

function ProtectedLayout({ children, requiredRole }) {
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  useEffect(() => {
    clearStaleAppRecoveryState()
  }, [])

  return (
    <Suspense fallback={<RouteFallback />}>
      <Toaster position="bottom-center" />
      <Routes>
          <Route
            path={ROUTES.REGISTER}
            element={PUBLIC_REGISTRATION_ENABLED ? <Register /> : <RedirectToMarketingSignup />}
          />
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.AUTH_HANDOFF} element={<AuthHandoff />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          <Route path={ROUTES.DASHBOARD} element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path={ROUTES.JOBS} element={<ProtectedLayout><Jobs /></ProtectedLayout>} />
          <Route path="/jobs/:id" element={<ProtectedLayout><JobDetail /></ProtectedLayout>} />
          <Route path="/jobs/:id/label" element={<ProtectedLayout><JobLabel /></ProtectedLayout>} />
          <Route path={ROUTES.LABELS} element={<ProtectedLayout><Labels /></ProtectedLayout>} />
          <Route path={ROUTES.SCAN} element={<ProtectedLayout><ScanJob /></ProtectedLayout>} />
          <Route path={ROUTES.HISTORY} element={<ProtectedLayout><JobHistory /></ProtectedLayout>} />
          <Route path={ROUTES.SUPPLIES} element={<ProtectedLayout><Supplies /></ProtectedLayout>} />
          <Route path={ROUTES.PRINT_LABELS} element={<ProtectedLayout requiredRole="admin"><PrintLabels /></ProtectedLayout>} />
          <Route path={ROUTES.CLIENTS} element={<ProtectedLayout><Clients /></ProtectedLayout>} />
          <Route path="/clients/:id" element={<ProtectedLayout><ClientDetail /></ProtectedLayout>} />
          <Route path={ROUTES.LOCATIONS} element={<ProtectedLayout><Locations /></ProtectedLayout>} />
          <Route path="/locations/:id" element={<ProtectedLayout><StationDetail /></ProtectedLayout>} />
          <Route path={ROUTES.SCAN_STATION} element={<ProtectedLayout><ScanStation /></ProtectedLayout>} />
          <Route path={ROUTES.FINANCIALS} element={<ProtectedLayout><Financials /></ProtectedLayout>} />
          <Route path={ROUTES.USERS} element={<ProtectedLayout requiredRole="admin"><Users /></ProtectedLayout>} />
          <Route path="/users/:id" element={<ProtectedLayout requiredRole="admin"><UserDetail /></ProtectedLayout>} />
          <Route path={ROUTES.PROFILE} element={<ProtectedLayout><Profile /></ProtectedLayout>} />
          <Route path={ROUTES.SETTINGS} element={<ProtectedLayout><Settings /></ProtectedLayout>} />
          <Route path={ROUTES.WEATHER_DEMO} element={<ProtectedLayout><WeatherDemo /></ProtectedLayout>} />
          <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  )
}
