import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const { data, loading, err, chartDays, setChartDays } = useDashboardData(30)
  const { calendarJobs, calendarClientEvents } = useCalendarData()
  const [chartsOpen, setChartsOpen] = useState(false)

  const todayRef = useRef(null)
  const scheduleRef = useRef(null)
  const analyticsRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setChartsOpen(window.matchMedia('(min-width: 1024px)').matches)
  }, [])

  const awaitingFirstPayload = Boolean(loading && data == null && !err)
  const failedFirstLoad = Boolean(err && data == null)

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
    lowInventory = [],
    recentReports = [],
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

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col space-y-6">
      <DashboardHero
        accent={accent}
        user={user}
        greeting={greeting}
        firstName={firstName}
        displayName={displayName}
        isAdmin={isAdmin}
        heroAvatarSrc={heroAvatarSrc}
        onJump={(section) => {
          if (section === 'today') scrollToRef(todayRef)
          if (section === 'schedule') scrollToRef(scheduleRef)
          if (section === 'analytics') scrollToRef(analyticsRef)
        }}
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
                  <h2 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Inventory Health</h2>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${lowInventory.length > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>
                    {lowInventory.length > 0 ? `${lowInventory.length} alerts` : 'All good'}
                  </span>
                </div>
                {lowInventory.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">All items are well stocked.</p>
                ) : (
                  <ul className="space-y-2">
                    {lowInventory.map((s) => (
                      <li key={s._id || s.name} className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 px-3 py-2.5">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100">{s.name}</p>
                        <p className="text-xs text-orange-700 dark:text-orange-300">{s.quantity_on_hand} left · threshold {s.reorder_threshold}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to={ROUTES.SUPPLIES} className={`mt-4 inline-flex items-center gap-1 text-xs font-medium hover:underline ${accent.pageLink}`}>
                  Go to inventory
                </Link>
              </div>

              <div className={`${CARD} p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Service Reports</h2>
                  <Link to={ROUTES.HISTORY} className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${accent.pageLinkStrong}`}>
                    View all
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
                            View
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
            {inventory_analytics && (
              <div className={`${CARD} p-6`}>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {isAdmin ? 'Inventory analytics' : 'Field inventory'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                  {isAdmin
                    ? 'SKU health, warehouse vs tech-planned quantities on active jobs, and per-technician field breakdown'
                    : 'Planned supplies on your pending and in-progress jobs'}
                </p>
                <InventoryAnalyticsCharts analytics={inventory_analytics} viewerRole={isAdmin ? 'admin' : 'technician'} />
              </div>
            )}
            <DashboardCharts
              isAdmin={isAdmin}
              revenueOverTime={revenue_over_time}
              analyticsDays={analyticsDays}
              revenueByTechnician={revenue_by_technician}
              revenueByJob={revenue_by_job}
              open={chartsOpen}
              onToggle={() => setChartsOpen((open) => !open)}
            />
          </section>
        </>
      )}
    </div>
  )
}
