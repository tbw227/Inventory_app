import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QrScanner from '../components/ui/QrScanner'
import toast from 'react-hot-toast'
import FullScreenModal from '../components/tech/FullScreenModal'
import api from '../services/api'

function isUuidLike(value) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    String(value || '').trim(),
  )
}

function parseStationQr(text) {
  const raw = String(text || '').trim()
  if (!raw) return { mode: 'code', value: '' }

  if (raw.startsWith('STNID:')) {
    return { mode: 'id', value: raw.slice(6).trim() }
  }

  if (raw.startsWith('STN:')) {
    return { mode: 'code', value: raw.slice(4).trim() }
  }

  return isUuidLike(raw)
    ? { mode: 'id', value: raw }
    : { mode: 'code', value: raw }
}

function getInventoryRows(station) {
  return Array.isArray(station?.station_inventory) ? station.station_inventory : []
}

function getItemName(item) {
  return item?.item_name || item?.name || 'Unnamed item'
}

function getItemQuantity(item) {
  const qty = Number(item?.quantity)
  return Number.isFinite(qty) ? qty : 0
}

function isFireExtinguisher(item) {
  return Boolean(item?.is_fire_extinguisher || item?.fire_extinguisher)
}

function StationSnippet({ station, scannedCode, busy, error }) {
  const inventory = useMemo(() => getInventoryRows(station), [station])
  const totalQty = useMemo(
    () => inventory.reduce((sum, item) => sum + getItemQuantity(item), 0),
    [inventory],
  )
  const fireExtinguishers = useMemo(
    () => inventory.filter((item) => isFireExtinguisher(item)).length,
    [inventory],
  )
  const previewItems = inventory.slice(0, 3)

  if (busy) {
    return (
      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Looking up station</p>
        <p className="mt-1 break-all text-sm text-white">{scannedCode}</p>
      </div>
    )
  }

  if (station) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 shadow-lg shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Station found</p>
            <h2 className="mt-1 break-words text-lg font-semibold leading-tight text-white">{station.name}</h2>
            <p className="mt-1 text-sm text-slate-300">
              {station.client_id?.name || 'No client attached'}
              {station.address ? ` - ${station.address}` : ''}
            </p>
          </div>
          {station.location_code ? (
            <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-semibold text-slate-200">
              {station.location_code}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-base font-semibold tabular-nums text-white">{inventory.length}</p>
            <p className="text-[11px] text-slate-400">Lines</p>
          </div>
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-base font-semibold tabular-nums text-white">{totalQty}</p>
            <p className="text-[11px] text-slate-400">Units</p>
          </div>
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-base font-semibold tabular-nums text-white">{fireExtinguishers}</p>
            <p className="text-[11px] text-slate-400">FE</p>
          </div>
        </div>

        {previewItems.length ? (
          <div className="mt-4 space-y-2">
            {previewItems.map((item, index) => (
              <div
                key={`${getItemName(item)}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-slate-200">{getItemName(item)}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  Qty {getItemQuantity(item)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-black/20 px-3 py-2 text-sm text-slate-300">
            No station inventory has been added yet.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Ready to scan</p>
      <p className="mt-1 text-sm leading-6 text-slate-200">
        Point the camera at a station label. The station details will appear here before you open it.
      </p>
      {error ? (
        <div className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export default function ScanStation() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [station, setStation] = useState(null)
  const [scannedCode, setScannedCode] = useState('')
  const lastScanRef = useRef({ value: '', at: 0 })

  const closeScanner = useCallback(() => {
    setOpen(false)
    navigate('/locations')
  }, [navigate])

  const resetScan = useCallback(() => {
    setStation(null)
    setScannedCode('')
    setError(null)
    setBusy(false)
    lastScanRef.current = { value: '', at: 0 }
  }, [])

  const handleResult = useCallback(
    async (text) => {
      if (busy || station) return

      const raw = String(text || '').trim()
      const stationRef = parseStationQr(raw)
      if (!stationRef.value) return

      const now = Date.now()
      if (lastScanRef.current.value === raw && now - lastScanRef.current.at < 1500) return
      lastScanRef.current = { value: raw, at: now }

      if (stationRef.value.length > 120) {
        setError('Unrecognized station label. Try again.')
        return
      }

      setError(null)
      setScannedCode(stationRef.value)
      setBusy(true)

      try {
        const url =
          stationRef.mode === 'id'
            ? `/locations/${encodeURIComponent(stationRef.value)}`
            : `/locations/by-code/${encodeURIComponent(stationRef.value)}`
        const res = await api.get(url)
        const loc = res.data
        toast.success(`Found: ${loc.name}`)
        setStation(loc)
        setBusy(false)
      } catch (err) {
        setBusy(false)
        if (err.response?.status === 404) {
          setError(`No station found for "${stationRef.value}". Check the label.`)
        } else {
          setError(err.response?.data?.message || 'Lookup failed. Try again.')
        }
      }
    },
    [busy, station],
  )

  return (
    <FullScreenModal open={open} title="Scan Station Label" onClose={closeScanner}>
      <div className="flex h-full flex-col overflow-hidden bg-slate-950">
        <section className="relative min-h-0 flex-1 overflow-hidden bg-black">
          {busy ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white">
              <div className="text-sm font-semibold">Looking up station...</div>
            </div>
          ) : null}

          <QrScanner
            constraints={{ facingMode: 'environment' }}
            scanDelay={250}
            paused={busy || Boolean(station)}
            onResult={handleResult}
            containerStyle={{ width: '100%', height: '100%' }}
            videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_34%,rgba(2,6,23,0.38)_52%,rgba(2,6,23,0.76)_100%)]" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative aspect-square w-full max-w-[18rem]">
              <div className="absolute left-0 top-0 h-14 w-14 rounded-tl-3xl border-l-4 border-t-4 border-white/90" />
              <div className="absolute right-0 top-0 h-14 w-14 rounded-tr-3xl border-r-4 border-t-4 border-white/90" />
              <div className="absolute bottom-0 left-0 h-14 w-14 rounded-bl-3xl border-b-4 border-l-4 border-white/90" />
              <div className="absolute bottom-0 right-0 h-14 w-14 rounded-br-3xl border-b-4 border-r-4 border-white/90" />
              {!station ? (
                <div className="absolute left-5 right-5 top-1/2 h-px bg-emerald-300/80 shadow-[0_0_18px_rgba(110,231,183,0.95)]" />
              ) : null}
            </div>
          </div>
          <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur">
            {station ? 'Station captured' : 'Hold steady on the station QR code'}
          </div>
        </section>

        <section className="shrink-0 space-y-3 border-t border-white/10 bg-slate-950 px-4 py-4 shadow-[0_-16px_40px_rgba(0,0,0,0.32)]">
          <StationSnippet station={station} scannedCode={scannedCode} busy={busy} error={error} />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeScanner}
              className="h-12 rounded-xl border border-white/10 bg-slate-800 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Close
            </button>
            {station ? (
              <button
                type="button"
                onClick={() => navigate(`/locations/${station._id}`)}
                className="h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Open station
              </button>
            ) : (
              <button
                type="button"
                onClick={resetScan}
                disabled={busy}
                className="h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Scan again
              </button>
            )}
          </div>

          {station ? (
            <button
              type="button"
              onClick={resetScan}
              className="w-full rounded-lg py-1.5 text-sm font-medium text-slate-300 hover:text-white"
            >
              Scan another station
            </button>
          ) : null}
        </section>
      </div>
    </FullScreenModal>
  )
}
