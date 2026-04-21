import React, { useEffect, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import JsBarcode from 'jsbarcode'
import { useJob } from '../hooks/useJob'
import { getJobLocations } from '../utils/jobLocations'
import HomeNavLink from '../components/shared/HomeNavLink'

export default function JobLabel() {
  const { id } = useParams()
  const { job, loading, error } = useJob(id)
  const barcodeRef = useRef(null)
  const shouldPrint = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('print') === '1'
  }, [])

  useEffect(() => {
    if (!job || !barcodeRef.current) return

    barcodeRef.current.innerHTML = ''
    JsBarcode(barcodeRef.current, `job_${job._id}`, {
      format: 'CODE128',
      width: 2,
      height: 48,
      displayValue: true,
    })
  }, [job])

  useEffect(() => {
    if (!job) return

    const previousTitle = document.title
    const titleParts = [job.client_id?.name]
    getJobLocations(job).forEach((s) => {
      if (s.name) titleParts.push(s.name)
    })
    document.title = titleParts.filter(Boolean).join(' - ') || `Job ${job._id}`

    if (shouldPrint) {
      const timer = window.setTimeout(() => {
        window.print()
      }, 400)
      return () => {
        window.clearTimeout(timer)
        document.title = previousTitle
      }
    }

    return () => {
      document.title = previousTitle
    }
  }, [job, shouldPrint])

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      </div>
    )
  }

  if (!job) {
    return <div className="max-w-xl mx-auto px-4 py-8 text-gray-500">Job not found</div>
  }

  const clientName = job.client_id?.name || 'Unknown customer'
  const clientLocation = job.client_id?.location || ''
  const stations = getJobLocations(job)
  const techName = job.assigned_user_id?.name || 'Unassigned'

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="no-print flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
        <HomeNavLink />
        <span className="hidden sm:inline text-slate-300" aria-hidden>
          |
        </span>
        <Link to={`/jobs/${job._id}`} className="text-sm text-blue-600 hover:text-blue-800">
          Back to Job
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
        >
          Print Label
        </button>
      </div>

      <div className="print-label bg-white border-2 border-gray-300 rounded-lg p-6">
        <div className="border-b border-gray-200 pb-3 mb-3">
          <p className="text-lg font-semibold text-gray-900">{clientName}</p>
          {stations.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stations</p>
              {stations.map((loc) => (
                <div key={loc._id || loc.name} className="text-sm text-gray-800">
                  <p className="font-medium">{loc.name}</p>
                  {loc.location_code && (
                    <p className="text-xs text-gray-600">Code: {loc.location_code}</p>
                  )}
                  {loc.address && <p className="text-xs text-gray-600">{loc.address}</p>}
                </div>
              ))}
            </div>
          ) : (
            clientLocation && <p className="text-sm text-gray-700 mt-1">{clientLocation}</p>
          )}
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <p><span className="font-medium">Job ID:</span> {job._id}</p>
          <p><span className="font-medium">Service Date:</span> {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'N/A'}</p>
          <p><span className="font-medium">Technician:</span> {techName}</p>
          {job.description && <p><span className="font-medium">Description:</span> {job.description}</p>}
        </div>

        {job.planned_supplies?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-800 mb-1">Planned Supplies</p>
            <div className="space-y-1">
              {job.planned_supplies.map((item, index) => (
                <p key={`${item.name}-${index}`} className="text-sm text-gray-700">
                  {item.name} - Qty: {item.quantity}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-center">
          <svg ref={barcodeRef} />
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-label, .print-label * { visibility: visible; }
          .print-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
