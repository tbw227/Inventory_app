import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Papa from 'papaparse'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatDateTime } from '../utils/formatDate'
import InventoryOverviewCharts from '../components/inventory/InventoryOverviewCharts'

function feUnits(items) {
  return (items || []).reduce((sum, row) => {
    if (!row?.is_fire_extinguisher) return sum
    return sum + (Number(row.quantity) || 0)
  }, 0)
}

/** Split `[SKU] description` from catalog-style names; otherwise show full string as description. */
function parseSupplyDisplayName(name) {
  const raw = String(name || '').trim()
  const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (m) {
    const desc = m[2].trim()
    return { itemNo: m[1].trim(), description: desc || '—' }
  }
  return { itemNo: '—', description: raw || '—' }
}

function ShopTableHeaderCell({ children, align = 'left', className = '', rowSpan, colSpan }) {
  const al = align === 'right' ? 'text-right' : 'text-left'
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`px-3 py-2.5 ${al} text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide leading-tight border-b border-gray-200 dark:border-slate-600 ${className}`}
    >
      {children}
    </th>
  )
}

function fmtMoneyCell(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—'
  return `$${Number(n).toFixed(2)}`
}

const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'category', label: 'Category' },
  { key: 'quantity_on_hand', label: 'Quantity on hand' },
  { key: 'reorder_threshold', label: 'Reorder at' },
  { key: 'unit_price', label: 'Unit price' },
]

function cellAt(row, idx) {
  if (idx == null || idx < 0) return ''
  const v = row[idx]
  return v == null ? '' : String(v).trim()
}

function buildImportItems(rows, hasHeader, mapping) {
  const dataRows = hasHeader ? rows.slice(1) : rows
  const items = []
  for (const row of dataRows) {
    if (!row || !row.length) continue
    const name = cellAt(row, mapping.name)
    if (!name) continue
    const item = { name }
    const cat = cellAt(row, mapping.category)
    if (cat) item.category = cat
    const q = cellAt(row, mapping.quantity_on_hand)
    if (q !== '') item.quantity_on_hand = Math.max(0, Math.floor(Number(q) || 0))
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

const defaultMapping = () => ({
  name: null,
  category: null,
  quantity_on_hand: null,
  reorder_threshold: null,
  unit_price: null,
})

export default function Supplies() {
  const { isAdmin } = useAuth()
  const [shop, setShop] = useState([])
  const [clients, setClients] = useState([])
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity_on_hand: 0,
    reorder_threshold: 5,
    unit_price: '',
  })
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [hasHeader, setHasHeader] = useState(true)
  const [columnMapping, setColumnMapping] = useState(defaultMapping)
  const [importStep, setImportStep] = useState('map')
  const [previewResult, setPreviewResult] = useState(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [importErr, setImportErr] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailErr, setEmailErr] = useState(null)
  const [detailItem, setDetailItem] = useState(null)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/supplies/overview')
      setShop(res.data.shop || [])
      setClients(res.data.clients || [])
      setTotals(res.data.totals || null)
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => shop.some((s) => s._id === id)))
  }, [shop])

  const headerLabels = useMemo(() => {
    if (!parsedRows.length) return []
    const first = parsedRows[0] || []
    return first.map((c, i) => (hasHeader ? String(c ?? '').trim() || `Column ${i + 1}` : `Column ${i + 1}`))
  }, [parsedRows, hasHeader])

  const maxCols = useMemo(() => {
    if (!parsedRows.length) return 0
    return Math.max(...parsedRows.map((r) => (r ? r.length : 0)), 0)
  }, [parsedRows])

  function resetImportWizard() {
    setImportFileName('')
    setParsedRows([])
    setHasHeader(true)
    setColumnMapping(defaultMapping())
    setImportStep('map')
    setPreviewResult(null)
    setImportBusy(false)
    setImportMsg(null)
    setImportErr(null)
  }

  function openImport() {
    resetImportWizard()
    setImportOpen(true)
  }

  function onCsvSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportFileName(file.name)
    setImportErr(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const { data, errors } = Papa.parse(text, { skipEmptyLines: 'greedy' })
      if (errors?.length) {
        setImportErr(errors.map((x) => x.message).join('; ') || 'Could not parse CSV')
        return
      }
      const rows = (data || []).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))
      setParsedRows(rows)
      setColumnMapping(defaultMapping())
      setPreviewResult(null)
      setImportStep('map')
      if (rows.length && hasHeader && rows[0]) {
        const hdr = rows[0].map((c) => String(c ?? '').trim().toLowerCase())
        const next = defaultMapping()
        const pick = (candidates) => {
          for (const cand of candidates) {
            const i = hdr.findIndex((h) => h === cand || h.replace(/\s+/g, '') === cand.replace(/\s+/g, ''))
            if (i >= 0) return i
          }
          return null
        }
        next.name = pick(['name', 'item', 'product', 'sku', 'description'])
        next.category = pick(['category', 'type', 'class'])
        next.quantity_on_hand = pick(['quantity', 'qty', 'quantity on hand', 'on hand', 'stock'])
        next.reorder_threshold = pick(['reorder', 'reorder at', 'min', 'minimum'])
        next.unit_price = pick(['unit price', 'price', 'cost', 'rate'])
        setColumnMapping(next)
      }
    }
    reader.readAsText(file)
  }

  async function runPreview() {
    if (columnMapping.name == null) {
      setImportErr('Map the Name column before preview.')
      return
    }
    const items = buildImportItems(parsedRows, hasHeader, columnMapping)
    if (!items.length) {
      setImportErr('No data rows found. Check header row and column mapping.')
      return
    }
    setImportBusy(true)
    setImportErr(null)
    try {
      const res = await api.post('/supplies/import/preview', { items })
      setPreviewResult(res.data)
      setImportStep('preview')
    } catch (err) {
      setImportErr(err?.response?.data?.error || 'Preview failed')
    } finally {
      setImportBusy(false)
    }
  }

  async function runCommit() {
    if (!previewResult?.valid) return
    const items = buildImportItems(parsedRows, hasHeader, columnMapping)
    setImportBusy(true)
    setImportErr(null)
    setImportMsg(null)
    try {
      const res = await api.post('/supplies/import/commit', {
        items,
        file_name: importFileName || null,
      })
      const jobId = res.data?.job_id
      if (!jobId) {
        setImportErr('No job id returned')
        return
      }
      for (let i = 0; i < 60; i += 1) {
        await new Promise((r) => setTimeout(r, 400))
        const st = await api.get(`/supplies/import/jobs/${jobId}`)
        const status = st.data?.status
        if (status === 'failed') {
          setImportErr(st.data?.error_message || 'Import failed')
          return
        }
        if (status === 'completed') {
          const created = st.data?.result?.created
          setImportMsg(`Imported ${created ?? items.length} shop line(s).`)
          setImportOpen(false)
          resetImportWizard()
          fetchOverview()
          return
        }
      }
      setImportMsg('Import is still processing. Refresh this page in a moment.')
      setImportOpen(false)
      fetchOverview()
    } catch (err) {
      setImportErr(err?.response?.data?.error || 'Import failed')
    } finally {
      setImportBusy(false)
    }
  }

  function startEdit(s) {
    setEditingId(s._id)
    setEditError(null)
    setEditDraft({
      name: s.name || '',
      category: s.category || '',
      catalog_group: s.catalog_group ?? '',
      qty_per_unit: s.qty_per_unit ?? '',
      case_qty: s.case_qty != null && s.case_qty !== '' ? String(s.case_qty) : '',
      quantity_on_hand: s.quantity_on_hand ?? 0,
      reorder_threshold: s.reorder_threshold ?? 5,
      min_order_qty: s.min_order_qty != null && s.min_order_qty !== '' ? String(s.min_order_qty) : '',
      min_order_unit_price:
        s.min_order_unit_price != null && s.min_order_unit_price !== '' ? String(s.min_order_unit_price) : '',
      discount_r_qty: s.discount_r_qty != null && s.discount_r_qty !== '' ? String(s.discount_r_qty) : '',
      discount_r_unit_price:
        s.discount_r_unit_price != null && s.discount_r_unit_price !== '' ? String(s.discount_r_unit_price) : '',
      discount_n_qty: s.discount_n_qty != null && s.discount_n_qty !== '' ? String(s.discount_n_qty) : '',
      discount_n_unit_price:
        s.discount_n_unit_price != null && s.discount_n_unit_price !== '' ? String(s.discount_n_unit_price) : '',
      unit_price: s.unit_price != null && s.unit_price !== '' ? String(s.unit_price) : '',
    })
  }

  function optIntPayload(v) {
    if (v === '' || v == null) return null
    const n = Math.floor(Number(v))
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  function optPricePayload(v) {
    if (v === '' || v == null) return null
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return
    setEditSaving(true)
    setEditError(null)
    try {
      const payload = {
        name: editDraft.name,
        category: editDraft.category || undefined,
        catalog_group: editDraft.catalog_group?.trim() || null,
        qty_per_unit: editDraft.qty_per_unit?.trim() || null,
        case_qty: optIntPayload(editDraft.case_qty),
        quantity_on_hand: Number(editDraft.quantity_on_hand) || 0,
        reorder_threshold: Number(editDraft.reorder_threshold) || 0,
        min_order_qty: optIntPayload(editDraft.min_order_qty),
        min_order_unit_price: optPricePayload(editDraft.min_order_unit_price),
        discount_r_qty: optIntPayload(editDraft.discount_r_qty),
        discount_r_unit_price: optPricePayload(editDraft.discount_r_unit_price),
        discount_n_qty: optIntPayload(editDraft.discount_n_qty),
        discount_n_unit_price: optPricePayload(editDraft.discount_n_unit_price),
      }
      if (editDraft.unit_price === '') payload.unit_price = null
      else if (editDraft.unit_price != null && editDraft.unit_price !== '')
        payload.unit_price = Number(editDraft.unit_price)
      await api.put(`/supplies/${editingId}`, payload)
      setEditingId(null)
      setEditDraft(null)
      fetchOverview()
    } catch (err) {
      setEditError(err?.response?.data?.error || 'Could not save')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        quantity_on_hand: formData.quantity_on_hand,
        reorder_threshold: formData.reorder_threshold,
      }
      if (formData.category?.trim()) payload.category = formData.category.trim()
      if (formData.unit_price !== '') payload.unit_price = Number(formData.unit_price)
      await api.post('/supplies', payload)
      setFormData({
        name: '',
        category: '',
        quantity_on_hand: 0,
        reorder_threshold: 5,
        unit_price: '',
      })
      setShowForm(false)
      fetchOverview()
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to add supply')
    } finally {
      setSaving(false)
    }
  }

  function toggleSelect(itemId) {
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  function selectAllVisible() {
    setSelectedIds(shop.map((s) => s._id))
  }

  function clearSelected() {
    setSelectedIds([])
  }

  function openDetails(item) {
    setDetailItem(item)
  }

  function closeDetails() {
    setDetailItem(null)
  }

  const selectedShopRows = useMemo(() => {
    const selected = new Set(selectedIds)
    return shop.filter((s) => selected.has(s._id))
  }, [shop, selectedIds])

  function printRows(rows, scopeLabel) {
    if (!rows.length) {
      setEmailErr(`No inventory rows selected for ${scopeLabel}.`)
      return
    }
    const htmlRows = rows
      .map(
        (s) => `
        <tr>
          <td>${s.name || ''}</td>
          <td>${s.category || 'General'}</td>
          <td style="text-align:right;">${s.quantity_on_hand ?? 0}</td>
          <td style="text-align:right;">${s.reorder_threshold ?? 0}</td>
          <td>${s.catalog_group || ''}</td>
          <td>${s.qty_per_unit || ''}</td>
        </tr>`
      )
      .join('')
    const w = window.open('', '_blank', 'width=980,height=760')
    if (!w) {
      setEmailErr('Popup blocked. Allow popups to print inventory.')
      return
    }
    w.document.write(`<!doctype html>
<html>
  <head>
    <title>Inventory print</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 16px; color: #4b5563; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
      th { text-align: left; background: #f3f4f6; }
    </style>
  </head>
  <body>
    <h1>Inventory export</h1>
    <p>${scopeLabel} · ${new Date().toLocaleString()}</p>
    <table>
      <thead>
        <tr>
          <th>Item</th><th>Category</th><th>On hand</th><th>Reorder at</th><th>Catalog group</th><th>Qty per unit</th>
        </tr>
      </thead>
      <tbody>${htmlRows}</tbody>
    </table>
  </body>
</html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  async function emailRows(rows, includeAll = false) {
    if (!emailRecipient.trim()) {
      setEmailErr('Enter an email recipient first.')
      return
    }
    if (!includeAll && rows.length === 0) {
      setEmailErr('Select at least one item to email.')
      return
    }
    setEmailBusy(true)
    setEmailErr(null)
    setEmailMsg(null)
    try {
      const payload = includeAll
        ? { recipient: emailRecipient.trim(), include_all: true }
        : { recipient: emailRecipient.trim(), item_ids: rows.map((s) => s._id) }
      const res = await api.post('/supplies/export/email', payload)
      setEmailMsg(res.data?.message || 'Inventory export email sent.')
    } catch (err) {
      setEmailErr(err?.response?.data?.error || 'Could not send inventory email.')
    } finally {
      setEmailBusy(false)
    }
  }

  const shopColSpan = isAdmin ? 13 : 12

  const shopTableRows = useMemo(() => {
    const rows = []
    let prevGroup = null
    for (const s of shop) {
      const g = (s.catalog_group || '').trim() || null
      if (g && g !== prevGroup) {
        rows.push({ type: 'group', key: `grp-${g}-${rows.length}`, label: g })
      }
      rows.push({ type: 'item', key: s._id, supply: s })
      prevGroup = g
    }
    return rows
  }, [shop])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Shop (warehouse) stock your team carries, plus what lives at each client site on stations—same data as
            Locations &amp; stations, rolled up here.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={openImport}
              className="text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              {showForm ? 'Cancel' : 'Add shop item'}
            </button>
          </div>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add to shop inventory</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                required
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <input
                value={formData.category}
                onChange={(e) => setFormData((d) => ({ ...d, category: e.target.value }))}
                placeholder="General"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.quantity_on_hand}
                onChange={(e) => setFormData((d) => ({ ...d, quantity_on_hand: Number(e.target.value) }))}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder at</label>
              <input
                type="number"
                min="0"
                value={formData.reorder_threshold}
                onChange={(e) => setFormData((d) => ({ ...d, reorder_threshold: Number(e.target.value) }))}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData((d) => ({ ...d, unit_price: e.target.value }))}
                placeholder="Optional"
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
              {formError}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Add supply'}
          </button>
        </form>
      )}

      {importOpen && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-dialog-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-start gap-2">
              <h2 id="import-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Import shop supplies (CSV)
              </h2>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload a CSV, map columns, preview validation, then commit. Rows are scoped to your organization on the
              server.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">CSV file</label>
              <input type="file" accept=".csv,text/csv" onChange={onCsvSelected} className="text-sm w-full" />
              {importFileName && (
                <p className="text-xs text-gray-500 mt-1">
                  Selected: <span className="font-medium">{importFileName}</span> · {parsedRows.length} row
                  {parsedRows.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
            {parsedRows.length > 0 && importStep === 'map' && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                  />
                  First row is header
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {IMPORT_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                        {f.label}
                        {f.required && <span className="text-red-500"> *</span>}
                      </label>
                      <select
                        value={columnMapping[f.key] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setColumnMapping((m) => ({
                            ...m,
                            [f.key]: v === '' ? null : Number(v),
                          }))
                        }}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                      >
                        <option value="">—</option>
                        {Array.from({ length: maxCols }, (_, i) => (
                          <option key={i} value={i}>
                            {headerLabels[i] != null ? `${i}: ${headerLabels[i]}` : `Column ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={importBusy}
                  onClick={runPreview}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {importBusy ? 'Working…' : 'Preview'}
                </button>
              </div>
            )}
            {importStep === 'preview' && previewResult && (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {previewResult.valid_row_count} valid row(s) of {previewResult.row_count}.{' '}
                  {!previewResult.valid && (
                    <span className="text-red-600 dark:text-red-400">
                      Fix errors in your file or mapping before importing.
                    </span>
                  )}
                </p>
                {previewResult.errors?.length > 0 && (
                  <ul className="text-xs text-red-700 dark:text-red-300 max-h-32 overflow-y-auto list-disc pl-4 space-y-1">
                    {previewResult.errors.slice(0, 40).map((er, i) => (
                      <li key={i}>
                        Row {er.row}: {er.message}
                      </li>
                    ))}
                    {previewResult.errors.length > 40 && <li>…</li>}
                  </ul>
                )}
                {previewResult.preview?.length > 0 && (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-md overflow-x-auto text-xs">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-slate-800 text-left">
                          <th className="px-2 py-1">Name</th>
                          <th className="px-2 py-1">Category</th>
                          <th className="px-2 py-1">Qty</th>
                          <th className="px-2 py-1">Reorder</th>
                          <th className="px-2 py-1">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.preview.map((row, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-slate-800">
                            <td className="px-2 py-1">{row.name}</td>
                            <td className="px-2 py-1">{row.category || '—'}</td>
                            <td className="px-2 py-1 tabular-nums">{row.quantity_on_hand ?? '—'}</td>
                            <td className="px-2 py-1 tabular-nums">{row.reorder_threshold ?? '—'}</td>
                            <td className="px-2 py-1 tabular-nums">
                              {row.unit_price != null ? row.unit_price : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportStep('map')
                      setPreviewResult(null)
                    }}
                    className="text-sm border border-gray-300 dark:border-slate-600 px-3 py-2 rounded-md"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={importBusy || !previewResult.valid}
                    onClick={runCommit}
                    className="text-sm bg-teal-600 text-white px-4 py-2 rounded-md font-medium hover:bg-teal-500 disabled:opacity-50"
                  >
                    {importBusy ? 'Importing…' : 'Import'}
                  </button>
                </div>
              </div>
            )}
            {importErr && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                {importErr}
              </div>
            )}
            {importMsg && (
              <div className="text-sm text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-md px-3 py-2">
                {importMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {totals && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shop items (SKUs)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{totals.shop_skus}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shop units (qty)</p>
            <p className="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-0.5">{totals.shop_units}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client site lines</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{totals.client_station_lines}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 uppercase">FE units (clients)</p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-0.5">
              {totals.client_fire_extinguisher_units}
            </p>
          </div>
        </div>
      )}

      {!loading && !error && <InventoryOverviewCharts shop={shop} clients={clients} />}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <section>
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shop / warehouse inventory</h2>
                <Link
                  to="/locations"
                  className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                >
                  Manage stations →
                </Link>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printRows(selectedShopRows, `Selected items (${selectedShopRows.length})`)}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-blue-700 transition-colors"
                  >
                    Print selected
                  </button>
                  <button
                    type="button"
                    onClick={() => printRows(shop, `All items (${shop.length})`)}
                    className="text-xs border border-gray-300 dark:border-slate-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Print all
                  </button>
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="text-xs border border-gray-300 dark:border-slate-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearSelected}
                    className="text-xs border border-gray-300 dark:border-slate-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Clear
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {selectedIds.length} selected (use checkboxes to select)
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Click an item row to view details
                  </span>
                </div>
                {isAdmin && (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="email"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="Email inventory to..."
                      className="w-full sm:max-w-xs border border-gray-300 dark:border-slate-600 rounded-md px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={emailBusy}
                      onClick={() => emailRows(selectedShopRows, false)}
                      className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                      {emailBusy ? 'Sending…' : 'Email selected'}
                    </button>
                    <button
                      type="button"
                      disabled={emailBusy}
                      onClick={() => emailRows(shop, true)}
                      className="text-xs border border-gray-300 dark:border-slate-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      Email all
                    </button>
                  </div>
                )}
                {emailErr && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{emailErr}</p>
                )}
                {emailMsg && (
                  <p className="mt-2 text-xs text-teal-700 dark:text-teal-300">{emailMsg}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Stock kept in your shop or trucks—not yet attributed to a client site.
            </p>
            <div className="mb-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/90 dark:bg-slate-800/50 px-3 py-2.5 text-center text-[11px] leading-snug text-gray-700 dark:text-gray-300 space-y-1">
              <p>
                Please note: pricing on PPE items such as gloves, masks and antiseptics as well as non-MediQue brands
                may change.
              </p>
              <p>First aid items and first aid kit fills may be substituted based on manufacturer supply.</p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                All Medi First Plus labeled items sold in case quantity only.
              </p>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
              <span className="font-medium">Shop QOH</span> is on-hand quantity in your shop or trucks. Tier columns
              mirror the vendor sheet (Level I / R / N). Technicians do not see unit prices.
            </p>
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-100 dark:bg-slate-800/90">
                    <tr>
                      <ShopTableHeaderCell rowSpan={2} className="align-middle text-center">
                        Pick
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell colSpan={4} className="text-center border-r border-gray-200 dark:border-slate-600">
                        Catalog
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell
                        align="right"
                        className="border-r border-gray-200 dark:border-slate-600 whitespace-nowrap"
                      >
                        Shop QOH
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" colSpan={2} className="border-r border-gray-200 dark:border-slate-600">
                        <span className="block">Minimum order</span>
                        <span className="block normal-case text-[9px] font-medium text-gray-500 dark:text-gray-500">
                          / Level I
                        </span>
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" colSpan={2} className="border-r border-gray-200 dark:border-slate-600">
                        <span className="block">Qty discount</span>
                        <span className="block normal-case text-[9px] font-medium text-gray-500 dark:text-gray-500">
                          / Level R
                        </span>
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" colSpan={2}>
                        <span className="block">Qty discount</span>
                        <span className="block normal-case text-[9px] font-medium text-gray-500 dark:text-gray-500">
                          / Level N
                        </span>
                      </ShopTableHeaderCell>
                      {isAdmin && (
                        <ShopTableHeaderCell align="right" rowSpan={2} className="align-middle">
                          Actions
                        </ShopTableHeaderCell>
                      )}
                    </tr>
                    <tr>
                      <ShopTableHeaderCell>Item #</ShopTableHeaderCell>
                      <ShopTableHeaderCell className="min-w-[12rem]">Item description</ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" className="whitespace-nowrap">
                        Qty per unit
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell
                        align="right"
                        className="border-r border-gray-200 dark:border-slate-600 whitespace-nowrap"
                      >
                        Case qty
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell
                        align="right"
                        className="border-r border-gray-200 dark:border-slate-600 whitespace-nowrap"
                      >
                        On hand
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" className="whitespace-nowrap">
                        Min qty
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell
                        align="right"
                        className="border-r border-gray-200 dark:border-slate-600 whitespace-nowrap"
                      >
                        Price / unit
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" className="whitespace-nowrap">
                        Qty
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell
                        align="right"
                        className="border-r border-gray-200 dark:border-slate-600 whitespace-nowrap"
                      >
                        Unit price
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" className="whitespace-nowrap">
                        Qty
                      </ShopTableHeaderCell>
                      <ShopTableHeaderCell align="right" className="whitespace-nowrap">
                        Unit price
                      </ShopTableHeaderCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {shopTableRows.map((row) => {
                      if (row.type === 'group') {
                        return (
                          <tr key={row.key} className="bg-slate-100/90 dark:bg-slate-800/70">
                            <td
                              colSpan={shopColSpan}
                              className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide"
                            >
                              {row.label}
                            </td>
                          </tr>
                        )
                      }
                      const s = row.supply
                      const low = s.quantity_on_hand <= s.reorder_threshold
                      const editing = isAdmin && editingId === s._id
                      const selected = selectedIds.includes(s._id)
                      const { itemNo, description } = parseSupplyDisplayName(s.name)
                      const showPricing = isAdmin
                      const tierHidden = (
                        <div className="text-right text-gray-400 dark:text-gray-500">
                          <div>—</div>
                          <div className="text-xs">—</div>
                        </div>
                      )
                      return (
                        <tr
                          key={s._id}
                          onClick={() => {
                            if (!editing) openDetails(s)
                          }}
                          onKeyDown={(e) => {
                            if (editing) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openDetails(s)
                            }
                          }}
                          role={editing ? undefined : 'button'}
                          tabIndex={editing ? undefined : 0}
                          className={`${
                            selected
                              ? 'bg-blue-50/80 dark:bg-blue-950/30'
                              : low
                              ? 'bg-red-50/80 dark:bg-red-950/20'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                          } ${editing ? '' : 'cursor-pointer'}`}
                        >
                          <td className="px-3 py-3 text-center align-top">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(s._id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${description}`}
                            />
                          </td>
                          {editing ? (
                            <td colSpan={2} className="px-3 py-3 text-sm align-top">
                              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                Full name (use [SKU] prefix for item #)
                              </label>
                              <input
                                value={editDraft?.name ?? ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                                className="w-full min-w-[12rem] border border-gray-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-950"
                              />
                              <input
                                value={editDraft?.catalog_group ?? ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, catalog_group: e.target.value }))}
                                placeholder="Catalog group (section heading)"
                                className="mt-2 w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                              />
                              <input
                                value={editDraft?.category ?? ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))}
                                placeholder="Category"
                                className="mt-2 w-full min-w-[8rem] border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                              />
                              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-2 mb-0.5">
                                Legacy list price (optional)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editDraft?.unit_price ?? ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, unit_price: e.target.value }))}
                                placeholder="unit_price"
                                className="w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                              />
                            </td>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-sm font-mono tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                                {itemNo}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-200">
                                <span className="block">{description}</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {s.category || 'General'}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-right">
                            {editing ? (
                              <input
                                value={editDraft?.qty_per_unit ?? ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, qty_per_unit: e.target.value }))}
                                placeholder="e.g. 1 each"
                                className="w-full min-w-[5rem] ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950 text-right"
                              />
                            ) : (
                              <span className="tabular-nums block text-right">
                                {s.qty_per_unit != null && s.qty_per_unit !== '' ? s.qty_per_unit : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-right tabular-nums border-r border-gray-100 dark:border-slate-800">
                            {editing ? (
                              <input
                                type="number"
                                min="0"
                                value={editDraft?.case_qty ?? ''}
                                onChange={(e) => setEditDraft((d) => ({ ...d, case_qty: e.target.value }))}
                                placeholder="—"
                                className="w-20 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                              />
                            ) : s.case_qty != null && s.case_qty !== '' ? (
                              s.case_qty
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-200 text-right tabular-nums border-r border-gray-100 dark:border-slate-800 align-top">
                            {editing ? (
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={editDraft?.quantity_on_hand ?? 0}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, quantity_on_hand: Number(e.target.value) }))
                                  }
                                  className="w-20 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950 block"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={editDraft?.reorder_threshold ?? 0}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, reorder_threshold: Number(e.target.value) }))
                                  }
                                  title="Reorder threshold"
                                  className="w-20 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-xs bg-white dark:bg-slate-950 block"
                                />
                                <span className="block text-[10px] text-gray-500">Reorder at</span>
                              </div>
                            ) : (
                              <>
                                <span className="font-medium block">{s.quantity_on_hand}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                  Reorder {s.reorder_threshold}
                                </span>
                                {low && (
                                  <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">
                                    Low
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          {showPricing && editing ? (
                            <>
                              <td className="px-3 py-3 text-right align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={editDraft?.min_order_qty ?? ''}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, min_order_qty: e.target.value }))}
                                  placeholder="—"
                                  className="w-16 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                                />
                              </td>
                              <td className="px-3 py-3 text-right align-top border-r border-gray-100 dark:border-slate-800">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editDraft?.min_order_unit_price ?? ''}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, min_order_unit_price: e.target.value }))
                                  }
                                  placeholder="—"
                                  className="w-20 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                                />
                              </td>
                              <td className="px-3 py-3 text-right align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={editDraft?.discount_r_qty ?? ''}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, discount_r_qty: e.target.value }))}
                                  placeholder="—"
                                  className="w-16 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                                />
                              </td>
                              <td className="px-3 py-3 text-right align-top border-r border-gray-100 dark:border-slate-800">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editDraft?.discount_r_unit_price ?? ''}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, discount_r_unit_price: e.target.value }))
                                  }
                                  placeholder="—"
                                  className="w-20 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                                />
                              </td>
                              <td className="px-3 py-3 text-right align-top">
                                <input
                                  type="number"
                                  min="0"
                                  value={editDraft?.discount_n_qty ?? ''}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, discount_n_qty: e.target.value }))}
                                  placeholder="—"
                                  className="w-16 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                                />
                              </td>
                              <td className="px-3 py-3 text-right align-top">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editDraft?.discount_n_unit_price ?? ''}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, discount_n_unit_price: e.target.value }))
                                  }
                                  placeholder="—"
                                  className="w-20 ml-auto border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-950"
                                />
                              </td>
                            </>
                          ) : showPricing ? (
                            <>
                              <td className="px-3 py-3 text-sm text-right tabular-nums align-top">
                                <span className="block text-gray-900 dark:text-gray-100">
                                  {s.min_order_qty != null && s.min_order_qty !== '' ? s.min_order_qty : '—'}
                                </span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Min qty</span>
                              </td>
                              <td className="px-3 py-3 text-sm text-right tabular-nums align-top border-r border-gray-100 dark:border-slate-800">
                                <span className="block">{fmtMoneyCell(s.min_order_unit_price)}</span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">/ unit</span>
                              </td>
                              <td className="px-3 py-3 text-sm text-right tabular-nums align-top">
                                <span className="block text-gray-900 dark:text-gray-100">
                                  {s.discount_r_qty != null && s.discount_r_qty !== '' ? s.discount_r_qty : '—'}
                                </span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Qty</span>
                              </td>
                              <td className="px-3 py-3 text-sm text-right tabular-nums align-top border-r border-gray-100 dark:border-slate-800">
                                <span className="block">{fmtMoneyCell(s.discount_r_unit_price)}</span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">/ unit</span>
                              </td>
                              <td className="px-3 py-3 text-sm text-right tabular-nums align-top">
                                <span className="block text-gray-900 dark:text-gray-100">
                                  {s.discount_n_qty != null && s.discount_n_qty !== '' ? s.discount_n_qty : '—'}
                                </span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Qty</span>
                              </td>
                              <td className="px-3 py-3 text-sm text-right tabular-nums align-top">
                                <span className="block">{fmtMoneyCell(s.discount_n_unit_price)}</span>
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">/ unit</span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-sm align-top">{tierHidden}</td>
                              <td className="px-3 py-3 text-sm align-top border-r border-gray-100 dark:border-slate-800">
                                {tierHidden}
                              </td>
                              <td className="px-3 py-3 text-sm align-top">{tierHidden}</td>
                              <td className="px-3 py-3 text-sm align-top border-r border-gray-100 dark:border-slate-800">
                                {tierHidden}
                              </td>
                              <td className="px-3 py-3 text-sm align-top">{tierHidden}</td>
                              <td className="px-3 py-3 text-sm align-top">{tierHidden}</td>
                            </>
                          )}
                          {isAdmin && (
                            <td className="px-3 py-3 text-right whitespace-nowrap align-top">
                              {editing ? (
                                <div className="flex flex-wrap justify-end gap-1">
                                  <button
                                    type="button"
                                    disabled={editSaving}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    saveEdit()
                                  }}
                                    className="text-xs font-medium text-teal-700 dark:text-teal-300 hover:underline"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                      setEditingId(null)
                                      setEditDraft(null)
                                      setEditError(null)
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEdit(s)
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClickCapture={(e) => e.stopPropagation()}
                                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Edit
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                    {editError && isAdmin && (
                      <tr key="shop-table-edit-error">
                        <td colSpan={shopColSpan} className="px-4 py-2 text-sm text-red-600">
                          {editError}
                        </td>
                      </tr>
                    )}
                    {shop.length === 0 && (
                      <tr key="shop-table-empty">
                        <td
                          colSpan={shopColSpan}
                          className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm"
                        >
                          No shop items yet. {isAdmin && 'Use “Add shop item” or import a CSV.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Client site inventory</h2>
              <Link
                to="/locations"
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline shrink-0"
              >
                Edit stations →
              </Link>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Required supplies from the client record, plus live counts from each station (cabinet / yard / jobsite).
            </p>

            <div className="space-y-6">
              {clients.map((c) => {
                const clientFe = c.stations.reduce((n, st) => n + feUnits(st.station_inventory), 0)
                const hasStations = c.stations.length > 0
                const hasRequired = (c.required_supplies || []).length > 0
                if (!hasStations && !hasRequired && c.name === 'Unassigned locations') return null
                return (
                  <div
                    key={c.client_id || c.name}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-800/40">
                      <div>
                        {isAdmin && c.client_id ? (
                          <Link
                            to={`/clients/${c.client_id}`}
                            className="font-semibold text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-white">{c.name}</span>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {c.stations.length} station{c.stations.length === 1 ? '' : 's'}
                          {clientFe > 0 && (
                            <>
                              {' · '}
                              <span className="text-amber-700 dark:text-amber-300 font-medium">{clientFe} FE units</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {hasRequired && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            Required supplies (contract / job template)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {c.required_supplies.map((req, i) => (
                              <span
                                key={i}
                                className="text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full"
                              >
                                {req.name} ×{req.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasStations && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No stations linked. Add locations for this client under{' '}
                          <Link to="/locations" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                            Locations &amp; stations
                          </Link>
                          .
                        </p>
                      )}

                      {c.stations.map((st) => {
                        const inv = st.station_inventory || []
                        const feHere = feUnits(inv)
                        return (
                          <div
                            key={st._id}
                            className="rounded-lg border border-gray-100 dark:border-slate-800 overflow-hidden"
                          >
                            <div className="px-3 py-2 bg-gray-50/90 dark:bg-slate-800/60 flex flex-wrap justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{st.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {[st.location_code && `Code ${st.location_code}`, st.address].filter(Boolean).join(' · ') ||
                                    'No code or address'}
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 self-center">
                                {inv.length} line{inv.length === 1 ? '' : 's'}
                                {feHere > 0 && (
                                  <span className="text-amber-700 dark:text-amber-300 font-medium"> · {feHere} FE</span>
                                )}
                              </p>
                            </div>
                            {inv.length === 0 ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-3">No lines at this station.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                                      <th className="px-3 py-2 font-medium">Item</th>
                                      <th className="px-3 py-2 font-medium w-12">Qty</th>
                                      <th className="px-3 py-2 font-medium">Stocked</th>
                                      <th className="px-3 py-2 font-medium">Expires</th>
                                      <th className="px-3 py-2 font-medium">FE</th>
                                      <th className="px-3 py-2 font-medium">Placement</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
                                    {inv.map((row, invIdx) => (
                                      <tr key={row._id ?? `${st._id}-line-${invIdx}-${row.item_name || ''}`}>
                                        <td className="px-3 py-2">{row.item_name}</td>
                                        <td className="px-3 py-2 tabular-nums">{row.quantity}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.stocked_at)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          {row.expires_at ? formatDate(row.expires_at) : '—'}
                                        </td>
                                        <td className="px-3 py-2">{row.is_fire_extinguisher ? 'Yes' : '—'}</td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[200px]">
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
                  </div>
                )
              })}

              {clients.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                  No clients yet. Add clients and stations to see site inventory here.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-detail-title"
          onClick={closeDetails}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="inventory-detail-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                  {parseSupplyDisplayName(detailItem.name).description}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Item # {parseSupplyDisplayName(detailItem.name).itemNo}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium text-gray-900 dark:text-white">{detailItem.category || 'General'}</p>
              </div>
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">On hand</p>
                <p className="font-medium text-gray-900 dark:text-white tabular-nums">{detailItem.quantity_on_hand ?? 0}</p>
              </div>
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Reorder at</p>
                <p className="font-medium text-gray-900 dark:text-white tabular-nums">{detailItem.reorder_threshold ?? 0}</p>
              </div>
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Catalog group</p>
                <p className="font-medium text-gray-900 dark:text-white">{detailItem.catalog_group || '—'}</p>
              </div>
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Qty per unit</p>
                <p className="font-medium text-gray-900 dark:text-white">{detailItem.qty_per_unit || '—'}</p>
              </div>
              <div className="rounded-md border border-gray-200 dark:border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Case qty</p>
                <p className="font-medium text-gray-900 dark:text-white tabular-nums">{detailItem.case_qty ?? '—'}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <p>Min order: {detailItem.min_order_qty ?? '—'} @ {fmtMoneyCell(detailItem.min_order_unit_price)}</p>
                <p>Level R: {detailItem.discount_r_qty ?? '—'} @ {fmtMoneyCell(detailItem.discount_r_unit_price)}</p>
                <p>Level N: {detailItem.discount_n_qty ?? '—'} @ {fmtMoneyCell(detailItem.discount_n_unit_price)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
