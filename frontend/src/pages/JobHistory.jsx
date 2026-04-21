import React from 'react'
import { Link } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'

export default function JobHistory() {
  const { jobs, loading, error } = useJobs({ status: 'completed' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Completed Jobs History</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-3">
          {jobs.map(job => (
            <div key={job._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{job.description || 'No description'}</p>
                  <p className="text-sm text-gray-500 mt-1">{job.client_id?.name || 'Unknown client'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Completed: {job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  completed
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">Job ID: {job._id}</p>
                <Link to={`/jobs/${job._id}`} className="text-sm text-blue-600 hover:text-blue-800">
                  View Details
                </Link>
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No completed jobs yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
