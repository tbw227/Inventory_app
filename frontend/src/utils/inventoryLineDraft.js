export function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocal(s) {
  if (!s) return new Date().toISOString()
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function toDateInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateInput(s) {
  if (!s || !String(s).trim()) return null
  const d = new Date(`${String(s).trim()}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function draftFromApi(items) {
  return (items || []).map((it) => ({
    _id: it._id,
    item_name: it.item_name || '',
    quantity: it.quantity ?? 0,
    stocked_at_local: toDatetimeLocalValue(it.stocked_at),
    expires_date: toDateInputValue(it.expires_at),
    is_fire_extinguisher: Boolean(it.is_fire_extinguisher),
    placement_note: it.placement_note || '',
  }))
}

export function emptyDraftRow() {
  return {
    _id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    item_name: '',
    quantity: 1,
    stocked_at_local: toDatetimeLocalValue(new Date().toISOString()),
    expires_date: '',
    is_fire_extinguisher: false,
    placement_note: '',
  }
}

export function apiInventoryFromDraft(rows) {
  return rows
    .filter((r) => (r.item_name || '').trim())
    .map((row) => {
      const out = {
        item_name: row.item_name.trim(),
        quantity: Math.max(0, Number(row.quantity) || 0),
        stocked_at: fromDatetimeLocal(row.stocked_at_local),
        expires_at: fromDateInput(row.expires_date),
        is_fire_extinguisher: Boolean(row.is_fire_extinguisher),
        placement_note: (row.placement_note || '').trim(),
      }
      if (row._id && /^[0-9a-fA-F]{24}$/.test(String(row._id))) {
        out._id = row._id
      }
      return out
    })
}
