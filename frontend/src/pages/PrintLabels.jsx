import React, { useState, useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'

export default function PrintLabels() {
  const [supplies, setSupplies] = useState([])
  const [clients, setClients] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [labelItems, setLabelItems] = useState([])
  const [selectedSupplyId, setSelectedSupplyId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [restockDate, setRestockDate] = useState(new Date().toISOString().slice(0, 10))
  const barcodeRef = useRef(null)

  useEffect(() => {
    api.get('/supplies').then(res => setSupplies(unwrapList(res.data))).catch(() => {})
    api.get('/clients').then(res => setClients(unwrapList(res.data))).catch(() => {})
    api.get('/locations').then(res => setLocations(unwrapList(res.data))).catch(() => {})
  }, [])

  const locationsForClient = locations.filter(
    loc => (loc.client_id?._id || loc.client_id) === selectedClientId
  )

  useEffect(() => {
    if (!barcodeRef.current || labelItems.length === 0) return
    try {
      barcodeRef.current.innerHTML = ''
      const encodedItems = labelItems
        .map(item => `${item.id}:${item.quantity}`)
        .join(',')
      const locPart = selectedLocationId ? `L${selectedLocationId}|` : ''
      const value = `${locPart}${encodedItems}|${restockDate}`
      JsBarcode(barcodeRef.current, value, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true,
      })
    } catch (e) {
      console.error(e)
    }
  }, [labelItems, restockDate, selectedLocationId])

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

  const selectedClient = clients.find(c => c._id === selectedClientId)
  const selectedLocation = locations.find(l => l._id === selectedLocationId)
  const onClientChange = (clientId) => {
    setSelectedClientId(clientId)
    setSelectedLocationId('')
  }

  const handlePrint = () => {
    const prevTitle = document.title
    if (selectedClient?.name) {
      document.title = selectedLocation?.name
        ? `${selectedClient.name} – ${selectedLocation.name}`
        : selectedClient.name
    }
    window.print()
    document.title = prevTitle
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Print Barcode Labels</h1>

      <div className="no-print space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer company (where this label goes)</label>
          <select
            value={selectedClientId}
            onChange={(e) => onClientChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Select customer...</option>
            {clients.map(c => (
              <option key={c._id} value={c._id}>{c.name} — {c.location}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location (site/cabinet for this label)</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={!selectedClientId}
          >
            <option value="">Select location...</option>
            {locationsForClient.map(loc => (
              <option key={loc._id} value={loc._id}>
                {loc.name}{loc.location_code ? ` (${loc.location_code})` : ''}
              </option>
            ))}
          </select>
          {selectedClientId && locationsForClient.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Add locations for this customer under Locations.</p>
          )}
        </div>

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
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {labelItems.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-50 rounded px-3 py-1">
                  <span>{item.name} — Qty: {item.quantity}</span>
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
          )}
        </div>
      </div>

      {labelItems.length > 0 && (
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
          <p className="text-sm text-gray-600">Restocked: {new Date(restockDate).toLocaleDateString()}</p>
          <div className="mt-2 space-y-1">
            {labelItems.map(item => (
              <p key={item.id} className="text-sm text-gray-800">
                {item.name} — Qty: {item.quantity}
              </p>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <svg ref={barcodeRef} />
          </div>
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
