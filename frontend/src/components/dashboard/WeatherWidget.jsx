import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTenantWeather } from '../../hooks/useTenantWeather'
import { buildWeatherViewModel } from '../../features/weather/buildWeatherViewModel'
import { WeatherMini } from '../../features/weather/WeatherMini'
import { WeatherFull } from '../../features/weather/WeatherFull'
import { getJobWeather } from '../../features/weather/jobWeather'
import { useWeatherCompany } from '../../hooks/useWeatherCompany'
import { useExtraContent } from '../../hooks/useExtraContent'
import api from '../../services/api'

function padDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pickTodayDaily(daily) {
  if (!daily?.length) return null
  const k = padDateKey(new Date())
  return daily.find((d) => d.dt_label === k) || daily[0]
}

function windCompass(deg) {
  if (deg == null || Number.isNaN(Number(deg))) return null
  const d = ((Number(deg) % 360) + 360) % 360
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(d / 45) % 8]
}

function fmtInt(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return null
  return Math.round(Number(n))
}

function fmtDec(n, places = 2) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return null
  return Number(n).toFixed(places)
}

function StatPill({ label, value, sub }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1.5 sm:min-w-[4.5rem] sm:flex-none sm:max-w-none">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function HeroStatChip({ label, value }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <span className="inline-flex max-w-full min-w-0 items-baseline gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-white/95 tabular-nums">
      <span className="shrink-0 font-semibold uppercase tracking-wide text-white/60">{label}</span>
      <span className="min-w-0 break-words font-semibold text-white sm:break-normal">{value}</span>
    </span>
  )
}

const HERO_EXTRAS_FADE_MS = 500
const HERO_JOKE_HOLD_MS = 6500
const HERO_NEWS_HOLD_MS = 4800
const HERO_SPORTS_HOLD_MS = 4800

function RotatorTypeIcon({ type, className = 'w-3.5 h-3.5' }) {
  if (type === 'joke') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a7 7 0 00-4 12.75V18a1 1 0 001 1h6a1 1 0 001-1v-2.25A7 7 0 0012 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 21h5M10.5 18.5h3" />
      </svg>
    )
  }
  if (type === 'sports') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16M6.5 6.5c1.3 1.2 2.7 1.8 5.5 1.8s4.2-.6 5.5-1.8M6.5 17.5c1.3-1.2 2.7-1.8 5.5-1.8s4.2.6 5.5 1.8" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14v10H7l-2 2V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 12h5" />
    </svg>
  )
}

/** Joke + news + sports alternate with fade. */
function HeroExtrasRotator({ joke, news, sports, variant = 'hero' }) {
  const slides = useMemo(() => {
    const s = []
    if (joke?.setup) s.push({ type: 'joke', joke })
    const nList = Array.isArray(news) ? news.slice(0, 5) : []
    nList.forEach((item, idx) => s.push({ type: 'news', item, idx }))
    const spList = Array.isArray(sports) ? sports.slice(0, 4) : []
    spList.forEach((item, idx) => s.push({ type: 'sports', item, idx }))
    return s
  }, [joke, news, sports])

  const [index, setIndex] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const timersRef = useRef([])

  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    if (!slides.length) {
      setOpacity(0)
      return undefined
    }

    const queue = (fn, ms) => {
      const t = setTimeout(fn, ms)
      timersRef.current.push(t)
      return t
    }

    if (slides.length === 1) {
      setIndex(0)
      setOpacity(0)
      queue(() => setOpacity(1), 50)
      return () => {
        timersRef.current.forEach(clearTimeout)
        timersRef.current = []
      }
    }

    let cancelled = false

    const step = (i) => {
      if (cancelled) return
      setIndex(i)
      setOpacity(0)
      queue(() => {
        if (cancelled) return
        setOpacity(1)
        const slide = slides[i]
        const hold =
          slide.type === 'joke'
            ? HERO_JOKE_HOLD_MS
            : slide.type === 'sports'
              ? HERO_SPORTS_HOLD_MS
              : HERO_NEWS_HOLD_MS
        queue(() => {
          if (cancelled) return
          setOpacity(0)
          queue(() => {
            if (cancelled) return
            step((i + 1) % slides.length)
          }, HERO_EXTRAS_FADE_MS)
        }, hold)
      }, 50)
    }

    step(0)

    return () => {
      cancelled = true
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [slides])

  if (!slides.length) return null

  const slide = slides[index]

  const isHero = variant === 'hero'
  const cardClass = isHero
    ? 'rounded-xl border border-white/20 bg-white/10 px-2.5 py-2 text-left backdrop-blur-sm sm:px-3 sm:py-2.5'
    : 'rounded-xl border border-slate-200/90 dark:border-slate-600 bg-slate-50/95 dark:bg-slate-800/70 px-3 py-2.5 text-left'
  const labelClass = isHero
    ? 'text-[10px] font-semibold uppercase tracking-wide text-white/65'
    : 'text-[10px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400'
  const bodyClass = isHero ? 'text-xs leading-snug text-white/85' : 'text-xs leading-snug text-slate-600 dark:text-slate-300'
  const linkClass = isHero
    ? 'underline decoration-white/35 underline-offset-2 hover:text-white'
    : 'text-slate-700 underline decoration-slate-400 underline-offset-2 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300'
  const labelWrapClass = `inline-flex items-center gap-1.5 ${labelClass}`

  return (
    <div
      className={cardClass}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="min-h-[2.75rem] sm:min-h-[3.25rem]"
        style={{
          opacity,
          transition: `opacity ${HERO_EXTRAS_FADE_MS}ms ease-in-out`,
        }}
      >
        {slide.type === 'joke' && (
          <div key="joke">
            <p className={labelWrapClass}><RotatorTypeIcon type="joke" /> Joke of the day</p>
            <p className={`mt-1.5 font-medium ${bodyClass}`}>{slide.joke.setup}</p>
            {slide.joke.punchline ? (
              <p className={`mt-1 ${bodyClass}`}>{slide.joke.punchline}</p>
            ) : null}
          </div>
        )} 
        {slide.type === 'news' && (
          <div key={`news-${slide.idx}`}>
            <p className={labelWrapClass}><RotatorTypeIcon type="news" /> News update</p>
            <p className={`mt-1.5 ${bodyClass}`}>
              {slide.item.url ? (
                <a
                  href={slide.item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {slide.item.title}
                </a>
              ) : (
                slide.item.title
              )}
            </p>
          </div>
        )}
        {slide.type === 'sports' && (
          <div key={`sports-${slide.idx}`}>
            <p className={labelWrapClass}><RotatorTypeIcon type="sports" /> Sports update</p>
            <p className={`mt-1.5 ${bodyClass}`}>
              {slide.item.url ? (
                <a
                  href={slide.item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {slide.item.title}
                </a>
              ) : (
                slide.item.title
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function fmtFetched(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 15) return 'Updated just now'
  if (s < 60) return `Updated ${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `Updated ${m}m ago`
  const h = Math.floor(m / 60)
  return `Updated ${h}h ago`
}

function CityPickerStrip({
  locations,
  selectedQuery,
  setSelectedQuery,
  setOpen,
  weatherThemeId,
  variant,
}) {
  if (!locations || locations.length <= 1) return null
  const ringSel =
    variant === 'hero'
      ? 'ring-2 ring-white/80'
      : 'ring-2 ring-teal-500/60 dark:ring-teal-400/50'
  const ringIdle =
    variant === 'hero' ? 'ring-1 ring-white/25' : 'ring-1 ring-slate-200 dark:ring-slate-600'

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 pl-0.5 -mr-1 pr-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Forecast cities"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {locations.map((loc) => {
        const rowVm = loc.data ? { ...buildWeatherViewModel(loc.data), city: loc.label } : null
        const sel = loc.query === selectedQuery
        return (
          <div
            key={loc.query}
            className={`min-w-[min(100%,8.25rem)] shrink-0 snap-start rounded-2xl sm:min-w-[9.5rem] ${sel ? ringSel : ringIdle}`}
          >
            {rowVm ? (
              <WeatherMini
                data={rowVm}
                onOpen={() => {
                  setSelectedQuery(loc.query)
                  setOpen(true)
                }}
                compact
                showLiveClock={false}
                scenePhotos={false}
                ambientAnimation={false}
                weatherThemeId={weatherThemeId}
                className={
                  variant === 'hero'
                    ? 'border border-white/20 shadow-md'
                    : 'border border-slate-200/90 dark:border-slate-600 shadow-sm'
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setSelectedQuery(loc.query)}
                className={`flex min-h-[5.5rem] w-full flex-col justify-center rounded-2xl px-3 py-2 text-left text-xs ${
                  variant === 'hero'
                    ? 'border border-white/20 bg-white/10 text-white/90'
                    : 'border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="font-semibold">{loc.label}</span>
                <span className="mt-1 opacity-70">Unavailable</span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Dashboard weather: themed mini card opens a right-hand forecast panel (4 / 7 / full range).
 */
export default function DashboardWeatherBar({ variant = 'default' }) {
  const { user } = useAuth()
  const weatherThemeId = user?.preferences?.weather_theme || 'default'
  const { locations, defaultQuery, loading: tenantLoading, error: tenantError, fetchedAt } = useTenantWeather()
  const [selectedQuery, setSelectedQuery] = useState(null)
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState('4')
  const [rawPanelJobs, setRawPanelJobs] = useState([])
  const [showMoreStats, setShowMoreStats] = useState(false)

  useEffect(() => {
    if (!locations.length) return
    setSelectedQuery((prev) => {
      if (prev && locations.some((l) => l.query === prev)) return prev
      const pref = (user?.preferences?.weather_city || '').trim().toLowerCase()
      const byPref = locations.find((l) => l.query.trim().toLowerCase() === pref && l.data)
      const pick = byPref || locations.find((l) => l.data) || locations[0]
      return pick?.query ?? defaultQuery ?? locations[0]?.query ?? null
    })
  }, [locations, defaultQuery, user?.preferences?.weather_city])

  const active = useMemo(() => {
    if (!locations.length) return null
    return locations.find((l) => l.query === selectedQuery) || locations.find((l) => l.data) || locations[0]
  }, [locations, selectedQuery])

  const data = active?.data ?? null
  const err = tenantError || active?.error || null
  const loading = tenantLoading

  const lat = data?.city?.lat
  const lon = data?.city?.lon
  const twc = useWeatherCompany(lat, lon)
  const { joke, news, sports } = useExtraContent(true)

  const vm = useMemo(() => {
    if (!data) return null
    const base = buildWeatherViewModel(data)
    if (!base) return null
    if (active?.label) return { ...base, city: active.label }
    return base
  }, [data, active?.label])

  const todayDaily = useMemo(() => pickTodayDaily(data?.daily), [data?.daily])
  const cur = data?.current

  const tempNow = useMemo(() => {
    const t = cur?.main?.temp
    const ti = fmtInt(t)
    if (ti != null) return ti
    if (todayDaily) {
      const a = Number(todayDaily.temp_max)
      const b = Number(todayDaily.temp_min)
      if (!Number.isNaN(a) && !Number.isNaN(b)) return Math.round((a + b) / 2)
    }
    return null
  }, [cur?.main?.temp, todayDaily])

  const feels = fmtInt(cur?.main?.feels_like)
  const humidity = fmtInt(cur?.main?.humidity)
  const pressureInHg = cur?.main?.pressure != null ? fmtDec(cur.main.pressure, 2) : null
  const pressureHpa = cur?.main?.pressure_hpa != null ? fmtInt(cur.main.pressure_hpa) : null
  const windSpeed = fmtInt(cur?.wind?.speed)
  const windGust = fmtInt(cur?.wind?.gust)
  const windDir = cur?.wind_cardinal || windCompass(cur?.wind?.deg)
  const visMi =
    cur?.visibility_m != null && !Number.isNaN(Number(cur.visibility_m))
      ? (Number(cur.visibility_m) / 1609.34).toFixed(1)
      : null
  const popPct = cur?.pop != null && !Number.isNaN(Number(cur.pop)) ? Math.round(Number(cur.pop) * 100) : null
  const precipIn = cur?.precipitation_in != null ? fmtDec(cur.precipitation_in, 2) : null
  const pressureDisplay =
    pressureInHg != null
      ? `${pressureInHg} inHg`
      : pressureHpa != null
        ? `${pressureHpa} hPa`
        : null
  const extraStatRows = [
    pressureDisplay ? { label: 'Pressure', value: pressureDisplay, sub: pressureInHg != null && pressureHpa != null ? `${pressureHpa} hPa` : null } : null,
    visMi != null ? { label: 'Visibility', value: `${visMi} mi` } : null,
    popPct != null && popPct > 0 ? { label: 'Precip chance', value: `${popPct}%` } : null,
    precipIn != null && Number(precipIn) > 0 ? { label: 'Precip now', value: `${precipIn} in` } : null,
  ].filter(Boolean)
  const hasExtraStats = extraStatRows.length > 0

  const maxDays = data?._forecastDaysAvailable || data?.daily?.length || 0
  const isOpenMeteo = data?._provider === 'open-meteo'
  const provider = data?._provider || ''

  const [, setTick] = useState(0)
  useEffect(() => {
    if (!fetchedAt) return undefined
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [fetchedAt])

  const updatedLabel = fetchedAt ? fmtFetched(fetchedAt) : ''

  const modalRows = useMemo(() => {
    const daily = data?.daily || []
    if (!daily.length) return []
    const n = range === '4' ? 4 : range === '7' ? 7 : daily.length
    return daily.slice(0, Math.min(n, daily.length))
  }, [data?.daily, range])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onKeyDown])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    api
      .get('/jobs')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : []
        const upcoming = list.filter((j) => j.status !== 'completed').slice(0, 6)
        if (!cancelled) setRawPanelJobs(upcoming)
      })
      .catch(() => {
        if (!cancelled) setRawPanelJobs([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    setShowMoreStats(false)
  }, [selectedQuery])

  const upcomingJobsForPanel = useMemo(() => {
    return rawPanelJobs.map((job) => {
      const jw = data?.list?.length ? getJobWeather(job, data) : null
      const pop = jw?.weather?.pop
      return {
        id: job._id,
        title: job.client_id?.name || 'Job',
        dateLabel: job.scheduled_date
          ? new Date(job.scheduled_date).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '',
        rainChance:
          pop != null && !Number.isNaN(Number(pop)) ? Math.round(Number(pop) * 100) : null,
        risk: jw?.risk,
      }
    })
  }, [rawPanelJobs, data])

  const windLine =
    windSpeed != null
      ? `${windSpeed} mph${windDir ? ` ${windDir}` : ''}${windGust != null ? ` · gust ${windGust}` : ''}`
      : null

  const pressureVal =
    pressureInHg != null
      ? `${pressureInHg} inHg`
      : pressureHpa != null
        ? `${pressureHpa} hPa`
        : null

  if (err) {
    if (variant === 'hero') {
      return (
        <div className="w-full min-w-0 px-0.5 text-left text-xs text-teal-100/80 sm:text-right">
          <span className="font-medium text-white/90">Weather</span>
          <span className="mx-1.5 text-white/30">·</span>
          {err}
        </div>
      )
    }
    return (
      <div className="w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="font-medium text-slate-800 dark:text-slate-100">Weather</span>
        <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
        {err}
      </div>
    )
  }

  if (loading || !data || !vm) {
    if (variant === 'hero') {
      return (
        <div className="w-full min-w-0 animate-pulse py-1 sm:py-1.5">
          <div className="h-16 w-full max-w-full rounded-xl bg-white/10" />
        </div>
      )
    }
    return (
      <div className="w-full min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/60 px-4 py-4 animate-pulse">
        <div className="h-20 w-full max-w-full rounded-xl bg-slate-200/80 dark:bg-slate-700" />
      </div>
    )
  }

  const panel = open && (
    <WeatherFull
      data={vm}
      rawExtras={data._extras}
      onClose={() => setOpen(false)}
      range={range}
      onRangeChange={setRange}
      maxDays={maxDays}
      modalRows={modalRows}
      provider={provider}
      isOpenMeteo={isOpenMeteo}
      updatedLabel={updatedLabel}
      todayDaily={todayDaily}
      tempNow={tempNow}
      weatherThemeId={weatherThemeId}
      twcInsights={twc.insights}
      suggestedRescheduleSlot={data._extras?.suggestedRescheduleSlot}
      upcomingJobs={upcomingJobsForPanel}
      extraContent={{ joke, news, sports }}
      showTwcAttribution={Boolean(twc.current || twc.insights)}
    />
  )

  if (variant === 'hero') {
    return (
      <>
        <div className="w-full min-w-0 space-y-2.5 sm:space-y-3">
          <CityPickerStrip
            locations={locations}
            selectedQuery={selectedQuery}
            setSelectedQuery={setSelectedQuery}
            setOpen={setOpen}
            weatherThemeId={weatherThemeId}
            variant="hero"
          />
          <WeatherMini
            data={vm}
            joke={null}
            onOpen={() => setOpen(true)}
            compact
            weatherThemeId={weatherThemeId}
            className="border border-white/15 shadow-none"
          />
          <div className="flex flex-wrap justify-start gap-1.5 border-t border-white/10 pt-2.5 sm:justify-end sm:pt-3">
            <HeroStatChip label="Feels" value={feels != null ? `${feels}°` : null} />
            <HeroStatChip label="Wind" value={windLine} />
            <HeroStatChip label="Hum" value={humidity != null ? `${humidity}%` : null} />
            <HeroStatChip label="Press" value={pressureVal} />
            {visMi != null && <HeroStatChip label="Vis" value={`${visMi} mi`} />}
            {popPct != null && popPct > 0 && <HeroStatChip label="Rain" value={`${popPct}%`} />}
          </div>
          <HeroExtrasRotator joke={joke} news={news} sports={sports} />
        </div>
        {panel}
      </>
    )
  }

  return (
    <>
      <div className="w-full min-w-0 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:p-3">
        <div className="space-y-2.5 sm:space-y-3">
          <CityPickerStrip
            locations={locations}
            selectedQuery={selectedQuery}
            setSelectedQuery={setSelectedQuery}
            setOpen={setOpen}
            weatherThemeId={weatherThemeId}
            variant="default"
          />
          <WeatherMini
            data={vm}
            joke={null}
            onOpen={() => setOpen(true)}
            weatherThemeId={weatherThemeId}
            className="shadow-md ring-1 ring-slate-900/5 dark:ring-white/10"
          />
          <div className="grid grid-cols-1 gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700 sm:grid-cols-3 sm:pt-3">
            <StatPill label="Feels like" value={feels != null ? `${feels}°` : null} />
            <StatPill label="Wind" value={windLine} />
            <StatPill label="Humidity" value={humidity != null ? `${humidity}%` : null} />
          </div>
          {hasExtraStats && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMoreStats((v) => !v)}
                aria-expanded={showMoreStats}
                className="text-xs font-medium text-slate-600 hover:underline dark:text-slate-300"
              >
                {showMoreStats ? 'Hide details' : 'More weather details'}
              </button>
              {showMoreStats && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                    {extraStatRows.map((item) => (
                      <p key={item.label}>
                        <span className="font-semibold">{item.label}:</span> {item.value}
                        {item.sub ? <span className="text-slate-500 dark:text-slate-400"> · {item.sub}</span> : null}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <HeroExtrasRotator joke={joke} news={news} sports={sports} variant="default" />

        </div>
      </div>
      {panel}
    </>
  )
}
