import React from 'react'
import { Link } from 'react-router-dom'
import { getJobLocations } from '../../utils/jobLocations'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

export default function JobCard({ job, onEdit, canEdit = false }) {
  const clientName = job.client_id?.name || 'Unknown client'
  const stations = getJobLocations(job)
  const techName = job.assigned_user_id?.name || 'Unassigned'
  const statusClass = STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">
            {job.description || 'No description'}
          </p>
          <p className="mt-1 text-sm text-gray-500">{clientName}</p>
          {stations.length > 0 && (
            <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Stations / locations
              </p>
              <ul className="mt-1 space-y-0.5">
                {stations.map((loc) => (
                  <li key={loc._id || loc.name} className="text-sm text-gray-700">
                    {loc.name}
                    {loc.location_code ? (
                      <span className="text-gray-500"> · {loc.location_code}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-gray-400 mt-2">Assigned to {techName}</p>
        </div>
        <div className="ml-4 flex flex-col items-end space-y-1">
          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
            {job.status}
          </span>
          {job.scheduled_date && (
            <span className="text-xs text-gray-400">
              {new Date(job.scheduled_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Link
          to={`/jobs/${job._id}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View Details
        </Link>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit?.(job)
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
