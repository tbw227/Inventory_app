import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useJob(id) {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchJob = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/jobs/${id}`)
      setJob(res.data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load job')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  return { job, loading, error, refetch: fetchJob }
}
