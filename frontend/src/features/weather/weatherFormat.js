export function wmoEmoji(code) {
  const c = Number(code);
  if (Number.isNaN(c)) return '🌤';
  if (c === 0 || c === 1) return '☀️';
  if (c === 2) return '⛅';
  if (c === 3) return '☁️';
  if (c === 45 || c === 48) return '🌫';
  if (c >= 51 && c <= 57) return '🌧';
  if (c >= 61 && c <= 67) return '🌧';
  if (c >= 71 && c <= 77) return '❄️';
  if (c >= 80 && c <= 82) return '🌦';
  if (c >= 95) return '⛈';
  return '🌤';
}

export function fmtDec(n, places = 2) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return null;
  return Number(n).toFixed(places);
}
