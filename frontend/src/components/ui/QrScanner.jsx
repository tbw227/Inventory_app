import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'

/**
 * Thin QR scanner built directly on @zxing/browser.
 *
 * Props:
 *   onResult(text) - called with decoded string on each successful scan
 *   onError(err) - optional error callback
 *   scanDelay - ms between decode attempts
 *   constraints - MediaTrackConstraints for the video stream
 *   paused - stop decoding while true, while keeping the camera stream open
 *   videoStyle - inline styles for the video element
 *   containerStyle - inline styles for the wrapper div
 */
export default function QrScanner({
  onResult,
  onError,
  scanDelay = 250,
  constraints = { facingMode: { ideal: 'environment' } },
  paused = false,
  videoStyle,
  containerStyle,
}) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const pausedRef = useRef(paused)
  const [cameraStatus, setCameraStatus] = useState('starting')
  const [cameraMessage, setCameraMessage] = useState('Starting camera...')

  const constraintsKey = useMemo(() => JSON.stringify(constraints || true), [constraints])

  onResultRef.current = onResult
  onErrorRef.current = onError
  pausedRef.current = paused

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return undefined

    if (!window.isSecureContext) {
      const err = new Error('Camera access requires HTTPS or localhost.')
      setCameraStatus('error')
      setCameraMessage(formatCameraError(err))
      onErrorRef.current?.(err)
      return undefined
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error('This browser does not support camera access.')
      setCameraStatus('error')
      setCameraMessage(formatCameraError(err))
      onErrorRef.current?.(err)
      return undefined
    }

    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: scanDelay,
      tryPlayVideoTimeout: 7000,
    })
    let stopped = false
    let activeStream = null
    const attempts = buildCameraAttempts(constraints)

    async function startScanner() {
      setCameraStatus('starting')
      setCameraMessage('Starting camera...')

      let lastError = null
      for (const mediaConstraints of attempts) {
        if (stopped) return

        try {
          activeStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
          if (stopped) {
            stopMediaStream(activeStream)
            return
          }

          const controls = await reader.decodeFromStream(
            activeStream,
            videoElement,
            (result, err) => {
              if (stopped || pausedRef.current) return
              if (result) {
                onResultRef.current?.(result.getText())
                return
              }
              if (shouldReportDecodeError(err)) onErrorRef.current?.(err)
            },
          )

          if (stopped) {
            controls.stop()
            return
          }

          controlsRef.current = controls
          setCameraStatus('ready')
          setCameraMessage('')
          return
        } catch (err) {
          lastError = err
          stopMediaStream(activeStream)
          activeStream = null
          if (!shouldTryFallback(err)) break
        }
      }

      if (!stopped) {
        setCameraStatus('error')
        setCameraMessage(formatCameraError(lastError))
        onErrorRef.current?.(lastError)
      }
    }

    startScanner()

    return () => {
      stopped = true
      controlsRef.current?.stop()
      controlsRef.current = null
      stopMediaStream(activeStream)
      if (videoElement.srcObject === activeStream) {
        videoElement.srcObject = null
      }
    }
  }, [scanDelay, constraintsKey])

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...containerStyle }}>
      <video ref={videoRef} style={videoStyle} muted playsInline />
      {cameraStatus !== 'ready' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(2, 6, 23, 0.82)',
            color: '#fff',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <div>
            {cameraStatus === 'starting' ? (
              <div
                style={{
                  width: 28,
                  height: 28,
                  margin: '0 auto 0.75rem',
                  border: '3px solid rgba(255,255,255,0.22)',
                  borderTopColor: '#fff',
                  borderRadius: '999px',
                  animation: 'spin 1s linear infinite',
                }}
                aria-hidden
              />
            ) : null}
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              {cameraStatus === 'error' ? 'Camera unavailable' : cameraMessage}
            </p>
            <p style={{ margin: '0.45rem auto 0', maxWidth: 320, fontSize: 12, lineHeight: 1.5, color: '#cbd5e1' }}>
              {cameraStatus === 'error' ? cameraMessage : 'If prompted, allow camera access for this site.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function stopMediaStream(stream) {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

function buildCameraAttempts(constraints) {
  const preferred = constraints || { facingMode: { ideal: 'environment' } }
  const attempts = [
    { video: preferred },
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    { video: true },
  ]

  const seen = new Set()
  return attempts.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function shouldTryFallback(err) {
  const name = err?.name || ''
  return [
    'OverconstrainedError',
    'ConstraintNotSatisfiedError',
    'NotFoundError',
    'DevicesNotFoundError',
    'NotReadableError',
    'TrackStartError',
  ].includes(name)
}

function shouldReportDecodeError(err) {
  if (!err) return false
  return !['NotFoundException', 'ChecksumException', 'FormatException', 'ReaderException'].includes(err.name)
}

function formatCameraError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission is blocked. Allow camera access in the browser, then reopen the scanner.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is already in use by another app or browser tab.'
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'The requested camera is not available. Try another camera or browser.'
  }
  if (name === 'SecurityError') {
    return 'Camera access requires HTTPS or localhost.'
  }
  return err?.message || 'The camera could not be started.'
}
