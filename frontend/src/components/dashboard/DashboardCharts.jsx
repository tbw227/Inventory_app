import React from 'react'
import RevenueChart from './RevenueChart'
import { RevenueByTechnicianChart, RevenueByJobChart } from './RevenueBreakdownCharts'

const CARD = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'

export default function DashboardCharts({
  isAdmin,
  revenueOverTime,
  analyticsDays,
  revenueByTechnician,
  revenueByJob,
  open,
  onToggle,
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Analytics</h2>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-expanded={open}
        >
          {open ? 'Hide analytics' : 'Show analytics'}
        </button>
      </div>
      {open && (
        <>
          <div className={`${CARD} p-6`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revenue over time</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Zero-filled daily series with trend smoothing
            </p>
            <RevenueChart data={revenueOverTime} dayCount={analyticsDays} />
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className={`${CARD} p-5`}>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Revenue by technician</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Completed payments in the selected range</p>
                <RevenueByTechnicianChart rows={revenueByTechnician} />
              </div>
              <div className={`${CARD} p-5`}>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Top jobs by revenue</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Highest payment totals</p>
                <RevenueByJobChart rows={revenueByJob} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
