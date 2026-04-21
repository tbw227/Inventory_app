import React from 'react';

/** @param {{ condition?: string, variant?: 'full' | 'mini' }} props */
export function AnimatedWeather({ condition, variant = 'full' }) {
  const c = String(condition || '').toLowerCase();
  const mini = variant === 'mini';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return <RainEffect />;
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('mist')) {
    return <CloudEffect />;
  }
  if (c.includes('snow')) return <CloudEffect />;
  if (c.includes('clear') || c.includes('sun')) return mini ? <SunEffectMini /> : <SunEffect />;
  return mini ? <SunEffectMini /> : <SunEffect />;
}

function RainEffect() {
  return <div className="pointer-events-none absolute inset-0 wx-rain" aria-hidden />;
}

function SunEffect() {
  return (
    <div
      className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-amber-300/40 blur-3xl animate-pulse"
      aria-hidden
    />
  );
}

function SunEffectMini() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="h-[120%] w-[120%] rounded-full bg-amber-300/35 blur-2xl animate-pulse" />
    </div>
  );
}

function CloudEffect() {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden wx-cloud" aria-hidden />;
}
