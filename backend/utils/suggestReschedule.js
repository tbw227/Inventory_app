/**
 * Pick a forecast slot with lower precip probability and no thunderstorms (OpenWeather list items).
 */
function findBestSlot(forecastList) {
  const list = forecastList && Array.isArray(forecastList.list) ? forecastList.list : forecastList;
  if (!list || !list.length) return null;
  return (
    list.find((item) => {
      const pop = item.pop != null ? Number(item.pop) : 0;
      const main = item.weather?.[0]?.main || '';
      return pop < 0.2 && !String(main).toLowerCase().includes('thunder');
    }) || null
  );
}

module.exports = { findBestSlot };
