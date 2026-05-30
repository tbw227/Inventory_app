import React, { useMemo, useState } from 'react'
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
import { useChartTheme } from '../dashboard/useChartTheme'
import { formatSupplyCatalogLines, shopQuantityOnHand } from '../../utils/supplyDisplay'
import { computeShopHealthCounts } from '../../utils/inventoryStats'

function feUnitsForClient(c) {
  return (c.stations || []).reduce((sum, st) => {
    return (
      sum +
      (st.station_inventory || []).reduce((s, row) => {
        if (!row?.is_fire_extinguisher) return s
        return s + (Number(row.quantity) || 0)
      }, 0)
    )
  }, 0)
}

function allSiteUnitsForClient(c) {
  return (c.stations || []).reduce((sum, st) => {
    return (
      sum +
      (st.station_inventory || []).reduce((s, row) => s + (Number(row.quantity) || 0), 0)
    )
  }, 0)
}

function truncateLabel(s, max = 16) {
  if (!s) return ''
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function formatUsd(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n) || 0)
}

function effectiveListUnitPrice(s) {
  const u = s.unit_price
  if (u != null && u !== '' && !Number.isNaN(Number(u))) return Number(u)
  const m = s.min_order_unit_price
  if (m != null && m !== '' && !Number.isNaN(Number(m))) return Number(m)
  return null
}

function lineOnHandValue(s) {
  const q = shopQuantityOnHand(s)
  const p = effectiveListUnitPrice(s)
  if (p == null) return 0
  return q * p
}

function categoryHasUnitPrices(items) {
  return (items || []).some((s) => effectiveListUnitPrice(s) != null)
}

const COL_OK = '#10b981'
const COL_LOW = '#f59e0b'
const COL_SHOP = '#0d9488'
const COL_SITES = '#6366f1'
const COL_FE = '#d97706'

const CATEGORY_BAR_COLORS = [
  '#0d9488',
  '#6366f1',
  '#d97706',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f43f5e',
  '#64748b',
  '#84cc16',
  '#06b6d4',
]

const CATEGORY_LAYOUTS = [
  { id: 'grid', label: 'Grid' },
  { id: 'stack', label: 'Stack' },
  { id: 'compact', label: 'Compact' },
  { id: 'bars', label: 'Bar chart' },
]

/** Stable category → chart color (same order as shopByCategory cards). */
function buildCategoryColorMap(groups) {
  const map = new Map()
  ;(groups || []).forEach((g, i) => {
    map.set(g.category, CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length])
  })
  return map
}

function categoryColor(map, category) {
  const key = (category || 'General').trim() || 'General'
  return map.get(key) || CATEGORY_BAR_COLORS[0]
}

function CategoryLegend({ groups, categoryColorMap }) {
  if (!groups?.length) return null
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
      {groups.map((g) => {
        const color = categoryColor(categoryColorMap, g.category)
        return (
          <li key={g.category} className="inline-flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-300">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="truncate max-w-[12rem]" title={g.category}>
              {g.category}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function CategoryCardsSection({ groups, layoutId, t, categoryColorMap }) {
  if (!groups.length) return null

  if (layoutId === 'bars') {
    const data = groups.map((g) => ({
      fullName: g.category,
      name: truncateLabel(g.category, 30),
      skus: g.skuCount,
    }))
    return (
      <div style={{ height: Math.min(400, Math.max(200, data.length * 36)) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: t.tick, fontSize: t.fontSize }} />
            <YAxis
              type="category"
              dataKey="name"
              width={200}
              tick={{ fill: t.tick, fontSize: t.fontSize }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: t.tooltipBg,
                border: `1px solid ${t.tooltipBorder}`,
                borderRadius: 8,
                color: t.tooltipLabel,
                fontSize: 12,
              }}
              formatter={(v) => [Number(v).toLocaleString(), 'SKUs']}
              labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ''}
              cursor={{ fill: t.dark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)' }}
            />
            <Bar dataKey="skus" radius={[0, 6, 6, 0]} maxBarSize={26}>
              {data.map((entry) => (
                <Cell key={entry.fullName} fill={categoryColor(categoryColorMap, entry.fullName)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const gridClass =
    layoutId === 'stack'
      ? 'grid grid-cols-1 gap-4 max-w-4xl mx-auto w-full'
      : layoutId === 'compact'
        ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
        : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'

  return (
    <div className={gridClass}>
      {groups.map((g) => {
        const accent = categoryColor(categoryColorMap, g.category)
        const isCompact = layoutId === 'compact'
        const showLimit = isCompact ? 5 : 12
        const visible = g.items.slice(0, showLimit)
        const rest = g.items.slice(showLimit)
        const more = rest.length
        const textSize = isCompact ? 'text-[10px]' : 'text-xs'

        const renderItemRow = (s, { hoverReveal = false } = {}) => {
          const qoh = shopQuantityOnHand(s)
          const low = qoh <= (Number(s.reorder_threshold) || 0)
          const { titleLine, secondaryQty, specQty } = formatSupplyCatalogLines(s.name, s)
          const showLow = specQty == null && low
          return (
            <li
              key={s._id}
              className={[
                'px-3 py-2 bg-white/60 dark:bg-slate-900/30',
                hoverReveal ? 'hidden group-hover:block' : 'block',
              ].join(' ')}
            >
              <p
                className="text-gray-700 dark:text-gray-300 break-words leading-snug"
                title={s.name}
              >
                {isCompact ? truncateLabel(titleLine, 40) : titleLine}
              </p>
              {secondaryQty != null && (
                <p
                  className={[
                    'mt-0.5 tabular-nums font-semibold leading-none',
                    showLow
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-900 dark:text-white',
                  ].join(' ')}
                >
                  {secondaryQty}
                </p>
              )}
            </li>
          )
        }

        return (
          <article
            key={g.category}
            className={[
              'group rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/40 overflow-hidden flex flex-col shadow-sm',
              'transition-[box-shadow,transform,border-color] duration-200 ease-out',
              'hover:shadow-lg hover:-translate-y-0.5 hover:border-teal-300/60 dark:hover:border-teal-600/50',
              isCompact ? 'min-h-0' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className="px-3 py-2.5 border-b border-gray-200/80 dark:border-slate-600/80 flex items-start justify-between gap-2"
              style={{ borderLeftWidth: 4, borderLeftColor: accent, borderLeftStyle: 'solid' }}
            >
              <div className="min-w-0">
                <h4
                  className={[
                    'font-semibold text-gray-900 dark:text-white leading-tight',
                    isCompact ? 'text-xs' : 'text-sm',
                  ].join(' ')}
                >
                  {g.category}
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                  {g.skuCount} SKU{g.skuCount === 1 ? '' : 's'}
                  {!isCompact && (
                    <>
                      {' · '}
                      {g.unitsOnHand.toLocaleString()} on hand
                      {g.lowCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {' · '}
                          {g.lowCount} at/below reorder
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums text-white"
                style={{ backgroundColor: accent }}
              >
                {g.skuCount}
              </span>
            </div>
            <ul className={['flex-1 divide-y divide-gray-200/70 dark:divide-slate-700/80', textSize].join(' ')}>
              {visible.map((s) => renderItemRow(s))}
              {more > 0 && (
                <li className="px-3 py-1.5 group-hover:hidden bg-white/40 dark:bg-slate-900/20 border-t border-dashed border-gray-200 dark:border-slate-600">
                  <p className="text-center text-[10px] text-gray-500 dark:text-gray-400">
                    +{more} more —{' '}
                    <span className="font-medium text-teal-600 dark:text-teal-400">hover card to show</span>
                  </p>
                </li>
              )}
              {more > 0 && rest.map((s) => renderItemRow(s, { hoverReveal: true }))}
            </ul>
            <div className="mt-auto px-3 py-2.5 border-t border-gray-200 dark:border-slate-600 bg-white/90 dark:bg-slate-900/60">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  On-hand total
                </span>
                <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                  {g.hasUnitPrices ? formatUsd(g.valueOnHand) : '—'}
                </span>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                {g.hasUnitPrices
                  ? 'Qty × unit price (catalog cost), summed for this category.'
                  : 'Sign in as admin to load unit prices for value totals.'}
              </p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default function InventoryOverviewCharts({ shop, clients }) {
  const t = useChartTheme()
  const [categoryLayout, setCategoryLayout] = useState('grid')

  const shopHealth = useMemo(() => {
    const { healthy: ok, atOrBelowReorder: low } = computeShopHealthCounts(shop)
    const rows = [
      { name: 'Healthy', value: ok, fill: COL_OK },
      { name: 'At / below reorder', value: low, fill: COL_LOW },
    ].filter((r) => r.value > 0)
    return { ok, low, pieRows: rows, hasData: ok + low > 0 }
  }, [shop])

  const shopByCategory = useMemo(() => {
    const m = new Map()
    for (const s of shop || []) {
      const c = (s.category || 'General').trim() || 'General'
      if (!m.has(c)) m.set(c, [])
      m.get(c).push(s)
    }
    return [...m.entries()]
      .map(([category, items]) => {
        const sorted = [...items].sort((a, b) => String(a.name).localeCompare(String(b.name)))
        const unitsOnHand = sorted.reduce((n, s) => n + shopQuantityOnHand(s), 0)
        const lowCount = sorted.filter(
          (s) => shopQuantityOnHand(s) <= (Number(s.reorder_threshold) || 0)
        ).length
        const hasUnitPrices = categoryHasUnitPrices(sorted)
        const valueOnHand = sorted.reduce((n, s) => n + lineOnHandValue(s), 0)
        return {
          category,
          items: sorted,
          skuCount: sorted.length,
          unitsOnHand,
          lowCount,
          valueOnHand,
          hasUnitPrices,
        }
      })
      .sort((a, b) => b.skuCount - a.skuCount)
  }, [shop])

  const categoryColorMap = useMemo(() => buildCategoryColorMap(shopByCategory), [shopByCategory])

  const shopBars = useMemo(() => {
    const rows = (shop || [])
      .map((s) => {
        const q = shopQuantityOnHand(s)
        const th = Number(s.reorder_threshold) || 0
        const category = (s.category || 'General').trim() || 'General'
        const low = q <= th
        return {
          name: truncateLabel(s.name, 18),
          fullName: s.name,
          category,
          quantity: q,
          threshold: th,
          low,
          fill: categoryColor(categoryColorMap, category),
        }
      })
      .sort((a, b) => b.quantity - a.quantity)
    return rows
  }, [shop, categoryColorMap])

  const shopVsSites = useMemo(() => {
    const shopUnits = (shop || []).reduce((n, s) => n + shopQuantityOnHand(s), 0)
    const siteUnits = (clients || []).reduce((n, c) => n + allSiteUnitsForClient(c), 0)
    return [
      { name: 'Shop / warehouse', units: shopUnits, fill: COL_SHOP },
      { name: 'Client sites (stations)', units: siteUnits, fill: COL_SITES },
    ]
  }, [shop, clients])

  const shopVsSitesTotal = shopVsSites[0].units + shopVsSites[1].units

  const feByClient = useMemo(() => {
    return (clients || [])
      .map((c) => ({
        name: truncateLabel(c.name, 14),
        fullName: c.name,
        fe: feUnitsForClient(c),
      }))
      .filter((r) => r.fe > 0)
      .sort((a, b) => b.fe - a.fe)
      .slice(0, 12)
  }, [clients])

  const hasAnyChart =
    shopHealth.hasData ||
    shopBars.length > 0 ||
    feByClient.length > 0 ||
    shopVsSitesTotal > 0 ||
    shopByCategory.length > 0

  if (!hasAnyChart && (shop || []).length === 0 && (clients || []).length === 0) {
    return null
  }

  const tooltipStyle = {
    background: t.tooltipBg,
    border: `1px solid ${t.tooltipBorder}`,
    borderRadius: 8,
    color: t.tooltipLabel,
    fontSize: 12,
  }

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Inventory visuals</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
        Shop catalog by category (try layouts below), then stock health, quantities, shop vs sites, and fire
        extinguishers by client.
      </p>

      {shopByCategory.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                By category
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                One card per category; quantities in amber are at or below reorder. When a card shows “+N more”, hover it
                to reveal the rest (full list is always in the table below). Switch layout to compare.
              </p>
            </div>
            <div
              className="inline-flex rounded-lg border border-gray-200 dark:border-slate-600 p-0.5 bg-gray-50 dark:bg-slate-800/80 shrink-0"
              role="tablist"
              aria-label="Category section layout"
            >
              {CATEGORY_LAYOUTS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={categoryLayout === opt.id}
                  onClick={() => setCategoryLayout(opt.id)}
                  className={[
                    'px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors',
                    categoryLayout === opt.id
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <CategoryCardsSection
            groups={shopByCategory}
            layoutId={categoryLayout}
            t={t}
            categoryColorMap={categoryColorMap}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Shop SKU health
          </h3>
          <div className="h-[220px]">
            {shopHealth.pieRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl">
                Add shop items to see OK vs low stock mix.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shopHealth.pieRows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke={t.tooltipBg}
                  >
                    {shopHealth.pieRows.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Units: shop vs client sites
          </h3>
          <div className="h-[220px]">
            {shopVsSitesTotal === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl">
                No quantities recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shopVsSites} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: t.tick, fontSize: t.fontSize }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fill: t.tick, fontSize: t.fontSize }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [Number(v).toLocaleString(), 'Units']}
                    cursor={{ fill: t.dark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
                  />
                  <Bar dataKey="units" radius={[0, 6, 6, 0]} maxBarSize={36}>
                    {shopVsSites.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Shop on-hand quantity (by item)
          </h3>
          <div style={{ height: Math.min(420, Math.max(240, shopBars.length * 32 || 240)) }}>
            {shopBars.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl">
                No shop items to chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shopBars}
                  layout="vertical"
                  margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                  barCategoryGap={6}
                >
                  <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: t.tick, fontSize: t.fontSize }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: t.tick, fontSize: t.fontSize }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, _k, props) => {
                      const p = props?.payload
                      const lowNote = p?.low ? ' · at/below reorder' : ''
                      return [
                        `${Number(v).toLocaleString()} on hand (reorder at ${p?.threshold})${lowNote}`,
                        p?.category || 'Qty',
                      ]
                    }}
                    labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ''}
                    cursor={{ fill: t.dark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)' }}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {shopBars.map((row) => (
                      <Cell
                        key={row.fullName}
                        fill={row.fill}
                        fillOpacity={row.low ? 0.55 : 1}
                        stroke={row.low ? COL_LOW : undefined}
                        strokeWidth={row.low ? 1 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Bar color matches the category cards above. Faded bars with an amber edge are at or below reorder.
          </p>
          <CategoryLegend groups={shopByCategory} categoryColorMap={categoryColorMap} />
        </div>

        <div className="xl:col-span-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Fire extinguisher units by client
          </h3>
          <div className="h-[280px]">
            {feByClient.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl">
                No fire extinguisher lines on stations yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={feByClient}
                  layout="vertical"
                  margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
                  barCategoryGap={8}
                >
                  <CartesianGrid strokeDasharray="3 6" stroke={t.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: t.tick, fontSize: t.fontSize }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: t.tick, fontSize: t.fontSize }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [Number(v).toLocaleString(), 'FE units']}
                    labelFormatter={(_, p) => p?.[0]?.payload?.fullName || ''}
                    cursor={{ fill: t.dark ? 'rgba(148,163,184,0.06)' : 'rgba(15,23,42,0.03)' }}
                  />
                  <Bar dataKey="fe" fill={COL_FE} name="FE units" radius={[0, 6, 6, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
