import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { isAbortError } from '../utils/isAbortError'

export function useDashboardData(initialDays = 30) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [heavyLoading, setHeavyLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [chartDays, setChartDays] = useState(initialDays)

  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    const initialLoad = dataRef.current == null
    if (initialLoad) setLoading(true)
    setHeavyLoading(true)

    const controller = new AbortController()
    ;(async () => {
      try {
        const summary = await api.get('/dashboard', {
          params: { days: chartDays, include_heavy: false },
          signal: controller.signal,
        })
        setData(summary.data)
        setErr(null)

        const heavy = await api.get('/dashboard', {
          params: { days: chartDays, include_heavy: true },
          signal: controller.signal,
        })
        setData(heavy.data)
        setErr(null)
      } catch (e) {
        if (isAbortError(e)) return
        setErr(e?.response?.data?.error || 'Failed to load dashboard')
      } finally {
        if (initialLoad) setLoading(false)
        setHeavyLoading(false)
      }
    })()

    return () => controller.abort()
  }, [chartDays])

  return { data, loading, heavyLoading, err, chartDays, setChartDays }
}
