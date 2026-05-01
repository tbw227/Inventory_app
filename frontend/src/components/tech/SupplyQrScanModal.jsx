import React, { useMemo, useState } from 'react'
import { QrReader } from 'react-qr-reader'
import FullScreenModal from './FullScreenModal'

function parseSupplyQrValue(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  // Job labels (job_${id})
  if (raw.startsWith('job_')) return { kind: 'job', jobId: raw.slice(4) }

  // Our restock/stock label encoding (see PrintLabels.jsx)
  // - With location: L<locationId>|<supplyId>:<qty>,...|<restockDate>
  // - Without location: <supplyId>:<qty>,...|<restockDate>
  const parts = raw.split('|')
  let itemsPart = null
  let locationId = null

  if (parts.length >= 3 && parts[0].startsWith('L')) {
    locationId = parts[0].slice(1)
    itemsPart = parts[1]
  } else {
    // e.g. "<items>|<date>"
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
  const title = useMemo(() => 'Scan Supply QR', [])

  function handleResult(result, error) {
    if (error) return
    if (!result?.text) return

    const parsed = parseSupplyQrValue(result.text)
    if (!parsed) {
      setErr('Unrecognized QR format.')
      return
    }

    if (parsed.kind === 'job') {
      setErr(`Job QR scanned. (Not used here.) Job: ${parsed.jobId}`)
      return
    }

    setErr(null)
    onScanned?.(parsed)
    onClose?.()
  }

  return (
    <FullScreenModal open={open} title={title} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="relative rounded-xl overflow-hidden bg-black">
          <QrReader
            constraints={{ facingMode: 'environment' }}
            scanDelay={250}
            onResult={handleResult}
            videoId="tech-qr-video"
            containerStyle={{ width: '100%' }}
            videoContainerStyle={{ width: '100%' }}
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
          Scan a supply label to auto-fill quantities.
        </p>
      </div>
    </FullScreenModal>
  )
}

