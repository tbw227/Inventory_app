import React, { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function fmt(v) {
  return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SummaryCard({ label, value, color = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>${fmt(value)}</p>
    </div>
  )
}

const CURRENT_YEAR = new Date().getFullYear()

export default function Financials() {
  const { user, isAdmin } = useAuth()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [taxCategories, setTaxCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'expense', date: new Date().toISOString().slice(0, 10), amount: '', description: '', vendor: '', tax_category_id: '', tax_deductible: true, notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, txnRes, catRes] = await Promise.all([
        api.get('/financials/tax-summary', { params: { year } }),
        api.get('/financials/transactions', { params: { year, limit: 200 } }),
        api.get('/financials/tax-categories'),
      ])
      setSummary(sumRes.data)
      setTransactions(txnRes.data)
      setTaxCategories(catRes.data)
    } catch (err) {
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/financials/sync/quickbooks')
      toast.success(`Synced ${res.data.accounts} accounts, ${res.data.income} income, ${res.data.expenses} expenses`)
      if (res.data.errors?.length) {
        res.data.errors.forEach((e) => toast.error(e, { duration: 5000 }))
      }
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'QuickBooks sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      await api.post('/financials/transactions', { ...form, amount: parseFloat(form.amount) })
      toast.success('Transaction added')
      setShowForm(false)
      setForm({ type: 'expense', date: new Date().toISOString().slice(0, 10), amount: '', description: '', vendor: '', tax_category_id: '', tax_deductible: true, notes: '' })
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (txnId) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await api.delete(`/financials/transactions/${txnId}`)
      toast.success('Deleted')
      fetchData()
    } catch (err) {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Financial Tracking</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Revenue, expenses, and tax deductions</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
            {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isAdmin && (
            <>
              <button type="button" onClick={handleSync} disabled={syncing} className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {syncing ? 'Syncing…' : 'Sync QuickBooks'}
              </button>
              <button type="button" onClick={() => setShowForm(!showForm)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                + Add
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard label="Total Income" value={summary.total_income} color="text-emerald-600 dark:text-emerald-400" />
              <SummaryCard label="Total Expenses" value={summary.total_expenses} color="text-red-600 dark:text-red-400" />
              <SummaryCard label="Net Profit" value={summary.net_profit} color={summary.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
              <SummaryCard label="Tax Deductions" value={summary.total_deductible} color="text-indigo-600 dark:text-indigo-400" />
            </div>
          )}

          {showForm && isAdmin && (
            <form onSubmit={handleAddTransaction} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">New Transaction</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Amount ($)</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Vendor / Client</label>
                  <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Company name" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                {form.type === 'expense' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Tax Category</label>
                      <select value={form.tax_category_id} onChange={(e) => setForm({ ...form, tax_category_id: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                        <option value="">None</option>
                        {taxCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={form.tax_deductible} onChange={(e) => setForm({ ...form, tax_deductible: e.target.checked })} className="rounded" />
                        Tax deductible
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {summary?.deductions_by_category?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tax Deductions by Category</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.deductions_by_category.map((cat) => (
                  <div key={cat.tax_category_id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{cat.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cat.irs_code} · {cat.count} transaction{cat.count !== 1 ? 's' : ''}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">${fmt(cat.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Transactions ({transactions.length})
              </h2>
            </div>
            {transactions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No transactions for {year}. Add one manually or sync from QuickBooks.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${txn.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {txn.description || txn.vendor || (txn.type === 'income' ? 'Income' : 'Expense')}
                        </p>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{new Date(txn.date).toLocaleDateString()}</span>
                        {txn.vendor && <span>{txn.vendor}</span>}
                        {txn.taxCategory && <span className="text-indigo-600 dark:text-indigo-400">{txn.taxCategory.name}</span>}
                        {txn.taxDeductible && <span className="font-medium text-emerald-600 dark:text-emerald-400">Deductible</span>}
                        {txn.qboId && <span className="text-teal-600 dark:text-teal-400">QB</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${txn.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {txn.type === 'income' ? '+' : '-'}${fmt(txn.amount)}
                      </p>
                      {isAdmin && !txn.qboId && (
                        <button type="button" onClick={() => handleDelete(txn.id)} className="text-xs text-red-500 hover:text-red-700">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
