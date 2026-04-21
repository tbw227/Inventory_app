/**
 * Rough outdoor / scheduling risk from a human-readable condition string.
 */
function getWeatherRisk(condition) {
  const s = String(condition || '').toLowerCase();
  if (s.includes('thunder')) return { level: 'high', color: 'red' };
  if (s.includes('rain') || s.includes('drizzle') || s.includes('snow')) {
    return { level: 'medium', color: 'orange' };
  }
  if (s.includes('fog') || s.includes('mist')) return { level: 'medium', color: 'amber' };
  return { level: 'low', color: 'green' };
}

module.exports = { getWeatherRisk };
