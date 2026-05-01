import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedWeather } from './AnimatedWeather';
import { getWeatherAppearance } from './weatherTheme';
import { wmoEmoji, fmtDec } from './weatherFormat';

const PANEL_EXTRAS_FADE_MS = 800
const PANEL_JOKE_HOLD_MS = 8000
const PANEL_NEWS_HOLD_MS = 5500
const PANEL_SPORTS_HOLD_MS = 5500

/**
 * Cycles joke, news, and sports headlines with fade in/out (full forecast panel).
 */
function JokeNewsRotator({ joke, news, sports, a }) {
  const slides = useMemo(() => {
    const s = []
    if (joke?.setup) s.push({ type: 'joke', joke })
    const nList = Array.isArray(news) ? news.slice(0, 6) : []
    nList.forEach((item, idx) => s.push({ type: 'news', item, idx }))
    const spList = Array.isArray(sports) ? sports.slice(0, 5) : []
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
      queue(() => setOpacity(1), 40)
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
            ? PANEL_JOKE_HOLD_MS
            : slide.type === 'sports'
              ? PANEL_SPORTS_HOLD_MS
              : PANEL_NEWS_HOLD_MS
        queue(() => {
          if (cancelled) return
          setOpacity(0)
          queue(() => {
            if (cancelled) return
            step((i + 1) % slides.length)
          }, PANEL_EXTRAS_FADE_MS)
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

  return (
    <div className="relative mt-3 min-h-[4.5rem]" aria-live="polite" aria-atomic="true">
      <div
        className={`rounded-xl border px-3 py-2.5 ${a.card}`}
        style={{
          opacity,
          transition: `opacity ${PANEL_EXTRAS_FADE_MS}ms ease-in-out`,
        }}
      >
        {slide.type === 'joke' && (
          <>
            <div className={`text-sm font-semibold ${a.text}`}>💡 Joke of the day</div>
            <p className={`mt-1 text-xs ${a.textMuted}`}>{slide.joke.setup}</p>
            <p className={`mt-1 text-xs font-light ${a.textSubtle}`}>{slide.joke.punchline}</p>
          </>
        )}
        {slide.type === 'news' && (
          <>
            <div className={`text-sm font-semibold ${a.text}`}>📰 Breaking news</div>
            <p className={`mt-1 text-xs ${a.textMuted}`}>
              {slide.item.url ? (
                <a
                  href={slide.item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline decoration-white/30 underline-offset-2 hover:opacity-90 ${a.textMuted}`}
                >
                  {slide.item.title}
                </a>
              ) : (
                slide.item.title
              )}
            </p>
          </>
        )}
        {slide.type === 'sports' && (
          <>
            <div className={`text-sm font-semibold ${a.text}`}>⚡ Sports</div>
            <p className={`mt-1 text-xs ${a.textMuted}`}>
              {slide.item.url ? (
                <a
                  href={slide.item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline decoration-white/30 underline-offset-2 hover:opacity-90 ${a.textMuted}`}
                >
                  {slide.item.title}
                </a>
              ) : (
                slide.item.title
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function fmtExtras(extras) {
  if (!extras?.risk) return null;
  const { risk, insights } = extras;
  const parts = [`Outdoor risk: ${risk.level}`];
  if (insights?.rainySlots != null) parts.push(`${insights.rainySlots} wet 3h windows`);
  if (insights?.rainyDays != null) parts.push(`${insights.rainyDays} wet day(s) in range`);
  return parts.join(' · ');
}

function formatRowDate(row) {
  try {
    if (row.dt_label) {
      return new Date(`${row.dt_label}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    if (row.dt) {
      return new Date(row.dt * 1000).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    return '—';
  } catch {
    return '—';
  }
}

export function WeatherFull({
  data,
  rawExtras,
  onClose,
  range,
  onRangeChange,
  maxDays,
  modalRows,
  provider,
  isOpenMeteo,
  updatedLabel,
  todayDaily,
  tempNow,
  weatherThemeId = 'default',
  showHeaderClock = true,
  twcInsights = null,
  suggestedRescheduleSlot = null,
  upcomingJobs = null,
  extraContent = null,
  showTwcAttribution = false,
}) {
  const [headerTime, setHeaderTime] = useState(() => new Date());

  useEffect(() => {
    if (!showHeaderClock) return undefined
    const t = setInterval(() => setHeaderTime(new Date()), 30_000)
    return () => clearInterval(t)
  }, [showHeaderClock])

  const a = data
    ? getWeatherAppearance(weatherThemeId, data.condition, data.isDay)
    : getWeatherAppearance('default', '—', true);
  const insightLine = fmtExtras(rawExtras);
  const joke = extraContent?.joke
  const news = extraContent?.news || []
  const sports = extraContent?.sports || []

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/45 backdrop-blur-sm sm:items-stretch sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wx-full-title"
      onClick={onClose}
    >
      <div
        className={`relative flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-gradient-to-br ${a.gradient} p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl sm:h-full sm:max-h-none sm:max-w-[min(100vw,420px)] sm:rounded-l-2xl sm:p-6 sm:pb-6 sm:pt-6 ${a.text}`}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatedWeather condition={data?.condition || data?.main || ''} isDay={data?.isDay ?? true} />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2
              id="wx-full-title"
              className={`min-w-0 truncate text-sm font-semibold uppercase tracking-wide ${a.textSubtle}`}
            >
              {data?.city || 'Forecast'}
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              {showHeaderClock && (
                <span
                  className={`text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${a.textSubtle}`}
                >
                  {headerTime.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg border px-3 py-1 text-xs font-medium ${a.closeBtn}`}
              >
                Close
              </button>
            </div>
          </div>

          {updatedLabel ? (
            <p className={`mb-1 text-[10px] tabular-nums ${a.textFaint}`}>{updatedLabel}</p>
          ) : null}

          <div className="text-4xl font-light tabular-nums leading-none min-[380px]:text-5xl sm:text-6xl">
            {tempNow != null ? `${tempNow}°` : data?.temp != null ? `${data.temp}°` : '—'}
          </div>
          <p className={`mt-1 text-lg capitalize ${a.textSubtle}`}>{data?.condition}</p>

          {todayDaily && todayDaily.temp_max != null && todayDaily.temp_min != null && (
            <p className={`mt-1 text-xs ${a.textMuted}`}>
              Today · High {Math.round(Number(todayDaily.temp_max))}° / Low{' '}
              {Math.round(Number(todayDaily.temp_min))}°
            </p>
          )}

          {insightLine && (
            <p className={`mt-3 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${a.insightBg}`}>
              {insightLine}
            </p>
          )}

          {twcInsights && (twcInsights.rainyPeriods != null || twcInsights.bestDayLabel) && (
            <div className={`mt-3 rounded-xl border px-3 py-2.5 ${a.card}`}>
              <div className={`text-sm font-semibold ${a.text}`}>Weekly insights (Weather Company)</div>
              {twcInsights.rainyPeriods != null && (
                <p className={`mt-1 text-xs ${a.textMuted}`}>
                  🌧 {twcInsights.rainyPeriods} day{twcInsights.rainyPeriods === 1 ? '' : 's'} with ≥40% precip
                  (5-day outlook)
                </p>
              )}
              {twcInsights.bestDayLabel && twcInsights.bestDayLabel !== '—' && (
                <p className={`text-xs ${a.textMuted}`}>☀️ Relatively drier outlook: {twcInsights.bestDayLabel}</p>
              )}
            </div>
          )}

          {suggestedRescheduleSlot?.dt != null && (
            <div className={`mt-3 rounded-xl border px-3 py-2.5 ${a.card}`}>
              <p className={`text-xs ${a.textMuted}`}>Suggested calmer window (from your forecast)</p>
              <button
                type="button"
                className={`mt-2 rounded-lg border px-2 py-1 text-xs font-medium ${a.pillActive}`}
                onClick={() =>
                  window.alert(
                    `Example slot: ${new Date(suggestedRescheduleSlot.dt * 1000).toLocaleString()}\n` +
                      '(Wire this to a real reschedule API when ready.)'
                  )
                }
              >
                Preview reschedule time
              </button>
            </div>
          )}

          {upcomingJobs && upcomingJobs.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className={`text-sm font-semibold ${a.text}`}>Upcoming jobs</div>
              {upcomingJobs.map((job) => (
                <div key={job.id} className={`rounded-xl border px-3 py-2.5 ${a.cardRow}`}>
                  <div className={`font-medium text-sm ${a.text}`}>{job.title}</div>
                  <div className={`text-xs ${a.textMuted}`}>{job.dateLabel}</div>
                  {job.rainChance != null && job.rainChance > 30 && (
                    <div className={`text-xs ${a.textMuted}`}>🌧 ~{job.rainChance}% precip near job time</div>
                  )}
                  {job.risk?.level && job.risk.level !== 'low' && (
                    <div className={`text-xs mt-0.5 ${a.ui === 'light' ? 'text-amber-700' : 'text-amber-200'}`}>
                      ⚠ Outdoor risk: {job.risk.level}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <JokeNewsRotator joke={joke} news={news} sports={sports} a={a} />

          {data?.hourly?.length > 0 && (
            <div className="relative z-10 mt-4 w-full min-w-0 sm:mt-5">
              <div
                className="-mx-4 flex gap-2 overflow-x-auto overflow-y-visible py-1 pl-4 pr-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:gap-2.5 sm:pl-6 sm:pr-4 [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {data.hourly.map((h, i) => (
                  <div
                    key={i}
                    className={`min-w-[80px] max-w-[88px] shrink-0 rounded-xl px-2.5 py-2 text-center ${a.card}`}
                  >
                    <div className={`whitespace-nowrap text-[11px] leading-tight ${a.textFaint}`}>{h.time}</div>
                    <div className={`mt-0.5 text-base font-semibold tabular-nums ${a.text}`}>
                      {h.temp != null ? `${h.temp}°` : '—'}
                    </div>
                  </div>
                ))}
                <div className="w-4 shrink-0" aria-hidden />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {[
              { id: '4', label: '4 days' },
              { id: '7', label: '7 days' },
              { id: 'max', label: maxDays > 0 ? `Full (${maxDays}d)` : 'Full' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onRangeChange(tab.id === 'max' ? 'max' : tab.id)}
                className={`rounded-full px-3 py-1.5 font-semibold transition ${
                  (tab.id === 'max' ? range === 'max' : range === tab.id) ? a.pillActive : a.pillIdle
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] pr-1 [&::-webkit-scrollbar]:hidden">
            {modalRows.map((row) => (
              <div key={row.dt_label || row.dt} className={`rounded-xl border px-3 py-2.5 ${a.cardRow}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-xl" aria-hidden>
                      {provider !== 'open-meteo' && row.weather?.[0]?.icon ? (
                        <img
                          src={`https://openweathermap.org/img/wn/${row.weather[0].icon}@2x.png`}
                          alt=""
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        wmoEmoji(row.weather?.[0]?.code)
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${a.text}`}>{formatRowDate(row)}</p>
                      <p className={`truncate text-xs capitalize ${a.textMuted}`}>{row.weather?.[0]?.description}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${a.text}`}>
                      {row.temp_max != null ? Math.round(Number(row.temp_max)) : '—'}°
                      <span className={`mx-1 font-normal ${a.slash}`}>/</span>
                      {row.temp_min != null ? Math.round(Number(row.temp_min)) : '—'}°
                    </p>
                    <p className={`text-[10px] ${a.textSoft}`}>high / low</p>
                  </div>
                </div>
                {(row.wind_speed_max != null || (isOpenMeteo && row.precip_in != null)) && (
                  <p className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] ${a.textSofter}`}>
                    {row.wind_speed_max != null && (
                      <span>Wind max {Math.round(Number(row.wind_speed_max))} mph</span>
                    )}
                    {isOpenMeteo && row.precip_in != null && Number(row.precip_in) > 0 && (
                      <span>Rain {fmtDec(row.precip_in, 2)} in</span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className={`mt-4 pt-3 text-[10px] ${a.footerTop} ${a.textFaint}`}>
            {provider === 'open-meteo' ? (
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={a.footerLink}
              >
                Weather data by Open-Meteo
              </a>
            ) : (
              <span>Forecast via OpenWeather</span>
            )}
            {maxDays > 0 && (
              <span className="ml-2 opacity-80">
                · up to {maxDays} day{maxDays === 1 ? '' : 's'}
              </span>
            )}
            {showTwcAttribution && (
              <span className="mt-1 block opacity-80">
                Supplemental outlook: The Weather Company (IBM) via your server.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
