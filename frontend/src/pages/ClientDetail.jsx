import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatDateTime } from '../utils/formatDate'

function feUnitsInInventory(items) {
  return (items || []).reduce((sum, row) => {
    if (!row?.is_fire_extinguisher) return sum
    return sum + (Number(row.quantity) || 0)
  }, 0)
}

function totalFeUnitsForClient(stations) {
  return stations.reduce((acc, loc) => acc + feUnitsInInventory(loc.station_inventory), 0)
}

function clientHasQuickbooksSummary(q) {
  if (!q || typeof q !== 'object') return false
  return !!(q.customer_id || q.display_name || q.notes || q.sync_enabled)
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [client, setClient] = useState(null)
  const [stations, setStations] = useState([])
  const [stationMeta, setStationMeta] = useState({ total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cRes, lRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get('/locations', { params: { client_id: id, limit: 100 } }),
      ])
      setClient(cRes.data)
      const list = unwrapList(lRes.data)
      setStations(list)
      const pag = lRes.data?.pagination
      if (pag) {
        setStationMeta({ total: pag.total ?? list.length, pages: pag.pages ?? 1 })
      } else {
        setStationMeta({ total: list.length, pages: 1 })
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load client')
      setClient(null)
      setStations([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const feTotal = useMemo(() => totalFeUnitsForClient(stations), [stations])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="max-w-lg">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error || 'Not found'}</p>
        <Link to="/clients" className="inline-block mt-4 text-sm font-medium text-teal-700 hover:text-teal-900">
          ← Back to clients
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4"
      >
        ← Back
      </button>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-teal-800 to-slate-900 px-6 py-8 text-white">
          <p className="text-teal-200/90 text-xs font-semibold uppercase tracking-wider">Client</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{client.name}</h1>
          <p className="text-slate-300 mt-2 text-sm">{client.location}</p>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Stations</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stationMeta.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sites / cabinets under this client</p>
              {stationMeta.total > stations.length && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  Showing {stations.length} of {stationMeta.total} stations. Open{' '}
                  <Link to="/locations" className="underline font-medium">
                    Locations
                  </Link>{' '}
                  for the full list.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-4">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase">Fire extinguishers</p>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">{feTotal}</p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">
                Total units on record (all stations, lines marked as fire extinguisher)
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/40 p-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Inventory lines</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {stations.reduce((n, s) => n + (s.station_inventory?.length || 0), 0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across all listed stations</p>
            </div>
          </div>

          <section>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Business details</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Primary location</dt>
                <dd className="font-medium text-slate-900 dark:text-white mt-0.5">{client.location}</dd>
              </div>
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Contact</dt>
                <dd className="text-slate-700 dark:text-slate-200 mt-0.5">{client.contact_info || '—'}</dd>
              </div>
              <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Service agreement start</dt>
                <dd className="font-medium text-slate-900 dark:text-white mt-0.5">
                  {client.service_start_date ? formatDate(client.service_start_date) : '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <dt className="text-xs text-slate-500 dark:text-slate-400">Service agreement expires</dt>
                <dd className="font-medium text-slate-900 dark:text-white mt-0.5">
                  {client.service_expiry_date ? formatDate(client.service_expiry_date) : '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg border border-slate-100 dark:border-slate-800 p-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">QuickBooks</h3>
              {clientHasQuickbooksSummary(client.quickbooks) ? (
                <div className="text-sm text-slate-700 dark:text-slate-200 space-y-1">
                  {client.quickbooks?.customer_id && (
                    <p>
                      <span className="text-slate-500">Customer ID:</span>{' '}
                      <span className="font-mono">{client.quickbooks.customer_id}</span>
                    </p>
                  )}
                  {client.quickbooks?.display_name && <p>QBO name: {client.quickbooks.display_name}</p>}
                  {client.quickbooks?.sync_enabled && (
                    <span className="inline-block text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                      Sync enabled
                    </span>
                  )}
                  {client.quickbooks?.notes && (
                    <p className="text-xs whitespace-pre-wrap text-slate-600 dark:text-slate-300 mt-2">{client.quickbooks.notes}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No QuickBooks link on file.</p>
              )}
            </div>

            {client.required_supplies?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Required supplies</h3>
                <div className="flex flex-wrap gap-2">
                  {client.required_supplies.map((s, i) => (
                    <span
                      key={i}
                      className="text-xs bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 px-2 py-1 rounded-full"
                    >
                      {s.name} ×{s.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Stations & inventory</h2>
            {stations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-600 rounded-xl px-4 py-8 text-center">
                No stations yet. Add locations under this client in{' '}
                <Link to="/locations" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                  Locations & stations
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-6">
                {stations.map((loc) => {
                  const inv = loc.station_inventory || []
                  const feHere = feUnitsInInventory(inv)
                  return (
                    <div
                      key={loc._id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{loc.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {[loc.location_code && `Code ${loc.location_code}`, loc.address].filter(Boolean).join(' · ') ||
                              'No code or address'}
                          </p>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-amber-700 dark:text-amber-300">{feHere}</span> FE units ·{' '}
                          <span className="font-medium">{inv.length}</span> line{inv.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      {inv.length === 0 ? (
                        <p className="text-xs text-slate-400 px-4 py-4">No inventory lines at this station.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                              <tr className="text-left text-slate-500 dark:text-slate-400">
                                <th className="px-4 py-2 font-medium">Item</th>
                                <th className="px-4 py-2 font-medium w-14">Qty</th>
                                <th className="px-4 py-2 font-medium">Stocked</th>
                                <th className="px-4 py-2 font-medium">Expires</th>
                                <th className="px-4 py-2 font-medium">FE</th>
                                <th className="px-4 py-2 font-medium">Placement</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {inv.map((row) => (
                                <tr key={row._id} className="text-slate-800 dark:text-slate-200">
                                  <td className="px-4 py-2">{row.item_name}</td>
                                  <td className="px-4 py-2 tabular-nums">{row.quantity}</td>
                                  <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.stocked_at)}</td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {row.expires_at ? formatDate(row.expires_at) : '—'}
                                  </td>
                                  <td className="px-4 py-2">{row.is_fire_extinguisher ? 'Yes' : '—'}</td>
                                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400 max-w-[220px]">
                                    {row.is_fire_extinguisher && row.placement_note ? row.placement_note : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/clients"
              className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              All clients
            </Link>
            {isAdmin && (
              <Link
                to="/clients"
                state={{ editClientId: client._id }}
                className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500"
              >
                Edit client
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
