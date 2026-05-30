import React, { useCallback, useEffect, useState } from 'react'
import api from '../../services/api'
import { unwrapList } from '../../utils/unwrapList'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import {
  apiInventoryFromDraft,
  draftFromApi,
  emptyDraftRow,
} from '../../utils/inventoryLineDraft'

function InventoryReadOnly({ items }) {
  const list = items?.length ? items : []
  if (list.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No items on this vehicle yet. Add lines for parts and supplies stocked on the truck.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700">
      <table className="min-w-[min(100%,32rem)] w-full text-xs">
        <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
          <tr>
            <th className="px-2 py-1.5 font-medium">Item</th>
            <th className="px-2 py-1.5 font-medium w-14">Qty</th>
            <th className="px-2 py-1.5 font-medium">Stocked</th>
            <th className="px-2 py-1.5 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {list.map((row, idx) => (
            <tr key={`${idx}-${row._id || row.item_name}`} className="text-slate-800 dark:text-slate-200">
              <td className="px-2 py-1.5">{row.item_name}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.quantity}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{formatDateTime(row.stocked_at)}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {row.expires_at ? formatDate(row.expires_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Edit truck / vehicle stock for a technician.
 * @param {{ userId?: string, useMe?: boolean, initialItems?: object[], onSaved?: (user) => void, readOnly?: boolean }} props
 */
export default function VehicleInventoryEditor({
  userId,
  useMe = false,
  initialItems = [],
  onSaved,
  readOnly = false,
}) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState([])
  const [displayItems, setDisplayItems] = useState(initialItems)
  const [supplyNames, setSupplyNames] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDisplayItems(initialItems || [])
  }, [initialItems])

  useEffect(() => {
    let cancelled = false
    api
      .get('/supplies', { params: { limit: 500 } })
      .then((res) => {
        if (cancelled) return
        const { data } = unwrapList(res.data)
        const names = [...new Set(data.map((s) => String(s.name || '').trim()).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b)
        )
        setSupplyNames(names)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const openEditor = useCallback(() => {
    setError(null)
    const draft = draftFromApi(displayItems)
    setRows(draft.length ? draft : [emptyDraftRow()])
    setEditing(true)
  }, [displayItems])

  function updateRow(index, patch) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyDraftRow()])
  }

  function removeRow(index) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length ? next : [emptyDraftRow()]
    })
  }

  async function handleSave() {
    const incomplete = rows.some((r) => {
      const name = (r.item_name || '').trim()
      const hasOther =
        Number(r.quantity) > 0 ||
        (r.expires_date && String(r.expires_date).trim()) ||
        (r.placement_note || '').trim() ||
        r.is_fire_extinguisher
      return !name && hasOther
    })
    if (incomplete) {
      setError('Each line with quantity or dates must have an item name—or clear those fields.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const path = useMe ? '/users/me/vehicle-inventory' : `/users/${userId}/vehicle-inventory`
      const res = await api.put(path, {
        vehicle_inventory: apiInventoryFromDraft(rows),
      })
      const saved = res.data?.vehicle_inventory || []
      setDisplayItems(saved)
      setEditing(false)
      onSaved?.(res.data)
    } catch (err) {
      const errData = err?.response?.data
      setError(
        errData?.details ? errData.details.map((d) => d.message).join(', ') : errData?.error || 'Save failed'
      )
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white'

  return (
    <section className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:shadow-black/30 dark:ring-white/[0.08] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vehicle inventory</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Stock on the service vehicle. Use supply catalog names when possible so the dashboard can align counts.
          </p>
        </div>
        {!readOnly && !editing && (
          <button
            type="button"
            onClick={openEditor}
            className="shrink-0 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
          >
            {displayItems.length ? 'Edit vehicle stock' : 'Add vehicle stock'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4">
        {editing ? (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row._id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Item name
                    </label>
                    <input
                      list="vehicle-supply-names"
                      value={row.item_name}
                      onChange={(e) => updateRow(index, { item_name: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. 10lb ABC fire extinguisher"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => updateRow(index, { quantity: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Stocked
                    </label>
                    <input
                      type="datetime-local"
                      value={row.stocked_at_local}
                      onChange={(e) => updateRow(index, { stocked_at_local: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Expires (optional)
                    </label>
                    <input
                      type="date"
                      value={row.expires_date}
                      onChange={(e) => updateRow(index, { expires_date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Remove line
                </button>
              </div>
            ))}
            {supplyNames.length > 0 && (
              <datalist id="vehicle-supply-names">
                {supplyNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                + Add line
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save vehicle stock'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setError(null)
                }}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <InventoryReadOnly items={displayItems} />
        )}
      </div>
    </section>
  )
}
