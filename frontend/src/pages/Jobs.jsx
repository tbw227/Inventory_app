import React, {useEffect, useState} from 'react'
import axios from 'axios'
import JobCard from '../components/JobCard'

export default function Jobs(){
  const [jobs,setJobs] = useState([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(null)

  useEffect(()=>{
    async function fetchJobs(){
      setLoading(true)
      setError(null)
      try{
        const token = localStorage.getItem('token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await axios.get('/api/jobs',{ headers })
        setJobs(res.data || [])
      }catch(err){
        setError('Failed to load jobs')
      }finally{setLoading(false)}
    }
    fetchJobs()
  },[])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Jobs</h1>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="grid gap-4">
        {jobs.map(j=> <JobCard key={j._id} job={j} />)}
        {!loading && jobs.length===0 && <div className="text-gray-600">No jobs found.</div>}
      </div>
    </div>
  )
}
