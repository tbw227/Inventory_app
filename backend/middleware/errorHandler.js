const logger = require('../config/logger');

const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;

  if (status >= 500) {
    logger.error(err.message, { status, stack: err.stack, url: req.originalUrl, method: req.method });
  }

  const dev = process.env.NODE_ENV === 'development';
  res.status(status).json({
    error: message,
    ...(dev && status >= 500 && {
      details: err.message,
      stack: err.stack,
    }),
  });
};

module.exports = errorHandler;
