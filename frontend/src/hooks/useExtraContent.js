import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Joke + news from backend (/api/v1/weather/extras). Pass true on the dashboard so the joke
 * shows on the card; the slideout reuses the same payload.
 */
export function useExtraContent(enabled) {
  const [joke, setJoke] = useState(null)
  const [news, setNews] = useState([])
  const [sports, setSports] = useState([])

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    api
      .get('/weather/extras')
      .then((r) => {
        if (cancelled) return
        setJoke(r.data?.joke || null)
        setNews(Array.isArray(r.data?.news) ? r.data.news : [])
        setSports(Array.isArray(r.data?.sports) ? r.data.sports : [])
      })
      .catch(() => {
        if (!cancelled) {
          setJoke(null)
          setNews([])
          setSports([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { joke, news, sports }
}
