const { isMetricsEnabled, recordHttpRequest } = require('../lib/metrics');

function shouldSkipMetrics(req) {
  return req.path === '/metrics';
}

function prometheusMiddleware(req, res, next) {
  if (!isMetricsEnabled() || shouldSkipMetrics(req)) {
    return next();
  }

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    recordHttpRequest(req, res, durationSec);
  });
  next();
}

module.exports = { prometheusMiddleware, shouldSkipMetrics };
