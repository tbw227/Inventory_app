import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function ScanJob() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader()
    let cancelled = false
    const controlsRef = { current: null }

    const startScan = async () => {
      try {
        const devices = await codeReader.listVideoInputDevices()
        const video = videoRef.current
        if (!video || cancelled) return
        controlsRef.current = await codeReader.decodeFromVideoDevice(
          devices.length ? devices[0].deviceId : undefined,
          video,
          (result, err) => {
            if (cancelled) return
            if (err) return
            if (result && result.getText()) {
              setScanning(false)
              controlsRef.current?.stop()
              let jobId = result.getText().trim()
              if (jobId.startsWith('job_')) jobId = jobId.slice(4)
              if (/^[0-9a-fA-F]{24}$/.test(jobId)) {
                navigate(`/jobs/${jobId}`)
              } else {
                setError('Invalid job code. Scan a job QR code.')
              }
            }
          }
        )
        if (cancelled) {
          controlsRef.current?.stop()
          controlsRef.current = null
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Camera access failed')
      }
    }

    startScan()
    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [navigate])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Scan Job QR Code</h2>
      <p className="text-sm text-gray-500 mb-4">Point your camera at the job QR code on the cabinet or tag.</p>
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: 300 }}>
        <video
          ref={videoRef}
          id="video"
          className="w-full"
          style={{ minHeight: 300, objectFit: 'cover' }}
          muted
          playsInline
        />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            Opening job...
          </div>
        )}
      </div>
    </div>
  )
}
