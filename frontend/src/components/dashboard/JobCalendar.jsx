import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJobLocations } from '../../utils/jobLocations'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function padDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function eventDateKey(raw) {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return padDateKey(d)
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function buildMonthGrid(cursor) {
  const first = startOfMonth(cursor)
  const startPad = first.getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = []
  let i = 0
  for (; i < startPad; i++) {
    cells.push({ type: 'empty', key: `e-${i}` })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
    cells.push({ type: 'day', key: padDateKey(date), date, day })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ type: 'empty', key: `t-${cells.length}` })
  }
  const rows = []
  for (let r = 0; r < cells.length; r += 7) {
    rows.push(cells.slice(r, r + 7))
  }
  return rows
}

function jobTooltip(j) {
  const clientName = j.client_id?.name || 'Client'
  const desc = (j.description || '').trim() || '—'
  const tech = j.assigned_user_id?.name || '—'
  const stationLine = getJobLocations(j)
    .map((l) => l.name)
    .filter(Boolean)
    .join(', ')
  const loc = j.client_id?.location || stationLine || ''
  const status = j.status || '—'
  const lines = [clientName, desc, `Technician: ${tech}`, `Status: ${status}`]
  if (loc) lines.push(loc)
  const ss = j.client_id?.service_start_date
  const se = j.client_id?.service_expiry_date
  if (ss) lines.push(`Client service start: ${new Date(ss).toLocaleDateString()}`)
  if (se) lines.push(`Client service expires: ${new Date(se).toLocaleDateString()}`)
  return lines.join('\n')
}

function DayDetailModal({ day, jobs, clientEvents, onClose, navigate }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!day) return null

  const label = day.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cal-day-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-teal-50/50 dark:from-slate-900 dark:to-slate-800/80">
          <h3 id="cal-day-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
        <div className="p-5 space-y-6">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Jobs ({jobs.length})
            </h4>
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No jobs scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {jobs.map((j) => (
                  <li
                    key={j._id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-800/40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate(`/jobs/${j._id}`)
                      }}
                      className="text-left w-full"
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {j.client_id?.name || 'Job'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-3">
                        {(j.description || '').trim() || 'No description'}
                      </p>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{j.status}</span>
                        {j.assigned_user_id?.name && (
                          <>
                            <span>·</span>
                            <span>{j.assigned_user_id.name}</span>
                          </>
                        )}
                        {j.client_id?.location && (
                          <>
                            <span>·</span>
                            <span className="truncate">{j.client_id.location}</span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Client milestones
            </h4>
            {clientEvents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No service start or expiry on this date.</p>
            ) : (
              <ul className="space-y-2">
                {clientEvents.map((ev, i) => (
                  <li key={`${ev.client_id}-${ev.kind}-${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate(`/clients/${ev.client_id}`)
                      }}
                      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-800/60 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{ev.client_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {ev.kind === 'service_start' ? 'Service agreement start' : 'Service agreement expires'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function JobCalendar({ jobs = [], clientEvents = [] }) {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => new Date())
  const [detail, setDetail] = useState(null)

  const jobsByDay = useMemo(() => {
    const map = new Map()
    if (!jobs?.length) return map
    for (const j of jobs) {
      const raw = j.scheduled_date
      const key = typeof raw === 'string' ? raw.slice(0, 10) : raw ? padDateKey(new Date(raw)) : null
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(j)
    }
    return map
  }, [jobs])

  const eventsByDay = useMemo(() => {
    const map = new Map()
    if (!clientEvents?.length) return map
    for (const ev of clientEvents) {
      const key = eventDateKey(ev.date)
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    }
    return map
  }, [clientEvents])

  const rows = useMemo(() => buildMonthGrid(cursor), [cursor])
  const title = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Schedule & client dates</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Jobs by status · client service start / expiry · click the day number for full details
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Prev
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[8rem] text-center">{title}</span>
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] mb-3 text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-indigo-600" /> Pending
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-teal-600" /> In progress
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-slate-500" /> Completed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-600" /> Service start
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-600" /> Service expires
        </span>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-600 rounded-lg overflow-hidden text-[11px]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold py-2 text-center">
            {w}
          </div>
        ))}
        {rows.flatMap((row) =>
          row.map((cell) => {
            if (cell.type === 'empty') {
              return <div key={cell.key} className="bg-slate-50 dark:bg-slate-900 min-h-[5.5rem]" />
            }
            const key = padDateKey(cell.date)
            const dayJobs = jobsByDay.get(key) || []
            const dayEvents = eventsByDay.get(key) || []
            const entries = [
              ...dayJobs.map((j) => ({ type: 'job', key: String(j._id), j })),
              ...dayEvents.map((e, idx) => ({
                type: 'client',
                key: `ev-${e.client_id}-${e.kind}-${idx}`,
                e,
              })),
            ]
            const visible = entries.slice(0, 3)
            const more = entries.length - visible.length

            return (
              <div
                key={cell.key}
                className="bg-white dark:bg-slate-900 min-h-[5.5rem] p-1 border-t border-slate-100 dark:border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setDetail({ date: cell.date, key, jobs: dayJobs, clientEvents: dayEvents })}
                  className="w-full text-left text-slate-500 dark:text-slate-400 font-semibold mb-0.5 hover:text-teal-600 dark:hover:text-teal-400 rounded px-0.5"
                >
                  {cell.day}
                </button>
                <div className="space-y-0.5">
                  {visible.map((entry) => {
                    if (entry.type === 'job') {
                      const j = entry.j
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            navigate(`/jobs/${j._id}`)
                          }}
                          className={`block w-full text-left truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${
                            j.status === 'completed'
                              ? 'bg-slate-500'
                              : j.status === 'in-progress'
                                ? 'bg-teal-600'
                                : 'bg-indigo-600'
                          }`}
                          title={jobTooltip(j)}
                        >
                          {j.client_id?.name || 'Job'}
                        </button>
                      )
                    }
                    const ev = entry.e
                    return (
                      <button
                        key={entry.key}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/clients/${ev.client_id}`)
                        }}
                        className={`block w-full text-left truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${
                          ev.kind === 'service_start' ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                        title={
                          ev.kind === 'service_start'
                            ? `${ev.client_name} — service agreement start`
                            : `${ev.client_name} — service agreement expires`
                        }
                      >
                        {ev.client_name}
                      </button>
                    )
                  })}
                  {more > 0 && (
                    <button
                      type="button"
                      onClick={() => setDetail({ date: cell.date, key, jobs: dayJobs, clientEvents: dayEvents })}
                      className="text-[10px] text-teal-600 dark:text-teal-400 font-medium hover:underline w-full text-left px-1"
                    >
                      +{more} more
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {detail && (
        <DayDetailModal
          day={detail.date}
          jobs={detail.jobs}
          clientEvents={detail.clientEvents}
          onClose={() => setDetail(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}
