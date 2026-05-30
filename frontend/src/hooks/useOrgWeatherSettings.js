import { useCallback, useEffect, useState } from 'react'
import api, { getApiErrorMessage } from '../services/api'

export function useOrgWeatherSettings(isAdmin) {
  const [orgMeta, setOrgMeta] = useState({ name: '', contact_info: '' })
  const [orgWeatherLocs, setOrgWeatherLocs] = useState([])
  const [orgWeatherMsg, setOrgWeatherMsg] = useState(null)
  const [orgWeatherErr, setOrgWeatherErr] = useState(null)
  const [orgWeatherLoading, setOrgWeatherLoading] = useState(false)
  const [orgWeatherSaving, setOrgWeatherSaving] = useState(false)

  const loadCompany = useCallback(() => {
    if (!isAdmin) return Promise.resolve()
    setOrgWeatherLoading(true)
    setOrgWeatherErr(null)
    return api
      .get('/companies')
      .then((res) => {
        const c = res.data || {}
        setOrgMeta({
          name: c.name || '',
          contact_info: c.contact_info || '',
        })
        const wl = Array.isArray(c.weather_locations) ? c.weather_locations : []
        setOrgWeatherLocs(wl.length ? wl.map((x) => ({ label: x.label || '', query: x.query || '' })) : [])
      })
      .catch((e) => {
        setOrgWeatherErr(getApiErrorMessage(e, 'Could not load company settings'))
        throw e
      })
      .finally(() => {
        setOrgWeatherLoading(false)
      })
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return undefined
    let cancelled = false
    loadCompany().catch(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin, loadCompany])

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
    reloadCompany: loadCompany,
  }
}
