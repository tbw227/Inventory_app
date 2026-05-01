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
  fill: 'none',
  viewBox: '0 0 64 64',
  xmlns: 'http://www.w3.org/2000/svg',
}

const strokeBase = {
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function IconClearDay(props) {
  return (
    <svg {...baseSvg} {...props}>
      <circle cx="32" cy="28" r="9" fill="currentColor" opacity="0.92" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={32 + Math.cos(rad) * 13}
            y1={28 + Math.sin(rad) * 13}
            x2={32 + Math.cos(rad) * 19}
            y2={28 + Math.sin(rad) * 19}
            {...strokeBase}
            opacity="0.9"
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
        d="M39 16c-9 0-16 7-16 16 0 8 6 14 13 15-3-2-5-5-5-9 0-6 5-11 11-11 2 0 4 .5 6 1.5C47 22 43 16 39 16z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="49" cy="21" r="1.3" fill="currentColor" opacity="0.75" />
      <circle cx="52" cy="29" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="45" cy="35" r="1" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

function IconCloud(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M19 42h27c5 0 9-4 9-9 0-4-3-8-7-9-1-6-6-10-13-10-6 0-11 3-13 9-5 1-9 5-9 10 0 5 4 9 9 9z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

function IconPartlyDay(props) {
  return (
    <svg {...baseSvg} {...props}>
      <circle cx="22" cy="22" r="7.5" fill="currentColor" opacity="0.92" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={22 + Math.cos(rad) * 10}
            y1={22 + Math.sin(rad) * 10}
            x2={22 + Math.cos(rad) * 14}
            y2={22 + Math.sin(rad) * 14}
            {...strokeBase}
            strokeWidth="2.5"
            opacity="0.85"
          />
        )
      })}
      <path
        d="M30 42h20c4 0 8-3 8-7s-3-7-7-8c-1-5-5-8-10-8s-9 3-10 8c-4 1-7 4-7 8s3 7 6 7z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

function IconPartlyNight(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M24 16c-6 0-11 5-11 11 0 5 3 9 8 11-2-1-3-3-3-6 0-4 3-7 7-7 1 0 3 .4 4 1.2-1-5-5-10-10-10z"
        fill="currentColor"
        opacity="0.88"
      />
      <path
        d="M30 42h20c4 0 8-3 8-7s-3-7-7-8c-1-5-5-8-10-8s-9 3-10 8c-4 1-7 4-7 8s3 7 6 7z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

function IconRain(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M19 38h27c5 0 9-4 9-9 0-4-3-8-7-9-1-6-6-10-13-10-6 0-11 3-13 9-5 1-9 5-9 10 0 5 4 9 9 9z"
        fill="currentColor"
        opacity="0.9"
      />
      {[20, 29, 38, 47].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={42}
          x2={x - 2.8}
          y2={51}
          {...strokeBase}
          strokeWidth="2.4"
          opacity="0.8"
        />
      ))}
    </svg>
  )
}

function IconSnow(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M19 38h27c5 0 9-4 9-9 0-4-3-8-7-9-1-6-6-10-13-10-6 0-11 3-13 9-5 1-9 5-9 10 0 5 4 9 9 9z"
        fill="currentColor"
        opacity="0.9"
      />
      {[[24, 46], [32, 50], [40, 46]].map(([x, y], i) => (
        <g key={i} opacity="0.82">
          <line x1={x} y1={y - 2.2} x2={x} y2={y + 2.2} {...strokeBase} strokeWidth="1.8" />
          <line x1={x - 2.2} y1={y} x2={x + 2.2} y2={y} {...strokeBase} strokeWidth="1.8" />
          <line x1={x - 1.6} y1={y - 1.6} x2={x + 1.6} y2={y + 1.6} {...strokeBase} strokeWidth="1.6" />
          <line x1={x - 1.6} y1={y + 1.6} x2={x + 1.6} y2={y - 1.6} {...strokeBase} strokeWidth="1.6" />
        </g>
      ))}
    </svg>
  )
}

function IconThunder(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M19 36h27c5 0 9-4 9-9 0-4-3-8-7-9-1-6-6-10-13-10-6 0-11 3-13 9-5 1-9 5-9 10 0 5 4 9 9 9z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M31 37l-4 11 7-2-4 12 12-16-8 2 3-7z" fill="currentColor" opacity="0.96" />
    </svg>
  )
}

function IconFog(props) {
  return (
    <svg {...baseSvg} {...props}>
      <path
        d="M19 32h27c5 0 9-3.5 9-8 0-4-3-7-7-8-1-6-6-10-13-10-6 0-11 3-13 9-5 1-9 4.5-9 9s4 8 9 8z"
        fill="currentColor"
        opacity="0.72"
      />
      <line x1="14" y1="42" x2="50" y2="42" {...strokeBase} opacity="0.52" />
      <line x1="18" y1="49" x2="46" y2="49" {...strokeBase} opacity="0.48" />
      <line x1="22" y1="56" x2="42" y2="56" {...strokeBase} opacity="0.44" />
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
