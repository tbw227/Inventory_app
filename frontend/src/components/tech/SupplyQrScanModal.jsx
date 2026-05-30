import React, { useCallback, useMemo, useState } from 'react'
import QrScanner from '../ui/QrScanner'
import FullScreenModal from './FullScreenModal'
import api from '../../services/api'
import toast from 'react-hot-toast'

function parseSupplyQrValue(text) {
  let raw = String(text || '').trim()
  if (!raw) return null

  if (raw.startsWith('RSK:')) raw = raw.slice(4).trim()

  if (raw.startsWith('job_')) return { kind: 'job', jobId: raw.slice(4) }

  if (raw.startsWith('STN:')) return { kind: 'station', code: raw.slice(4) }
  if (raw.startsWith('STNID:')) return { kind: 'station_id', id: raw.slice(6) }

  const parts = raw.split('|')
  let itemsPart = null
  let locationId = null

  if (parts.length >= 3 && parts[0].startsWith('L')) {
    locationId = parts[0].slice(1)
    itemsPart = parts[1]
  } else {
    itemsPart = parts[0]
  }

  if (!itemsPart || !itemsPart.includes(':')) return null

  const items = itemsPart
    .split(',')
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const [id, qtyRaw] = seg.split(':')
      const qty = qtyRaw != null ? Number(qtyRaw) : NaN
      return { supplyId: id, quantity: qty }
    })
    .filter((x) => x.supplyId && Number.isFinite(x.quantity) && x.quantity > 0)

  if (!items.length) return null

  return { kind: 'supplies', locationId, items }
}

export default function SupplyQrScanModal({ open, onClose, onScanned }) {
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [station, setStation] = useState(null)
  const [selections, setSelections] = useState({})
  const title = useMemo(() => 'Scan Supply QR', [])

  const reset = useCallback(() => {
    setErr(null)
    setBusy(false)
    setStation(null)
    setSelections({})
  }, [])

  const handleResult = useCallback(
    async (text) => {
      if (busy || station) return
      const parsed = parseSupplyQrValue(text)
      if (!parsed) {
        setErr('Unrecognized QR format.')
        return
      }

      if (parsed.kind === 'job') {
        setErr(`Job QR scanned (not used here). Job: ${parsed.jobId}`)
        return
      }

      if (parsed.kind === 'station' || parsed.kind === 'station_id') {
        setErr(null)
        setBusy(true)
        try {
          const endpoint = parsed.kind === 'station'
            ? `/locations/by-code/${encodeURIComponent(parsed.code)}`
            : `/locations/${parsed.id}`
          const res = await api.get(endpoint)
          const loc = res.data
          const inv = Array.isArray(loc.station_inventory) ? loc.station_inventory : []
          if (inv.length === 0) {
            setErr(`Station "${loc.name}" has no inventory items configured.`)
            setBusy(false)
            return
          }
          setStation({ ...loc, inventory: inv })
          const initial = {}
          inv.forEach((item) => { initial[item.item_name] = item.quantity || 1 })
          setSelections(initial)
          toast.success(`Loaded ${inv.length} items from ${loc.name}`)
        } catch (e) {
          setErr(e?.response?.data?.message || 'Station not found')
        } finally {
          setBusy(false)
        }
        return
      }

      setErr(null)
      onScanned?.(parsed)
      onClose?.()
    },
    [busy, station, onScanned, onClose],
  )

  const handleConfirmStation = () => {
    const items = Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([name, quantity]) => ({ name, quantity }))

    if (!items.length) {
      toast.error('Select at least one item')
      return
    }

    onScanned?.({ kind: 'station_supplies', locationId: station._id, items })
    reset()
    onClose?.()
  }

  const toggleItem = (name) => {
    setSelections((prev) => ({ ...prev, [name]: prev[name] > 0 ? 0 : 1 }))
  }

  const updateQty = (name, qty) => {
    setSelections((prev) => ({ ...prev, [name]: Math.max(0, qty) }))
  }

  return (
    <FullScreenModal
      open={open}
      title={title}
      onClose={() => { reset(); onClose?.() }}
    >
      <div className="p-4 space-y-3">
        {!station ? (
          <>
            <div className="relative rounded-xl overflow-hidden bg-black">
              {busy && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                  <p className="text-sm font-semibold text-white">Loading station inventory…</p>
                </div>
              )}
              <QrScanner
                constraints={{ facingMode: 'environment' }}
                scanDelay={250}
                paused={busy}
                onResult={handleResult}
                containerStyle={{ width: '100%' }}
                videoStyle={{ width: '100%' }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-52 w-52 rounded-2xl border-2 border-white/30 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]" />
              </div>
            </div>

            {err && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200">
                {err}
              </div>
            )}

            <p className="text-xs text-slate-300">
              Scan a station QR label to load its inventory, then pick what was used.
            </p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Station loaded</p>
              <p className="mt-0.5 text-base font-semibold text-white">{station.name}</p>
              {station.location_code && (
                <p className="text-xs text-slate-400">Code: {station.location_code}</p>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Select items and quantities that were used or restocked:
            </p>

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {station.inventory.map((item) => {
                const qty = selections[item.item_name] || 0
                const active = qty > 0
                return (
                  <div
                    key={item.item_name}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      active
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(item.item_name)}
                      className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        active ? 'border-emerald-400 bg-emerald-500' : 'border-slate-500 bg-transparent'
                      }`}
                    >
                      {active && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="flex-1 min-w-0 text-sm text-white truncate">{item.item_name}</span>
                    <input
                      type="number"
                      min={0}
                      value={qty}
                      onChange={(e) => updateQty(item.item_name, Number(e.target.value) || 0)}
                      className="w-16 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-center text-sm text-white tabular-nums"
                    />
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => { reset() }}
                className="h-11 rounded-xl border border-white/10 bg-slate-800 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                Scan another
              </button>
              <button
                type="button"
                onClick={handleConfirmStation}
                className="h-11 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Confirm ({Object.values(selections).filter((q) => q > 0).length} items)
              </button>
            </div>
          </div>
        )}
      </div>
    </FullScreenModal>
  )
}

