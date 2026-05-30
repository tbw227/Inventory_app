/** Split `[SKU] description` from catalog-style names; otherwise show full string as description. */
export function parseSupplyDisplayName(name) {
  const raw = String(name || '').trim()
  const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (m) {
    const desc = m[2].trim()
    return { itemNo: m[1].trim(), description: desc || '—' }
  }
  return { itemNo: '—', description: raw || '—' }
}

/**
 * Move kit size numbers (person count, shelf count) out of the description for display.
 * e.g. "ANSI 2015 Class A 25 Person Kit Refill" → "ANSI 2015 Class A Person Kit Refill", specQty 25
 */
export function stripCatalogCapacityFromDescription(desc) {
  const d = String(desc || '').trim()
  if (!d) return { description: '—', specQty: null }

  const person = d.match(/\b(\d+)\s+Person\b/i)
  if (person) {
    return {
      description: d.replace(/\b\d+\s+Person\b/i, 'Person').replace(/\s{2,}/g, ' ').trim(),
      specQty: Number(person[1]),
    }
  }

  const shelf = d.match(/\b(\d+)\s+Shelf\b/i)
  if (shelf) {
    return {
      description: d.replace(/\b\d+\s+Shelf\b/i, 'Shelf').replace(/\s{2,}/g, ' ').trim(),
      specQty: Number(shelf[1]),
    }
  }

  return { description: d, specQty: null }
}

/** Two-line catalog list: title without embedded size, second line = size or shop QOH. */
export function formatSupplyCatalogLines(name, supply = null) {
  const { itemNo, description } = parseSupplyDisplayName(name)
  const { description: cleanDesc, specQty } = stripCatalogCapacityFromDescription(description)
  const titleLine = itemNo !== '—' ? `[${itemNo}] ${cleanDesc}` : cleanDesc
  const secondaryQty =
    specQty != null ? specQty : supply != null ? shopQuantityOnHand(supply) : null
  return { titleLine, secondaryQty, specQty, itemNo, description: cleanDesc }
}

/** Shop on-hand count from API row. */
export function shopQuantityOnHand(supply) {
  const q = Number(supply?.quantity_on_hand)
  return Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 0
}
