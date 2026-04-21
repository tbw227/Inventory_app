import React, { useState, useMemo } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { paymentService } from '../../services/paymentService'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY?.trim()

function useStripePromise() {
  return useMemo(() => {
    if (!stripePublishableKey) return null
    return loadStripe(stripePublishableKey)
  }, [])
}

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
}

function PaymentFormInner({ jobId, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount')
      return
    }

    setProcessing(true)
    setError(null)
    setSuccess(false)

    try {
      const { data } = await paymentService.createIntent({
        job_id: jobId,
        amount: parsedAmount,
      })

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      })

      if (result.error) {
        setError(result.error.message)
      } else if (result.paymentIntent?.status === 'succeeded') {
        setSuccess(true)
        setAmount('')
        elements.getElement(CardElement).clear()
        onSuccess?.()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (USD)
        </label>
        <input
          type="number"
          min="0.50"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={processing}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-md px-3 py-3 bg-white">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Payment successful!
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing || !amount}
        className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
}

export default function PaymentForm(props) {
  const stripePromise = useStripePromise()

  if (!stripePublishableKey) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        Card payments need <code className="text-xs">VITE_STRIPE_PUBLIC_KEY</code> in <code className="text-xs">frontend/.env</code>
        . Use a <strong>test</strong> key (<code className="text-xs">pk_test_…</code>) for local HTTP; live keys (
        <code className="text-xs">pk_live_…</code>) require HTTPS in production.
      </p>
    )
  }
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner {...props} />
    </Elements>
  )
}
