const Sentry = require('@sentry/node');
const logger = require('./logger');

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('Sentry DSN not configured — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });

  Sentry.setupExpressErrorHandler(app);

  logger.info('Sentry error tracking enabled');
}

module.exports = { initSentry };
