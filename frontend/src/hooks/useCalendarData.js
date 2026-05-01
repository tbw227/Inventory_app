import { useEffect, useState } from 'react'
import api from '../services/api'
import { isAbortError } from '../utils/isAbortError'

export function useCalendarData({ includeClientEvents = true } = {}) {
  const [calendarJobs, setCalendarJobs] = useState([])
  const [calendarClientEvents, setCalendarClientEvents] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    ;(async () => {
      try {
        const jobsReq = api.get('/jobs', { params: { view: 'calendar' }, signal })
        const eventsReq = includeClientEvents ? api.get('/clients/meta/calendar-events', { signal }) : Promise.resolve(null)
        const [jobsRes, eventsRes] = await Promise.all([jobsReq, eventsReq])
        setCalendarJobs(jobsRes.data || [])
        setCalendarClientEvents(eventsRes?.data?.events || [])
      } catch (e) {
        if (isAbortError(e)) return
        setCalendarJobs([])
        setCalendarClientEvents([])
      }
    })()
    return () => controller.abort()
  }, [includeClientEvents])

  return { calendarJobs, calendarClientEvents }
}
