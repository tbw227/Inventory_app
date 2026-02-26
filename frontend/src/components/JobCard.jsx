import React from 'react'

export default function JobCard({job}){
  return (
    <div className="bg-white p-4 rounded shadow flex justify-between items-center">
      <div>
        <div className="font-semibold">{job.description || 'No description'}</div>
        <div className="text-sm text-gray-500">Status: {job.status || 'pending'}</div>
        <div className="text-sm text-gray-500">Client: {job.client_name || job.client_id}</div>
      </div>
      <div>
        <a className="text-blue-600" href={`/api/jobs/${job._id}/report`} target="_blank" rel="noreferrer">View PDF</a>
      </div>
    </div>
  )
}
