import React, { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import { buildRevenueSeries, revenueMovingAverage } from './revenueSeries'
import { useChartTheme } from './useChartTheme'

function formatMoney(v) {
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RevenueChart({ data, dayCount = 30 }) {
  const t = useChartTheme()
  const chartData = useMemo(() => {
    const base = buildRevenueSeries(data, dayCount)
    return revenueMovingAverage(base, Math.min(7, dayCount))
  }, [data, dayCount])

  const avgDaily =
    chartData.length > 0
      ? chartData.reduce((a, p) => a + p.total, 0) / chartData.length
      : 0

  const hasRevenue = (data || []).some((d) => Number(d.total) > 0)
  if (!hasRevenue) {
    return (
      <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
        No revenue in this period yet.
      </div>
    )
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="revenueMaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke={t.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: t.tick, fontSize: t.fontSize }}
            tickLine={false}
            axisLine={{ stroke: t.grid }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: t.tick, fontSize: t.fontSize }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <Tooltip
            cursor={{ stroke: t.grid, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload
              return (
                <div
                  className="rounded-xl px-3 py-2 shadow-lg border text-sm"
                  style={{
                    background: t.tooltipBg,
                    borderColor: t.tooltipBorder,
                    color: t.tooltipLabel,
                  }}
                >
                  <p className="text-xs font-medium opacity-80 mb-1">{row?.date || label}</p>
                  <p className="font-semibold text-teal-600 dark:text-teal-400">{formatMoney(row?.total || 0)}</p>
                  <p className="text-xs mt-1 text-indigo-600 dark:text-indigo-400">
                    {dayCount >= 7 ? `${7}d avg: ${formatMoney(row?.ma || 0)}` : `Avg: ${formatMoney(row?.ma || 0)}`}
                  </p>
                </div>
              )
            }}
          />
          {avgDaily > 0 && (
            <ReferenceLine
              y={avgDaily}
              stroke={t.dark ? '#64748b' : '#94a3b8'}
              strokeDasharray="4 4"
              label={{
                value: 'Period avg',
                position: 'insideTopRight',
                fill: t.tick,
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="ma"
            name="Moving avg"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#revenueMaFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Daily revenue"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#revenueAreaFill)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0, fill: '#14b8a6' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
        Teal: daily total · Indigo: rolling average · Dashed: mean across the selected range
      </p>
    </div>
  )
}
