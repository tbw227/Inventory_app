import React, { useState, useCallback } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

function fmt(n) {
  return (Number(n) || 0).toFixed(2)
}

export default function InvoicePanel({ jobId }) {
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const generateInvoice = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.post(`/jobs/${jobId}/invoice`, { send: false })
      setInvoice(res.data.invoice)
      if (res.data.invoice?.client?.contact_info) {
        const match = res.data.invoice.client.contact_info.match(/\S+@\S+\.\S+/)
        if (match) setEmail(match[0])
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to generate invoice')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  const sendInvoice = useCallback(async () => {
    if (!email.trim()) {
      toast.error('Enter a recipient email')
      return
    }
    setError(null)
    setSending(true)
    try {
      const res = await api.post(`/jobs/${jobId}/invoice`, { send: true, email: email.trim() })
      toast.success(`Invoice sent to ${res.data.sent_to}`)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to send invoice'
      toast.error(msg)
      setError(msg)
    } finally {
      setSending(false)
    }
  }, [jobId, email])

  if (!invoice) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={generateInvoice}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating…' : 'Generate Invoice'}
        </button>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-indigo-600 px-4 py-3">
          <h3 className="text-sm font-bold text-white">Service Invoice</h3>
          <p className="text-xs text-indigo-200 mt-0.5">Job {invoice.job_id}</p>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Client</span>
            <span className="font-medium text-slate-900 dark:text-white">{invoice.client.name}</span>
            <span className="text-slate-500 dark:text-slate-400">Service Date</span>
            <span className="text-slate-800 dark:text-slate-200">
              {invoice.service_date ? new Date(invoice.service_date).toLocaleDateString() : 'N/A'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Technician</span>
            <span className="text-slate-800 dark:text-slate-200">{invoice.technician}</span>
          </div>

          {invoice.stations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Stations</p>
              <ul className="space-y-0.5 text-sm text-slate-700 dark:text-slate-300">
                {invoice.stations.map((s, i) => (
                  <li key={i}>
                    {s.name}
                    {s.location_code ? ` (${s.location_code})` : ''}
                    {s.address ? ` — ${s.address}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Item</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((li, i) => (
                  <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-800/30'}>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100 font-medium">{li.name}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-700 dark:text-slate-200">{li.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">${fmt(li.unit_price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">${fmt(li.line_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                  <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-slate-900 dark:text-white">Total</td>
                  <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">${fmt(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Send invoice to
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={sendInvoice}
            disabled={sending}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending…' : 'Send Invoice'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setInvoice(null)}
        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Close preview
      </button>
    </div>
  )
}
