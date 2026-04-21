import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useJobs(filters = {}) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)

      const url = `/jobs${params.toString() ? `?${params}` : ''}`
      const res = await api.get(url)
      setJobs(res.data || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [filters.status])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, loading, error, refetch: fetchJobs }
}
