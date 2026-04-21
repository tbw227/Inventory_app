const prisma = require('../lib/prisma');
const weatherService = require('../services/weatherService');
const twcWeatherService = require('../services/twcWeatherService');
const { enrichDashboardWeather } = require('../utils/weatherExtras');
const AppError = require('../utils/AppError');
const {
  fetchRssHeadlines,
  RSS_WORLD_NEWS,
  RSS_ESPN_NEWS,
} = require('../utils/rssHeadlines');

function normalizeGnewsKey(raw) {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

async function fetchGNewsHeadlines() {
  const key = normalizeGnewsKey(process.env.GNEWS_API_KEY);
  if (!key) return [];
  try {
    const url =
      'https://gnews.io/api/v4/top-headlines?' +
      `lang=en&country=us&max=5&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];
    return articles.slice(0, 5).map((a, i) => ({
      id: a.url || `n-${i}`,
      title: a.title || '—',
      url: a.url || '',
      source: a.source?.name || '',
    }));
  } catch {
    return [];
  }
}

const EXTRAS_HEADLINE_CAP = 6;
const EXTRAS_SPORTS_CAP = 5;

async function buildNewsHeadlines() {
  const gnews = await fetchGNewsHeadlines();
  if (gnews.length >= EXTRAS_HEADLINE_CAP) return gnews.slice(0, EXTRAS_HEADLINE_CAP);
  const rss = await fetchRssHeadlines(RSS_WORLD_NEWS, 12);
  const seen = new Set(gnews.map((x) => String(x.title || '').toLowerCase()));
  const merged = [...gnews];
  for (const it of rss) {
    if (merged.length >= EXTRAS_HEADLINE_CAP) break;
    const t = String(it.title || '').toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    merged.push({
      id: it.id,
      title: it.title,
      url: it.url,
      source: 'BBC News',
    });
  }
  return merged;
}

async function fetchSportsHeadlines() {
  const raw = await fetchRssHeadlines(RSS_ESPN_NEWS, 10);
  return raw.slice(0, EXTRAS_SPORTS_CAP).map((it, i) => ({
    id: it.id || `sp-${i}`,
    title: it.title,
    url: it.url,
    source: 'ESPN',
  }));
}

async function fetchJokeTwopart() {
  try {
    const jr = await fetch('https://official-joke-api.appspot.com/random_joke', {
      headers: { Accept: 'application/json' },
    });
    if (jr.ok) {
      const j = await jr.json();
      if (j?.setup && j?.punchline) return { setup: j.setup, punchline: j.punchline };
    }
  } catch {
    /* optional */
  }
  try {
    const r = await fetch(
      'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=twopart'
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.error) return null;
    if (j?.setup && j?.delivery) return { setup: j.setup, punchline: j.delivery };
    return null;
  } catch {
    return null;
  }
}

exports.forecast = async (req, res, next) => {
  try {
    const data = await weatherService.getForecast(req.query.city);
    res.json(enrichDashboardWeather(data));
  } catch (err) {
    next(err);
  }
};

/**
 * Tenant / company forecast locations — one row per city, cached per query in weatherService.
 * Company.weather_locations overrides; otherwise single slot from user preference or server default.
 */
exports.locations = async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: String(req.user.company_id) },
      select: { weatherLocations: true },
    });
    const defaultCityEnv = (process.env.DEFAULT_WEATHER_CITY || 'Olathe,KS,US').trim();
    const userPref = (req.user.preferences?.weather_city || '').trim();

    const wl = company?.weatherLocations;
    let rows = [];
    if (Array.isArray(wl) && wl.length > 0) {
      rows = wl
        .map((loc) => ({
          label: (loc.label || loc.query || '').trim(),
          query: (loc.query || '').trim(),
        }))
        .filter((r) => r.query);
    }

    if (!rows.length) {
      const q = userPref || defaultCityEnv;
      const shortLabel = userPref ? userPref.split(',')[0].trim() || 'Forecast' : 'Forecast';
      rows = [{ label: shortLabel, query: q }];
    }

    const locations = [];
    for (const row of rows) {
      try {
        const raw = await weatherService.getForecast(row.query);
        locations.push({
          label: row.label,
          query: row.query,
          data: enrichDashboardWeather(raw),
        });
      } catch (e) {
        locations.push({
          label: row.label,
          query: row.query,
          data: null,
          error: e.message || 'Weather unavailable',
        });
      }
    }

    const prefNorm = userPref.toLowerCase();
    const default_query =
      rows.find((r) => r.query.toLowerCase() === prefNorm)?.query ||
      rows[0]?.query ||
      defaultCityEnv;

    res.json({
      locations,
      default_query,
      cache_ttl_sec: weatherService.getForecastCacheTtlSec(),
    });
  } catch (err) {
    next(err);
  }
};

/** The Weather Company (IBM) — server-side key; optional integration */
exports.twc = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return next(new AppError('Query params lat and lon are required', 400));
    }
    const bundle = await twcWeatherService.getTwcBundle(lat, lon);
    res.json(bundle);
  } catch (err) {
    next(err);
  }
};

/** Joke + world news + sports. GNews used when GNEWS_API_KEY is set; otherwise BBC RSS. Sports: ESPN RSS. */
exports.extras = async (req, res, next) => {
  try {
    const [joke, news, sports] = await Promise.all([
      fetchJokeTwopart(),
      buildNewsHeadlines(),
      fetchSportsHeadlines(),
    ]);
    res.json({ joke, news, sports });
  } catch (err) {
    next(err);
  }
};
