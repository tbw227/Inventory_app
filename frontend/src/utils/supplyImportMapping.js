export const SUPPLY_IMPORT_FIELDS = [
  { key: 'item_no', label: 'Item # / SKU' },
  { key: 'name', label: 'Name / description', required: true },
  { key: 'category', label: 'Category' },
  { key: 'quantity_on_hand', label: 'Shop on hand (QOH)' },
  { key: 'case_qty', label: 'Case qty' },
  { key: 'reorder_threshold', label: 'Reorder at' },
  { key: 'unit_price', label: 'Unit price' },
]

const FIELD_BADGE_CLASS = {
  item_no: 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200',
  name: 'bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200',
  category: 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
  quantity_on_hand: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  case_qty: 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
  reorder_threshold: 'bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  unit_price: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
}

export function importFieldBadgeClass(fieldKey) {
  return FIELD_BADGE_CLASS[fieldKey] || 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-200'
}

function cellAt(row, idx) {
  if (idx == null || idx < 0) return ''
  const v = row[idx]
  return v == null ? '' : String(v).trim()
}

export function composeImportName(name, itemNo) {
  const n = String(name || '').trim()
  const sku = String(itemNo || '').trim()
  if (!n) return ''
  if (!sku || /^\[/.test(n)) return n
  return `[${sku}] ${n}`
}

export function fieldKeyForColumn(mapping, colIdx) {
  const hit = SUPPLY_IMPORT_FIELDS.find((f) => mapping[f.key] === colIdx)
  return hit?.key ?? null
}

export function assignColumnToField(mapping, colIdx, fieldKey) {
  const next = { ...mapping }
  for (const f of SUPPLY_IMPORT_FIELDS) {
    if (next[f.key] === colIdx) next[f.key] = null
  }
  if (fieldKey) next[fieldKey] = colIdx
  return next
}

export function buildImportItems(rows, hasHeader, mapping) {
  const dataRows = hasHeader ? rows.slice(1) : rows
  const items = []
  for (const row of dataRows) {
    if (!row || !row.length) continue
    const rawName = cellAt(row, mapping.name)
    const itemNo = cellAt(row, mapping.item_no)
    const name = composeImportName(rawName, itemNo)
    if (!name) continue
    const item = { name }
    const cat = cellAt(row, mapping.category)
    if (cat) item.category = cat
    const q = cellAt(row, mapping.quantity_on_hand)
    if (q !== '') item.quantity_on_hand = Math.max(0, Math.floor(Number(q) || 0))
    const cq = cellAt(row, mapping.case_qty)
    if (cq !== '') item.case_qty = Math.max(0, Math.floor(Number(cq) || 0))
    const r = cellAt(row, mapping.reorder_threshold)
    if (r !== '') item.reorder_threshold = Math.max(0, Math.floor(Number(r) || 0))
    const p = cellAt(row, mapping.unit_price)
    if (p !== '') {
      const n = Number(p.replace(/[$,]/g, ''))
      if (Number.isFinite(n) && n >= 0) item.unit_price = n
    }
    items.push(item)
  }
  return items
}
