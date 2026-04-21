/**
 * Parse DEFAULT_WEATHER_CITY / ?city= strings and disambiguate Open-Meteo geocoding (US + state).
 */

const US_STATE_FULL = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

const FULL_TO_ABBR = Object.fromEntries(
  Object.entries(US_STATE_FULL).map(([abbr, full]) => [full.toLowerCase(), abbr])
);

function abbrevForAdmin1(admin1) {
  if (!admin1) return null;
  return FULL_TO_ABBR[String(admin1).toLowerCase()] || null;
}

/**
 * @param {string} raw e.g. "Olathe,KS,US", "Kansas City,US"
 */
function parseWeatherLocationQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return { searchName: '', stateAbbrev: null, wantUS: false };

  const parts = q.split(',').map((p) => p.trim()).filter(Boolean);
  const wantUS = /,\s*US\s*$/i.test(q);

  let stateAbbrev = null;
  if (wantUS && parts.length >= 3) {
    const maybe = parts[parts.length - 2].toUpperCase();
    if (maybe.length === 2 && US_STATE_FULL[maybe]) stateAbbrev = maybe;
  } else if (parts.length >= 2 && !wantUS) {
    const maybe = parts[1].toUpperCase();
    if (maybe.length === 2 && US_STATE_FULL[maybe]) stateAbbrev = maybe;
  }

  const searchName = parts[0] || q;
  return { searchName, stateAbbrev, wantUS };
}

/**
 * Pick best GeoNames row for US + optional state (e.g. Kansas City,MO,US).
 */
function pickGeocodeResult(results, { wantUS, stateAbbrev }) {
  if (!results?.length) return null;

  let pool = results;
  if (wantUS) {
    pool = results.filter((r) => r.country_code === 'US');
    if (!pool.length) pool = results;
  }

  if (stateAbbrev) {
    const full = US_STATE_FULL[stateAbbrev];
    if (full) {
      const fl = full.toLowerCase();
      const inState = pool.filter(
        (r) => r.admin1 && String(r.admin1).toLowerCase() === fl
      );
      if (inState.length) return inState[0];
    }
  }

  return pool[0] || results[0];
}

function displayPlaceLabel(place, stateAbbrevFromQuery) {
  if (!place) return '';
  const { name, country_code: country, admin1 } = place;
  const abbr = stateAbbrevFromQuery || (country === 'US' ? abbrevForAdmin1(admin1) : null);
  if (abbr) return `${name}, ${abbr}`;
  if (country) return `${name}, ${country}`;
  return name;
}

module.exports = {
  parseWeatherLocationQuery,
  pickGeocodeResult,
  displayPlaceLabel,
  US_STATE_FULL,
};
