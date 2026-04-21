import { useEffect, useState } from 'react'
import api from '../services/api'

export function useBillingSettings({ searchParams, setSearchParams, refreshUser }) {
  const [billingMsg, setBillingMsg] = useState(null)
  const [billingErr, setBillingErr] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)

  useEffect(() => {
    const b = searchParams.get('billing')
    if (b === 'success') {
      setBillingMsg('Subscription updated. Syncing your account…')
      refreshUser().finally(() => {
        setBillingMsg('Subscription is up to date.')
        searchParams.delete('billing')
        setSearchParams(searchParams, { replace: true })
      })
    } else if (b === 'cancel') {
      setBillingMsg('Checkout was cancelled.')
      searchParams.delete('billing')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, refreshUser])

  async function openCheckout(plan) {
    setBillingErr(null)
    setBillingMsg(null)
    setBillingLoading(true)
    try {
      const res = await api.post('/companies/billing/checkout-session', { plan })
      if (res.data?.url) window.location.href = res.data.url
      else setBillingErr('No checkout URL returned')
    } catch (e) {
      setBillingErr(e?.response?.data?.error || e?.message || 'Could not start checkout')
    } finally {
      setBillingLoading(false)
    }
  }

  async function openBillingPortal() {
    setBillingErr(null)
    setBillingMsg(null)
    setBillingLoading(true)
    try {
      const res = await api.post('/companies/billing/portal-session')
      if (res.data?.url) window.location.href = res.data.url
      else setBillingErr('No billing portal URL returned')
    } catch (e) {
      setBillingErr(e?.response?.data?.error || e?.message || 'Could not open billing portal')
    } finally {
      setBillingLoading(false)
    }
  }

  return {
    billingMsg,
    billingErr,
    billingLoading,
    setBillingMsg,
    setBillingErr,
    openCheckout,
    openBillingPortal,
  }
}
