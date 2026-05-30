/** True when client has a non-zero percent discount on catalog prices. */
export function clientHasPricingDiscount(client) {
  const p = client?.pricing_discount_percent
  return p != null && Number(p) > 0
}

/** Apply client percent discount to a catalog amount; returns null if amount is invalid. */
export function applyClientDiscount(amount, discountPercent) {
  if (amount == null || amount === '' || Number.isNaN(Number(amount))) return null
  const base = Number(amount)
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  if (pct <= 0) return base
  return Math.round(base * (1 - pct / 100) * 100) / 100
}

export function formatClientDiscountLabel(percent) {
  const p = Number(percent)
  if (!Number.isFinite(p) || p <= 0) return null
  return `${p}% off catalog`
}
