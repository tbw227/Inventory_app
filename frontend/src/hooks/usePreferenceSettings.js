import { useEffect, useState } from 'react'

export function usePreferenceSettings(user) {
  const [weatherTheme, setWeatherTheme] = useState(() => user?.preferences?.weather_theme || 'default')
  const [dashboardAccent, setDashboardAccent] = useState(() => user?.preferences?.dashboard_accent || 'teal')
  const [weatherCity, setWeatherCity] = useState(() => user?.preferences?.weather_city || '')
  const [prefsMsg, setPrefsMsg] = useState(null)
  const [prefsErr, setPrefsErr] = useState(null)
  const [prefsSaving, setPrefsSaving] = useState(false)

  useEffect(() => {
    if (!user?.preferences) return
    setWeatherTheme(user.preferences.weather_theme || 'default')
    setDashboardAccent(user.preferences.dashboard_accent || 'teal')
    setWeatherCity(user.preferences.weather_city || '')
  }, [user?.preferences])

  return {
    weatherTheme,
    setWeatherTheme,
    dashboardAccent,
    setDashboardAccent,
    weatherCity,
    setWeatherCity,
    prefsMsg,
    setPrefsMsg,
    prefsErr,
    setPrefsErr,
    prefsSaving,
    setPrefsSaving,
  }
}
