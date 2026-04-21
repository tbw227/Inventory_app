import { useEffect, useState } from 'react'
import api from '../services/api'
import { isAbortError } from '../utils/isAbortError'

export function useCalendarData() {
  const [calendarJobs, setCalendarJobs] = useState([])
  const [calendarClientEvents, setCalendarClientEvents] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    ;(async () => {
      try {
        const [jobsRes, eventsRes] = await Promise.all([
          api.get('/jobs', { params: { view: 'calendar' }, signal }),
          api.get('/clients/meta/calendar-events', { signal }),
        ])
        setCalendarJobs(jobsRes.data || [])
        setCalendarClientEvents(eventsRes.data?.events || [])
      } catch (e) {
        if (isAbortError(e)) return
        setCalendarJobs([])
        setCalendarClientEvents([])
      }
    })()
    return () => controller.abort()
  }, [])

  return { calendarJobs, calendarClientEvents }
}
