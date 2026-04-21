/**
 * Normalize payment aggregates into a continuous daily series for charting (zero-fill gaps).
 */
export function buildRevenueSeries(rows, dayCount) {
  const map = new Map()
  for (const d of rows || []) {
    if (d._id) map.set(d._id, typeof d.total === 'number' ? d.total : 0)
  }
  const out = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const dt = new Date(end)
    dt.setDate(dt.getDate() - i)
    const key = dt.toISOString().slice(0, 10)
    const short = `${dt.getMonth() + 1}/${dt.getDate()}`
    out.push({
      date: key,
      label: short,
      total: Math.round((map.get(key) || 0) * 100) / 100,
    })
  }
  return out
}

export function revenueMovingAverage(series, windowSize = 7) {
  if (!series?.length) return series
  const w = Math.min(windowSize, series.length)
  return series.map((_, i) => {
    const start = Math.max(0, i - w + 1)
    const slice = series.slice(start, i + 1)
    const sum = slice.reduce((a, p) => a + p.total, 0)
    return { ...series[i], ma: Math.round((sum / slice.length) * 100) / 100 }
  })
}
