import { useEffect, useState } from 'react'
import api from '../services/api'

export function useQuickBooksSettings({ isAdmin, searchParams, setSearchParams }) {
  const [qboStatus, setQboStatus] = useState(null)
  const [qboLoading, setQboLoading] = useState(false)
  const [qboErr, setQboErr] = useState(null)
  const [qboMsg, setQboMsg] = useState(null)
  const [qboBusy, setQboBusy] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setQboLoading(true)
    setQboErr(null)
    api
      .get('/integrations/quickbooks/status')
      .then((res) => {
        if (!cancelled) setQboStatus(res.data || { connected: false })
      })
      .catch((e) => {
        if (!cancelled) setQboErr(e?.response?.data?.error || e?.message || 'Could not load QuickBooks status')
      })
      .finally(() => {
        if (!cancelled) setQboLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    const integ = searchParams.get('integration')
    const st = searchParams.get('status')
    if (integ !== 'qbo' || !st) return
    if (st === 'connected') {
      setQboMsg('QuickBooks connected for your organization.')
      setQboStatus((prev) => ({ ...(prev || {}), connected: true }))
    } else {
      setQboErr(
        st === 'missing_params'
          ? 'QuickBooks returned an incomplete response. Try connecting again.'
          : 'QuickBooks connection did not finish. Check server Intuit settings and try again.'
      )
    }
    searchParams.delete('integration')
    searchParams.delete('status')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams])

  async function connectQuickBooks() {
    setQboErr(null)
    setQboMsg(null)
    setQboBusy(true)
    try {
      const res = await api.get('/integrations/quickbooks/authorize-url')
      const url = res.data?.authorization_url
      if (url) window.location.href = url
      else setQboErr('No authorization URL returned')
    } catch (e) {
      setQboErr(e?.response?.data?.error || e?.message || 'Could not start QuickBooks connection')
    } finally {
      setQboBusy(false)
    }
  }

  async function disconnectQuickBooks() {
    setQboErr(null)
    setQboMsg(null)
    setQboBusy(true)
    try {
      await api.delete('/integrations/quickbooks/connection')
      setQboStatus({ connected: false })
      setQboMsg('QuickBooks disconnected.')
    } catch (e) {
      setQboErr(e?.response?.data?.error || e?.message || 'Could not disconnect')
    } finally {
      setQboBusy(false)
    }
  }

  return {
    qboStatus,
    qboLoading,
    qboErr,
    qboMsg,
    qboBusy,
    setQboErr,
    setQboMsg,
    connectQuickBooks,
    disconnectQuickBooks,
  }
}
