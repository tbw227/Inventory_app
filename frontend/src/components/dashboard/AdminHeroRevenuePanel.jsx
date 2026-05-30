import React from 'react'
import RevenueChart from './RevenueChart'
import { RevenueByTechnicianChart, RevenueByJobChart } from './RevenueBreakdownCharts'

const CARD = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'

function ChartSkeleton() {
  return (
    <div className={`${CARD} p-5 animate-pulse`}>
      <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
      <div className="h-48 w-full rounded bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

/**
 * Admin revenue charts beside the profile hero — revenue over time + breakdowns.
 */
export default function AdminHeroRevenuePanel({
  accent,
  revenueOverTime = [],
  revenueByTechnician = [],
  revenueByJob = [],
  analyticsDays,
  chartDays,
  setChartDays,
  loading = false,
  demo = false,
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className={`${CARD} p-4 sm:p-5`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revenue</h2>
              {demo && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                  Demo data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Last {analyticsDays ?? chartDays} days
            </p>
          </div>
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
                {d}d
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-52 rounded-xl bg-slate-200/90 dark:bg-slate-700/80 animate-pulse" />
        ) : (
          <RevenueChart data={revenueOverTime} dayCount={analyticsDays ?? chartDays} />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={`${CARD} p-4 sm:p-5`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">By technician</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 mt-0.5">Paid jobs in this range</p>
            <RevenueByTechnicianChart rows={revenueByTechnician} />
          </div>
          <div className={`${CARD} p-4 sm:p-5`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Top jobs</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 mt-0.5">Highest earning jobs</p>
            <RevenueByJobChart rows={revenueByJob} />
          </div>
        </div>
      )}
    </div>
  )
}
