import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import { useAuth } from '../context/AuthContext'
import { getDashboardAccent } from '../config/dashboardAccents'
import { mediaUrl } from '../utils/mediaUrl'
import { useDashboardData } from '../hooks/useDashboardData'
import { useCalendarData } from '../hooks/useCalendarData'
import DashboardHero from '../components/dashboard/DashboardHero'
import DashboardKpis from '../components/dashboard/DashboardKpis'
import DashboardCharts from '../components/dashboard/DashboardCharts'
import JobCalendar from '../components/dashboard/JobCalendar'
import InventoryAnalyticsCharts from '../components/dashboard/InventoryAnalyticsCharts'
import Avatar from '../components/ui/Avatar'

const DEFAULT_ADMIN_AVATAR = '/images/default-admin-avatar.jpg'
const CARD = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'
const SKELETON_PULSE = 'rounded-xl bg-slate-200/90 dark:bg-slate-700/80 animate-pulse'

function getFirstName(name) {
  if (!name?.trim()) return 'there'
  return name.trim().split(/\s+/)[0]
}

function SkeletonBlock({ className }) {
  return <div className={`${SKELETON_PULSE} ${className}`} />
}

export default function Dashboard() {
  const { user } = useAuth()
  const location = useLocation()
  const { data, loading, heavyLoading, err, chartDays, setChartDays } = useDashboardData(30)
  const { calendarJobs, calendarClientEvents } = useCalendarData({ includeClientEvents: user?.role === 'admin' })
  const [chartsOpen, setChartsOpen] = useState(false)
  const [inventoryAlertsOpen, setInventoryAlertsOpen] = useState(false)
  const inventoryAlertsRef = useRef(null)

  const todayRef = useRef(null)
  const scheduleRef = useRef(null)
  const analyticsRef = useRef(null)

  useEffect(() => {
    setChartsOpen(false)
  }, [])

  useEffect(() => {
    if (!inventoryAlertsOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setInventoryAlertsOpen(false)
    }
    const onMouseDown = (e) => {
      const el = inventoryAlertsRef.current
      if (!el || el.contains(e.target)) return
      setInventoryAlertsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
    }
  }, [inventoryAlertsOpen])

  useEffect(() => {
    const jump = location.state?.jump
    if (!jump) return
    if (jump === 'today') scrollToRef(todayRef)
    if (jump === 'schedule') scrollToRef(scheduleRef)
    if (jump === 'analytics') scrollToRef(analyticsRef)
    window.history.replaceState({}, document.title)
  }, [location.state, todayRef, scheduleRef, analyticsRef])

  const awaitingFirstPayload = Boolean(loading && data == null && !err)
  const failedFirstLoad = Boolean(err && data == null)
  const hasHeavyPayload = Boolean(data && Object.prototype.hasOwnProperty.call(data, 'analytics'))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const displayName = user?.name?.trim() || 'Team member'
  const firstName = getFirstName(user?.name)
  const isAdmin = user?.role === 'admin'
  const accent = getDashboardAccent(user?.preferences?.dashboard_accent)
  const heroAvatarSrc = user?.photo_url
    ? mediaUrl(user.photo_url)
    : isAdmin
      ? DEFAULT_ADMIN_AVATAR
      : undefined

  const {
    todayJobs = 0,
    completedToday = 0,
    pendingToday = 0,
    recentReports = [],
    lowInventory = [],
    analytics = {},
    inventory_analytics = null,
  } = data || {}

  const {
    total_revenue = 0,
    completed_payments = 0,
    revenue_over_time = [],
    revenue_by_technician = [],
    revenue_by_job = [],
    total_jobs = 0,
    jobs_completed = 0,
    days: analyticsDays = chartDays,
  } = analytics

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const recentReportRows = useMemo(() => recentReports || [], [recentReports])
  const lowStockRows = useMemo(() => (Array.isArray(lowInventory) ? lowInventory : []), [lowInventory])
  const alertCount = lowStockRows.length

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col space-y-6">
      <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div ref={inventoryAlertsRef} className="relative">
          <button
            type="button"
            onClick={() => setInventoryAlertsOpen((v) => !v)}
            aria-expanded={inventoryAlertsOpen}
            aria-label="Inventory alerts"
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-700 transition-opacity hover:opacity-75 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {alertCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            ) : null}
          </button>
          {inventoryAlertsOpen && (
            <div
              className="absolute right-0 z-50 mt-1 w-[min(calc(100vw-2rem),18rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-600 dark:bg-slate-900"
              role="dialog"
              aria-label="Low stock items"
            >
              <p className="border-b border-slate-100 px-2 pb-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                Inventory alerts
              </p>
              {!data ? (
                <p className="px-2 py-3 text-xs text-slate-500 dark:text-slate-400">Loading…</p>
              ) : alertCount === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-600 dark:text-slate-300">Nothing at or below reorder right now.</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto py-1 text-xs">
                  {lowStockRows.slice(0, 12).map((row) => (
                    <li
                      key={row._id || row.name}
                      className="truncate px-2 py-1.5 text-slate-700 dark:text-slate-200"
                      title={row.name}
                    >
                      <span className="font-medium">{row.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}
                        · {row.quantity_on_hand} / {row.reorder_threshold}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to={ROUTES.SUPPLIES}
                onClick={() => setInventoryAlertsOpen(false)}
                className={`mt-1 block rounded-lg px-2 py-2 text-center text-xs font-semibold ${accent.pageLinkStrong} hover:underline`}
              >
                Open inventory
              </Link>
            </div>
          )}
        </div>
        <Link
          to={ROUTES.SETTINGS}
          aria-label="Account settings"
          title="Account settings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-700 transition-opacity hover:opacity-75 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.065 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>

      <DashboardHero
        accent={accent}
        user={user}
        greeting={greeting}
        firstName={firstName}
        displayName={displayName}
        isAdmin={isAdmin}
        heroAvatarSrc={heroAvatarSrc}
      />

      {failedFirstLoad && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md px-4 py-3" role="alert">
          {err}
        </div>
      )}

      {awaitingFirstPayload && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            {isAdmin && <SkeletonBlock className="h-24" />}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonBlock className="lg:col-span-2 h-[24rem]" />
            <SkeletonBlock className="h-[24rem]" />
          </div>
        </div>
      )}

      {data && (
        <>
          <section ref={todayRef} className="space-y-6">
            <DashboardKpis
              isAdmin={isAdmin}
              accent={accent}
              todayJobs={todayJobs}
              completedToday={completedToday}
              pendingToday={pendingToday}
              totalRevenue={total_revenue}
              completedPayments={completed_payments}
              totalJobs={total_jobs}
              jobsCompleted={jobs_completed}
              analyticsDays={analyticsDays}
              chartDays={chartDays}
              setChartDays={setChartDays}
            />
          </section>

          <section ref={scheduleRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <JobCalendar jobs={calendarJobs} clientEvents={calendarClientEvents} />
            </div>
            <aside className="space-y-6">
              <div className={`${CARD} p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Completed Jobs</h2>
                  <Link to={ROUTES.HISTORY} className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${accent.pageLinkStrong}`}>
                    See all
                  </Link>
                </div>
                {recentReportRows.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No completed jobs yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentReportRows.map((job) => {
                      const techName = job.assigned_user_id?.name
                      return (
                        <li key={job._id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{job.client_id?.name || 'Unknown client'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : ''}
                              </p>
                              {techName && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                                  <Avatar name={techName} size="sm" />
                                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{techName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Link to={`${ROUTES.JOBS}/${job._id}`} className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium hover:underline ${accent.pageLinkStrong}`}>
                            Open
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </section>

          <section ref={analyticsRef} className="space-y-6">
            {hasHeavyPayload && inventory_analytics ? (
              <div className={`${CARD} p-6`}>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {isAdmin ? 'Inventory summary' : 'Field inventory'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                  {isAdmin
                    ? 'Quick stock overview for your team'
                    : 'Supplies planned for your active jobs'}
                </p>
                <InventoryAnalyticsCharts analytics={inventory_analytics} viewerRole={isAdmin ? 'admin' : 'technician'} />
              </div>
            ) : (
              <div className={`${CARD} p-6 animate-pulse`}>
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
                <div className="h-3 w-60 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
                <div className="h-56 w-full rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            )}
            <DashboardCharts
              isAdmin={isAdmin}
              revenueOverTime={revenue_over_time}
              analyticsDays={analyticsDays}
              revenueByTechnician={revenue_by_technician}
              revenueByJob={revenue_by_job}
              loading={heavyLoading && !hasHeavyPayload}
              open={chartsOpen}
              onToggle={() => setChartsOpen((open) => !open)}
            />
          </section>
        </>
      )}
    </div>
  )
}
