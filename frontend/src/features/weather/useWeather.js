import { useCallback, useEffect, useState } from 'react';
import { getForecast } from '../../services/weatherService';

export function useWeather(city) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    return getForecast(city)
      .then((res) => {
        setData(res.data);
        setFetchedAt(Date.now());
        setError(null);
        return res.data;
      })
      .catch((e) => {
        const msg = e?.response?.data?.error || e?.message || 'Weather unavailable';
        setData(null);
        setError(msg);
        throw e;
      })
      .finally(() => setLoading(false));
  }, [city]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getForecast(city)
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setFetchedAt(Date.now());
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e?.response?.data?.error || e?.message || 'Weather unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return { data, error, loading, fetchedAt, refetch };
}
