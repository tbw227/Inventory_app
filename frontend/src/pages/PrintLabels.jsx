import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import toast from 'react-hot-toast'

export default function PrintLabels() {
  const [supplies, setSupplies] = useState([])
  const [clients, setClients] = useState([])
  const [locations, setLocations] = useState([])
  const [labelMode, setLabelMode] = useState('station')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [labelItems, setLabelItems] = useState([])
  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [restockDate, setRestockDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    api.get('/supplies').then(res => setSupplies(unwrapList(res.data))).catch(() => {})
    api.get('/clients').then(res => setClients(unwrapList(res.data))).catch(() => {})
    api.get('/locations').then(res => setLocations(unwrapList(res.data))).catch(() => {})
  }, [])

  const selectedClient = clients.find(c => c._id === selectedClientId)
  const selectedLocation = locations.find(l => l._id === selectedLocationId)
  const isStationLabel = labelMode === 'station'

  const locationsForClient = locations.filter(
    loc => (loc.client_id?._id || loc.client_id) === selectedClientId
  )

  const stationQrValue = useMemo(() => {
    if (!selectedLocation) return ''
    const code = String(selectedLocation.location_code || '').trim()
    return code ? `STN:${code}` : `STNID:${selectedLocation._id}`
  }, [selectedLocation])

  const restockQrValue = useMemo(() => {
    if (!selectedLocation) return ''
    const code = String(selectedLocation.location_code || '').trim()
    return code ? `STN:${code}` : `STNID:${selectedLocation._id}`
  }, [selectedLocation])

  const qrValue = isStationLabel ? stationQrValue : restockQrValue
  const canPreviewLabel = isStationLabel ? Boolean(selectedLocation && qrValue) : Boolean(selectedLocation && labelItems.length > 0)

  const addItem = () => {
    if (!selectedSupplyId || selectedQuantity < 1) return
    const supply = supplies.find(s => s._id === selectedSupplyId)
    if (!supply) return
    setLabelItems(prev => {
      const existing = prev.find(i => i.id === selectedSupplyId)
      if (existing) {
        return prev.map(i =>
          i.id === selectedSupplyId ? { ...i, quantity: i.quantity + selectedQuantity } : i
        )
      }
      return [...prev, { id: selectedSupplyId, name: supply.name, quantity: selectedQuantity }]
    })
    setSelectedSupplyId('')
    setSelectedQuantity(1)
  }

  const removeItem = (id) => {
    setLabelItems(prev => prev.filter(i => i.id !== id))
  }

  const refreshLocations = useCallback(() => {
    api.get('/locations').then(res => setLocations(unwrapList(res.data))).catch(() => {})
  }, [])

  const onClientChange = (clientId) => {
    setSelectedClientId(clientId)
    setSelectedLocationId('')
  }

  const saveItemsToStation = async () => {
    if (!selectedLocationId || labelItems.length === 0) return
    const existing = Array.isArray(selectedLocation?.station_inventory) ? selectedLocation.station_inventory : []
    const merged = [...existing]
    for (const item of labelItems) {
      const idx = merged.findIndex((inv) => inv.item_name === item.name)
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], quantity: (merged[idx].quantity || 0) + item.quantity, stocked_at: new Date().toISOString() }
      } else {
        merged.push({ item_name: item.name, quantity: item.quantity, stocked_at: new Date().toISOString(), expiry: '', fire_extinguisher: false, placement_notes: '' })
      }
    }
    try {
      await api.put(`/locations/${selectedLocationId}`, { station_inventory: merged })
      toast.success(`Saved ${labelItems.length} items to station inventory`)
      refreshLocations()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save to station')
    }
  }

  const handlePrint = () => {
    const prevTitle = document.title
    if (selectedClient?.name) {
      document.title = selectedLocation?.name
        ? `${selectedClient.name} - ${selectedLocation.name}`
        : selectedClient.name
    }
    window.print()
    document.title = prevTitle
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Print Labels</h1>

      <div className="no-print space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Label type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLabelMode('station')}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                isStationLabel
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="block font-semibold">Station QR label</span>
              <span className="block text-xs opacity-80">Short code that opens station inventory.</span>
            </button>
            <button
              type="button"
              onClick={() => setLabelMode('restock')}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                !isStationLabel
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="block font-semibold">Restock supply label</span>
              <span className="block text-xs opacity-80">Lists a specific restock bundle on the label.</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer company</label>
          <select
            value={selectedClientId}
            onChange={(e) => onClientChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Select customer...</option>
            {clients.map(c => (
              <option key={c._id} value={c._id}>{c.name} - {c.location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Station / location</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={!selectedClientId}
          >
            <option value="">Select station...</option>
            {locationsForClient.map(loc => (
              <option key={loc._id} value={loc._id}>
                {loc.name}{loc.location_code ? ` (${loc.location_code})` : ''}
              </option>
            ))}
          </select>
          {selectedClientId && locationsForClient.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Add stations for this customer under Locations.</p>
          )}
          {isStationLabel && selectedLocation && !selectedLocation.location_code && (
            <p className="text-xs text-slate-500 mt-1">
              This station has no location code, so the QR will use its internal station ID.
            </p>
          )}
        </div>

        {!isStationLabel && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restock Date</label>
              <input
                type="date"
                value={restockDate}
                onChange={(e) => setRestockDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Products & quantities</label>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[150px]">
                  <select
                    value={selectedSupplyId}
                    onChange={(e) => setSelectedSupplyId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select product...</option>
                    {supplies.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min={1}
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Number(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="py-2 px-4 bg-gray-100 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  + Add Item
                </button>
              </div>

              {labelItems.length > 0 && (
                <>
                  <ul className="mt-3 space-y-1 text-sm text-gray-700">
                    {labelItems.map(item => (
                      <li key={item.id} className="flex justify-between items-center bg-gray-50 rounded px-3 py-1">
                        <span>{item.name} - Qty: {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  {selectedLocationId && (
                    <button
                      type="button"
                      onClick={saveItemsToStation}
                      className="mt-2 w-full py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700"
                    >
                      Save to Station Inventory
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {canPreviewLabel && (
        <div className="print-label bg-white border-2 border-gray-300 rounded-lg p-6 max-w-sm">
          {selectedClient && (
            <div className="mb-2">
              <p className="text-base font-semibold text-gray-900">{selectedClient.name}</p>
              {selectedLocation && (
                <>
                  <p className="text-sm font-medium text-gray-800 mt-1">{selectedLocation.name}</p>
                  {selectedLocation.location_code && (
                    <p className="text-xs text-gray-600">Code: {selectedLocation.location_code}</p>
                  )}
                  {selectedLocation.address && (
                    <p className="text-xs text-gray-600">{selectedLocation.address}</p>
                  )}
                </>
              )}
              {!selectedLocation && <p className="text-xs text-gray-600">{selectedClient.location}</p>}
              {selectedClient.contact_info && (
                <p className="text-xs text-gray-600 whitespace-pre-wrap mt-0.5">{selectedClient.contact_info}</p>
              )}
            </div>
          )}

          {(() => {
            const inv = Array.isArray(selectedLocation?.station_inventory) ? selectedLocation.station_inventory : []
            if (inv.length > 0) {
              return (
                <div className="mt-3 border-t border-gray-200 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Station Inventory ({inv.length} items)
                  </p>
                  <div className="space-y-0.5">
                    {inv.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span className="truncate">{item.item_name}</span>
                        <span className="tabular-nums ml-2 shrink-0">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })()}

          {isStationLabel ? (
            <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Station QR</p>
              <p className="mt-1 text-sm text-gray-700">
                Scan to open this station and load its live inventory from the app.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">Restocked: {new Date(restockDate).toLocaleDateString()}</p>
              <div className="mt-2 space-y-1">
                {labelItems.map(item => (
                  <p key={item.id} className="text-sm text-gray-800">
                    {item.name} - Qty: {item.quantity}
                  </p>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 flex justify-center">
            {qrValue && <QRCodeSVG value={qrValue} size={128} level="M" />}
          </div>
          <p className="mt-1 text-center text-[10px] font-mono text-gray-500 break-all">
            {qrValue}
          </p>
          <div className="no-print mt-6">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
            >
              Print Label
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-label, .print-label * { visibility: visible; }
          .print-label { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
