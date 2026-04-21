/**
 * Five weather chrome presets: default, seasonal, nonseasonal, google, aurora.
 * Returns gradient + UI tokens for light (Google) vs dark panels.
 */

export const WEATHER_THEME_IDS = ['default', 'seasonal', 'nonseasonal', 'google', 'aurora']

/** Northern Hemisphere meteorological seasons (by local date). */
const SEASON_META = {
  spring: { label: 'Spring', monthRange: 'Mar – May' },
  summer: { label: 'Summer', monthRange: 'Jun – Aug' },
  fall: { label: 'Fall', monthRange: 'Sep – Nov' },
  winter: { label: 'Winter', monthRange: 'Dec – Feb' },
}

/**
 * Current meteorological season from the device clock (Northern Hemisphere).
 * @param {Date} [now]
 * @returns {{ key: 'spring'|'summer'|'fall'|'winter', label: string, monthRange: string }}
 */
export function getCurrentMeteorologicalSeason(now = new Date()) {
  const m = now.getMonth()
  let key
  if (m >= 2 && m <= 4) key = 'spring'
  else if (m >= 5 && m <= 7) key = 'summer'
  else if (m >= 8 && m <= 10) key = 'fall'
  else key = 'winter'
  const meta = SEASON_META[key]
  return { key, label: meta.label, monthRange: meta.monthRange }
}

const cStr = (c) => String(c || '').toLowerCase()

function conditionGradientSuffix(c) {
  const c0 = cStr(c)
  if (c0.includes('thunder')) return 'thunder'
  if (c0.includes('rain') || c0.includes('drizzle')) return 'rain'
  if (c0.includes('snow')) return 'snow'
  if (c0.includes('cloud') || c0.includes('overcast') || c0.includes('fog') || c0.includes('mist')) {
    return 'cloud'
  }
  return 'clear'
}

/** Northern-hemisphere seasonal bases — driven by {@link getCurrentMeteorologicalSeason}. */
function seasonalGradient(condition, isDay) {
  const { key } = getCurrentMeteorologicalSeason()
  const cond = conditionGradientSuffix(condition)
  if (!isDay) {
    if (key === 'winter') {
      if (cond === 'thunder') return 'from-slate-950 via-violet-950 to-black'
      if (cond === 'rain') return 'from-slate-950 via-blue-950 to-black'
      return 'from-slate-950 via-sky-950 to-black'
    }
    if (key === 'spring') return 'from-indigo-950 via-emerald-950 to-black'
    if (key === 'summer') return 'from-orange-950 via-amber-900 to-black'
    return 'from-amber-950 via-orange-950 to-black'
  }
  if (key === 'winter') {
    if (cond === 'snow') return 'from-sky-200 via-slate-100 to-blue-300'
    if (cond === 'rain') return 'from-slate-300 to-blue-500'
    return 'from-sky-200 via-blue-100 to-indigo-200'
  }
  if (key === 'spring') {
    if (cond === 'rain') return 'from-emerald-300 via-sky-300 to-blue-400'
    return 'from-lime-100 via-emerald-200 to-sky-300'
  }
  if (key === 'summer') {
    if (cond === 'thunder') return 'from-amber-300 via-violet-400 to-slate-600'
    return 'from-amber-200 via-yellow-200 to-cyan-300'
  }
  if (cond === 'rain') return 'from-amber-200 via-orange-300 to-slate-500'
  return 'from-amber-300 via-orange-400 to-rose-300'
}

function nonseasonalGradient(condition, isDay) {
  const cond = conditionGradientSuffix(condition)
  if (!isDay) {
    if (cond === 'rain') return 'from-zinc-900 via-slate-800 to-blue-950'
    if (cond === 'thunder') return 'from-zinc-900 via-violet-950 to-black'
    return 'from-zinc-900 via-neutral-900 to-black'
  }
  if (cond === 'rain') return 'from-slate-400 to-sky-600'
  if (cond === 'snow') return 'from-zinc-200 to-slate-400'
  if (cond === 'cloud') return 'from-zinc-300 to-slate-400'
  if (cond === 'thunder') return 'from-slate-500 to-violet-600'
  return 'from-stone-300 via-zinc-200 to-slate-300'
}

function googleGradient(condition, isDay) {
  const cond = conditionGradientSuffix(condition)
  if (!isDay) {
    if (cond === 'rain') return { gradient: 'from-slate-800 via-blue-900 to-slate-900', ui: 'dark' }
    if (cond === 'thunder') return { gradient: 'from-slate-800 via-indigo-900 to-slate-900', ui: 'dark' }
    return { gradient: 'from-slate-800 via-slate-700 to-slate-900', ui: 'dark' }
  }
  if (cond === 'rain') return { gradient: 'from-sky-100 via-blue-50 to-slate-100', ui: 'light' }
  if (cond === 'cloud') return { gradient: 'from-slate-100 via-gray-50 to-blue-50', ui: 'light' }
  if (cond === 'snow') return { gradient: 'from-cyan-50 via-slate-50 to-blue-100', ui: 'light' }
  if (cond === 'thunder') return { gradient: 'from-indigo-100 via-slate-50 to-sky-100', ui: 'light' }
  return { gradient: 'from-blue-50 via-sky-50 to-amber-50', ui: 'light' }
}

function auroraGradient(condition, isDay) {
  const cond = conditionGradientSuffix(condition)
  if (!isDay) {
    if (cond === 'rain') return 'from-indigo-950 via-blue-950 to-teal-950'
    return 'from-violet-950 via-fuchsia-900 to-cyan-950'
  }
  if (cond === 'rain') return 'from-indigo-500 via-blue-500 to-teal-500'
  if (cond === 'thunder') return 'from-violet-600 via-fuchsia-600 to-indigo-700'
  if (cond === 'snow') return 'from-cyan-300 via-violet-300 to-fuchsia-300'
  return 'from-violet-400 via-fuchsia-300 to-cyan-400'
}

function defaultGradient(condition, isDay) {
  const c = cStr(condition)
  if (!isDay) return 'from-slate-900 via-indigo-950 to-black'
  if (c.includes('thunder')) return 'from-violet-700 to-slate-900'
  if (c.includes('rain') || c.includes('drizzle')) return 'from-blue-600 to-slate-700'
  if (c.includes('snow')) return 'from-sky-300 to-blue-500'
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('mist')) {
    return 'from-slate-400 to-sky-400'
  }
  return 'from-amber-300 via-sky-400 to-blue-500'
}

function darkTokens(gradient) {
  return {
    gradient,
    ui: 'dark',
    text: 'text-white',
    textSubtle: 'text-white/80',
    textMuted: 'text-white/75',
    textFaint: 'text-white/55',
    textSoft: 'text-white/50',
    textSofter: 'text-white/65',
    border: 'border-white/20',
    borderSoft: 'border-white/10',
    card: 'bg-white/15 backdrop-blur-sm',
    cardRow: 'border-white/10 bg-white/10 backdrop-blur-sm',
    pillIdle: 'bg-white/15 hover:bg-white/25',
    pillActive: 'bg-white text-slate-900 shadow',
    closeBtn: 'border-white/20 bg-white/10 hover:bg-white/20 text-white',
    insightBg: 'border-white/15 bg-black/10 text-white/85',
    footerLink: 'text-white/80 underline hover:text-white',
    footerTop: 'border-t border-white/10',
    focusRing: 'focus-visible:ring-white/50',
    miniBlur: 'bg-white/10 opacity-30',
    miniDetail: 'text-white/80 group-hover:text-white',
    slash: 'text-white/50',
  }
}

function lightTokens(gradient) {
  return {
    gradient,
    ui: 'light',
    text: 'text-slate-900',
    textSubtle: 'text-slate-700',
    textMuted: 'text-slate-600',
    textFaint: 'text-slate-500',
    textSoft: 'text-slate-500',
    textSofter: 'text-slate-500',
    border: 'border-slate-200/90',
    borderSoft: 'border-slate-200/70',
    card: 'bg-white/85 border border-slate-100 backdrop-blur-sm',
    cardRow: 'border-slate-200/90 bg-white/75 backdrop-blur-sm',
    pillIdle: 'bg-slate-200/80 hover:bg-slate-300/90 text-slate-800',
    pillActive: 'bg-slate-800 text-white shadow',
    closeBtn: 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800',
    insightBg: 'border-slate-200 bg-slate-100/95 text-slate-700',
    footerLink: 'text-blue-700 underline hover:text-blue-900',
    footerTop: 'border-t border-slate-200/90',
    focusRing: 'focus-visible:ring-slate-400/50',
    miniBlur: 'bg-slate-900/5 opacity-40',
    miniDetail: 'text-slate-600 group-hover:text-slate-900',
    slash: 'text-slate-400',
  }
}

/**
 * @param {string} themeId
 * @param {string} condition - description or main
 * @param {boolean} isDay
 */
export function getWeatherAppearance(themeId, condition, isDay) {
  const id = WEATHER_THEME_IDS.includes(themeId) ? themeId : 'default'

  if (id === 'google') {
    const g = googleGradient(condition, isDay)
    return g.ui === 'light' ? lightTokens(g.gradient) : darkTokens(g.gradient)
  }

  let gradient
  switch (id) {
    case 'seasonal':
      gradient = seasonalGradient(condition, isDay)
      break
    case 'nonseasonal':
      gradient = nonseasonalGradient(condition, isDay)
      break
    case 'aurora':
      gradient = auroraGradient(condition, isDay)
      break
    default:
      gradient = defaultGradient(condition, isDay)
  }
  return darkTokens(gradient)
}

/** @deprecated use getWeatherAppearance(...).gradient via tokens */
export function getTheme(condition, isDay) {
  return getWeatherAppearance('default', condition, isDay).gradient
}
