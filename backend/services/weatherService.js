const AppError = require('../utils/AppError');
const { createNodeCacheAdapter } = require('../lib/cache');

const ttlRaw = Number(process.env.WEATHER_CACHE_TTL_SEC || 600);
const WEATHER_CACHE_TTL_SEC = Math.min(3600, Math.max(60, Number.isFinite(ttlRaw) ? ttlRaw : 600));
const forecastCache = createNodeCacheAdapter({
  ttlSec: WEATHER_CACHE_TTL_SEC,
  maxKeys: 500,
  useClones: false,
});

function forecastCacheKey(query) {
  return `wf:${(query || '').trim().toLowerCase()}`;
}
const {
  parseWeatherLocationQuery,
  pickGeocodeResult,
  displayPlaceLabel,
} = require('../utils/weatherLocationQuery');

/** Normalize key from .env (quotes, BOM, CR, accidental spaces). */
function normalizeApiKey(raw) {
  if (raw == null) return '';
  return String(raw)
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\r/g, '')
    .replace(/\s+/g, '');
}

function windCompass(deg) {
  if (deg == null || Number.isNaN(Number(deg))) return null;
  const d = ((Number(deg) % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(d / 45) % 8];
}

/** hPa → inHg for display */
function hpaToInHg(hpa) {
  if (hpa == null || Number.isNaN(Number(hpa))) return null;
  return Math.round(Number(hpa) * 0.029529983071445 * 100) / 100;
}

function wmoCodeToDescription(code) {
  const m = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Slight rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Moderate showers',
    82: 'Violent showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  };
  return m[code] != null ? m[code] : 'Weather';
}

function localDateKeyFromUnix(sec) {
  const d = new Date(sec * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** OpenWeather 3-hour / 5-day → daily highs/lows + current for dashboard. */
function openWeatherToDashboardShape(data, opts = {}) {
  const stateAbbrev = opts.stateAbbrev || null;
  const list = data.list || [];
  const byDay = new Map();
  for (const item of list) {
    const key = localDateKeyFromUnix(item.dt);
    if (!byDay.has(key)) {
      byDay.set(key, {
        temps: [],
        windSpeeds: [],
        description: item.weather?.[0]?.description || 'Weather',
      });
    }
    const g = byDay.get(key);
    g.temps.push(Number(item.main?.temp) || 0);
    if (item.wind?.speed != null) g.windSpeeds.push(Number(item.wind.speed) || 0);
  }
  const daily = [];
  for (const [key, g] of byDay) {
    daily.push({
      dt: Math.floor(new Date(`${key}T12:00:00`).getTime() / 1000),
      dt_label: key,
      temp_max: Math.max(...g.temps),
      temp_min: Math.min(...g.temps),
      wind_speed_max: g.windSpeeds.length ? Math.max(...g.windSpeeds) : null,
      weather: [{ description: g.description }],
    });
  }
  daily.sort((a, b) => a.dt - b.dt);
  const first = list[0];
  const pHpa = first?.main?.pressure;
  const current = first
    ? {
        dt: first.dt,
        main: {
          temp: first.main?.temp,
          feels_like: first.main?.feels_like ?? first.main?.temp,
          humidity: first.main?.humidity,
          pressure: hpaToInHg(pHpa),
          pressure_hpa: pHpa,
        },
        weather: first.weather,
        wind: first.wind
          ? { speed: first.wind.speed, deg: first.wind.deg, gust: first.wind.gust }
          : undefined,
        wind_cardinal: windCompass(first.wind?.deg),
        clouds: first.clouds,
        visibility_m: first.visibility,
        pop: first.pop,
      }
    : null;
  const cityName = data.city?.name || '';
  const country = data.city?.country || '';
  let displayName = country ? `${cityName}, ${country}` : cityName;
  if (stateAbbrev && String(country).toUpperCase() === 'US') {
    displayName = `${cityName}, ${stateAbbrev}`;
  }
  const tz = data.city?.timezone;
  return {
    city: {
      name: displayName,
      lat: data.city?.coord?.lat ?? null,
      lon: data.city?.coord?.lon ?? null,
      utc_offset_seconds: typeof tz === 'number' ? tz : null,
    },
    current,
    daily,
    list: list.slice(0, 8),
    _provider: 'openweather',
    _forecastDaysAvailable: daily.length,
    _units: { temp: '°F', wind: 'mph', pressure: 'inHg' },
  };
}

/**
 * Free tier — https://open-meteo.com/ — up to 16 days daily + current conditions.
 */
async function fetchOpenMeteo(cityQuery, parsed) {
  const { searchName, stateAbbrev, wantUS } = parsed || parseWeatherLocationQuery(cityQuery);
  let geoUrl =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=10`;
  if (wantUS) geoUrl += '&countryCode=US';

  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) {
    throw new AppError('Weather geocoding failed (Open-Meteo)', 502);
  }
  const geo = await geoRes.json();
  if (!geo.results?.length) {
    throw new AppError(`Location not found: "${cityQuery}"`, 404);
  }

  const place = pickGeocodeResult(geo.results, { wantUS, stateAbbrev });
  if (!place) {
    throw new AppError(`Location not found: "${cityQuery}"`, 404);
  }

  const { latitude, longitude } = place;
  const label = displayPlaceLabel(place, stateAbbrev);

  const fcUrl =
    'https://api.open-meteo.com/v1/forecast?' +
    `latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,' +
    'wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum' +
    '&forecast_days=16' +
    '&temperature_unit=fahrenheit' +
    '&wind_speed_unit=mph' +
    '&precipitation_unit=inch' +
    '&timezone=auto';

  const fcRes = await fetch(fcUrl);
  if (!fcRes.ok) {
    throw new AppError('Weather forecast failed (Open-Meteo)', 502);
  }
  const fc = await fcRes.json();
  const cur = fc.current || {};
  const times = fc.daily?.time || [];
  const tmax = fc.daily?.temperature_2m_max || [];
  const tmin = fc.daily?.temperature_2m_min || [];
  const codes = fc.daily?.weather_code || [];
  const wmax = fc.daily?.wind_speed_10m_max || [];
  const precip = fc.daily?.precipitation_sum || [];

  const daily = times.map((t, i) => ({
    dt: Math.floor(new Date(`${t}T12:00:00`).getTime() / 1000),
    dt_label: t,
    temp_max: tmax[i],
    temp_min: tmin[i],
    wind_speed_max: wmax[i],
    precip_in: precip[i],
    weather: [{ description: wmoCodeToDescription(codes[i]), code: codes[i] }],
  }));

  if (!daily.length) {
    throw new AppError('No forecast data returned', 502);
  }

  const pressureHpa = cur.surface_pressure;
  const current = {
    dt: Math.floor(Date.now() / 1000),
    main: {
      temp: cur.temperature_2m,
      feels_like: cur.apparent_temperature ?? cur.temperature_2m,
      humidity: cur.relative_humidity_2m,
      pressure: hpaToInHg(pressureHpa),
      pressure_hpa: pressureHpa,
    },
    weather: [{ description: wmoCodeToDescription(cur.weather_code), code: cur.weather_code }],
    wind: {
      speed: cur.wind_speed_10m,
      deg: cur.wind_direction_10m,
      gust: cur.wind_gusts_10m,
    },
    precipitation_in: cur.precipitation,
    wind_cardinal: windCompass(cur.wind_direction_10m),
  };

  const list = daily.slice(0, 8).map((d) => ({
    dt: d.dt,
    main: { temp: Math.round(((Number(d.temp_max) + Number(d.temp_min)) / 2) * 10) / 10 },
    weather: d.weather,
  }));

  const utcOff = fc.utc_offset_seconds;
  return {
    city: {
      name: label,
      lat: latitude,
      lon: longitude,
      utc_offset_seconds: typeof utcOff === 'number' ? utcOff : null,
      timezone: place.timezone || null,
    },
    current,
    daily,
    list,
    _provider: 'open-meteo',
    _forecastDaysAvailable: daily.length,
    _units: { temp: '°F', wind: 'mph', pressure: 'inHg', precip: 'in' },
  };
}

async function fetchOpenWeather(query, apiKey) {
  const q = encodeURIComponent(query);
  const url =
    `https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${apiKey}&units=imperial`;

  const res = await fetch(url);
  const bodyText = await res.text();

  if (!res.ok) {
    let detail = '';
    try {
      const j = JSON.parse(bodyText);
      if (j.message) detail = j.message;
    } catch (_) {
      detail = bodyText?.slice(0, 200) || '';
    }
    return { ok: false, status: res.status, detail };
  }

  try {
    return { ok: true, data: JSON.parse(bodyText) };
  } catch {
    return { ok: false, status: 502, detail: 'Invalid JSON from OpenWeather' };
  }
}

/**
 * Prefer OpenWeather when a valid-looking key is set; on 401/403 or network issues,
 * fall back to Open-Meteo (no key, free for non-commercial use per Open-Meteo terms).
 * Uncached — use getForecast() for tenant-safe caching (10–15 min default).
 */
async function fetchForecastUncached(city) {
  const query = (city || process.env.DEFAULT_WEATHER_CITY || 'Olathe,KS,US').trim();
  const parsed = parseWeatherLocationQuery(query);
  const apiKey = normalizeApiKey(process.env.OPENWEATHER_API_KEY);

  if (apiKey.length >= 16) {
    const ow = await fetchOpenWeather(query, apiKey);
    if (ow.ok) {
      return openWeatherToDashboardShape(ow.data, { stateAbbrev: parsed.stateAbbrev });
    }
    if (ow.status === 404) {
      throw new AppError(
        `City not found for "${query}". Try DEFAULT_WEATHER_CITY (e.g. Olathe,KS,US) in backend/.env.`,
        404
      );
    }
    if (ow.status === 429) {
      throw new AppError('OpenWeather rate limit reached. Try again in a minute.', 429);
    }
    if (ow.status === 401 || ow.status === 403) {
      console.warn(
        '[weather] OpenWeather returned %s (%s). Using Open-Meteo fallback (no API key).',
        ow.status,
        ow.detail || 'unauthorized'
      );
      return fetchOpenMeteo(query, parsed);
    }
    console.warn(
      '[weather] OpenWeather failed (%s): %s — using Open-Meteo fallback.',
      ow.status,
      ow.detail
    );
    return fetchOpenMeteo(query, parsed);
  }

  if (apiKey.length > 0 && apiKey.length < 16) {
    console.warn('[weather] OPENWEATHER_API_KEY looks too short; using Open-Meteo only.');
  }

  return fetchOpenMeteo(query, parsed);
}

async function getForecast(city) {
  const query = (city || process.env.DEFAULT_WEATHER_CITY || 'Olathe,KS,US').trim();
  const key = forecastCacheKey(query);
  const hit = forecastCache.get(key);
  if (hit != null) return hit;
  const data = await fetchForecastUncached(city);
  forecastCache.set(key, data);
  return data;
}

function getForecastCacheTtlSec() {
  return WEATHER_CACHE_TTL_SEC;
}

module.exports = { getForecast, fetchForecastUncached, getForecastCacheTtlSec };
