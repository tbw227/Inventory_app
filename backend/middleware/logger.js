const morgan = require('morgan');
const logger = require('../config/logger');

const stream = {
  write: (message) => logger.info(message.trim()),
};

const morganMiddleware = morgan(
  ':remote-addr :method :url :status :response-time ms',
  {
    skip: () => process.env.NODE_ENV === 'test',
    stream,
  }
);

module.exports = morganMiddleware;
