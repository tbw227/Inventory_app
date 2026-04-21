import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useChartTheme } from './useChartTheme'

const TECH_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16']

function formatMoney(v) {
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function MoneyTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-xs shadow-lg border"
      style={{
        background: t.tooltipBg,
        borderColor: t.tooltipBorder,
        color: t.tooltipLabel,
      }}
    >
      <p className="font-medium">{p.name}</p>
      <p className="text-teal-600 dark:text-teal-400 font-semibold">{formatMoney(p.total)}</p>
      {p.count != null && <p className="opacity-70 mt-0.5">{p.count} payments</p>}
    </div>
  )
}

export function RevenueByTechnicianChart({ rows }) {
  const t = useChartTheme()
  const data = (rows || []).map((r) => ({
    name: r.name || 'Technician',
    total: r.total || 0,
    count: r.count,
  }))
  if (!data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
        No technician revenue in this range.
      </div>
    )
  }
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          barCategoryGap={12}
        >
          <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: t.tick, fontSize: t.fontSize }}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tick={{ fill: t.tick, fontSize: t.fontSize }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<MoneyTooltip t={t} />} cursor={{ fill: t.dark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }} />
          <Bar dataKey="total" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={TECH_COLORS[i % TECH_COLORS.length]} />
            ))}
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v) => formatMoney(v)}
              style={{ fill: t.tick, fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RevenueByJobChart({ rows }) {
  const t = useChartTheme()
  const data = (rows || []).slice(0, 12).map((r) => ({
    name: (r.client_name || 'Job').length > 22 ? `${(r.client_name || 'Job').slice(0, 20)}…` : r.client_name || 'Job',
    total: r.total || 0,
    job_id: r.job_id,
    count: r.payment_count,
  }))
  if (!data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
        No job revenue in this range.
      </div>
    )
  }
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: t.tick, fontSize: t.fontSize }}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: t.tick, fontSize: t.fontSize }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload
              return (
                <div
                  className="rounded-lg px-2.5 py-1.5 text-xs shadow-lg border max-w-[220px]"
                  style={{
                    background: t.tooltipBg,
                    borderColor: t.tooltipBorder,
                    color: t.tooltipLabel,
                  }}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-teal-600 dark:text-teal-400 font-semibold">{formatMoney(p.total)}</p>
                  {p.job_id && (
                    <Link to={`/jobs/${p.job_id}`} className="text-indigo-500 dark:text-indigo-400 hover:underline mt-1 inline-block">
                      Open job
                    </Link>
                  )}
                </div>
              )
            }}
            cursor={{ fill: t.dark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
          />
          <Bar dataKey="total" fill="#0d9488" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={26}>
            <LabelList
              dataKey="total"
              position="right"
              formatter={(v) => formatMoney(v)}
              style={{ fill: t.tick, fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
