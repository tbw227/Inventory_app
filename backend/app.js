/**
 * Express application — entry point for all API routing and middleware.
 *
 * Middleware stack (order matters):
 *   1. Helmet (security headers + CSP)
 *   2. Rate limiter (configurable via RATE_LIMIT_*)
 *   3. Prometheus HTTP metrics (optional METRICS_ENABLED)
 *   4. Morgan request logging
 *   5. CORS (FRONTEND_URL origins; required in production)
 *   5. Cache-control headers
 *   6. Webhook routes (before body parsing — Stripe needs raw body)
 *   7. JSON + URL-encoded body parsing
 *   8. Static uploads route
 *   9. Swagger UI (dev/staging; optional in production via ENABLE_API_DOCS)
 *  10. Versioned API routes (/api/v1/*)
 *  11. Legacy unversioned routes (/api/*)
 *  12. Health endpoints (/health/live, /health)
 *  13. 404 handler → Sentry → global error handler
 *
 * This module exports the app (no listen call). server.js handles startup.
 * Deploy marker: 2026-06-09 — re-trigger Railway build from main.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morganMiddleware = require('./middleware/logger');
const { prometheusMiddleware, shouldSkipMetrics } = require('./middleware/prometheus');
const responseCacheControl = require('./middleware/responseCacheControl');
const errorHandler = require('./middleware/errorHandler');
const { isLanCorsAllowed, getConfiguredBrowserOrigins } = require('./config/security');
const { isClerkConfigured } = require('./config/clerk');

const app = express();
app.set('etag', 'weak');
// Behind Railway/Vercel proxies, trust the first hop so express-rate-limit and
// req.ip read the client address from X-Forwarded-For instead of erroring.
app.set('trust proxy', 1);

if (isClerkConfigured() && process.env.NODE_ENV !== 'test') {
  const { clerkMiddleware } = require('@clerk/express');
  app.use(clerkMiddleware());
}

if (process.env.NODE_ENV === 'production') {
  const origins = getConfiguredBrowserOrigins();
  if (origins.length === 0) {
    throw new Error(
      'FRONTEND_URL must be set in production (comma-separated allowed browser origins, e.g. https://app.example.com)'
    );
  }
}

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives:
        process.env.NODE_ENV === 'production'
          ? {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https:'],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
            }
          : {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-eval'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*', 'https:'],
              fontSrc: ["'self'", 'data:'],
            },
    },
  })
);

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100);

if (rateLimitMax > 0) {
  const limiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    message: { error: 'Too many requests from this IP, please try again later.' },
    skip: (req) => shouldSkipMetrics(req),
  });
  app.use(limiter);
}

app.use(prometheusMiddleware);
app.use(morganMiddleware);

const fromEnv = getConfiguredBrowserOrigins();
const viteDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://localhost:5173',
  'https://localhost:5174',
  'https://localhost:5175',
  'https://127.0.0.1:5173',
  'https://127.0.0.1:5174',
  'https://127.0.0.1:5175',
];
const frontendOrigins =
  process.env.NODE_ENV === 'production'
    ? fromEnv
    : [...new Set([...fromEnv, ...viteDevOrigins])];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (frontendOrigins.includes(origin)) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' &&
        isLanCorsAllowed() &&
        /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      if (
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(responseCacheControl);

// Webhook routes must be mounted BEFORE express.json() — Stripe needs the raw body
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/v1/webhooks', require('./routes/webhooks'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsServe = require('./routes/uploads');
app.use('/api/v1/uploads', uploadsServe);
app.use('/api/uploads', uploadsServe);

// Swagger UI: dev/staging by default; set ENABLE_API_DOCS=true to expose in production.
if (
  process.env.NODE_ENV !== 'test' &&
  (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true')
) {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'FireTrack API',
        version: '1.0.0',
        description: 'API documentation for the FireTrack inventory and job management platform.',
      },
      servers: [
        { url: '/api/v1', description: 'v1 API' },
        { url: '/api', description: 'Legacy (unversioned)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./routes/*.js'],
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Versioned routes — v1 is the preferred API; unversioned /api/* kept for backwards compatibility.
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/upload', require('./routes/upload'));
app.use('/api/v1/companies', require('./routes/companies'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/locations', require('./routes/locations'));
app.use('/api/v1/jobs', require('./routes/jobs'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/supplies', require('./routes/supplies'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/weather', require('./routes/weather'));
app.use('/api/v1/integrations', require('./routes/integrations'));
app.use('/api/v1/financials', require('./routes/financials'));

// Legacy unversioned routes (backwards compatible)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/supplies', require('./routes/supplies'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/financials', require('./routes/financials'));

app.use('/metrics', require('./routes/metrics'));

/** Liveness — no database; safe for kubelet restart decisions. */
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/health', async (req, res) => {
  let database = 'unknown';
  let cache = 'unknown';
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    database = 'connected';
  } catch {
    database = 'error';
  }
  try {
    const { getStore } = require('./lib/cacheStore');
    const store = await getStore();
    await store.ping();
    cache = store.backend || 'ok';
  } catch {
    cache = 'error';
  }
  res.json({
    status: database === 'connected' ? 'OK' : 'DEGRADED',
    timestamp: new Date(),
    uptime: process.uptime(),
    database,
    cache,
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const { initSentry } = require('./config/sentry');
initSentry(app);

app.use(errorHandler);

module.exports = app;
