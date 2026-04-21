import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import JobCard from '../components/shared/JobCard'
import { useJobs } from '../hooks/useJobs'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import { getJobLocationIds } from '../utils/jobLocations'

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
]

function defaultDatetimeLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function emptyNewLocation() {
  return {
    name: '',
    address: '',
    location_code: '',
    initial_item_name: '',
    initial_quantity: '1',
    initial_stocked_at: defaultDatetimeLocal(),
  }
}

export default function Jobs() {
  const [searchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState('')
  const { jobs, loading, error, refetch } = useJobs({ status: statusFilter })

  useEffect(() => {
    const s = searchParams.get('status')
    if (s === 'pending' || s === 'in-progress') {
      setStatusFilter(s)
    }
  }, [searchParams])
  const { isAdmin } = useAuth()
  const [clients, setClients] = useState([])
  const [locations, setLocations] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [supplies, setSupplies] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [creatingLocation, setCreatingLocation] = useState(false)
  const [supplyInput, setSupplyInput] = useState({ name: '', quantity: '' })
  const [newLocation, setNewLocation] = useState(() => emptyNewLocation())
  const [form, setForm] = useState({
    client_id: '',
    location_ids: [],
    assigned_user_id: '',
    description: '',
    scheduled_date: '',
    status: 'pending',
    planned_supplies: [],
  })

  async function loadOptions() {
    if (!isAdmin) return
    setLoadingOptions(true)
    try {
      const [clientsRes, locationsRes, usersRes, suppliesRes] = await Promise.all([
        api.get('/clients'),
        api.get('/locations'),
        api.get('/users'),
        api.get('/supplies'),
      ])
      setClients(unwrapList(clientsRes.data))
      setLocations(unwrapList(locationsRes.data))
      const techOnly = unwrapList(usersRes.data).filter(u => u.role === 'technician')
      setTechnicians(techOnly)
      setSupplies(unwrapList(suppliesRes.data))
      setFormError(null)
    } catch (err) {
      const details = err?.response?.data?.details
      const message = details
        ? details.map(d => d.message).join(', ')
        : (err?.response?.data?.error || 'Failed to load job form options')
      setFormError(message)
      throw err
    } finally {
      setLoadingOptions(false)
    }
  }

  function resetForm() {
    setForm({
      client_id: '',
      location_ids: [],
      assigned_user_id: '',
      description: '',
      scheduled_date: '',
      status: 'pending',
      planned_supplies: [],
    })
    setEditingId(null)
    setFormError(null)
    setSupplyInput({ name: '', quantity: '' })
    setNewLocation(emptyNewLocation())
  }

  async function openCreate() {
    resetForm()
    try {
      await loadOptions()
    } catch {
      return
    }
    setShowForm(true)
  }

  async function openEdit(job) {
    const clientId = typeof job.client_id === 'object' ? job.client_id?._id : job.client_id
    const userId = typeof job.assigned_user_id === 'object' ? job.assigned_user_id?._id : job.assigned_user_id
    setEditingId(job._id)
    setForm({
      client_id: clientId || '',
      location_ids: getJobLocationIds(job).map(String),
      assigned_user_id: userId || '',
      description: job.description || '',
      scheduled_date: job.scheduled_date ? new Date(job.scheduled_date).toISOString().slice(0, 16) : '',
      status: job.status || 'pending',
      planned_supplies: job.planned_supplies || [],
    })
    setFormError(null)
    setSupplyInput({ name: '', quantity: '' })
    setNewLocation(emptyNewLocation())
    setShowForm(true)
    try {
      await loadOptions()
    } catch {
      // Keep the edit form open with the existing job values.
    }
  }

  function closeForm() {
    setShowForm(false)
    resetForm()
  }

  function handleClientChange(clientId) {
    setForm(prev => ({
      ...prev,
      client_id: clientId,
      location_ids: [],
    }))
    setNewLocation(emptyNewLocation())
  }

  async function handleAddLocation() {
    if (!form.client_id || !newLocation.name.trim()) return

    const itemName = newLocation.initial_item_name.trim()
    if (!itemName) {
      setFormError('Enter an initial inventory item for this station (item name is required).')
      return
    }

    setCreatingLocation(true)
    setFormError(null)

    try {
      const qty = Math.max(0, Number(newLocation.initial_quantity) || 0)
      const stockedRaw = (newLocation.initial_stocked_at || '').trim()
      const stockedDate = stockedRaw ? new Date(stockedRaw) : new Date()
      const stocked_at = Number.isNaN(stockedDate.getTime()) ? new Date().toISOString() : stockedDate.toISOString()

      const res = await api.post('/locations', {
        client_id: form.client_id,
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        location_code: newLocation.location_code.trim(),
        station_inventory: [
          {
            item_name: itemName,
            quantity: qty,
            stocked_at,
            expires_at: null,
            is_fire_extinguisher: false,
            placement_note: '',
          },
        ],
      })

      const createdLocation = res.data
      setLocations(prev => [...prev, createdLocation])
      setForm(prev => ({
        ...prev,
        location_ids: [...new Set([...prev.location_ids.map(String), String(createdLocation._id)])],
      }))
      setNewLocation(emptyNewLocation())
    } catch (err) {
      const details = err?.response?.data?.details
      setFormError(details ? details.map(d => d.message).join(', ') : (err?.response?.data?.error || 'Failed to add location'))
    } finally {
      setCreatingLocation(false)
    }
  }

  function addPlannedSupply() {
    if (!supplyInput.name || !supplyInput.quantity) return

    setForm(prev => {
      const qty = Number(supplyInput.quantity)
      const existingIdx = prev.planned_supplies.findIndex(s => s.name === supplyInput.name)
      if (existingIdx >= 0) {
        const next = [...prev.planned_supplies]
        next[existingIdx] = { ...next[existingIdx], quantity: qty }
        return { ...prev, planned_supplies: next }
      }
      return {
        ...prev,
        planned_supplies: [...prev.planned_supplies, { name: supplyInput.name, quantity: qty }],
      }
    })

    setSupplyInput({ name: '', quantity: '' })
  }

  function removePlannedSupply(name) {
    setForm(prev => ({
      ...prev,
      planned_supplies: prev.planned_supplies.filter(s => s.name !== name),
    }))
  }

  function applyClientNeeds() {
    const selectedClient = clients.find(c => c._id === form.client_id)
    const required = selectedClient?.required_supplies || []
    setForm(prev => ({
      ...prev,
      planned_supplies: required.map(s => ({ name: s.name, quantity: s.quantity })),
    }))
  }

  function openJobLabel(jobId, shouldPrint = true) {
    const url = `/jobs/${jobId}/label${shouldPrint ? '?print=1' : ''}`
    const printWindow = window.open(url, '_blank')
    if (!printWindow) {
      window.location.href = url
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const shouldPrintAfterCreate = !editingId
    try {
      const payload = {
        client_id: form.client_id,
        assigned_user_id: form.assigned_user_id,
        description: form.description,
        scheduled_date: new Date(form.scheduled_date).toISOString(),
        planned_supplies: form.planned_supplies,
        location_ids: form.location_ids.length ? form.location_ids : [],
      }

      if (editingId) {
        payload.status = form.status
        await api.put(`/jobs/${editingId}`, payload)
      } else {
        const res = await api.post('/jobs', payload)
        const createdJob = res.data
        if (createdJob?._id && shouldPrintAfterCreate) {
          openJobLabel(createdJob._id, true)
        }
      }

      await refetch()
      closeForm()
    } catch (err) {
      const details = err?.response?.data?.details
      setFormError(details ? details.map(d => d.message).join(', ') : (err?.response?.data?.error || 'Failed to save job'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
        <div className="flex items-center space-x-2 flex-wrap justify-end">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={openCreate}
              className="text-sm px-3 py-1.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Job
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">{editingId ? 'Update Job' : 'Create Job'}</h2>
          {loadingOptions && <p className="text-sm text-gray-500">Loading clients and technicians...</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Client</label>
              <select
                required
                value={form.client_id}
                onChange={e => handleClientChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select client</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <span className="block text-sm text-gray-700 mb-1">Stations / locations (optional)</span>
              {!form.client_id ? (
                <p className="text-xs text-gray-500">Select a client to see their sites.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 space-y-1.5">
                  {locations.filter(loc => (loc.client_id?._id || loc.client_id) === form.client_id).length === 0 ? (
                    <p className="text-xs text-gray-500">No locations yet — use Quick Add below.</p>
                  ) : (
                    locations
                      .filter(loc => (loc.client_id?._id || loc.client_id) === form.client_id)
                      .map((loc) => (
                        <label key={loc._id} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={form.location_ids.map(String).includes(String(loc._id))}
                            onChange={() => {
                              const idStr = String(loc._id)
                              setForm((prev) => {
                                const set = new Set(prev.location_ids.map(String))
                                if (set.has(idStr)) set.delete(idStr)
                                else set.add(idStr)
                                return { ...prev, location_ids: [...set] }
                              })
                            }}
                          />
                          <span>
                            {loc.name}
                            {loc.location_code ? ` (${loc.location_code})` : ''}
                          </span>
                        </label>
                      ))
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Select every site this job covers. New locations can be added under Quick Add.
              </p>
            </div>

            <div className="md:col-span-2 border border-dashed border-gray-200 rounded-md p-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-800 mb-1">Quick Add Location</p>
              <p className="text-xs text-gray-600 mb-3">
                New stations require at least one inventory line (same as Locations page).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={newLocation.name}
                  onChange={e => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Station / location name *"
                  disabled={!form.client_id || creatingLocation}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                />
                <input
                  value={newLocation.location_code}
                  onChange={e => setNewLocation(prev => ({ ...prev, location_code: e.target.value }))}
                  placeholder="Code (optional)"
                  disabled={!form.client_id || creatingLocation}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                />
                <input
                  value={newLocation.address}
                  onChange={e => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Address (optional)"
                  disabled={!form.client_id || creatingLocation}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                />
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={newLocation.initial_item_name}
                  onChange={e => setNewLocation(prev => ({ ...prev, initial_item_name: e.target.value }))}
                  placeholder="Initial inventory item *"
                  disabled={!form.client_id || creatingLocation}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100 md:col-span-1"
                />
                <input
                  type="number"
                  min={0}
                  value={newLocation.initial_quantity}
                  onChange={e => setNewLocation(prev => ({ ...prev, initial_quantity: e.target.value }))}
                  placeholder="Qty"
                  disabled={!form.client_id || creatingLocation}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                />
                <input
                  type="datetime-local"
                  value={newLocation.initial_stocked_at}
                  onChange={e => setNewLocation(prev => ({ ...prev, initial_stocked_at: e.target.value }))}
                  disabled={!form.client_id || creatingLocation}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white disabled:bg-gray-100"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddLocation}
                  disabled={
                    !form.client_id
                    || !newLocation.name.trim()
                    || !newLocation.initial_item_name.trim()
                    || creatingLocation
                  }
                  className="text-sm bg-gray-200 text-gray-800 px-3 py-2 rounded-md disabled:opacity-50"
                >
                  {creatingLocation ? 'Adding Location...' : 'Add Location'}
                </button>
                {!form.client_id && (
                  <span className="text-xs text-gray-500">Select a client first.</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Technician</label>
              <select
                required
                value={form.assigned_user_id}
                onChange={e => setForm(prev => ({ ...prev, assigned_user_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select technician</option>
                {technicians.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Scheduled Date</label>
              <input
                type="datetime-local"
                required
                value={form.scheduled_date}
                onChange={e => setForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {editingId && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[80px]"
              placeholder="Optional job description"
            />
          </div>

          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-gray-700 font-medium">Planned Supplies</label>
              <button
                type="button"
                onClick={applyClientNeeds}
                disabled={!form.client_id}
                className="text-xs text-blue-600 disabled:text-gray-400"
              >
                Use Client Needs
              </button>
            </div>

            {form.planned_supplies.length > 0 && (
              <div className="mb-3 space-y-1">
                {form.planned_supplies.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm bg-white border border-gray-200 px-2 py-1.5 rounded">
                    <span className="text-gray-700">{item.name} x{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => removePlannedSupply(item.name)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={supplyInput.name}
                onChange={e => setSupplyInput(prev => ({ ...prev, name: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">Select supply</option>
                {supplies.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
              <input
                type="number"
                min="1"
                value={supplyInput.quantity}
                onChange={e => setSupplyInput(prev => ({ ...prev, quantity: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                placeholder="Quantity"
              />
              <button
                type="button"
                onClick={addPlannedSupply}
                disabled={!supplyInput.name || !supplyInput.quantity}
                className="text-sm bg-gray-200 text-gray-800 px-3 py-2 rounded-md disabled:opacity-50"
              >
                Add Supply
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
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : (editingId ? 'Update Job' : 'Create Job & Print Label')}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-md"
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
          {jobs.map(j => (
            <JobCard
              key={j._id}
              job={j}
              canEdit={isAdmin}
              onEdit={openEdit}
            />
          ))}
          {jobs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No jobs found{statusFilter ? ` with status "${statusFilter}"` : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
