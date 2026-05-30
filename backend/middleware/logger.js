const morgan = require('morgan');
const logger = require('../config/logger');

const stream = {
  write: (message) => logger.info(message.trim()),
};

const { shouldSkipMetrics } = require('./prometheus');

const morganMiddleware = morgan(
  ':remote-addr :method :url :status :response-time ms',
  {
    skip: (req) => process.env.NODE_ENV === 'test' || shouldSkipMetrics(req),
    stream,
  }
);

module.exports = morganMiddleware;
