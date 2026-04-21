const { getWeatherRisk } = require('./weatherRisk');
const { generateInsights, generateInsightsFromDaily } = require('./weatherInsights');
const { findBestSlot } = require('./suggestReschedule');

/**
 * Attach UI / scheduling hints to the dashboard weather payload (non-breaking: `_extras`).
 */
function enrichDashboardWeather(data) {
  if (!data || typeof data !== 'object') return data;

  const desc =
    data.current?.weather?.[0]?.description ||
    data.daily?.[0]?.weather?.[0]?.description ||
    '';
  const main = data.current?.weather?.[0]?.main || data.daily?.[0]?.weather?.[0]?.main || '';
  const risk = getWeatherRisk(`${desc} ${main}`);

  let insights;
  let suggestedRescheduleSlot = null;

  if (data.list && data.list.length) {
    insights = generateInsights(data);
    suggestedRescheduleSlot = findBestSlot(data.list);
  } else if (data.daily?.length) {
    insights = generateInsightsFromDaily(data.daily);
  }

  return {
    ...data,
    _extras: {
      risk,
      insights,
      suggestedRescheduleSlot,
    },
  };
}

module.exports = { enrichDashboardWeather };
