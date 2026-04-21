import React, { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatDateTime } from '../utils/formatDate'

const EMPTY_FORM = { client_id: '', name: '', address: '', location_code: '' }

function toDatetimeLocalValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s) {
  if (!s) return new Date().toISOString()
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function toDateInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromDateInput(s) {
  if (!s || !String(s).trim()) return null
  const d = new Date(`${String(s).trim()}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function apiInventoryFromDraft(rows) {
  return rows
    .filter(r => (r.item_name || '').trim())
    .map(row => {
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

function draftFromApi(items) {
  return (items || []).map(it => ({
    _id: it._id,
    item_name: it.item_name || '',
    quantity: it.quantity ?? 0,
    stocked_at_local: toDatetimeLocalValue(it.stocked_at),
    expires_date: toDateInputValue(it.expires_at),
    is_fire_extinguisher: Boolean(it.is_fire_extinguisher),
    placement_note: it.placement_note || '',
  }))
}

function emptyDraftRow() {
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

function StationInventoryReadOnly({ items }) {
  const list = items && items.length ? items : []
  if (list.length === 0) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        No line items yet. Stations hold dated stock counts, expiry, and optional fire extinguisher placement notes.
      </p>
    )
  }
  return (
    <div className="mt-2 -mx-1 px-1 sm:mx-0 sm:px-0 overflow-x-auto rounded-md border border-gray-100 dark:border-slate-700">
      <table className="min-w-[min(100%,36rem)] w-full text-xs">
        <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 text-left">
          <tr>
            <th className="px-2 py-1.5 font-medium">Item</th>
            <th className="px-2 py-1.5 font-medium w-14">Qty</th>
            <th className="px-2 py-1.5 font-medium">Stocked</th>
            <th className="px-2 py-1.5 font-medium">Expires</th>
            <th className="px-2 py-1.5 font-medium">FE</th>
            <th className="px-2 py-1.5 font-medium">Placement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {list.map((row, idx) => (
            <tr
              key={`${idx}-${row._id != null && row._id !== '' ? row._id : 'line'}`}
              className="text-gray-800 dark:text-gray-200"
            >
              <td className="px-2 py-1.5">{row.item_name}</td>
              <td className="px-2 py-1.5 tabular-nums">{row.quantity}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">{formatDateTime(row.stocked_at)}</td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {row.expires_at ? formatDate(row.expires_at) : '—'}
              </td>
              <td className="px-2 py-1.5">{row.is_fire_extinguisher ? 'Yes' : '—'}</td>
              <td className="px-2 py-1.5 text-gray-600 max-w-[200px]">
                {row.is_fire_extinguisher && row.placement_note ? row.placement_note : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Locations() {
  const { isAdmin } = useAuth()
  const [locations, setLocations] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [inventoryEditor, setInventoryEditor] = useState(null)
  const [inventorySaving, setInventorySaving] = useState(false)
  const [inventoryError, setInventoryError] = useState(null)

  /** Inventory rows collected while creating a new location (required on create). */
  const [createInventoryRows, setCreateInventoryRows] = useState(() => [emptyDraftRow()])

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const [locRes, clientRes] = await Promise.all([
        api.get('/locations'),
        api.get('/clients'),
      ])
      setLocations(unwrapList(locRes.data))
      setClients(unwrapList(clientRes.data))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load locations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  function openCreate() {
    setEditing(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setCreateInventoryRows([emptyDraftRow()])
    setShowForm(true)
  }

  function openEdit(loc) {
    setEditing(loc._id)
    setFormData({
      client_id: loc.client_id?._id || loc.client_id || '',
      name: loc.name || '',
      address: loc.address || '',
      location_code: loc.location_code || '',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setCreateInventoryRows([emptyDraftRow()])
  }

  function updateCreateInventoryRow(index, patch) {
    setCreateInventoryRows(rows => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addCreateInventoryRow() {
    setCreateInventoryRows(rows => [...rows, emptyDraftRow()])
  }

  function removeCreateInventoryRow(index) {
    setCreateInventoryRows(rows => {
      const next = rows.filter((_, i) => i !== index)
      return next.length ? next : [emptyDraftRow()]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const payload = { ...formData }
      if (editing) {
        delete payload.client_id
        await api.put(`/locations/${editing}`, payload)
      } else {
        const inv = apiInventoryFromDraft(createInventoryRows)
        if (inv.length === 0) {
          setFormError(
            'Add at least one inventory line with an item name, quantity (0 or more), and stocked date/time for this station.'
          )
          setSaving(false)
          return
        }
        const badQty = inv.some(i => i.quantity < 0)
        if (badQty) {
          setFormError('Each line must have a valid quantity (0 or greater).')
          setSaving(false)
          return
        }
        await api.post('/locations', { ...payload, station_inventory: inv })
      }
      closeForm()
      fetchLocations()
    } catch (err) {
      const errData = err?.response?.data
      const msg = errData?.details
        ? errData.details.map(d => d.message).join(', ')
        : errData?.error || 'Failed to save location'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this location? Jobs linked to it will keep the reference but show no location.')) return
    try {
      await api.delete(`/locations/${id}`)
      if (inventoryEditor?.locationId === id) setInventoryEditor(null)
      fetchLocations()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete location')
    }
  }

  function openInventoryEditor(loc) {
    setInventoryError(null)
    const rows = draftFromApi(loc.station_inventory)
    setInventoryEditor({
      locationId: loc._id,
      rows: rows.length ? rows : [emptyDraftRow()],
    })
  }

  function closeInventoryEditor() {
    setInventoryEditor(null)
    setInventoryError(null)
  }

  function updateInventoryRow(index, patch) {
    setInventoryEditor(prev => {
      if (!prev) return prev
      const rows = prev.rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
      return { ...prev, rows }
    })
  }

  function addInventoryRow() {
    setInventoryEditor(prev => (prev ? { ...prev, rows: [...prev.rows, emptyDraftRow()] } : prev))
  }

  function removeInventoryRow(index) {
    setInventoryEditor(prev => {
      if (!prev) return prev
      const rows = prev.rows.filter((_, i) => i !== index)
      return { ...prev, rows: rows.length ? rows : [emptyDraftRow()] }
    })
  }

  async function saveStationInventory() {
    if (!inventoryEditor) return
    const incomplete = inventoryEditor.rows.some(r => {
      const name = (r.item_name || '').trim()
      const hasOther =
        Number(r.quantity) > 0 ||
        (r.expires_date && String(r.expires_date).trim()) ||
        (r.placement_note || '').trim() ||
        r.is_fire_extinguisher
      return !name && hasOther
    })
    if (incomplete) {
      setInventoryError('Each line with quantity, expiry, FE, or placement must have an item name—or clear those fields.')
      return
    }
    setInventoryError(null)
    setInventorySaving(true)
    try {
      await api.put(`/locations/${inventoryEditor.locationId}`, {
        station_inventory: apiInventoryFromDraft(inventoryEditor.rows),
      })
      closeInventoryEditor()
      fetchLocations()
    } catch (err) {
      const errData = err?.response?.data
      setInventoryError(
        errData?.details ? errData.details.map(d => d.message).join(', ') : errData?.error || 'Save failed'
      )
    } finally {
      setInventorySaving(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Locations & stations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            Each location is a station under a client. Track what is stocked, when, expiry, and optional fire extinguisher
            placements across the site.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={showForm ? closeForm : openCreate}
            className="w-full sm:w-auto text-sm bg-blue-600 text-white px-4 py-2.5 rounded-md font-medium hover:bg-blue-700 transition-colors shrink-0 text-center"
          >
            {showForm ? 'Cancel' : 'Add location'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 mb-6 space-y-4 shadow-sm"
        >
          <h3 className="font-medium text-gray-900">{editing ? 'Edit location' : 'New location'}</h3>

          {!editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer (client)</label>
              <select
                value={formData.client_id}
                onChange={e => setFormData(d => ({ ...d, client_id: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select client...</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} — {c.location}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Station / location name</label>
              <input
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                placeholder="e.g. North yard, Building 2 — med cabinet"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location code (optional)</label>
              <input
                value={formData.location_code}
                onChange={e => setFormData(d => ({ ...d, location_code: e.target.value }))}
                placeholder="e.g. WH-01, CAB-101"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address / area note (optional)</label>
            <input
              value={formData.address}
              onChange={e => setFormData(d => ({ ...d, address: e.target.value }))}
              placeholder="Where to find this station on site"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          {!editing && (
            <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">Station inventory (required)</p>
              <p className="text-xs text-gray-600">
                Every new station needs at least one stocked line (item, quantity, when it was stocked). Add more lines if
                needed.
              </p>
              {createInventoryRows.map((row, index) => (
                <div key={row._id} className="border border-gray-200 rounded-lg p-3 bg-white space-y-2 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Item name</label>
                      <input
                        value={row.item_name}
                        onChange={e => updateCreateInventoryRow(index, { item_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                        placeholder="e.g. Fire extinguisher 10lb ABC"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={row.quantity}
                        onChange={e => updateCreateInventoryRow(index, { quantity: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Stocked (date & time)</label>
                      <input
                        type="datetime-local"
                        value={row.stocked_at_local}
                        onChange={e => updateCreateInventoryRow(index, { stocked_at_local: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Expires (optional)</label>
                      <input
                        type="date"
                        value={row.expires_date}
                        onChange={e => updateCreateInventoryRow(index, { expires_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-gray-700 cursor-pointer pt-5">
                      <input
                        type="checkbox"
                        checked={row.is_fire_extinguisher}
                        onChange={e => updateCreateInventoryRow(index, { is_fire_extinguisher: e.target.checked })}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      Fire extinguisher
                    </label>
                  </div>
                  {row.is_fire_extinguisher && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Placement on site</label>
                      <textarea
                        value={row.placement_note}
                        onChange={e => updateCreateInventoryRow(index, { placement_note: e.target.value })}
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                        placeholder="Where this unit sits on the client site"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeCreateInventoryRow(index)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove line
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCreateInventoryRow}
                className="text-sm bg-white border border-gray-300 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-50"
              >
                + Add inventory line
              </button>
            </div>
          )}

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{formError}</div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : editing ? 'Update location' : 'Add location'}
          </button>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {locations.map(loc => (
            <article
              key={loc._id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white text-base sm:text-lg break-words">{loc.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                    {loc.client_id?.name || 'Unknown client'}
                    {loc.address && ` · ${loc.address}`}
                  </p>
                  {loc.location_code && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Code: {loc.location_code}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap lg:w-auto lg:max-w-md lg:flex-col xl:max-w-none xl:flex-row xl:flex-wrap xl:justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        inventoryEditor?.locationId === loc._id ? closeInventoryEditor() : openInventoryEditor(loc)
                      }
                      className="w-full sm:flex-1 sm:min-w-[10rem] lg:w-full xl:flex-initial xl:min-w-0 text-sm text-center px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 font-medium hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                    >
                      {inventoryEditor?.locationId === loc._id ? 'Close inventory' : 'Edit station inventory'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(loc)}
                      className="w-full sm:flex-1 sm:min-w-[8rem] lg:w-full xl:flex-initial text-sm text-center px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 text-blue-800 dark:text-blue-100 font-medium hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      Edit location
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(loc._id)}
                      className="w-full sm:flex-1 sm:min-w-[8rem] lg:w-full xl:flex-initial text-sm text-center px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 pt-3 sm:pt-4">
                  Station inventory
                </p>
                {inventoryEditor?.locationId === loc._id ? (
                  <div className="space-y-3 mt-2">
                    <p className="text-xs text-gray-600">
                      Fire extinguisher (FE): optional per line. When checked, use placement to describe where that unit sits
                      on the client site (hall, bay, office, etc.).
                    </p>
                    {inventoryEditor.rows.map((row, index) => (
                      <div
                        key={row._id}
                        className="border border-gray-200 rounded-lg p-3 bg-slate-50/50 space-y-2 text-sm"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Item name</label>
                            <input
                              value={row.item_name}
                              onChange={e => updateInventoryRow(index, { item_name: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                              placeholder="e.g. Fire extinguisher 10lb ABC"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Quantity</label>
                            <input
                              type="number"
                              min={0}
                              value={row.quantity}
                              onChange={e => updateInventoryRow(index, { quantity: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Stocked (date & time)</label>
                            <input
                              type="datetime-local"
                              value={row.stocked_at_local}
                              onChange={e => updateInventoryRow(index, { stocked_at_local: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Expires (optional)</label>
                            <input
                              type="date"
                              value={row.expires_date}
                              onChange={e => updateInventoryRow(index, { expires_date: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-gray-700 cursor-pointer pt-5">
                            <input
                              type="checkbox"
                              checked={row.is_fire_extinguisher}
                              onChange={e => updateInventoryRow(index, { is_fire_extinguisher: e.target.checked })}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            Fire extinguisher
                          </label>
                        </div>
                        {row.is_fire_extinguisher && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-0.5">Placement on site</label>
                            <textarea
                              value={row.placement_note}
                              onChange={e => updateInventoryRow(index, { placement_note: e.target.value })}
                              rows={2}
                              placeholder="e.g. East wall welding bay; south door of portable office"
                              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeInventoryRow(index)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove line
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={addInventoryRow}
                        className="text-sm bg-gray-200 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-300"
                      >
                        + Add line
                      </button>
                      <button
                        type="button"
                        onClick={saveStationInventory}
                        disabled={inventorySaving}
                        className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 disabled:opacity-50"
                      >
                        {inventorySaving ? 'Saving…' : 'Save inventory'}
                      </button>
                      <button type="button" onClick={closeInventoryEditor} className="text-sm text-gray-600 hover:text-gray-800">
                        Cancel
                      </button>
                    </div>
                    {inventoryError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {inventoryError}
                      </div>
                    )}
                  </div>
                ) : (
                  <StationInventoryReadOnly items={loc.station_inventory} />
                )}
              </div>
            </article>
          ))}
          {locations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No locations yet. Add a station per client site or storage point, then record inventory with dates and optional
              fire extinguisher placements.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
