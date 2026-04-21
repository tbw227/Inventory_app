import { useEffect, useState } from 'react'
import api from '../services/api'

export function useOrgWeatherSettings(isAdmin) {
  const [orgMeta, setOrgMeta] = useState({ name: '', contact_info: '' })
  const [orgWeatherLocs, setOrgWeatherLocs] = useState([])
  const [orgWeatherMsg, setOrgWeatherMsg] = useState(null)
  const [orgWeatherErr, setOrgWeatherErr] = useState(null)
  const [orgWeatherLoading, setOrgWeatherLoading] = useState(false)
  const [orgWeatherSaving, setOrgWeatherSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setOrgWeatherLoading(true)
    setOrgWeatherErr(null)
    api
      .get('/companies')
      .then((res) => {
        if (cancelled) return
        const c = res.data || {}
        setOrgMeta({
          name: c.name || '',
          contact_info: c.contact_info || '',
        })
        const wl = Array.isArray(c.weather_locations) ? c.weather_locations : []
        setOrgWeatherLocs(wl.length ? wl.map((x) => ({ label: x.label || '', query: x.query || '' })) : [])
      })
      .catch((e) => {
        if (!cancelled) setOrgWeatherErr(e?.response?.data?.error || e?.message || 'Could not load organization')
      })
      .finally(() => {
        if (!cancelled) setOrgWeatherLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  return {
    orgMeta,
    setOrgMeta,
    orgWeatherLocs,
    setOrgWeatherLocs,
    orgWeatherMsg,
    setOrgWeatherMsg,
    orgWeatherErr,
    setOrgWeatherErr,
    orgWeatherLoading,
    orgWeatherSaving,
    setOrgWeatherSaving,
  }
}
