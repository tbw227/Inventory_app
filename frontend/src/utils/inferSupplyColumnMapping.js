/** @typedef {'item_no'|'name'|'category'|'quantity_on_hand'|'case_qty'|'reorder_threshold'|'unit_price'} SupplyImportFieldKey */

export const SUPPLY_IMPORT_FIELD_ALIASES = {
  item_no: [
    'sku',
    'item no',
    'item #',
    'item number',
    'item id',
    'product code',
    'part number',
    'part no',
    'part #',
    'catalog number',
    'catalog no',
  ],
  name: [
    'product/service',
    'product service',
    'sales description',
    'item description',
    'description',
    'product description',
    'product name',
    'item name',
    'name',
    'product',
    'supply',
    'sku description',
    'catalog item',
  ],
  category: ['category', 'type', 'class', 'catalog group', 'group', 'department', 'family'],
  quantity_on_hand: [
    'shop qoh',
    'shop qty',
    'shop quantity',
    'quantity on hand',
    'qty on hand',
    'on hand',
    'on hands',
    'on hands amount',
    'on hand amount',
    'qoh',
    'count',
    'count amount',
    'quantity',
    'qty',
    'stock',
    'inventory',
    'in stock',
  ],
  case_qty: ['case qty', 'case quantity', 'case amount', 'case pack', 'case', 'pack size', 'units per case'],
  reorder_threshold: [
    'reorder at',
    'reorder point',
    'reorder level',
    'reorder',
    'min stock',
    'minimum stock',
    'min qty',
    'min quantity',
    'minimum',
    'min',
    'par level',
    'par',
  ],
  unit_price: [
    'unit price',
    'each price',
    'price each',
    'list price',
    'unit cost',
    'cost each',
    'price',
    'cost',
    'rate',
    'amount',
  ],
}

/** Fields are assigned in this order so Name wins before weaker matches on the same header. */
export const SUPPLY_IMPORT_FIELD_ORDER = [
  'item_no',
  'name',
  'category',
  'quantity_on_hand',
  'case_qty',
  'reorder_threshold',
  'unit_price',
]

export function defaultSupplyColumnMapping() {
  return {
    item_no: null,
    name: null,
    category: null,
    quantity_on_hand: null,
    case_qty: null,
    reorder_threshold: null,
    unit_price: null,
  }
}

/** Normalize header text for fuzzy matching. */
export function normalizeImportHeader(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[_\-./]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function compactHeader(value) {
  return normalizeImportHeader(value).replace(/\s+/g, '')
}

/**
 * Score how well a spreadsheet header matches a list of aliases (higher = better).
 * @returns {number} 0 = no match
 */
export function scoreHeaderAgainstAliases(header, aliases) {
  const raw = String(header ?? '').trim()
  if (!raw) return 0

  const norm = normalizeImportHeader(raw)
  const compact = compactHeader(raw)
  if (!norm) return 0

  let best = 0
  for (const alias of aliases) {
    const aNorm = normalizeImportHeader(alias)
    const aCompact = compactHeader(alias)
    if (!aNorm) continue

    if (norm === aNorm || compact === aCompact) {
      best = Math.max(best, 100)
      continue
    }
    if (compact.endsWith(aCompact) || compact.startsWith(aCompact)) {
      best = Math.max(best, 85)
      continue
    }
    if (compact.includes(aCompact) && aCompact.length >= 4) {
      best = Math.max(best, 70)
      continue
    }
    // Word-boundary style: "shop qoh" in "shop qoh amount"
    const words = norm.split(' ')
    const aliasWords = aNorm.split(' ')
    if (aliasWords.length > 1 && aliasWords.every((w) => words.includes(w))) {
      best = Math.max(best, 75)
    }
  }

  // Penalize very short generic headers matching loose aliases (e.g. "id")
  if (compact.length <= 2 && best < 100) return 0

  return best
}

/**
 * Guess column index per import field from the first row (when hasHeader) or column labels.
 * Each spreadsheet column is used at most once.
 *
 * @param {string[][]} rows
 * @param {boolean} hasHeader
 * @returns {ReturnType<typeof defaultSupplyColumnMapping>}
 */
export function inferSupplyColumnMapping(rows, hasHeader) {
  const mapping = defaultSupplyColumnMapping()
  if (!rows?.length) return mapping

  const colCount = Math.max(...rows.map((r) => (r ? r.length : 0)), 0)
  if (!colCount) return mapping

  const headers = Array.from({ length: colCount }, (_, i) => {
    if (hasHeader) return String(rows[0]?.[i] ?? '').trim()
    return `Column ${i + 1}`
  })

  const used = new Set()
  const MIN_SCORE = 55

  for (const fieldKey of SUPPLY_IMPORT_FIELD_ORDER) {
    const aliases = SUPPLY_IMPORT_FIELD_ALIASES[fieldKey] || []
    let bestIdx = null
    let bestScore = 0

    for (let i = 0; i < colCount; i += 1) {
      if (used.has(i)) continue
      const score = hasHeader
        ? scoreHeaderAgainstAliases(headers[i], aliases)
        : 0
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    if (bestIdx != null && bestScore >= MIN_SCORE) {
      mapping[fieldKey] = bestIdx
      used.add(bestIdx)
    }
  }

  // No header row: positional fallback for common 3–6 column exports (Name, Category, QOH, …)
  if (!hasHeader && colCount >= 1 && mapping.name == null) {
    mapping.name = 0
    used.add(0)
    if (colCount >= 2 && mapping.category == null) {
      mapping.category = 1
      used.add(1)
    }
    if (colCount >= 3 && mapping.quantity_on_hand == null) {
      mapping.quantity_on_hand = 2
      used.add(2)
    }
    if (colCount >= 4 && mapping.case_qty == null) {
      mapping.case_qty = 3
      used.add(3)
    }
    if (colCount >= 5 && mapping.reorder_threshold == null) {
      mapping.reorder_threshold = 4
      used.add(4)
    }
    if (colCount >= 6 && mapping.unit_price == null) {
      mapping.unit_price = 5
      used.add(5)
    }
  }

  return mapping
}

/**
 * @param {ReturnType<typeof defaultSupplyColumnMapping>} mapping
 * @returns {number} count of mapped fields
 */
export function countMappedFields(mapping) {
  return SUPPLY_IMPORT_FIELD_ORDER.filter((k) => mapping[k] != null).length
}

/**
 * QuickBooks and similar exports often have report title rows before the real header.
 * @returns {number} row index to treat as the header (0 if none detected)
 */
export function findImportHeaderRowIndex(rows) {
  if (!rows?.length) return 0

  const maxScan = Math.min(rows.length, 30)
  let bestIdx = 0
  let bestScore = 0

  for (let r = 0; r < maxScan; r += 1) {
    const row = rows[r]
    if (!row?.length) continue

    let score = 0
    for (const cell of row) {
      for (const fieldKey of SUPPLY_IMPORT_FIELD_ORDER) {
        const aliases = SUPPLY_IMPORT_FIELD_ALIASES[fieldKey] || []
        if (scoreHeaderAgainstAliases(cell, aliases) >= 55) {
          score += 1
          break
        }
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestIdx = r
    }
  }

  return bestScore >= 2 ? bestIdx : 0
}

/**
 * Drop title rows above the detected header so row 0 is the column header line.
 * @returns {{ rows: string[][], skipped: number }}
 */
export function trimRowsToImportHeader(rows) {
  if (!rows?.length) return { rows: [], skipped: 0 }
  const headerIdx = findImportHeaderRowIndex(rows)
  if (headerIdx <= 0) return { rows, skipped: 0 }
  return { rows: rows.slice(headerIdx), skipped: headerIdx }
}
