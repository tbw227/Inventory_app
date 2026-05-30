export function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function revenuePeriodLabel(days) {
  if (days === 30) return 'Last 30 days'
  if (days === 90) return 'Last 90 days'
  return 'All time'
}
