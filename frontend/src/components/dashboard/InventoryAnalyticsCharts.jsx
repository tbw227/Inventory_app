import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useChartTheme } from './useChartTheme'

function InvTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
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
      <p className="opacity-90">{p.value} SKUs</p>
    </div>
  )
}

const FIELD_PLANNED_COLOR = '#d97706'

function StockTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const planned = Number(row.quantity_planned_in_field) || 0
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-xs shadow-lg border max-w-[240px]"
      style={{
        background: t.tooltipBg,
        borderColor: t.tooltipBorder,
        color: t.tooltipLabel,
      }}
    >
      <p className="font-medium">{row.fullName || row.name}</p>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        Warehouse on hand:{' '}
        <span className="font-semibold tabular-nums" style={{ color: row.barColor || '#2563eb' }}>
          {row.quantity_on_hand}
        </span>
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Tech jobs (planned):{' '}
        <span className="font-semibold tabular-nums" style={{ color: FIELD_PLANNED_COLOR }}>
          {planned}
        </span>
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Reorder at: <span className="font-semibold">{row.reorder_threshold}</span>
      </p>
      <p className="text-[10px] uppercase tracking-wide mt-1 opacity-70">{row.health}</p>
    </div>
  )
}

function TechPlannedTooltip({ active, payload, t, techColor, technicianName }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-xs shadow-lg border max-w-[240px]"
      style={{
        background: t.tooltipBg,
        borderColor: t.tooltipBorder,
        color: t.tooltipLabel,
      }}
    >
      <p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">{technicianName}</p>
      <p className="font-medium">{row.fullName || row.name}</p>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        Planned qty:{' '}
        <span className="font-semibold tabular-nums" style={{ color: techColor }}>
          {row.quantity}
        </span>
      </p>
    </div>
  )
}

/** Pie slices: stock status (ok / low / critical) */
const STATUS_COLORS = {
  ok: '#2563eb',
  low: '#ca8a04',
  critical: '#db2777',
}

/** One distinct color per bar (top items); cycles if there are more rows than swatches */
const ITEM_BAR_COLORS = [
  '#2563eb',
  '#db2777',
  '#ca8a04',
  '#059669',
  '#7c3aed',
  '#ea580c',
  '#0d9488',
  '#be185d',
  '#4f46e5',
  '#16a34a',
  '#0891b2',
  '#a21caf',
  '#b45309',
  '#c026d3',
  '#0f766e',
  '#dc2626',
]

/** One color per technician (all of that tech’s bars use the same fill) */
const TECHNICIAN_COLORS = [
  '#2563eb',
  '#db2777',
  '#059669',
  '#7c3aed',
  '#ea580c',
  '#0891b2',
  '#ca8a04',
  '#4f46e5',
  '#0d9488',
  '#be185d',
  '#a21caf',
  '#b45309',
  '#16a34a',
  '#c026d3',
  '#0f766e',
]

function technicianMetaLine(tech) {
  const aj = tech.active_jobs ?? 0
  const bits = [`${aj} active job${aj === 1 ? '' : 's'}`]
  if (tech.total_units > 0) bits.push(`${tech.total_units.toLocaleString()} planned units`)
  else if (aj > 0 && tech.items.length === 0) bits.push('no supplies planned yet')
  return bits.join(' · ')
}

const MAX_COMBINED_SUPPLIES = 14

/** Pivot: top supply names by team total → one numeric column per technician for grouped bars */
function buildCombinedTechnicianSupplyRows(technicianInventory, maxSupplies = MAX_COMBINED_SUPPLIES) {
  const supplyTotals = new Map()
  for (const tech of technicianInventory) {
    for (const item of tech.items || []) {
      const k = String(item.name || '').trim()
      if (!k) continue
      supplyTotals.set(k, (supplyTotals.get(k) || 0) + (Number(item.quantity) || 0))
    }
  }
  if (supplyTotals.size === 0) {
    return { rows: [], techList: [] }
  }

  const topNames = [...supplyTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSupplies)
    .map(([name]) => name)

  const rows = topNames.map((supplyName) => {
    const row = {
      supplyLabel: supplyName.length > 22 ? `${supplyName.slice(0, 20)}…` : supplyName,
      fullSupplyName: supplyName,
    }
    for (const tech of technicianInventory) {
      const found = (tech.items || []).find((i) => String(i.name || '').trim() === supplyName)
      row[`qty_${tech.user_id}`] = found ? Number(found.quantity) || 0 : 0
    }
    return row
  })

  const techList = technicianInventory.map((tech) => ({
    user_id: tech.user_id,
    name: tech.name,
  }))
  return { rows, techList }
}

function CombinedTeamFieldTooltip({ active, payload, t, techList }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const positives = payload
    .filter((p) => p && String(p.dataKey || '').startsWith('qty_') && Number(p.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value))

  return (
    <div
      className="rounded-lg px-2.5 py-1.5 text-xs shadow-lg border max-w-[280px] z-50"
      style={{
        background: t.tooltipBg,
        borderColor: t.tooltipBorder,
        color: t.tooltipLabel,
      }}
    >
      <p className="font-semibold border-b border-slate-200 dark:border-slate-600 pb-1 mb-1.5">{row.fullSupplyName}</p>
      {positives.length === 0 ? (
        <p className="opacity-70">No technician quantities for this row</p>
      ) : (
        <ul className="space-y-1">
          {positives.map((p) => {
            const uid = String(p.dataKey).replace('qty_', '')
            const idx = techList.findIndex((x) => String(x.user_id) === uid)
            const tech = idx >= 0 ? techList[idx] : null
            const color = TECHNICIAN_COLORS[idx >= 0 ? idx % TECHNICIAN_COLORS.length : 0]
            return (
              <li key={String(p.dataKey)} className="flex justify-between gap-3 tabular-nums">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="truncate">{tech?.name || 'Technician'}</span>
                </span>
                <span className="font-semibold shrink-0">{p.value}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function TeamFieldCombinedChart({ technicianInventory, t }) {
  const { rows, techList } = useMemo(
    () => buildCombinedTechnicianSupplyRows(technicianInventory),
    [technicianInventory]
  )

  if (techList.length === 0) return null

  if (rows.length === 0) {
    return (
      <div className="mb-6 h-[200px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/40 dark:bg-slate-800/20 px-4 text-center">
        No planned supplies on active jobs yet. The team chart appears when technicians have planned items on pending or
        in-progress jobs.
      </div>
    )
  }

  const chartHeight = Math.min(560, Math.max(280, rows.length * 36 + 88))
  const barSize = techList.length > 8 ? 8 : techList.length > 5 ? 11 : 14

  return (
    <div className="mb-8 min-w-0">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Team field inventory — all technicians</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 max-w-3xl">
        Top {rows.length} supplies by total planned units across the team. Each colored bar is a technician; compare who
        has what allocated on active jobs.
      </p>
      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 20, left: 4, bottom: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
            <XAxis type="number" tick={{ fill: t.tick, fontSize: t.fontSize }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="supplyLabel"
              width={120}
              tick={{ fill: t.tick, fontSize: t.fontSize }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CombinedTeamFieldTooltip t={t} techList={techList} />}
              cursor={{ fill: t.dark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: t.tick }}>{value}</span>}
            />
            {techList.map((tech, idx) => (
              <Bar
                key={String(tech.user_id)}
                dataKey={`qty_${tech.user_id}`}
                name={tech.name}
                fill={TECHNICIAN_COLORS[idx % TECHNICIAN_COLORS.length]}
                radius={[0, 4, 4, 0]}
                maxBarSize={barSize}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TechnicianShopStyleChart({ tech, techColor, t }) {
  const barData = useMemo(
    () =>
      (tech.items || []).map((item) => ({
        name: item.name.length > 18 ? `${item.name.slice(0, 16)}…` : item.name,
        fullName: item.name,
        quantity: Number(item.quantity) || 0,
      })),
    [tech.items]
  )

  const chartHeight = Math.min(320, Math.max(120, barData.length * 34 + 56))

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/60 p-4 shadow-sm min-w-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-800" style={{ background: techColor }} />
          <div className="min-w-0">
            <Link
              to={`/users/${tech.user_id}`}
              className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
            >
              {tech.name}
            </Link>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{technicianMetaLine(tech)}</p>
          </div>
        </div>
      </div>

      {barData.length === 0 ? (
        <div className="h-[140px] flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
          No planned supplies on active jobs.
        </div>
      ) : (
        <div className="w-full min-w-0" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              barCategoryGap={8}
            >
              <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: t.tick, fontSize: t.fontSize }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: t.tick, fontSize: t.fontSize }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={(props) => (
                  <TechPlannedTooltip {...props} t={t} techColor={techColor} technicianName={tech.name} />
                )}
                cursor={{ fill: t.dark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)' }}
              />
              <Bar dataKey="quantity" name="Planned" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {barData.map((_, i) => (
                  <Cell key={`${tech.user_id}-${i}`} fill={techColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function InventoryAnalyticsCharts({ analytics, viewerRole = 'admin' }) {
  const t = useChartTheme()
  const pieDataRaw = analytics?.pie_data || []
  const pieData = useMemo(
    () =>
      pieDataRaw.map((p) => ({
        ...p,
        fill: STATUS_COLORS[p.key] || p.fill || '#64748b',
      })),
    [pieDataRaw]
  )
  const top = analytics?.top_by_quantity || []
  const totalSkus = analytics?.total_skus ?? 0
  const totalUnits = analytics?.total_units ?? 0
  const totalTechPlanned = analytics?.total_tech_planned_units ?? 0
  const technicianInventory = analytics?.technician_inventory || []

  const barData = useMemo(
    () =>
      top.map((r, i) => ({
        ...r,
        quantity_planned_in_field: Number(r.quantity_planned_in_field) || 0,
        name: r.name.length > 18 ? `${r.name.slice(0, 16)}…` : r.name,
        fullName: r.name,
        barColor: ITEM_BAR_COLORS[i % ITEM_BAR_COLORS.length],
      })),
    [top]
  )

  const isAdminView = viewerRole === 'admin'
  const techSelf = !isAdminView ? technicianInventory[0] : null

  if (!isAdminView) {
    return (
      <div className="min-w-0 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Your field inventory
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-2xl">
          Planned supply quantities on your <span className="font-medium text-slate-600 dark:text-slate-300">pending</span>{' '}
          and <span className="font-medium text-slate-600 dark:text-slate-300">in-progress</span> jobs.
        </p>
        {techSelf ? (
          <TechnicianShopStyleChart tech={techSelf} techColor={TECHNICIAN_COLORS[0]} t={t} />
        ) : (
          <div className="h-[160px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl px-4 text-center">
            No planned supplies on your active jobs yet. Open a job and add planned supplies to see them here.
          </div>
        )}
      </div>
    )
  }

  const hasWarehouseSkus = totalSkus > 0
  const hasTechnicianSection = technicianInventory.length > 0

  if (!hasWarehouseSkus && !hasTechnicianSection) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl px-4 text-center">
        Add supplies and assign technicians to jobs with planned items to see inventory analytics.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-w-0">
      {hasWarehouseSkus ? (
        <>
      <div className="lg:col-span-2 flex flex-col min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
          Stock status
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {totalSkus} <span className="text-sm font-normal text-slate-500">SKUs</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          {totalUnits.toLocaleString()} units on hand
        </p>
        <div className="h-[220px] w-full min-w-0 flex-1 min-h-[200px]">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 border border-dashed rounded-xl">
              No status breakdown
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke={t.tooltipBg}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<InvTooltip t={t} />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="flex flex-wrap gap-3 text-xs mt-2">
          {pieData.map((p) => (
            <li key={p.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
              <span className="text-slate-600 dark:text-slate-300">
                {p.name}: <strong>{p.value}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-3 min-h-[280px] min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Warehouse vs tech field (top items)
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          Grouped bars: warehouse on hand and planned quantities on technician{' '}
          <span className="font-medium text-slate-600 dark:text-slate-300">pending</span> /{' '}
          <span className="font-medium text-slate-600 dark:text-slate-300">in-progress</span> jobs (matched by supply
          name).{' '}
          {totalTechPlanned > 0 && (
            <span className="tabular-nums">
              Total planned on tech jobs: <strong>{totalTechPlanned.toLocaleString()}</strong> units.
            </span>
          )}
        </p>
        <div className="h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={320} minWidth={0}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              barCategoryGap={8}
            >
              <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: t.tick, fontSize: t.fontSize }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: t.tick, fontSize: t.fontSize }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<StockTooltip t={t} />} cursor={{ fill: t.dark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                formatter={(value) => <span style={{ color: t.tick }}>{value}</span>}
              />
              <Bar dataKey="quantity_on_hand" name="Warehouse (on hand)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {barData.map((row, i) => (
                  <Cell key={`wh-${row.fullName || row.name}-${i}`} fill={row.barColor} />
                ))}
              </Bar>
              <Bar
                dataKey="quantity_planned_in_field"
                name="Tech jobs (planned)"
                fill={FIELD_PLANNED_COLOR}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {hasTechnicianSection && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Per-technician breakdown below. Adjust reorder thresholds on the supplies page.
          </p>
        )}
      </div>
        </>
      ) : (
        <div className="lg:col-span-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/20 py-8 px-4 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No warehouse SKUs yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Add supplies on the <span className="font-medium">Supplies</span> page to unlock stock health and warehouse
            vs field charts.
          </p>
          {hasTechnicianSection && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 max-w-lg mx-auto">
              Technician field inventory is shown below for planned items on active jobs.
            </p>
          )}
        </div>
      )}

      {hasTechnicianSection && (
        <div className="lg:col-span-5 mt-2 pt-6 border-t border-slate-200 dark:border-slate-700 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
            Technician field inventory
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 max-w-3xl">
            Planned quantities on{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">pending</span> /{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">in-progress</span> jobs. The team chart
            below compares every technician on the same supplies; individual cards show each tech in detail.
          </p>
          <TeamFieldCombinedChart technicianInventory={technicianInventory} t={t} />
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-2">By technician</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-5">
            {technicianInventory.map((tech, idx) => {
              const c = TECHNICIAN_COLORS[idx % TECHNICIAN_COLORS.length]
              return (
                <li key={String(tech.user_id)} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
                  <Link
                    to={`/users/${tech.user_id}`}
                    className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                  >
                    {tech.name}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            {technicianInventory.map((tech, idx) => (
              <TechnicianShopStyleChart
                key={String(tech.user_id)}
                tech={tech}
                techColor={TECHNICIAN_COLORS[idx % TECHNICIAN_COLORS.length]}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
