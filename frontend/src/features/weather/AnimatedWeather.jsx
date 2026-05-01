import React from 'react';

/** @param {{ condition?: string, variant?: 'full' | 'mini', isDay?: boolean }} props */
export function AnimatedWeather({ condition, variant = 'full', isDay = true }) {
  const c = String(condition || '').toLowerCase();
  const mini = variant === 'mini';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return <RainEffect variant={variant} />;
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('mist')) {
    return <CloudEffect variant={variant} />;
  }
  if (c.includes('snow')) return <SnowEffect variant={variant} />;
  if (c.includes('clear') || c.includes('sun')) return mini ? <SunEffectMini isDay={isDay} /> : <SunEffect isDay={isDay} />;
  if (c.includes('thunder') || c.includes('lightning')) return <ThunderEffect variant={variant} />;
  return mini ? <SunEffectMini isDay={isDay} /> : <SunEffect isDay={isDay} />;
}

/** Sparkle particles overlay */
function Sparkles({ count = 12, isDay: day = true }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 2}s`,
    },
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute h-1 w-1 rounded-full ${day ? 'bg-amber-200' : 'bg-white'} animate-sparkle`}
          style={p.style}
        />
      ))}
    </div>
  );
}

/** Wind streak lines */
function WindStreaks({ intensity = 1 }) {
  const streaks = Array.from({ length: 3 * intensity }, (_, i) => ({
    id: i,
    style: {
      top: `${20 + i * 25}%`,
      animationDelay: `${i * 0.3}s`,
      width: `${40 + Math.random() * 40}px`,
    },
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {streaks.map((s) => (
        <div
          key={s.id}
          className="absolute h-px w-8 rounded-full bg-white/20 animate-wind-streak"
          style={s.style}
        />
      ))}
    </div>
  );
}

function RainEffect({ variant }) {
  const mini = variant === 'mini';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`wx-rain ${mini ? 'wx-rain-mini' : 'wx-rain'}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-rain-shine" />
      <WindStreaks intensity={mini ? 1 : 2} />
    </div>
  );
}

function SnowEffect({ variant }) {
  const mini = variant === 'mini';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`wx-snow ${mini ? 'wx-snow-mini' : 'wx-snow'}`} />
      <Sparkles count={mini ? 6 : 12} isDay={true} />
    </div>
  );
}

function ThunderEffect({ variant }) {
  const mini = variant === 'mini';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="wx-thunder-flash absolute inset-0" />
      <div className={`wx-rain ${mini ? 'wx-rain-mini' : 'wx-rain'}`} />
      <WindStreaks intensity={mini ? 2 : 3} />
    </div>
  );
}

function SunEffect({ isDay }) {
  if (!isDay) {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-slate-300/20 blur-3xl animate-pulse-slow" />
        <Sparkles count={15} isDay={false} />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-amber-300/40 blur-3xl animate-pulse-slow" />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/30 blur-2xl animate-pulse-slow animation-delay-700" />
      <Sparkles count={8} isDay={true} />
      <WindStreaks intensity={1} />
    </div>
  );
}

function SunEffectMini({ isDay }) {
  if (!isDay) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="h-[120%] w-[120%] rounded-full bg-slate-300/25 blur-2xl animate-pulse-slow" />
        <Sparkles count={5} isDay={false} />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="h-[120%] w-[120%] rounded-full bg-amber-300/35 blur-2xl animate-pulse-slow" />
      <Sparkles count={4} isDay={true} />
    </div>
  );
}

function CloudEffect({ variant }) {
  const mini = variant === 'mini';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`wx-cloud ${mini ? 'wx-cloud-mini' : 'wx-cloud'}`} />
      <div className="absolute bottom-0 h-1/3 w-full bg-gradient-to-t from-white/10 to-transparent" />
      <WindStreaks intensity={mini ? 1 : 2} />
    </div>
  );
}
