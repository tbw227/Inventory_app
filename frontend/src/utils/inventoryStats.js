import { shopQuantityOnHand } from './supplyDisplay'

/** Count shop SKUs above vs at/below reorder threshold. */
export function computeShopHealthCounts(shop) {
  let healthy = 0
  let atOrBelowReorder = 0
  for (const s of shop || []) {
    const q = shopQuantityOnHand(s)
    const th = Number(s.reorder_threshold) || 0
    if (q <= th) atOrBelowReorder += 1
    else healthy += 1
  }
  return {
    healthy,
    atOrBelowReorder,
    total: healthy + atOrBelowReorder,
  }
}
