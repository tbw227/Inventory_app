import React, { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartTheme } from './useChartTheme'

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16']
const COMPANY_COLOR = '#0d9488'

function fmt(v) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

export default function HeroRevenueChart({ totalRevenue = 0, revenueByTechnician = [], days }) {
  const t = useChartTheme()

  const chartData = useMemo(() => {
    const techs = (revenueByTechnician || []).map((r, i) => ({
      name: r.name || 'Tech',
      total: r.total || 0,
      fill: COLORS[i % COLORS.length],
    }))
    return [
      { name: 'Company', total: totalRevenue || 0, fill: COMPANY_COLOR },
      ...techs,
    ]
  }, [totalRevenue, revenueByTechnician])

  const hasRevenue = chartData.some((d) => d.total > 0)

  if (!hasRevenue) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-400">
        No revenue data yet.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revenue</h3>
        {days != null && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Last {days}d</span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: t.tick, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: t.tick, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: t.dark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload
                return (
                  <div
                    className="rounded-lg border px-2.5 py-1.5 text-xs shadow-lg"
                    style={{
                      background: t.tooltipBg,
                      borderColor: t.tooltipBorder,
                      color: t.tooltipLabel,
                    }}
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="font-semibold text-teal-600 dark:text-teal-400">
                      ${Number(p.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={24}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
