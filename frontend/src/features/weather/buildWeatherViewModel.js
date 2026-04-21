function padDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pickTodayDaily(daily) {
  if (!daily?.length) return null;
  const k = padDateKey(new Date());
  return daily.find((d) => d.dt_label === k) || daily[0];
}

/**
 * Hour-of-day at the forecast location (uses API utc offset). Falls back to viewer's local clock.
 */
function localHourAtForecastLocation(utcOffsetSeconds) {
  if (utcOffsetSeconds == null || Number.isNaN(Number(utcOffsetSeconds))) {
    return new Date().getHours();
  }
  const sec = Math.floor(Date.now() / 1000) + Number(utcOffsetSeconds);
  const daySec = ((sec % 86400) + 86400) % 86400;
  return Math.floor(daySec / 3600);
}

/**
 * Derive props for WeatherMini / WeatherFull from dashboard API payload.
 */
export function buildWeatherViewModel(apiData) {
  if (!apiData) return null;

  const cur = apiData.current;
  const daily = apiData.daily || [];
  const list = apiData.list || [];
  const todayDaily = pickTodayDaily(daily);

  let temp = cur?.main?.temp;
  if (temp == null && todayDaily) {
    const a = Number(todayDaily.temp_max);
    const b = Number(todayDaily.temp_min);
    if (!Number.isNaN(a) && !Number.isNaN(b)) temp = Math.round((a + b) / 2);
  }
  temp = temp != null && !Number.isNaN(Number(temp)) ? Math.round(Number(temp)) : null;

  const condition =
    cur?.weather?.[0]?.description ||
    todayDaily?.weather?.[0]?.description ||
    '—';

  const main = cur?.weather?.[0]?.main || todayDaily?.weather?.[0]?.main || '';

  const hour = localHourAtForecastLocation(apiData.city?.utc_offset_seconds);
  const isDay = hour >= 6 && hour < 20;

  const hourly = list.slice(0, 12).map((item) => ({
    time: new Date((item.dt || 0) * 1000).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
    temp:
      item.main?.temp != null && !Number.isNaN(Number(item.main.temp))
        ? Math.round(Number(item.main.temp))
        : null,
  }));

  const dailyRows = daily.slice(0, 7).map((d) => {
    const label = d.dt_label || padDateKey(new Date((d.dt || 0) * 1000));
    let dayName = label;
    try {
      const [yy, mm, dd] = label.split('-').map(Number);
      if (yy && mm && dd) {
        dayName = new Date(yy, mm - 1, dd).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      /* keep label */
    }
    return {
      day: dayName,
      high: d.temp_max != null ? Math.round(Number(d.temp_max)) : null,
      low: d.temp_min != null ? Math.round(Number(d.temp_min)) : null,
    };
  });

  return {
    temp,
    condition,
    main,
    isDay,
    city: apiData.city?.name || 'Forecast',
    hourly,
    daily: dailyRows,
    raw: apiData,
  };
}
