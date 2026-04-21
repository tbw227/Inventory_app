const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const authController = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_LOGIN_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS || 25),
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const passwordResetLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RESET_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RESET_MAX_ATTEMPTS || 5),
  message: { error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

router.post('/login', loginLimiter, validate(schemas.login), authController.login);
router.post('/forgot-password', passwordResetLimiter, validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(schemas.resetPassword), authController.resetPassword);
router.get('/me', authenticate, authController.me);

module.exports = router;
