import React from 'react'

/**
 * Map description + OpenWeather-style main + day/night to an icon variant.
 */
export function resolveWeatherIconKind(condition, main, isDay) {
  const c = `${String(condition || '')} ${String(main || '')}`.toLowerCase()
  if (/(thunder|storm|lightning)/.test(c)) return 'thunder'
  if (/snow|sleet|ice|blizzard|hail/.test(c)) return 'snow'
  if (/(rain|drizzle|shower)/.test(c)) return 'rain'
  if (/(fog|mist|haze)/.test(c)) return 'fog'
  if ((/clear|fair/.test(c) || c.includes('mainly clear')) && !/cloud/.test(c)) {
    return isDay ? 'clear-day' : 'clear-night'
  }
  if (/partly|few cloud|scattered|broken/.test(c)) return isDay ? 'partly-day' : 'partly-night'
  if (/cloud|overcast|gray|grey/.test(c)) return 'cloudy'
  return 'cloudy'
}

const baseSvg = {
  className: '',
  fill: 'currentColor',
  viewBox: '0 0 64 64',
  xmlns: 'http://www.w3.org/2000/svg',
}

function IconClearDay(props) {
  return (
    <svg {...baseSvg} {...props}>
      <circle cx="32" cy="28" r="11" opacity="0.9" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={32 + Math.cos(rad) * 14}
            y1={28 + Math.sin(rad) * 14}
            x2={32 + Math.cos(rad) * 20}
            y2={28 + Math.sin(rad) * 20}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
        )
      })}
    </svg>
  )
}

function IconClearNight(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M36 18c-8 0-14 6-14 14 0 7 5 13 12 14-2-1-3-3-3-6 0-4 3-7 7-7 2 0 4 1 5 2-1-9-8-17-17-17z"
        opacity="0.92"
      />
      <circle cx="46" cy="22" r="1.5" opacity="0.7" />
      <circle cx="50" cy="30" r="1" opacity="0.55" />
      <circle cx="42" cy="36" r="1" opacity="0.5" />
    </svg>
  )
}

function IconCloud(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M48 38c4 0 8-3 8-8s-3.5-7.5-8-8c-1-7-7-12-15-12-7 0-13 4-15 11-5 1-9 5-9 11 0 6 5 11 11 11h28z"
        opacity="0.92"
      />
    </svg>
  )
}

function IconPartlyDay(props) {
  return (
    <svg {...baseSvg} {...props}>
      <circle cx="22" cy="22" r="8" opacity="0.95" />
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={22 + Math.cos(rad) * 10}
            y1={22 + Math.sin(rad) * 10}
            x2={22 + Math.cos(rad) * 14}
            y2={22 + Math.sin(rad) * 14}
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        )
      })}
      <path
        d="M52 40c3 0 6-2 6-6s-2.5-5.5-6-6c-1-5-5-9-11-9-5 0-9 3-11 8-4 0-7 3-7 7 0 4 3 7 7 7h22z"
        opacity="0.9"
      />
    </svg>
  )
}

function IconPartlyNight(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M24 16c-6 0-11 5-11 11 0 5 3 9 8 11-1-1-2-3-2-5 0-4 3-7 7-7 1 0 3 0 4 1-1-6-6-11-12-11z"
        opacity="0.88"
      />
      <path
        d="M52 40c3 0 6-2 6-6s-2.5-5.5-6-6c-1-5-5-9-11-9-5 0-9 3-11 8-4 0-7 3-7 7 0 4 3 7 7 7h22z"
        opacity="0.9"
      />
    </svg>
  )
}

function IconRain(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M48 34c4 0 8-3 8-8s-3.5-7.5-8-8c-1-7-7-12-15-12-7 0-13 4-15 11-5 1-9 5-9 11 0 6 5 11 11 11h28z"
        opacity="0.92"
      />
      {[18, 28, 38, 30, 40].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={42}
          x2={x - 3}
          y2={52}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      ))}
    </svg>
  )
}

function IconSnow(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M48 34c4 0 8-3 8-8s-3.5-7.5-8-8c-1-7-7-12-15-12-7 0-13 4-15 11-5 1-9 5-9 11 0 6 5 11 11 11h28z"
        opacity="0.92"
      />
      {[
        [22, 46],
        [32, 50],
        [42, 46],
        [28, 54],
        [38, 54],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" opacity="0.8" />
      ))}
    </svg>
  )
}

function IconThunder(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M48 32c4 0 8-3 8-8s-3.5-7.5-8-8c-1-7-7-12-15-12-7 0-13 4-15 11-5 1-9 5-9 11 0 6 5 11 11 11h28z"
        opacity="0.9"
      />
      <path d="M30 36 L26 48 L34 44 L28 58 L40 40 L32 42 Z" opacity="0.95" />
    </svg>
  )
}

function IconFog(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M48 30c4 0 8-3 8-7s-3.5-6.5-8-7c-1-6-7-11-15-11-7 0-13 4-15 10-5 1-9 4-9 9 0 5 4 9 9 9h30z"
        opacity="0.75"
      />
      <line x1="12" y1="44" x2="52" y2="44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="16" y1="52" x2="48" y2="52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <line x1="20" y1="58" x2="44" y2="58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

function renderIcon(kind, svgProps) {
  switch (kind) {
    case 'clear-day':
      return <IconClearDay {...svgProps} />
    case 'clear-night':
      return <IconClearNight {...svgProps} />
    case 'partly-day':
      return <IconPartlyDay {...svgProps} />
    case 'partly-night':
      return <IconPartlyNight {...svgProps} />
    case 'rain':
      return <IconRain {...svgProps} />
    case 'snow':
      return <IconSnow {...svgProps} />
    case 'thunder':
      return <IconThunder {...svgProps} />
    case 'fog':
      return <IconFog {...svgProps} />
    case 'cloudy':
    default:
      return <IconCloud {...svgProps} />
  }
}

/**
 * Inline SVG for current conditions; uses currentColor to match the mini card text.
 */
export function WeatherConditionIcon({ condition, main, isDay, className = 'h-14 w-14' }) {
  const kind = resolveWeatherIconKind(condition, main, isDay)
  const label = condition && condition !== '—' ? condition : 'Weather'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      role="img"
      aria-label={label}
    >
      {renderIcon(kind, { className: 'h-full w-full' })}
    </span>
  )
}
