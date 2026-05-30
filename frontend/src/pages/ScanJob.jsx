import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QrScanner from '../components/ui/QrScanner'
import toast from 'react-hot-toast'
import FullScreenModal from '../components/tech/FullScreenModal'
import { ROUTES } from '../config/routes'
import api from '../services/api'
import { getJobLocations } from '../utils/jobLocations'

const STATUS_STYLES = {
  pending: 'border-yellow-300/30 bg-yellow-400/15 text-yellow-100',
  'in-progress': 'border-blue-300/30 bg-blue-400/15 text-blue-100',
  completed: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100',
}

function isUuidLike(value) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    String(value || '').trim(),
  )
}

function isHex24(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || '').trim())
}

function parseScanValue(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  if (raw.startsWith('job_')) return { kind: 'job', value: raw.slice(4).trim() }
  if (raw.startsWith('STNID:')) return { kind: 'station-id', value: raw.slice(6).trim() }
  if (raw.startsWith('STN:')) return { kind: 'station-code', value: raw.slice(4).trim() }
  if (raw.startsWith('RSK:')) return parseRestockQr(raw.slice(4).trim(), raw)
  if (looksLikeLegacyRestockQr(raw)) return parseRestockQr(raw, raw)
  if (isUuidLike(raw) || isHex24(raw)) return { kind: 'job', value: raw }

  return { kind: 'station-code', value: raw }
}

function looksLikeLegacyRestockQr(raw) {
  return raw.includes('|') && raw.includes(':')
}

function parseRestockQr(payload, originalValue) {
  const parts = String(payload || '').split('|')
  const first = parts[0] || ''
  if (parts.length >= 3 && first.startsWith('L')) {
    return {
      kind: 'restock',
      value: originalValue,
      locationId: first.slice(1).trim(),
      itemCount: countRestockItems(parts[1]),
    }
  }
  return {
    kind: 'restock',
    value: originalValue,
    locationId: '',
    itemCount: countRestockItems(first),
  }
}

function countRestockItems(itemsPart) {
  return String(itemsPart || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length
}

function formatServiceDate(value) {
  if (!value) return 'No date set'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'No date set'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getSupplyQty(item) {
  const qty = Number(item?.quantity)
  return Number.isFinite(qty) ? qty : 0
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

function ScanSnippet({ job, station, pendingLabel, busy, error }) {
  const stations = useMemo(() => getJobLocations(job), [job])
  const planned = Array.isArray(job?.planned_supplies) ? job.planned_supplies : []
  const plannedTotal = planned.reduce((sum, item) => sum + getSupplyQty(item), 0)
  const inventory = useMemo(() => getInventoryRows(station), [station])
  const stationTotalQty = inventory.reduce((sum, item) => sum + getItemQuantity(item), 0)
  const fireExtinguishers = inventory.filter((item) => isFireExtinguisher(item)).length

  if (busy) {
    return (
      <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Loading label</p>
        <p className="mt-1 break-all text-sm text-white">{pendingLabel}</p>
      </div>
    )
  }

  if (job) {
    const status = job.status || 'pending'
    const statusClass = STATUS_STYLES[status] || 'border-white/10 bg-white/10 text-slate-100'
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 shadow-lg shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Job found</p>
            <h2 className="mt-1 break-words text-lg font-semibold leading-tight text-white">
              {job.description || 'No description'}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {job.client_id?.name || 'Unknown client'}
              {job.client_id?.location ? ` - ${job.client_id.location}` : ''}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>
            {status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-sm font-semibold text-white">{formatServiceDate(job.scheduled_date)}</p>
            <p className="text-[11px] text-slate-400">Service</p>
          </div>
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-base font-semibold tabular-nums text-white">{stations.length}</p>
            <p className="text-[11px] text-slate-400">Stations</p>
          </div>
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-base font-semibold tabular-nums text-white">{plannedTotal}</p>
            <p className="text-[11px] text-slate-400">Supplies</p>
          </div>
        </div>
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
            <p className="text-base font-semibold tabular-nums text-white">{stationTotalQty}</p>
            <p className="text-[11px] text-slate-400">Units</p>
          </div>
          <div className="rounded-lg bg-black/20 px-2 py-2">
            <p className="text-base font-semibold tabular-nums text-white">{fireExtinguishers}</p>
            <p className="text-[11px] text-slate-400">FE</p>
          </div>
        </div>

        {inventory.slice(0, 2).map((item, index) => (
          <div key={`${getItemName(item)}-${index}`} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
            <span className="min-w-0 truncate text-sm text-slate-200">{getItemName(item)}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-white">Qty {getItemQuantity(item)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Ready to scan</p>
      <p className="mt-1 text-sm leading-6 text-slate-200">
        Scan a job label or station label. Details will appear here before you open it.
      </p>
      {error ? (
        <div className="mt-3 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </div>
  )
}

export default function ScanJob() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [scanBusy, setScanBusy] = useState(false)
  const [pendingLabel, setPendingLabel] = useState('')
  const [job, setJob] = useState(null)
  const [station, setStation] = useState(null)
  const [error, setError] = useState(null)
  const lastScanRef = useRef({ value: '', at: 0 })

  const hasResult = Boolean(job || station)

  const closeScanner = useCallback(() => {
    setError(null)
    setPendingLabel('')
    setScanBusy(false)
    setOpen(false)
    navigate(ROUTES.JOBS)
  }, [navigate])

  const resetScan = useCallback(() => {
    setError(null)
    setPendingLabel('')
    setJob(null)
    setStation(null)
    setScanBusy(false)
    lastScanRef.current = { value: '', at: 0 }
  }, [])

  const handleResult = useCallback(
    async (text) => {
      if (scanBusy || hasResult) return

      const raw = String(text || '').trim()
      const parsed = parseScanValue(raw)
      if (!parsed?.value || (parsed.kind !== 'restock' && parsed.value.length > 140)) {
        setError('Unrecognized QR label. Try scanning a job or station label again.')
        return
      }
      if (parsed.kind === 'restock' && !parsed.locationId) {
        setError('This restock QR does not include a station. Scan it from a job supply scanner, or print a Station QR label.')
        return
      }

      const now = Date.now()
      if (lastScanRef.current.value === raw && now - lastScanRef.current.at < 1500) return
      lastScanRef.current = { value: raw, at: now }

      setError(null)
      setPendingLabel(parsed.value)
      setScanBusy(true)

      try {
        if (parsed.kind === 'job') {
          const res = await api.get(`/jobs/${encodeURIComponent(parsed.value)}`)
          setJob(res.data)
          toast.success('Job scanned')
        } else if (parsed.kind === 'restock') {
          const res = await api.get(`/locations/${encodeURIComponent(parsed.locationId)}`)
          setStation(res.data)
          toast.success('Restock label scanned')
        } else {
          const url =
            parsed.kind === 'station-id'
              ? `/locations/${encodeURIComponent(parsed.value)}`
              : `/locations/by-code/${encodeURIComponent(parsed.value)}`
          const res = await api.get(url)
          setStation(res.data)
          toast.success('Station scanned')
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          setError(`No matching ${parsed.kind === 'job' ? 'job' : 'station'} found for "${parsed.kind === 'restock' ? parsed.locationId : parsed.value}".`)
        } else {
          setError(err?.response?.data?.error || err?.response?.data?.message || 'Unable to load that label.')
        }
      } finally {
        setScanBusy(false)
      }
    },
    [hasResult, scanBusy],
  )

  return (
    <FullScreenModal open={open} title="Scan QR Label" onClose={closeScanner}>
      <div className="flex h-full flex-col overflow-hidden bg-slate-950">
        <section className="relative min-h-0 flex-1 overflow-hidden bg-black">
          {scanBusy ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white">
              <div className="px-4 text-center">
                <div className="text-sm font-semibold">Loading label...</div>
                {pendingLabel ? <div className="mt-1 break-all text-xs text-slate-300">{pendingLabel}</div> : null}
              </div>
            </div>
          ) : null}

          <QrScanner
            constraints={{ facingMode: 'environment' }}
            scanDelay={250}
            paused={scanBusy || hasResult}
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
              {!hasResult ? (
                <div className="absolute left-5 right-5 top-1/2 h-px bg-blue-300/80 shadow-[0_0_18px_rgba(147,197,253,0.95)]" />
              ) : null}
            </div>
          </div>
          <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur">
            {hasResult ? 'Label captured' : 'Hold steady on the QR label'}
          </div>
        </section>

        <section className="shrink-0 space-y-3 border-t border-white/10 bg-slate-950 px-4 py-4 shadow-[0_-16px_40px_rgba(0,0,0,0.32)]">
          <ScanSnippet job={job} station={station} pendingLabel={pendingLabel} busy={scanBusy} error={error} />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={closeScanner}
              className="h-12 rounded-xl border border-white/10 bg-slate-800 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Close
            </button>
            {hasResult ? (
              <button
                type="button"
                onClick={() => navigate(job ? `/jobs/${job._id}` : `/locations/${station._id}`)}
                className="h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                {job ? 'Open job' : 'Open station'}
              </button>
            ) : (
              <button
                type="button"
                onClick={resetScan}
                disabled={scanBusy}
                className="h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                Scan again
              </button>
            )}
          </div>

          {hasResult ? (
            <button
              type="button"
              onClick={resetScan}
              className="w-full rounded-lg py-1.5 text-sm font-medium text-slate-300 hover:text-white"
            >
              Scan another label
            </button>
          ) : null}
        </section>
      </div>
    </FullScreenModal>
  )
}
