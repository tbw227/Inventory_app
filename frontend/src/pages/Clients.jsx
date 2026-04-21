import React, { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import { useAuth } from '../context/AuthContext'

const EMPTY_QUICKBOOKS = {
  customer_id: '',
  display_name: '',
  notes: '',
  sync_enabled: false,
}

function toDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  name: '',
  location: '',
  contact_info: '',
  service_start_date: '',
  service_expiry_date: '',
  required_supplies: [],
  quickbooks: { ...EMPTY_QUICKBOOKS },
}

function normalizeQuickbooks(q) {
  if (!q || typeof q !== 'object') return { ...EMPTY_QUICKBOOKS }
  return {
    customer_id: q.customer_id ?? '',
    display_name: q.display_name ?? '',
    notes: q.notes ?? '',
    sync_enabled: Boolean(q.sync_enabled),
  }
}

function clientHasQuickbooksSummary(c) {
  const q = c.quickbooks
  if (!q) return false
  return !!(q.customer_id || q.display_name || q.notes || q.sync_enabled)
}

export default function Clients() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [supplyInput, setSupplyInput] = useState({ name: '', quantity: '' })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/clients')
      setClients(unwrapList(res.data))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  useEffect(() => {
    const cid = location.state?.editClientId
    if (!cid || clients.length === 0) return
    const c = clients.find((x) => String(x._id) === String(cid))
    if (c) {
      openEdit(c)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [clients, location.state, location.pathname, navigate])

  function openCreate() {
    setEditing(null)
    setFormData(EMPTY_FORM)
    setFormError(null)
    setSupplyInput({ name: '', quantity: '' })
    setShowForm(true)
  }

  function openEdit(client) {
    setEditing(client._id)
    setFormData({
      name: client.name,
      location: client.location,
      contact_info: client.contact_info || '',
      service_start_date: toDateInput(client.service_start_date),
      service_expiry_date: toDateInput(client.service_expiry_date),
      required_supplies: client.required_supplies || [],
      quickbooks: normalizeQuickbooks(client.quickbooks),
    })
    setFormError(null)
    setSupplyInput({ name: '', quantity: '' })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function addSupplyRequirement() {
    if (!supplyInput.name || !supplyInput.quantity) return
    setFormData(d => ({
      ...d,
      required_supplies: [
        ...d.required_supplies,
        { name: supplyInput.name, quantity: Number(supplyInput.quantity) },
      ],
    }))
    setSupplyInput({ name: '', quantity: '' })
  }

  function removeSupplyRequirement(index) {
    setFormData(d => ({
      ...d,
      required_supplies: d.required_supplies.filter((_, i) => i !== index),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const payload = {
        ...formData,
        service_start_date: formData.service_start_date?.trim() || null,
        service_expiry_date: formData.service_expiry_date?.trim() || null,
      }
      if (editing) {
        await api.put(`/clients/${editing}`, payload)
      } else {
        await api.post('/clients', payload)
      }
      closeForm()
      fetchClients()
    } catch (err) {
      const errData = err?.response?.data
      const msg = errData?.details
        ? errData.details.map(d => d.message).join(', ')
        : errData?.error || 'Failed to save client'
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this client? This cannot be undone.')) return
    try {
      await api.delete(`/clients/${id}`)
      fetchClients()
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete client')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
        {!showForm && isAdmin && (
          <button
            onClick={openCreate}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Add Client
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-4">
          <h3 className="font-medium text-gray-900">{editing ? 'Edit Client' : 'New Client'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                value={formData.location}
                onChange={e => setFormData(d => ({ ...d, location: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info</label>
              <input
                value={formData.contact_info}
                onChange={e => setFormData(d => ({ ...d, contact_info: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service agreement start</label>
              <input
                type="date"
                value={formData.service_start_date}
                onChange={e => setFormData(d => ({ ...d, service_start_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Shown on the dashboard calendar.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service agreement expires</label>
              <input
                type="date"
                value={formData.service_expiry_date}
                onChange={e => setFormData(d => ({ ...d, service_expiry_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 bg-slate-50/80">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">QuickBooks</h4>
            <p className="text-xs text-gray-500 mb-3">
              Store this client’s QuickBooks Customer ID and notes for invoicing and sync. Company-level QuickBooks connection is still configured in server environment variables.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input
                  value={formData.quickbooks.customer_id}
                  onChange={e =>
                    setFormData(d => ({
                      ...d,
                      quickbooks: { ...d.quickbooks, customer_id: e.target.value },
                    }))
                  }
                  placeholder="e.g. 123 from QuickBooks"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name (in QuickBooks)</label>
                <input
                  value={formData.quickbooks.display_name}
                  onChange={e =>
                    setFormData(d => ({
                      ...d,
                      quickbooks: { ...d.quickbooks, display_name: e.target.value },
                    }))
                  }
                  placeholder="Matches QBO customer name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.quickbooks.notes}
                onChange={e =>
                  setFormData(d => ({
                    ...d,
                    quickbooks: { ...d.quickbooks, notes: e.target.value },
                  }))
                }
                rows={3}
                placeholder="Terms, last sync, or other bookkeeping details"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.quickbooks.sync_enabled}
                onChange={e =>
                  setFormData(d => ({
                    ...d,
                    quickbooks: { ...d.quickbooks, sync_enabled: e.target.checked },
                  }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Enable sync for this client (used when server QuickBooks integration is on)
            </label>
          </div>

          {/* Required supplies section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Required Supplies</label>
            {formData.required_supplies.length > 0 && (
              <div className="bg-gray-50 rounded-md p-3 mb-3 space-y-2">
                {formData.required_supplies.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{s.name} <span className="text-gray-400">x{s.quantity}</span></span>
                    <button
                      type="button"
                      onClick={() => removeSupplyRequirement(i)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  placeholder="Supply name"
                  value={supplyInput.name}
                  onChange={e => setSupplyInput(d => ({ ...d, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={supplyInput.quantity}
                  onChange={e => setSupplyInput(d => ({ ...d, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={addSupplyRequirement}
                disabled={!supplyInput.name || !supplyInput.quantity}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {formError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editing ? 'Update Client' : 'Add Client'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-3">
          {clients.map(c => (
            <div
              key={c._id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:border-teal-300/60 transition-colors"
            >
              <Link
                to={`/clients/${c._id}`}
                className="group block p-4 hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 group-hover:text-teal-700">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.location}</p>
                    {c.contact_info && <p className="text-sm text-gray-400">{c.contact_info}</p>}
                    <p className="text-xs text-teal-600 font-medium mt-2">View details, stations & inventory →</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">QuickBooks</p>
                  {clientHasQuickbooksSummary(c) ? (
                    <div className="text-sm text-gray-700 space-y-1">
                      {c.quickbooks?.customer_id && (
                        <p>
                          <span className="text-gray-500">Customer ID:</span>{' '}
                          <span className="font-mono">{c.quickbooks.customer_id}</span>
                        </p>
                      )}
                      {c.quickbooks?.display_name && (
                        <p>
                          <span className="text-gray-500">QBO name:</span> {c.quickbooks.display_name}
                        </p>
                      )}
                      {c.quickbooks?.sync_enabled && (
                        <span className="inline-block text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full">
                          Sync enabled
                        </span>
                      )}
                      {c.quickbooks?.notes && (
                        <p className="text-gray-600 whitespace-pre-wrap text-xs mt-1 line-clamp-2">{c.quickbooks.notes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No QuickBooks customer linked.
                      {isAdmin && ' Add from the full detail page or Edit.'}
                    </p>
                  )}
                </div>
                {c.required_supplies?.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Required Supplies</p>
                    <div className="flex flex-wrap gap-2">
                      {c.required_supplies.map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                          {s.name} x{s.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
              {isAdmin && (
                <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50/80">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c._id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {clients.length === 0 && (
            <div className="text-center py-12 text-gray-500">No clients found.</div>
          )}
        </div>
      )}
    </div>
  )
}
