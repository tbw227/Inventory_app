import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * The Weather Company (IBM) v3 bundle via backend proxy — never put the API key in the client.
 * @param {number|string|null|undefined} lat
 * @param {number|string|null|undefined} lon
 */
export function useWeatherCompany(lat, lon) {
  const [current, setCurrent] = useState(null)
  const [hourly, setHourly] = useState(null)
  const [daily, setDaily] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  /** false when TWC is not configured on the server (empty bundle) or legacy 503 */
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const la = lat != null ? Number(lat) : NaN
    const lo = lon != null ? Number(lon) : NaN
    if (Number.isNaN(la) || Number.isNaN(lo)) {
      setCurrent(null)
      setHourly(null)
      setDaily(null)
      setInsights(null)
      setLoading(false)
      setAvailable(true)
      return undefined
    }

    let cancelled = false
    setLoading(true)

    api
      .get('/weather/twc', { params: { lat: la, lon: lo } })
      .then((res) => {
        if (cancelled) return
        const configured = res.data?.configured !== false
        setCurrent(res.data?.current || null)
        setHourly(res.data?.hourly || null)
        setDaily(res.data?.daily || null)
        setInsights(res.data?.insights || null)
        setAvailable(configured)
      })
      .catch((e) => {
        if (cancelled) return
        const st = e?.response?.status
        if (st === 503) {
          setCurrent(null)
          setHourly(null)
          setDaily(null)
          setInsights(null)
          setAvailable(false)
          return
        }
        setCurrent(null)
        setHourly(null)
        setDaily(null)
        setInsights(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return { current, hourly, daily, insights, loading, available }
}
