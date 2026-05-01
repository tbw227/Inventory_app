const READ_HEAVY_PREFIXES = [
  '/api/v1/clients',
  '/api/v1/locations',
  '/api/v1/supplies',
  '/api/v1/dashboard',
  '/api/clients',
  '/api/locations',
  '/api/supplies',
  '/api/dashboard',
];

function responseCacheControl(req, res, next) {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const isReadHeavy = READ_HEAVY_PREFIXES.some((prefix) => req.path.startsWith(prefix));
  if (!isReadHeavy) {
    next();
    return;
  }

  // Allow browser revalidation (ETag/If-None-Match) without stale shared-cache reuse.
  res.set('Cache-Control', 'private, no-cache');
  next();
}

module.exports = responseCacheControl;
