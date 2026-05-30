const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'inventory_',
});

const httpRequestDuration = new client.Histogram({
  name: 'inventory_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'inventory_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpErrorsTotal = new client.Counter({
  name: 'inventory_http_errors_total',
  help: 'HTTP responses with status >= 500',
  labelNames: ['method', 'route'],
  registers: [register],
});

/** Collapse UUIDs and numeric IDs to keep Prometheus label cardinality low. */
function normalizeRoute(req) {
  if (req.route?.path) {
    const base = req.baseUrl || '';
    return `${base}${req.route.path}` || 'unknown';
  }
  return (req.path || 'unknown')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

function isMetricsEnabled() {
  const raw = process.env.METRICS_ENABLED;
  if (raw === 'false' || raw === '0') return false;
  if (process.env.NODE_ENV === 'test') {
    return raw === 'true' || raw === '1';
  }
  return raw === undefined || raw === '' || raw === 'true' || raw === '1';
}

function recordHttpRequest(req, res, durationSec) {
  const route = normalizeRoute(req);
  const labels = {
    method: req.method,
    route,
    status_code: String(res.statusCode),
  };
  httpRequestsTotal.inc(labels);
  httpRequestDuration.observe(labels, durationSec);
  if (res.statusCode >= 500) {
    httpErrorsTotal.inc({ method: req.method, route });
  }
}

async function getMetricsText() {
  return register.metrics();
}

function getContentType() {
  return register.contentType;
}

module.exports = {
  register,
  isMetricsEnabled,
  recordHttpRequest,
  getMetricsText,
  getContentType,
  normalizeRoute,
};
