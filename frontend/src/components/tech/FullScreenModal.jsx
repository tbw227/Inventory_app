import React, { useEffect, useRef } from 'react'

export default function FullScreenModal({ open, title, onClose, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal'}
      onMouseDown={(e) => {
        // Click outside closes.
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        ref={panelRef}
        className="absolute left-0 right-0 top-0 bottom-0 bg-slate-950 text-white overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label="Close"
            title="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="absolute left-0 right-0 top-[56px] bottom-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

