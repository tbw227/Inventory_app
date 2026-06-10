const CHUNK_RELOAD_KEY = 'fieldops:chunk-reload'
const MAX_AUTO_RELOADS = 2

export function isStaleChunkError(error) {
  const msg = String(error?.message || error || '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('MIME type') ||
    msg.includes('404')
  )
}

export function clearStaleAppRecoveryState() {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
}

async function unregisterServiceWorkers() {
  if (!navigator.serviceWorker?.getRegistrations) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* ignore */
  }
}

/**
 * Recover from a cached shell pointing at deleted Vercel asset hashes.
 * Unregisters the PWA service worker and cache-busts the URL.
 * @param {{ force?: boolean }} [options] force=true ignores the auto-reload cap (user clicked Reload)
 */
export async function recoverFromStaleDeploy({ force = false } = {}) {
  if (force) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } else {
    const count = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (count >= MAX_AUTO_RELOADS) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(count + 1))
  }
  await unregisterServiceWorkers()

  const url = new URL(window.location.href)
  url.searchParams.set('_cb', String(Date.now()))
  window.location.replace(url.toString())
  return true
}

export function installStaleDeployRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    recoverFromStaleDeploy()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isStaleChunkError(event.reason)) return
    event.preventDefault()
    recoverFromStaleDeploy()
  })
}
