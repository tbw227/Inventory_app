import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './styles/index.css'

const CHUNK_RELOAD_KEY = 'fieldops:chunk-reload'

function isStaleChunkError(error) {
  const msg = String(error?.message || error || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('MIME type')
  )
}

function reloadAfterDeploy() {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  window.location.reload()
  return true
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadAfterDeploy()
})

window.addEventListener('unhandledrejection', (event) => {
  if (!isStaleChunkError(event.reason)) return
  event.preventDefault()
  reloadAfterDeploy()
})

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
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
