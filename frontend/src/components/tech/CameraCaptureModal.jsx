import React, { useMemo, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import FullScreenModal from './FullScreenModal'
import api from '../../services/api'

function dataURLToFile(dataUrl, filename) {
  // Convert base64 screenshot to File for the existing /upload endpoint.
  return fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => new File([blob], filename, { type: blob.type || 'image/jpeg' }))
}

export default function CameraCaptureModal({ open, onClose, onUploaded }) {
  const webcamRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const title = useMemo(() => 'Capture Photo', [])

  async function handleCapture() {
    if (busy) return
    setErr(null)
    setBusy(true)
    try {
      const screenshot = webcamRef.current?.getScreenshot?.()
      if (!screenshot) throw new Error('Capture failed')

      const file = await dataURLToFile(screenshot, `capture-${Date.now()}.jpg`)
      const formData = new FormData()
      formData.append('photo', file)

      const res = await api.post('/upload', formData)
      const url = res.data?.url
      if (!url) throw new Error('Upload failed')

      onUploaded?.(url)
      onClose?.()
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FullScreenModal open={open} title={title} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div className="relative w-full overflow-hidden rounded-xl bg-black">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-[70vh] object-cover"
            mirrored={false}
            playsInline
            audio={false}
          />
        </div>

        {err && (
          <div className="rounded-xl border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <button
          type="button"
          onClick={handleCapture}
          disabled={busy}
          className="w-full h-14 rounded-xl bg-blue-600 text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Uploading…' : 'Capture & Upload'}
        </button>
      </div>
    </FullScreenModal>
  )
}

