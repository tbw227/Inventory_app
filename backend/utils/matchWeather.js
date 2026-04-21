/**
 * Find the forecast list item closest to a target time (OpenWeather list shape: { dt, ... }).
 */
function matchWeatherToTime(date, forecastList) {
  const list = forecastList && Array.isArray(forecastList.list) ? forecastList.list : forecastList;
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

module.exports = { matchWeatherToTime };
