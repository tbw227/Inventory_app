import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ClerkAuthBridge from './components/auth/ClerkAuthBridge'
import App from './App'
import './styles/index.css'
import { installStaleDeployRecovery } from './utils/recoverStaleApp'
import { isClerkEnabled, getClerkPublishableKey } from './config/clerk'
import { getSignInPath, getSignUpPath } from './config/authPortal'
import { ROUTES } from './config/routes'

installStaleDeployRecovery()

function AppTree() {
  const app = <App />
  if (!isClerkEnabled()) return app
  return (
    <ClerkProvider
      publishableKey={getClerkPublishableKey()}
      signInUrl={getSignInPath()}
      signUpUrl={getSignUpPath()}
      afterSignOutUrl={getSignInPath()}
      afterSignInUrl={ROUTES.DASHBOARD}
      afterSignUpUrl={ROUTES.DASHBOARD}
    >
      <ClerkAuthBridge>{app}</ClerkAuthBridge>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <AppTree />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
