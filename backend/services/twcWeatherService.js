const AppError = require('../utils/AppError');

function normalizeKey(raw) {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) {
    let detail = text?.slice(0, 200) || res.statusText;
    try {
      const j = JSON.parse(text);
      if (j.message) detail = j.message;
    } catch {
      /* keep detail */
    }
    throw new AppError(`Weather Company API error (${res.status}): ${detail}`, res.status === 401 || res.status === 403 ? 502 : 502);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('Invalid JSON from Weather Company API', 502);
  }
}

/** TWC v3 sometimes returns a single object or an array of station objects */
function unwrapObservation(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw)) return raw[0] || null;
  if (raw.temperature != null || raw.wxPhraseLong != null) return raw;
  const keys = Object.keys(raw);
  if (keys.length === 1 && Array.isArray(raw[keys[0]])) return raw[keys[0]][0];
  return raw;
}

function parseHourly12(raw) {
  const times = raw?.validTimeLocal;
  const temps = raw?.temperature;
  const phrases = raw?.wxPhraseShort || raw?.wxPhraseLong;
  if (!Array.isArray(times) || !Array.isArray(temps)) return { hours: [] };
  const hours = [];
  for (let i = 0; i < Math.min(times.length, temps.length, 12); i++) {
    hours.push({
      validTimeLocal: times[i],
      temperature: temps[i],
      wxPhrase: phrases?.[i] || '',
    });
  }
  return { hours };
}

function parseDaily5(raw) {
  const max = raw?.calendarDayTemperatureMax;
  const min = raw?.calendarDayTemperatureMin;
  const dow = raw?.dayOfWeek;
  const precip = raw?.precipChance;
  const narrative = raw?.narrative;
  if (!Array.isArray(max)) return { days: [], insights: { rainyPeriods: 0, bestDayLabel: '—' } };
  const days = [];
  for (let i = 0; i < max.length; i++) {
    days.push({
      tempMax: max[i],
      tempMin: Array.isArray(min) ? min[i] : null,
      dayOfWeek: Array.isArray(dow) ? dow[i] : null,
      precipChance: Array.isArray(precip) ? precip[i] : null,
      narrative: Array.isArray(narrative) ? narrative[i] : null,
    });
  }
  let rainyPeriods = 0;
  for (const d of days) {
    const p = d.precipChance != null ? Number(d.precipChance) : 0;
    if (p >= 40) rainyPeriods += 1;
  }
  const best = days.reduce((b, c) => {
    const cp = c.precipChance != null ? Number(c.precipChance) : 100;
    const bp = b.precipChance != null ? Number(b.precipChance) : 100;
    return cp < bp ? c : b;
  }, days[0]);
  const bestDayLabel =
    best?.dayOfWeek && best?.narrative
      ? `${best.dayOfWeek}: ${best.narrative}`
      : best?.dayOfWeek || best?.narrative || '—';

  return { days, insights: { rainyPeriods, bestDayLabel } };
}

/**
 * The Weather Company (IBM) v3 — uses WEATHER_COMPANY_API_KEY when set.
 * Without a key, returns 200-safe empty bundle (no throw) so dashboards work on Open-Meteo only.
 * @param {number} lat
 * @param {number} lon
 */
async function getTwcBundle(lat, lon) {
  const key = normalizeKey(process.env.WEATHER_COMPANY_API_KEY);
  if (!key) {
    return {
      configured: false,
      current: null,
      hourly: { hours: [] },
      daily: [],
      insights: null,
      _provider: 'twc',
    };
  }

  const la = Number(lat);
  const lo = Number(lon);
  if (Number.isNaN(la) || Number.isNaN(lo)) {
    throw new AppError('Invalid coordinates', 400);
  }

  const geo = `${la},${lo}`;
  const q = `apiKey=${encodeURIComponent(key)}&geocode=${encodeURIComponent(geo)}&language=en-US&format=json`;
  const base = 'https://api.weather.com/v3/wx';

  const [currentRaw, hourlyRaw, dailyRaw] = await Promise.all([
    fetchJson(`${base}/observations/current?${q}`),
    fetchJson(`${base}/forecast/hourly/12hour?${q}&units=e`),
    fetchJson(`${base}/forecast/daily/5day?${q}&units=e`),
  ]);

  const obs = unwrapObservation(currentRaw) || currentRaw;
  const temp =
    obs?.temperature != null
      ? Math.round(Number(obs.temperature))
      : obs?.temp != null
        ? Math.round(Number(obs.temp))
        : null;
  const wxPhrase =
    obs?.wxPhraseLong || obs?.wxPhraseShort || obs?.wxPhrase || obs?.condition || '—';
  const dayOrNight = obs?.dayOrNight === 'N' ? 'N' : 'D';

  const hourly = parseHourly12(hourlyRaw);
  const daily = parseDaily5(dailyRaw);

  return {
    configured: true,
    current: {
      temperature: temp,
      wxPhrase,
      dayOrNight,
      isDay: dayOrNight === 'D',
    },
    hourly,
    daily: daily.days,
    insights: daily.insights,
    _provider: 'twc',
  };
}

module.exports = { getTwcBundle };
