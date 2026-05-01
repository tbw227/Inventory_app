import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../config/routes'

function LabelsActionCard({ to, title, description, icon, disabled = false }) {
  if (disabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-70">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-200 p-2 text-slate-500">{icon}</div>
          <div>
            <h3 className="text-base font-semibold text-slate-700">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">Admin access required</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={to}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">{icon}</div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          <p className="mt-3 text-xs font-medium text-indigo-600">Open</p>
        </div>
      </div>
    </Link>
  )
}

export default function Labels() {
  const { isAdmin } = useAuth()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Labels</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Scan existing labels or print new ones from one screen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LabelsActionCard
          to={ROUTES.SCAN}
          title="Scan Labels"
          description="Use your camera to scan a job label and jump directly to the job."
          icon={(
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM3 12h18" />
            </svg>
          )}
        />
        <LabelsActionCard
          to={ROUTES.PRINT_LABELS}
          title="Print Labels"
          description="Create and print new barcode labels for supplies and stations."
          disabled={!isAdmin}
          icon={(
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          )}
        />
      </div>
    </div>
  )
}
