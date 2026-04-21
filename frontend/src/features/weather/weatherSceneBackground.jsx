import React, { useEffect, useState } from 'react'
import { resolveWeatherIconKind } from './WeatherConditionIcon'

/**
 * Optional full-bleed photos: add files under `public/weather-bg/` named by kind, e.g.
 * `clear-day.jpg`, `rain.webp`, `thunder.jpg` (try .webp → .jpg → .jpeg → .png).
 * Gradients below still show if no file is found (Samsung-style without assets).
 */
export function useOptionalSceneImage(kind, enabled) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!enabled || !kind) {
      setSrc(null)
      return undefined
    }
    let cancelled = false
    const exts = ['webp', 'jpg', 'jpeg', 'png']
    let i = 0

    const tryNext = () => {
      if (cancelled) return
      if (i >= exts.length) {
        setSrc(null)
        return
      }
      const url = `/weather-bg/${kind}.${exts[i]}`
      const img = new Image()
      img.onload = () => {
        if (!cancelled) setSrc(url)
      }
      img.onerror = () => {
        i += 1
        tryNext()
      }
      img.src = url
    }

    tryNext()
    return () => {
      cancelled = true
    }
  }, [kind, enabled])

  return src
}

/** Samsung-weather-style layered skies (no external assets). */
function SceneGradientStack({ kind }) {
  switch (kind) {
    case 'clear-day':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-amber-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-5%,rgba(255,253,220,0.55),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.35),transparent_35%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-500/25 via-transparent to-sky-200/20" />
        </>
      )
    case 'clear-night':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-[#0a1628]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_70%_15%,rgba(99,102,241,0.35),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(147,197,253,0.12),transparent_30%)]" />
        </>
      )
    case 'partly-day':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-sky-200 to-cyan-100" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_20%_35%,rgba(255,255,255,0.7),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_85%_30%,rgba(255,255,255,0.45),transparent_40%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-400/30 to-transparent" />
        </>
      )
    case 'partly-night':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-[#0c1220]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_30%_40%,rgba(71,85,105,0.5),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(129,140,248,0.2),transparent_35%)]" />
        </>
      )
    case 'rain':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-600 to-sky-800" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_40%_at_50%_0%,rgba(56,189,248,0.25),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/40 via-transparent to-slate-500/20" />
        </>
      )
    case 'snow':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-200 via-sky-100 to-indigo-100" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_60%_at_50%_20%,rgba(255,255,255,0.85),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_60%,rgba(224,231,255,0.6),transparent_40%)]" />
        </>
      )
    case 'thunder':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950 via-indigo-950 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_10%,rgba(139,92,246,0.45),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.2),transparent_40%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </>
      )
    case 'fog':
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-400 via-slate-300 to-slate-400" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_50%,rgba(255,255,255,0.5),transparent_60%)]" />
          <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_30%_40%,rgba(241,245,249,0.8),transparent_45%)]" />
        </>
      )
    case 'cloudy':
    default:
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-500 via-slate-400 to-sky-200" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_40%_25%,rgba(255,255,255,0.35),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-500/35 to-transparent" />
        </>
      )
  }
}

/**
 * Full-bleed backdrop: optional photo + Samsung-like gradients + readability scrim.
 */
export function WeatherSceneBackdrop({ condition, main, isDay, useImage }) {
  const kind = resolveWeatherIconKind(condition, main, isDay)
  const imgSrc = useOptionalSceneImage(kind, useImage)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      <div className="absolute inset-0 bg-slate-900" />
      {imgSrc ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${imgSrc})` }}
        />
      ) : null}
      <div className={imgSrc ? 'absolute inset-0 opacity-85' : 'absolute inset-0'}>
        <SceneGradientStack kind={kind} />
      </div>
      {/* Legibility (Samsung-style): stronger on bright scenes */}
      <div
        className={
          kind === 'snow' || kind === 'fog' || kind === 'partly-day' || kind === 'clear-day'
            ? 'absolute inset-0 bg-gradient-to-b from-black/18 via-black/32 to-black/52'
            : 'absolute inset-0 bg-gradient-to-b from-black/10 via-black/22 to-black/48'
        }
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_50%,transparent_0%,rgba(0,0,0,0.18)_100%)]" />
    </div>
  )
}
