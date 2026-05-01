import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/routes'

const CARD = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'

export default function DashboardKpis({
  isAdmin,
  accent,
  todayJobs,
  completedToday,
  pendingToday,
  totalRevenue,
  completedPayments,
  totalJobs,
  jobsCompleted,
  analyticsDays,
  chartDays,
  setChartDays,
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to={ROUTES.JOBS}
          className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 shadow-md text-white flex items-start gap-4 transition-transform hover:scale-[1.01]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">{"Today's Jobs"}</p>
            <p className="mt-1 text-4xl font-bold">{todayJobs}</p>
            <p className="mt-1 text-xs text-blue-100">{pendingToday} left · {completedToday} done</p>
          </div>
        </Link>
        <Link
          to={ROUTES.HISTORY}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-md text-white flex items-start gap-4 transition-transform hover:scale-[1.01]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Done Today</p>
            <p className="mt-1 text-4xl font-bold">{completedToday}</p>
            <p className="mt-1 text-xs text-emerald-100">Jobs finished today.</p>
          </div>
        </Link>
        <Link
          to={`${ROUTES.JOBS}?status=pending`}
          className="rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 p-5 shadow-md text-white flex items-start gap-4 transition-transform hover:scale-[1.01]"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-100">Left Today</p>
            <p className="mt-1 text-4xl font-bold">{pendingToday}</p>
            <p className="mt-1 text-xs text-orange-100">Still waiting to be done.</p>
          </div>
        </Link>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {isAdmin && (
          <div className={`${CARD} p-5`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Revenue ({analyticsDays}d)
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{completedPayments} paid jobs</p>
          </div>
        )}
        <div className={`${CARD} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">All jobs</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{totalJobs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">For your team</p>
        </div>
        <div className={`${CARD} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Jobs done</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{jobsCompleted}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total completed</p>
        </div>
        <div className={`${CARD} p-5 flex flex-col justify-center`}>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Time range</p>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setChartDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartDays === d
                    ? accent.chartSelected
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
