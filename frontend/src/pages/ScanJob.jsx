import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrReader } from 'react-qr-reader'
import toast from 'react-hot-toast'
import FullScreenModal from '../components/tech/FullScreenModal'
import { ROUTES } from '../config/routes'

export default function ScanJob() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const [scanBusy, setScanBusy] = useState(false)
  const [pendingJobId, setPendingJobId] = useState(null)
  const [error, setError] = useState(null)

  const title = useMemo(() => 'Scan Job QR Code', [])

  const parseJobId = useCallback((text) => {
    const raw = String(text || '').trim()
    if (!raw) return null

    const maybe = raw.startsWith('job_') ? raw.slice(4) : raw

    // UUID (Prisma/Supabase jobs)
    const uuidLike = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(maybe)
    if (uuidLike) return maybe

    // Legacy 24-hex ids (if any old QR exists)
    const hex24 = /^[0-9a-fA-F]{24}$/.test(maybe)
    if (hex24) return maybe

    return null
  }, [])

  return (
    <FullScreenModal
      open={open}
      title={title}
      onClose={() => {
        setOpen(false)
        navigate(ROUTES.JOBS)
      }}
    >
      <div className="p-4 space-y-3">
        <div className="relative w-full overflow-hidden rounded-xl bg-black">
          {scanBusy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <div className="px-4 text-center">
                <div className="text-sm font-semibold">Opening job…</div>
                {pendingJobId ? (
                  <div className="mt-1 text-xs text-slate-300 break-all">
                    {pendingJobId}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <QrReader
            constraints={{ facingMode: 'environment' }}
            scanDelay={250}
            onResult={(result, err) => {
              if (scanBusy) return
              if (err) return
              if (!result?.text) return

              const jobId = parseJobId(result.text)
              if (!jobId) {
                setError('Invalid job QR code. Try scanning the job label again.')
                return
              }

              setError(null)
              setPendingJobId(jobId)
              setScanBusy(true)

              toast.success('Job scanned')
              // Let the overlay render briefly for a smoother "native" feel.
              window.setTimeout(() => {
                setOpen(false)
                navigate(`/jobs/${jobId}`)
              }, 350)
            }}
            containerStyle={{ width: '100%' }}
            videoContainerStyle={{ width: '100%' }}
            videoStyle={{ width: '100%', height: '70vh', objectFit: 'cover' }}
          />
        </div>

        {!scanBusy ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
            Hold steady on the QR code until it auto-opens.
          </div>
        ) : null}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="text-xs text-slate-300">
          Point your camera at the job label QR code on the cabinet or equipment.
        </div>

        <div className="sticky bottom-0 pt-3">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setPendingJobId(null)
              setScanBusy(false)
              setOpen(false)
              navigate(ROUTES.JOBS)
            }}
            className="w-full h-12 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-100 font-semibold"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    </FullScreenModal>
  )
}
