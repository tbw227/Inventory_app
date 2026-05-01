import React, { useCallback, useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { WEATHER_THEME_OPTIONS, DASHBOARD_ACCENT_OPTIONS } from '../config/userPreferences'
import { getCurrentMeteorologicalSeason } from '../features/weather/weatherTheme'
import SettingsSection from '../components/settings/SettingsSection'
import { useBillingSettings } from '../hooks/useBillingSettings'
import { useQuickBooksSettings } from '../hooks/useQuickBooksSettings'
import { useOrgWeatherSettings } from '../hooks/useOrgWeatherSettings'
import { usePreferenceSettings } from '../hooks/usePreferenceSettings'

function speakSummary() {
  const main = document.querySelector('main')
  const text = main?.innerText?.slice(0, 2000) || document.body.innerText.slice(0, 2000)
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}

const PLAN_LABELS = { basic: 'Basic', growth: 'Growth', pro: 'Pro' }

const STATUS_LABELS = {
  trial: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  incomplete: 'Incomplete',
}

/** Shared field styles — match Profile / modern focus-visible patterns */
const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-teal-500/40 dark:focus:ring-teal-500/15'

const selectClass = `${inputClass} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`

const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5'

const sectionCard =
  'scroll-mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm'

const navPillClass =
  'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-600 dark:hover:bg-teal-950/50 dark:hover:text-teal-200'

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-900'

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900'

const btnDangerGhost =
  'inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:text-slate-300 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-200 dark:focus-visible:ring-offset-slate-900'

function MessageSuccess({ children }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-sm text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-3.5 py-2.5"
    >
      {children}
    </p>
  )
}

function MessageError({ children }) {
  return (
    <p
      role="alert"
      className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3.5 py-2.5"
    >
      {children}
    </p>
  )
}

function HelpDot({ text }) {
  const tooltipId = useId()

  return (
    <span className="relative inline-flex items-center group">
      <button
        type="button"
        aria-label="Help"
        aria-describedby={tooltipId}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 align-middle dark:bg-slate-700 dark:text-slate-200 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-normal leading-relaxed text-slate-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        {text}
      </span>
    </span>
  )
}

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { user, isAdmin, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    billingMsg,
    billingErr,
    billingLoading,
    setBillingErr,
    openCheckout,
    openBillingPortal,
  } = useBillingSettings({ searchParams, setSearchParams, refreshUser })

  const {
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
  } = usePreferenceSettings(user)

  const {
    orgMeta,
    setOrgMeta,
    orgWeatherLocs,
    setOrgWeatherLocs,
    orgWeatherMsg,
    setOrgWeatherMsg,
    orgWeatherErr,
    setOrgWeatherErr,
    orgWeatherLoading,
    orgWeatherSaving,
    setOrgWeatherSaving,
  } = useOrgWeatherSettings(isAdmin)

  const {
    qboStatus,
    qboLoading,
    qboErr,
    qboMsg,
    qboBusy,
    connectQuickBooks,
    disconnectQuickBooks,
  } = useQuickBooksSettings({ isAdmin, searchParams, setSearchParams })

  const metroSeason = getCurrentMeteorologicalSeason()

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel()
  }, [])

  async function startCheckout(plan) {
    await openCheckout(plan)
  }

  async function saveDashboardPreferences() {
    setPrefsErr(null)
    setPrefsMsg(null)
    setPrefsSaving(true)
    try {
      await api.put('/users/me', {
        preferences: {
          weather_theme: weatherTheme,
          dashboard_accent: dashboardAccent,
          weather_city: weatherCity.trim(),
        },
      })
      await refreshUser()
      setPrefsMsg('Dashboard and forecast preferences saved.')
    } catch (e) {
      setPrefsErr(e?.response?.data?.error || e?.message || 'Could not save preferences')
    } finally {
      setPrefsSaving(false)
    }
  }

  async function saveOrgWeatherLocations() {
    setOrgWeatherErr(null)
    setOrgWeatherMsg(null)
    setOrgWeatherSaving(true)
    try {
      const weather_locations = orgWeatherLocs
        .map((r) => ({ label: r.label.trim(), query: r.query.trim() }))
        .filter((r) => r.label && r.query)
      await api.put('/companies', {
        name: orgMeta.name.trim(),
        contact_info: orgMeta.contact_info.trim(),
        weather_locations,
      })
      setOrgWeatherMsg(
        weather_locations.length
          ? `Saved ${weather_locations.length} office location(s). The dashboard will show a city picker.`
          : 'Cleared office locations. Each user’s forecast city (below) is used instead.'
      )
    } catch (e) {
      setOrgWeatherErr(e?.response?.data?.error || e?.message || 'Could not save')
    } finally {
      setOrgWeatherSaving(false)
    }
  }

  async function openPortal() {
    await openBillingPortal()
  }

  const weatherThemeHintId = 'settings-weather-theme-hint'
  const dashboardAccentHintId = 'settings-dashboard-accent-hint'
  const forecastCityHintId = 'settings-forecast-city-hint'

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <header className="mb-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          Workspace
        </p>
        <h1
          id="settings-page-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
        >
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Personal settings affect only your account. Company settings are visible only to admins.
        </p>
        <p className="mt-3 text-sm">
          <Link
            to="/profile"
            className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
          >
            Profile &amp; photo
          </Link>
          <span className="text-slate-400 dark:text-slate-500"> · </span>
          <span className="text-slate-500 dark:text-slate-400">Name, phone, bio, and skills</span>
        </p>
      </header>

      <nav aria-label="On this page" className="mb-10 flex flex-wrap gap-2">
        <a href="#settings-appearance" className={navPillClass}>
          Appearance
        </a>
        <a href="#settings-dashboard" className={navPillClass}>
          Dashboard &amp; weather
        </a>
        <a href="#settings-accessibility" className={navPillClass}>
          Accessibility
        </a>
        {isAdmin && (
          <>
            <a href="#settings-billing" className={navPillClass}>
              Billing
            </a>
            <a href="#settings-quickbooks" className={navPillClass}>
              QuickBooks
            </a>
            <a href="#settings-org-weather" className={navPillClass}>
              Office locations
            </a>
          </>
        )}
      </nav>

      <div className="space-y-10" role="presentation">
        {/* Personal: appearance */}
        <section
          id="settings-appearance"
          className={sectionCard}
          aria-labelledby="settings-appearance-heading"
        >
          <h2
            id="settings-appearance-heading"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            Appearance
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Theme updates immediately and is stored in this browser.
          </p>
          <div className="mt-6">
            <label htmlFor="settings-app-theme" className={`${labelClass} inline-flex items-center gap-1.5`}>
              App theme <HelpDot text="Changes how the app looks on this device only." />
            </label>
            <select
              id="settings-app-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={selectClass}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="contrast">High contrast</option>
            </select>
          </div>
        </section>

        {/* Personal: dashboard & forecast */}
        <section
          id="settings-dashboard"
          className={sectionCard}
          aria-labelledby="settings-dashboard-heading"
        >
          <h2
            id="settings-dashboard-heading"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            Dashboard &amp; forecast
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Saved to your account. Changes your dashboard look and your default weather location.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="settings-weather-theme" className={`${labelClass} inline-flex items-center gap-1.5`}>
                Weather look <HelpDot text="Changes only the weather card style, not the weather data." />
              </label>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Current season:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{metroSeason.label}</span>
                <span className="text-slate-400"> ({metroSeason.monthRange})</span>
              </p>
              <select
                id="settings-weather-theme"
                value={weatherTheme}
                onChange={(e) => setWeatherTheme(e.target.value)}
                className={selectClass}
                aria-describedby={weatherThemeHintId}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                }}
              >
                {WEATHER_THEME_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id} title={o.hint}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p id={weatherThemeHintId} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {weatherTheme === 'seasonal' ? (
                  <>
                    Seasonal theme uses <strong>{metroSeason.label}</strong> colors today ({metroSeason.monthRange}).{' '}
                    {WEATHER_THEME_OPTIONS.find((o) => o.id === 'seasonal')?.hint}
                  </>
                ) : (
                  WEATHER_THEME_OPTIONS.find((o) => o.id === weatherTheme)?.hint
                )}
              </p>
            </div>

            <div>
              <label htmlFor="settings-dashboard-accent" className={`${labelClass} inline-flex items-center gap-1.5`}>
                Dashboard accent color <HelpDot text="Updates dashboard highlight colors like buttons and links." />
              </label>
              <select
                id="settings-dashboard-accent"
                value={dashboardAccent}
                onChange={(e) => setDashboardAccent(e.target.value)}
                className={selectClass}
                aria-describedby={dashboardAccentHintId}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                }}
              >
                {DASHBOARD_ACCENT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p id={dashboardAccentHintId} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Controls the main color accents on your dashboard.
              </p>
            </div>

            <div>
              <label htmlFor="settings-forecast-city" className={`${labelClass} inline-flex items-center gap-1.5`}>
                Forecast location <HelpDot text="City format: City,ST,US. Leave empty to use your company default." />
              </label>
              <input
                id="settings-forecast-city"
                type="text"
                value={weatherCity}
                onChange={(e) => setWeatherCity(e.target.value)}
                placeholder="e.g. Olathe,KS,US (empty = server default)"
                className={inputClass}
                autoComplete="address-level2"
                aria-describedby={forecastCityHintId}
              />
              <p id={forecastCityHintId} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Enter a city like <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] dark:bg-slate-800">Olathe,KS,US</code>.
                Leave blank to use your company default.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {prefsMsg && <MessageSuccess>{prefsMsg}</MessageSuccess>}
            {prefsErr && <MessageError>{prefsErr}</MessageError>}
            <button
              type="button"
              disabled={prefsSaving}
              onClick={saveDashboardPreferences}
              className={btnPrimary}
              aria-busy={prefsSaving}
            >
              {prefsSaving ? 'Saving…' : 'Save dashboard & forecast'}
            </button>
          </div>
        </section>

        {/* Accessibility */}
        <section
          id="settings-accessibility"
          className={sectionCard}
          aria-labelledby="settings-accessibility-heading"
        >
          <h2
            id="settings-accessibility-heading"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            Accessibility
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Read aloud uses your browser voice to read the main page content.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={speakSummary}
              className={btnPrimary}
              aria-label="Read main content aloud using speech synthesis"
            >
              Read main content
            </button>
            <button
              type="button"
              onClick={stopSpeech}
              className={btnSecondary}
              aria-label="Stop speech synthesis"
            >
              Stop reading
            </button>
          </div>
        </section>

        {/* Admin: billing */}
        {isAdmin && (
          <section
            id="settings-billing"
            className={sectionCard}
            aria-labelledby="settings-billing-heading"
          >
            <h2 id="settings-billing-heading" className="text-base font-semibold text-slate-900 dark:text-white">
              Organization billing
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your company plan and payment method.
            </p>

            <div
              className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40"
              role="group"
              aria-label="Current subscription"
            >
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Plan</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                    {PLAN_LABELS[user?.subscription_tier] || user?.subscription_tier || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </dt>
                  <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                    {STATUS_LABELS[user?.subscription_status] || user?.subscription_status || '—'}
                  </dd>
                </div>
                {user?.subscription_current_period_end && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Current period ends
                    </dt>
                    <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
                      {new Date(user.subscription_current_period_end).toLocaleDateString(undefined, {
                        dateStyle: 'medium',
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-6 space-y-3">
              {billingMsg && <MessageSuccess>{billingMsg}</MessageSuccess>}
              {billingErr && <MessageError>{billingErr}</MessageError>}
            </div>

            <fieldset className="mt-6 space-y-4 border-0 p-0">
              <legend className="text-sm font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                Plans <HelpDot text="Selecting a plan opens a secure checkout page. You can cancel there." />
              </legend>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pick a plan or open billing to update your payment method.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={() => startCheckout('basic')}
                  className={btnSecondary}
                  aria-busy={billingLoading}
                >
                  Basic
                </button>
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={() => startCheckout('growth')}
                  className={btnSecondary}
                  aria-busy={billingLoading}
                >
                  Growth
                </button>
                <button
                  type="button"
                  disabled={billingLoading}
                  onClick={() => startCheckout('pro')}
                  className={btnSecondary}
                  aria-busy={billingLoading}
                >
                  Pro
                </button>
              </div>
            </fieldset>

            <div className="mt-6">
              <button
                type="button"
                disabled={billingLoading}
                onClick={openPortal}
                className={btnPrimary}
                aria-busy={billingLoading}
              >
                Manage billing in Stripe
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                Need help? <HelpDot text="Billing updates are handled on our secure payment provider page." />
              </p>
            </div>
          </section>
        )}

        {/* Admin: QuickBooks Online */}
        {isAdmin && (
          <SettingsSection
            id="settings-quickbooks"
            className={sectionCard}
            headingId="settings-quickbooks-heading"
            title="QuickBooks Online"
            description="Connect QuickBooks so your customer and item data can be linked here."
          >
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
              QuickBooks setup help <HelpDot text="Click Connect QuickBooks and sign in. You can disconnect anytime." />
            </p>
            {qboLoading && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400" role="status">
                Loading connection status…
              </p>
            )}
            {qboErr && (
              <div className="mt-4">
                <MessageError>{qboErr}</MessageError>
              </div>
            )}
            {qboMsg && (
              <div className="mt-4">
                <MessageSuccess>{qboMsg}</MessageSuccess>
              </div>
            )}
            {!qboLoading && qboStatus && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  Status:{' '}
                  <span className="font-semibold">
                    {qboStatus.connected ? 'Connected' : 'Not connected'}
                  </span>
                  {qboStatus.connected && qboStatus.realm_id && (
                    <span className="text-slate-500 dark:text-slate-400"> · Account {qboStatus.realm_id}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!qboStatus.connected ? (
                    <button
                      type="button"
                      disabled={qboBusy}
                      onClick={connectQuickBooks}
                      className={btnPrimary}
                    >
                      Connect QuickBooks
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={qboBusy}
                      onClick={disconnectQuickBooks}
                      className={btnDangerGhost}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                {qboStatus.connected && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    QuickBooks is connected. Import tools can be added here when you are ready.
                  </p>
                )}
              </div>
            )}
          </SettingsSection>
        )}

        {/* Admin: org weather */}
        {isAdmin && (
          <SettingsSection
            id="settings-org-weather"
            className={sectionCard}
            headingId="settings-org-weather-heading"
            title="Office forecast locations"
            description="Add up to eight office locations so your team can switch weather by location."
          >
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              If you leave this empty, each person’s weather location above is used.
            </p>

            {orgWeatherLoading && (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
                Loading organization…
              </p>
            )}
            {orgWeatherErr && (
              <div className="mt-6">
                <MessageError>{orgWeatherErr}</MessageError>
              </div>
            )}

            {!orgWeatherLoading && (
              <div className="mt-6 space-y-4">
                {orgWeatherLocs.map((row, i) => {
                  const labelId = `org-weather-label-${i}`
                  const queryId = `org-weather-query-${i}`
                  return (
                    <div
                      key={`loc-${i}`}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Location {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setOrgWeatherLocs((prev) => prev.filter((_, j) => j !== i))}
                          className={btnDangerGhost}
                          aria-label={`Remove office location ${i + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={labelId} className={`${labelClass} inline-flex items-center gap-1.5`}>
                            Display label <HelpDot text="A short name your team sees in the weather picker." />
                          </label>
                          <input
                            id={labelId}
                            type="text"
                            value={row.label}
                            onChange={(e) => {
                              const v = e.target.value
                              setOrgWeatherLocs((prev) => prev.map((r, j) => (j === i ? { ...r, label: v } : r)))
                            }}
                            placeholder="e.g. Kansas City HQ"
                            className={inputClass}
                            autoComplete="organization"
                          />
                        </div>
                        <div>
                          <label htmlFor={queryId} className={`${labelClass} inline-flex items-center gap-1.5`}>
                            City <HelpDot text="Best format: City,ST,US to avoid picking the wrong location." />
                          </label>
                          <input
                            id={queryId}
                            type="text"
                            value={row.query}
                            onChange={(e) => {
                              const v = e.target.value
                              setOrgWeatherLocs((prev) => prev.map((r, j) => (j === i ? { ...r, query: v } : r)))
                            }}
                            placeholder="e.g. Kansas City,MO,US"
                            className={inputClass}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <button
                  type="button"
                  disabled={orgWeatherLocs.length >= 8}
                  onClick={() => setOrgWeatherLocs((prev) => [...prev, { label: '', query: '' }])}
                  className={btnSecondary}
                >
                  Add location
                </button>
              </div>
            )}

            <div className="mt-6 space-y-3">
              {orgWeatherMsg && <MessageSuccess>{orgWeatherMsg}</MessageSuccess>}
              <button
                type="button"
                disabled={orgWeatherSaving || orgWeatherLoading}
                onClick={saveOrgWeatherLocations}
                className={btnPrimary}
                aria-busy={orgWeatherSaving}
              >
                {orgWeatherSaving ? 'Saving…' : 'Save office locations'}
              </button>
            </div>
          </SettingsSection>
        )}
      </div>
    </div>
  )
}
