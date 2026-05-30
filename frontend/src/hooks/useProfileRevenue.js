import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useProfileRevenue(userId) {
  const [revenueDays, setRevenueDays] = useState('30')
  const [shopRevenue, setShopRevenue] = useState(null)
  const [techRevenue, setTechRevenue] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRevenue = useCallback(async () => {
    if (userId === '') return
    setLoading(true)
    setError(null)
    try {
      const params = revenueDays === 'all' ? {} : { days: revenueDays }
      const url = userId ? `/users/${userId}/revenue` : '/users/me/revenue'
      const res = await api.get(url, { params })
      setShopRevenue(res.data?.shop_revenue ?? 0)
      setTechRevenue(res.data?.tech_revenue ?? 0)
    } catch (err) {
      setShopRevenue(null)
      setTechRevenue(null)
      setError(err?.response?.data?.error || err?.message || 'Could not load revenue')
    } finally {
      setLoading(false)
    }
  }, [userId, revenueDays])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  return {
    revenueDays,
    setRevenueDays,
    shopRevenue,
    techRevenue,
    revenueLoading: loading,
    revenueError: error,
    refetchRevenue: fetchRevenue,
  }
}
