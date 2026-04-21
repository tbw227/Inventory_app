/**
 * Simple stats over OpenWeather-style `list` (3h steps) or daily rows.
 */
function generateInsights(forecast) {
  const list = forecast && Array.isArray(forecast.list) ? forecast.list : forecast;
  if (!list || !list.length) return { rainySlots: 0, bestSlot: null };

  const rainySlots = list.filter((f) => (f.pop != null ? Number(f.pop) : 0) > 0.4).length;
  const bestSlot = list.reduce((best, curr) => {
    const cp = curr.pop != null ? Number(curr.pop) : 1;
    const bp = best.pop != null ? Number(best.pop) : 1;
    return cp < bp ? curr : best;
  }, list[0]);

  return { rainySlots, bestSlot };
}

function generateInsightsFromDaily(daily) {
  if (!daily?.length) return { rainyDays: 0, bestDay: null };
  let rainyDays = 0;
  for (const d of daily) {
    const code = d.weather?.[0]?.code;
    const desc = (d.weather?.[0]?.description || '').toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('snow')) rainyDays += 1;
    else if (code != null && code >= 51 && code <= 82) rainyDays += 1;
  }
  const bestDay = daily.reduce((best, curr) => {
    const c = curr.precip_in != null ? Number(curr.precip_in) : 0;
    const b = best.precip_in != null ? Number(best.precip_in) : 0;
    return c < b ? curr : best;
  }, daily[0]);
  return { rainyDays, bestDay };
}

module.exports = { generateInsights, generateInsightsFromDaily };
