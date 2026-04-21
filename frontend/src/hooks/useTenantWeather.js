import { useCallback, useEffect, useState } from 'react'
import { getWeatherLocations } from '../services/weatherService'

/**
 * Multi-city weather for the signed-in user’s company (see Company.weather_locations).
 * Falls back to a single slot from profile forecast city or server default.
 */
export function useTenantWeather() {
  const [locations, setLocations] = useState([])
  const [defaultQuery, setDefaultQuery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    return getWeatherLocations()
      .then((r) => {
        setLocations(Array.isArray(r.data?.locations) ? r.data.locations : [])
        setDefaultQuery(r.data?.default_query || null)
        setFetchedAt(Date.now())
      })
      .catch((e) => {
        setLocations([])
        setDefaultQuery(null)
        setError(e?.response?.data?.error || e?.message || 'Weather locations unavailable')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getWeatherLocations()
      .then((r) => {
        if (cancelled) return
        setLocations(Array.isArray(r.data?.locations) ? r.data.locations : [])
        setDefaultQuery(r.data?.default_query || null)
        setFetchedAt(Date.now())
      })
      .catch((e) => {
        if (cancelled) return
        setLocations([])
        setDefaultQuery(null)
        setError(e?.response?.data?.error || e?.message || 'Weather locations unavailable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { locations, defaultQuery, loading, error, fetchedAt, refetch }
}
