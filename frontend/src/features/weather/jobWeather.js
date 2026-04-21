import { getWeatherRisk, matchWeatherToTime } from './weatherUtils';

/**
 * Map a job date to the nearest forecast slice + risk (expects API `list` from /api/v1/weather/forecast).
 * Not a React hook — safe to call during render or in effects.
 */
export function getJobWeather(job, forecastPayload) {
  if (!job || !forecastPayload?.list?.length) return null;
  const date = job.scheduled_date ?? job.date ?? job.scheduledDate;
  if (!date) return null;

  const weather = matchWeatherToTime(date, forecastPayload.list);
  if (!weather?.weather?.[0]) return { weather, risk: getWeatherRisk('') };

  const main = weather.weather[0].main || '';
  const desc = weather.weather[0].description || '';
  const risk = getWeatherRisk(`${main} ${desc}`);

  return { weather, risk };
}
