import React from 'react'

function isStaleChunkError(error) {
  const msg = String(error?.message || error || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('MIME type')
  )
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('React error boundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const staleDeploy = isStaleChunkError(this.state.error)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {staleDeploy ? 'App update available' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {staleDeploy
                ? 'Your browser has an older copy of the app. Reload once to pick up the latest version.'
                : 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                if (staleDeploy) {
                  sessionStorage.removeItem('fieldops:chunk-reload')
                  window.location.reload()
                  return
                }
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {staleDeploy ? 'Reload app' : 'Return Home'}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
