import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Read PORT from backend/.env so the dev proxy matches where `npm run dev` in backend listens. */
function readBackendApiOrigin() {
  const envPath = path.resolve(__dirname, '../backend/.env')
  try {
    const raw = fs.readFileSync(envPath, 'utf8')
    let port = '5000'
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*PORT\s*=\s*(\d+)\s*$/)
      if (m) port = m[1]
    }
    return `http://127.0.0.1:${port}`
  } catch {
    return null
  }
}

/**
 * Keep chunking explicit and easy to maintain:
 * - vendor-react: framework/runtime (rarely changes)
 * - vendor-charts: dashboard charting library
 * - vendor-scan: scanner + barcode tools
 * - vendor-integrations: Stripe/Supabase SDKs
 * Leave everything else to Vite defaults to avoid over-splitting/circular chunking.
 */
function manualChunks(id) {
  const normalizedId = id.replace(/\\/g, '/')
  if (!normalizedId.includes('/node_modules/')) return undefined

  if (
    normalizedId.includes('/react/') ||
    normalizedId.includes('/react-dom/') ||
    normalizedId.includes('/react-router-dom/')
  ) {
    return 'vendor-react'
  }
  if (normalizedId.includes('/recharts/')) return 'vendor-charts'
  if (normalizedId.includes('/@zxing/browser/') || normalizedId.includes('/jsbarcode/')) {
    return 'vendor-scan'
  }
  if (
    normalizedId.includes('/@stripe/react-stripe-js/') ||
    normalizedId.includes('/@stripe/stripe-js/') ||
    normalizedId.includes('/@supabase/supabase-js/')
  ) {
    return 'vendor-integrations'
  }
  return undefined
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target =
    env.VITE_DEV_API_ORIGIN ||
    readBackendApiOrigin() ||
    'http://127.0.0.1:5000'

  const apiProxy = {
    target,
    changeOrigin: true,
    secure: false,
    configure(proxy) {
      proxy.on('error', (err, _req, res) => {
        const hint =
          'Backend API is not running. From the repo root run: npm run dev (starts API + Vite), or in another terminal: npm run dev --prefix backend'
        console.error(`[vite proxy] ${err.code || err.message} → ${target}`)
        console.error(`[vite proxy] ${hint}`)
        if (res && !res.headersSent && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: hint }))
        }
      })
    },
  }

  return {
    plugins: [
      react(),
      // Generate precompressed assets; supported hosts can serve these directly.
      viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1536, verbose: false }),
      viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1536, verbose: false }),
      // Make the app installable + enable a service worker for offline capability.
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    server: {
      port: Number(env.VITE_DEV_PORT || 5174),
      proxy: { '/api': apiProxy },
    },
    preview: {
      proxy: { '/api': apiProxy },
    },
  }
})
