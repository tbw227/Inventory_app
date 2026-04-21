import api from './api'

/** Optional override without changing backend .env (Vite: VITE_WEATHER_CITY=Olathe,KS,US). */
function defaultCityParam() {
  const v = import.meta.env.VITE_WEATHER_CITY
  return v && String(v).trim() ? String(v).trim() : undefined
}

export function getForecast(city) {
  const resolved = city ?? defaultCityParam()
  return api.get('/weather/forecast', { params: resolved ? { city: resolved } : {} })
}

/** Company / tenant forecast locations (cached per city on server). */
export function getWeatherLocations() {
  return api.get('/weather/locations')
}
