/** Client-side copies for hooks (do not import backend paths in the browser). */

export function getWeatherRisk(condition) {
  const s = String(condition || '').toLowerCase();
  if (s.includes('thunder')) return { level: 'high', color: 'red' };
  if (s.includes('rain') || s.includes('drizzle') || s.includes('snow')) {
    return { level: 'medium', color: 'orange' };
  }
  if (s.includes('fog') || s.includes('mist')) return { level: 'medium', color: 'amber' };
  return { level: 'low', color: 'green' };
}

export function matchWeatherToTime(date, list) {
  if (!list || !list.length) return null;
  const target = new Date(date).getTime();
  return list.reduce((closest, item) => {
    if (!item || item.dt == null) return closest;
    if (!closest) return item;
    const a = Math.abs(item.dt * 1000 - target);
    const b = Math.abs(closest.dt * 1000 - target);
    return a < b ? item : closest;
  }, null);
}
