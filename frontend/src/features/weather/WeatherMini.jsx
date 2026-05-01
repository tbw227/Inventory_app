import React, { useEffect, useState, useRef } from 'react';
import { AnimatedWeather } from './AnimatedWeather';
import { getWeatherAppearance } from './weatherTheme';
import { WeatherConditionIcon } from './WeatherConditionIcon';
import { WeatherSceneBackdrop } from './weatherSceneBackground';

export function WeatherMini({
  data,
  onOpen,
  className = '',
  compact = false,
  weatherThemeId = 'default',
  showLiveClock = true,
  /** When set, “Joke of the day” renders inside this same card (below forecast + clock). */
  joke = null,
  /**
   * Samsung-style full-card scene: gradients (and optional photos) from current conditions.
   * Set false to use theme gradients only (legacy).
   */
  sceneBackground = true,
  /** If true, loads `/weather-bg/{kind}.webp|.jpg|…` when present under `public/weather-bg/`. */
  scenePhotos = true,
  /** CSS rain/cloud/sun layer behind the condition icon (scene mode only). */
  ambientAnimation = true,
  /** Enable entrance animation */
  animateEntrance = true,
  /** Enable tilt effect on hover */
  enableTilt = true,
}) {
  const [time, setTime] = useState(() => new Date());
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Handle mouse move for tilt effect
  const handleMouseMove = (e) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -3;
    const rotateY = ((x - centerX) / centerX) * 3;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  useEffect(() => {
    if (!showLiveClock) return undefined
    const t = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(t)
  }, [showLiveClock])

  if (!data) return null;
  const a = getWeatherAppearance(weatherThemeId, data.condition, data.isDay);
  const pad = compact ? 'p-3' : 'p-4';
  const tempCls = compact ? 'text-2xl' : 'text-3xl';

  const scene = sceneBackground
  const tSubtle = scene ? 'text-white/88' : a.textSubtle
  const tMuted = scene ? 'text-white/80' : a.textMuted
  const tFaint = scene ? 'text-white/65' : a.textFaint
  const tSoft = scene ? 'text-white/72' : a.textSoft
  const tDetail = scene ? 'text-white/80 group-hover:text-white' : a.miniDetail
  const jokeDivider = scene ? 'border-t border-white/22' : a.ui === 'light' ? 'border-t border-slate-400/45' : 'border-t border-white/20'

  const btnBase =
    'group relative w-full overflow-hidden rounded-2xl text-left shadow-lg transition-all duration-500 focus:outline-none focus-visible:ring-2'
  const btnTheme = scene
    ? `${btnBase} ${pad} text-white ring-1 ring-white/15 focus-visible:ring-white/50 ${className}`
    : `${btnBase} bg-gradient-to-br ${a.gradient} ${a.text} ${a.focusRing} ${pad} ${className}`

  // Build transform with tilt
  const tiltStyle = enableTilt && isHovered
    ? { transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }
    : {};

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${btnTheme} ${animateEntrance ? 'animate-slide-up-fade' : ''} ${enableTilt ? 'weather-card-tilt' : ''}`}
      style={enableTilt ? { ...tiltStyle, transition: 'transform 0.3s ease' } : undefined}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {scene ? (
        <WeatherSceneBackdrop
          condition={data.condition}
          main={data.main}
          isDay={data.isDay}
          useImage={scenePhotos}
        />
      ) : (
        <div className={`pointer-events-none absolute inset-0 blur-2xl ${a.miniBlur}`} aria-hidden />
      )}
      <div className="relative z-10 flex w-full min-w-0 flex-col gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
        <div className="flex w-full min-w-0 items-stretch gap-3 sm:gap-4">
          <div className="min-w-0 flex-1 flex flex-col justify-between gap-0.5">
            <div className={`text-[10px] font-semibold uppercase tracking-wide ${tSubtle}`}>{data.city}</div>
            <div className={`${tempCls} font-light tabular-nums leading-none text-white`}>
              {data.temp != null ? `${data.temp}°` : '—'}
            </div>
            <div className={`break-words text-xs capitalize leading-snug sm:truncate ${tMuted}`}>{data.condition}</div>
            {showLiveClock && (
              <div
                className={`mt-1 tabular-nums font-semibold tracking-tight ${tSubtle} ${
                  compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                }`}
              >
                {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div
            className={[
              'relative shrink-0 overflow-hidden rounded-2xl',
              compact ? 'h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14' : 'h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem]',
            ].join(' ')}
          >
            {scene && ambientAnimation ? (
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <AnimatedWeather condition={data.condition} variant="mini" isDay={data.isDay} />
              </div>
            ) : null}
            <span
              className={[
                'relative z-10 flex h-full w-full items-center justify-center opacity-95',
                scene ? '[filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <WeatherConditionIcon
                condition={data.condition}
                main={data.main}
                isDay={data.isDay}
                className="h-[88%] w-[88%]"
              />
            </span>
          </div>
        </div>
        <div className="flex justify-end sm:justify-start">
          <span className={`text-[10px] font-semibold uppercase tracking-wide transition ${tDetail}`}>Details →</span>
        </div>
        {joke?.setup ? (
          <div className={`pt-2 ${jokeDivider}`}>
            <p className={`text-[9px] font-semibold uppercase tracking-wide ${tFaint}`}>Joke of the day</p>
            <p className={`mt-1 text-xs font-medium leading-snug ${tMuted}`}>{joke.setup}</p>
            {joke.punchline ? (
              <p className={`mt-1 text-xs leading-snug ${tSoft}`}>{joke.punchline}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
