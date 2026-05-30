import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatDateTime } from '../utils/formatDate'
import toast from 'react-hot-toast'

function InventoryRow({ item, index, editing, onChange }) {
  if (!editing) {
    return (
      <tr className={index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40'}>
        <td className="px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100">{item.item_name}</td>
        <td className="px-3 py-2.5 text-sm text-center tabular-nums text-slate-700 dark:text-slate-200">{item.quantity}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{item.stocked_at ? formatDateTime(item.stocked_at) : '—'}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{item.expiry ? formatDate(item.expiry) : '—'}</td>
        <td className="px-3 py-2.5 text-center">{item.fire_extinguisher ? '🧯' : ''}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{item.placement_notes || ''}</td>
      </tr>
    )
  }

  return (
    <tr className="bg-white dark:bg-slate-900">
      <td className="px-2 py-1.5"><input type="text" value={item.item_name} onChange={(e) => onChange(index, 'item_name', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></td>
      <td className="px-2 py-1.5"><input type="number" min={0} value={item.quantity} onChange={(e) => onChange(index, 'quantity', Number(e.target.value) || 0)} className="w-20 rounded border border-slate-300 px-2 py-1 text-sm text-center dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></td>
      <td className="px-2 py-1.5"><input type="datetime-local" value={toLocalInput(item.stocked_at)} onChange={(e) => onChange(index, 'stocked_at', e.target.value ? new Date(e.target.value).toISOString() : '')} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></td>
      <td className="px-2 py-1.5"><input type="date" value={item.expiry?.slice(0, 10) || ''} onChange={(e) => onChange(index, 'expiry', e.target.value || '')} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></td>
      <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={!!item.fire_extinguisher} onChange={(e) => onChange(index, 'fire_extinguisher', e.target.checked)} /></td>
      <td className="px-2 py-1.5"><input type="text" value={item.placement_notes || ''} onChange={(e) => onChange(index, 'placement_notes', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white" /></td>
    </tr>
  )
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function StationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [inventory, setInventory] = useState([])
  const [saving, setSaving] = useState(false)

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/locations/${id}`)
      setLocation(res.data)
      setInventory(Array.isArray(res.data.station_inventory) ? res.data.station_inventory : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load station')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchLocation() }, [fetchLocation])

  const handleFieldChange = (index, field, value) => {
    setInventory((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const addRow = () => {
    setInventory((prev) => [...prev, { item_name: '', quantity: 1, stocked_at: new Date().toISOString(), expiry: '', fire_extinguisher: false, placement_notes: '' }])
  }

  const removeRow = (index) => {
    setInventory((prev) => prev.filter((_, i) => i !== index))
  }

  const saveInventory = async () => {
    try {
      setSaving(true)
      await api.put(`/locations/${id}`, { station_inventory: inventory })
      setEditing(false)
      toast.success('Station inventory updated')
      fetchLocation()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">Go back</button>
      </div>
    )
  }

  if (!location) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/locations" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            ← All Locations
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{location.name}</h1>
          {location.location_code && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Code: {location.location_code}</p>
          )}
          {location.address && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{location.address}</p>
          )}
        </div>
        <div className="text-right text-sm">
          {location.client_id && (
            <p className="font-medium text-slate-800 dark:text-slate-100">{location.client_id.name}</p>
          )}
          {location.client_id?.location && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{location.client_id.location}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Station Inventory ({inventory.length} items)
          </h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button type="button" onClick={addRow} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  + Add Row
                </button>
                <button type="button" onClick={() => { setEditing(false); setInventory(Array.isArray(location.station_inventory) ? location.station_inventory : []) }} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={saveInventory} disabled={saving} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                {isAdmin ? 'Edit Inventory' : 'Record Restock'}
              </button>
            )}
          </div>
        </div>

        {inventory.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No inventory items configured for this station.
            {editing && (
              <button type="button" onClick={addRow} className="mt-2 block mx-auto text-blue-600 hover:underline text-xs">
                + Add the first item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Item</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center">Qty</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stocked</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Expiry</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 text-center">FE</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notes</th>
                  {editing && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, i) => (
                  <React.Fragment key={i}>
                    <InventoryRow item={item} index={i} editing={editing} onChange={handleFieldChange} />
                    {editing && (
                      <tr>
                        <td colSpan={7} className="px-3 pb-1">
                          <button type="button" onClick={() => removeRow(i)} className="text-[10px] text-red-500 hover:underline">Remove</button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
