import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useJob } from '../hooks/useJob'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { unwrapList } from '../utils/unwrapList'
import { paymentService } from '../services/paymentService'
import PaymentForm from '../components/ui/PaymentForm'
import AuthedImg from '../components/ui/AuthedImg'
import { getJobLocations } from '../utils/jobLocations'
import toast from 'react-hot-toast'
import CameraCaptureModal from '../components/tech/CameraCaptureModal'
import SupplyQrScanModal from '../components/tech/SupplyQrScanModal'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { job, loading, error, refetch } = useJob(id)
  const { user } = useAuth()
  const [suppliesList, setSuppliesList] = useState([])
  const [suppliesUsed, setSuppliesUsed] = useState([])
  const [selectedSupply, setSelectedSupply] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)
  const [photos, setPhotos] = useState([])
  const [notes, setNotes] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientLocations, setClientLocations] = useState([])
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [billingDraft, setBillingDraft] = useState('')
  const [billingSaving, setBillingSaving] = useState(false)
  const [billingError, setBillingError] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [supplyQrOpen, setSupplyQrOpen] = useState(false)

  const fetchPayments = useCallback(() => {
    if (!id) return
    setPaymentsLoading(true)
    paymentService.listByJob(id)
      .then(res => setPayments(res.data || []))
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false))
  }, [id])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    if (job?.billing_amount != null && job.billing_amount !== '') {
      setBillingDraft(String(job.billing_amount))
    } else {
      setBillingDraft('')
    }
  }, [job?.billing_amount])

  useEffect(() => {
    api.get('/supplies').then(res => setSuppliesList(unwrapList(res.data))).catch(() => {})
  }, [])

  const addOrMergeSupplyUsed = useCallback(
    async (items) => {
      const normalized = (items || []).filter(Boolean)
      if (!normalized.length) return

      const unknownIds = []
      const mapped = normalized
        .map((it) => {
          const supply = suppliesList.find((s) => s._id === it.supplyId)
          if (!supply) {
            unknownIds.push(it.supplyId)
            return null
          }
          return { name: supply.name, quantity: it.quantity }
        })
        .filter(Boolean)

      if (unknownIds.length) {
        toast.error(
          `Some supplies were not recognized (${Array.from(new Set(unknownIds)).slice(0, 2).join(', ')}${
            unknownIds.length > 2 ? '…' : ''
          })`
        )
      }

      if (!mapped.length) return

      // Persist to backend immediately so scans survive refresh and stay consistent.
      await api.post(`/jobs/${id}/inventory`, { items: mapped })

      setSuppliesUsed((prev) => {
        const next = [...prev]
        for (const m of mapped) {
          const idx = next.findIndex((x) => x.name === m.name)
          if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + m.quantity }
          else next.push(m)
        }
        return next
      })

      toast.success(`Scanned ${mapped.length} supply${mapped.length === 1 ? '' : 'ies'}`)
    },
    [suppliesList, id]
  )

  useEffect(() => {
    const clientId = job?.client_id?._id
    if (!clientId) {
      setClientLocations([])
      return
    }

    api
      .get('/locations', { params: { client_id: clientId } })
      .then(res => setClientLocations(unwrapList(res.data)))
      .catch(() => setClientLocations([]))
  }, [job?.client_id?._id])

  const canComplete = job
    && job.status !== 'completed'
    && (user?.role === 'admin' || job.assigned_user_id?._id === user?._id)

  const canCollectPayment = job && (
    user?.role === 'admin'
    || String(job.assigned_user_id?._id) === String(user?._id)
  )

  async function saveBillingAmount() {
    setBillingError(null)
    setBillingSaving(true)
    try {
      const raw = billingDraft.trim()
      const billing_amount = raw === '' ? null : parseFloat(raw)
      if (billing_amount != null && (Number.isNaN(billing_amount) || billing_amount < 0)) {
        setBillingError('Enter a valid amount or leave empty')
        return
      }
      await api.put(`/jobs/${id}`, { billing_amount })
      refetch()
    } catch (e) {
      setBillingError(e?.response?.data?.error || 'Could not update billing')
    } finally {
      setBillingSaving(false)
    }
  }

  const addSupply = () => {
    const name = selectedSupply.trim()
    if (!name || selectedQty < 1) return
    setSuppliesUsed(prev => [...prev.filter(s => s.name !== name), { name, quantity: selectedQty }])
    setSelectedSupply('')
    setSelectedQty(1)
  }

  const removeSupply = (name) => {
    setSuppliesUsed(prev => prev.filter(s => s.name !== name))
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await api.post('/upload', formData)
      if (res.data?.url) setPhotos(prev => [...prev, res.data.url])
    } catch (err) {
      console.error(err)
    } finally {
      setUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const removePhoto = (url) => setPhotos(prev => prev.filter(p => p !== url))

  async function handleComplete() {
    setCompleteError(null)
    setCompleting(true)
    try {
      const payload = {
        suppliesUsed: suppliesUsed,
        photos,
        notes: notes.trim(),
        clientEmail: clientEmail.trim() || undefined,
      }
      await api.post(`/jobs/${id}/complete`, payload)
      refetch()
    } catch (err) {
      setCompleteError(err?.response?.data?.error || 'Failed to complete job')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
        {error}
      </div>
    )
  }

  if (!job) {
    return <div className="text-gray-500 text-center py-12">Job not found</div>
  }

  const clientName = job.client_id?.name || 'Unknown'
  const clientLocation = job.client_id?.location || ''
  const clientContact = job.client_id?.contact_info || ''
  const stations = getJobLocations(job)
  const techName = job.assigned_user_id?.name || 'Unassigned'
  const showMobileStickyComplete = user?.role !== 'admin'

  return (
    <>
      <div className="job-container max-w-2xl mx-auto px-4 py-6 pb-28">
      <button
        onClick={() => navigate('/jobs')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center"
      >
        &larr; Back to Jobs
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{clientName}</h2>
            {clientLocation && <p className="text-gray-600 mt-1">{clientLocation}</p>}
            {stations.length > 0 && (
              <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Stations / locations
                </p>
                <ul className="mt-1 space-y-1">
                  {stations.map((loc) => (
                    <li key={loc._id || loc.name} className="text-sm text-gray-800">
                      <span className="font-medium">{loc.name}</span>
                      {loc.location_code && (
                        <span className="text-gray-600"> ({loc.location_code})</span>
                      )}
                      {loc.address && (
                        <span className="block text-xs text-gray-600 mt-0.5">{loc.address}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Service date: {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'N/A'} · Technician: {techName}
            </p>
          </div>
          {job.status !== 'completed' && (
            <button
              type="button"
              onClick={() => window.open(`/jobs/${job._id}/label`, '_blank')}
              className="text-sm bg-gray-100 text-gray-800 px-3 py-2 rounded-md font-medium hover:bg-gray-200 no-print"
            >
              Print Label
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-gray-500">Job ID</p>
            <p className="font-medium text-gray-900 break-all">{job._id}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-gray-500">Status</p>
            <p className="font-medium text-gray-900 capitalize">{job.status}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-gray-500">Technician</p>
            <p className="font-medium text-gray-900">{techName}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-gray-500">Client Contact</p>
            <p className="font-medium text-gray-900">{clientContact || 'No contact info added'}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-3 sm:col-span-2">
            <p className="text-gray-500">Billing</p>
            <p className="font-medium text-gray-900">
              Total paid: ${(job.total_paid || 0).toFixed(2)}
              {job.billing_amount != null && (
                <>
                  {' · '}
                  Expected: ${Number(job.billing_amount).toFixed(2)}
                  {' · '}
                  Remaining: $
                  {(job.remaining_balance != null ? job.remaining_balance : Math.max(0, job.billing_amount - (job.total_paid || 0))).toFixed(2)}
                </>
              )}
              {job.billing_amount == null && (
                <span className="text-gray-500 font-normal"> · Set expected total (admin) to track balance</span>
              )}
            </p>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="rounded-md border border-gray-200 p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Expected job total (admin)</h3>
            <p className="text-xs text-gray-500">Used with payments to show remaining balance. Technicians cannot edit this.</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-gray-500 mb-1">Amount (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billingDraft}
                  onChange={(e) => setBillingDraft(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={saveBillingAmount}
                disabled={billingSaving}
                className="py-2 px-4 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
              >
                {billingSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {billingError && (
              <p className="text-sm text-red-600">{billingError}</p>
            )}
          </div>
        )}

        {job.planned_supplies?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Planned Supplies</h3>
            <div className="bg-gray-50 rounded-md p-3 space-y-1">
              {job.planned_supplies.map((s, i) => (
                <div key={`${s.name}-${i}`} className="flex justify-between text-sm">
                  <span className="text-gray-700">{s.name}</span>
                  <span className="text-gray-500">x{s.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {clientLocations.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Client Locations</h3>
            <div className="bg-gray-50 rounded-md p-3 space-y-2">
              {clientLocations.map((loc) => (
                <div key={loc._id} className="text-sm border-b border-gray-200 last:border-b-0 pb-2 last:pb-0">
                  <p className="font-medium text-gray-900">
                    {loc.name}
                    {loc.location_code ? ` (${loc.location_code})` : ''}
                  </p>
                  {loc.address && <p className="text-gray-600">{loc.address}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {job.supplies_used?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Supplies Used</h3>
            <div className="bg-gray-50 rounded-md p-3 space-y-1">
              {job.supplies_used.map((s, i) => (
                <div key={`${s.name}-${i}`} className="flex justify-between text-sm">
                  <span className="text-gray-700">{s.name}</span>
                  <span className="text-gray-500">x{s.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {job.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}

        {job.completed_at && (
          <p className="text-sm text-gray-500">
            Completed {new Date(job.completed_at).toLocaleString()}
          </p>
        )}

        {job.status !== 'completed' && canComplete && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Supplies Used</h3>
              {suppliesUsed.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {suppliesUsed.map((s, i) => (
                    <li key={i} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2 text-sm">
                      <span>{s.name} — Qty: {s.quantity}</span>
                      <button type="button" onClick={() => removeSupply(s.name)} className="text-red-600 hover:underline">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-gray-500 mb-1">Supply</label>
                  <select
                    value={selectedSupply}
                    onChange={(e) => setSelectedSupply(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    {suppliesList.map(s => (
                      <option key={s._id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-xs text-gray-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Number(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addSupply}
                  className="py-2 px-4 bg-gray-100 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  + Add Supply
                </button>
                <button
                  type="button"
                  onClick={() => setSupplyQrOpen(true)}
                  className="py-2 px-4 w-full sm:w-auto bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors active:scale-[0.99]"
                >
                  Scan Supply QR
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Upload Photos</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {photos.map(url => (
                  <div key={url} className="relative inline-block">
                    <AuthedImg src={url} alt="" className="h-20 w-20 object-cover rounded border" />
                    <button type="button" onClick={() => removePhoto(url)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="inline-block w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-md text-center text-sm text-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                  {uploadingPhoto ? 'Uploading...' : 'Take / Choose Photo'}
                </label>

                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  disabled={uploadingPhoto}
                  className="w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-md text-center text-sm font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.99]"
                >
                  Capture Photo
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for the report..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[120px]"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report email (optional)</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {completeError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {completeError}
              </div>
            )}

            {showMobileStickyComplete && (
              <div className="fixed left-0 right-0 bottom-16 px-4 lg:hidden">
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full h-14 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.99]"
                >
                  {completing ? 'Completing…' : 'Complete Job'}
                </button>
              </div>
            )}

            <button
              onClick={handleComplete}
              disabled={completing}
              className={`w-full py-4 bg-green-600 text-white text-lg font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                showMobileStickyComplete ? 'hidden lg:block' : ''
              }`}
            >
              {completing ? 'Completing...' : 'Complete Job'}
            </button>
          </>
        )}

        {/* Payment Section — assigned technician or admin; view-only financial records for others */}
        {job.status !== 'pending' && canCollectPayment && (
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Collect Payment</h3>
            <p className="text-xs text-gray-500">Payments are immutable after submission; failed attempts stay in history for audit.</p>
            <PaymentForm
              jobId={job._id}
              onSuccess={() => {
                fetchPayments()
                refetch()
              }}
            />
          </div>
        )}

        {/* Payment History */}
        {job.status !== 'pending' && (
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <span className="text-sm font-medium text-gray-700">
                Total paid: <span className="text-green-600">${(job.total_paid || 0).toFixed(2)}</span>
                {job.billing_amount != null && job.remaining_balance != null && (
                  <span className="text-gray-600 ml-2">
                    · Remaining: ${Number(job.remaining_balance).toFixed(2)}
                  </span>
                )}
              </span>
            </div>
            {paymentsLoading ? (
              <div className="text-sm text-gray-500">Loading payments...</div>
            ) : payments.length === 0 && !(job.total_paid > 0) ? (
              <div className="text-sm text-gray-500">No payments recorded yet.</div>
            ) : payments.length === 0 ? (
              <div className="text-sm text-gray-500">Totals reflect completed payments; detailed rows will appear after sync.</div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-900">${p.amount.toFixed(2)}</span>
                      <span className="text-gray-500 ml-2">
                        {p.technician_id?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(p.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      <SupplyQrScanModal
        open={supplyQrOpen}
        onClose={() => setSupplyQrOpen(false)}
        onScanned={(parsed) => {
          if (parsed?.kind === 'supplies') {
            addOrMergeSupplyUsed(parsed.items).catch((e) => {
              toast.error(e?.response?.data?.error || e?.message || 'Failed to update inventory')
            })
          }
        }}
      />
      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onUploaded={(url) => {
          setPhotos((prev) => [...prev, url])
          toast.success('Photo added')
        }}
      />
    </>
  )
}
