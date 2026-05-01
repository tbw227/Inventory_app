const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morganMiddleware = require('./middleware/logger');
const responseCacheControl = require('./middleware/responseCacheControl');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('etag', 'weak');

if (process.env.NODE_ENV === 'production') {
  const origins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
  });
  app.use(limiter);
}

app.use(morganMiddleware);

const fromEnv = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const viteDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
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

app.get('/health', async (req, res) => {
  let database = 'unknown';
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    database = 'connected';
  } catch {
    database = 'error';
  }
  res.json({
    status: database === 'connected' ? 'OK' : 'DEGRADED',
    timestamp: new Date(),
    uptime: process.uptime(),
    database,
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
