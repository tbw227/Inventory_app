import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { isAbortError } from '../utils/isAbortError'

export function useDashboardData(initialDays = 30) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [chartDays, setChartDays] = useState(initialDays)

  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    const silentRefresh = dataRef.current !== null
    if (!silentRefresh) setLoading(true)

    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await api.get('/dashboard', {
          params: { days: chartDays },
          signal: controller.signal,
        })
        setData(res.data)
        setErr(null)
      } catch (e) {
        if (isAbortError(e)) return
        setErr(e?.response?.data?.error || 'Failed to load dashboard')
      } finally {
        if (!silentRefresh) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [chartDays])

  return { data, loading, err, chartDays, setChartDays }
}
