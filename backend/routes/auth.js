const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { requireClerkSession } = require('../middleware/clerkSession');
const { rejectLegacyAuthWhenClerk } = require('../middleware/clerkLegacyAuth');
const { validate, schemas } = require('../middleware/validation');
const authController = require('../controllers/authController');
const { isPublicRegistrationAllowed } = require('../config/security');

function requirePublicRegistrationEnabled(req, res, next) {
  if (!isPublicRegistrationAllowed()) {
    return res.status(403).json({ error: 'Public registration is disabled' });
  }
  return next();
}

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

router.post(
  '/register',
  rejectLegacyAuthWhenClerk,
  requirePublicRegistrationEnabled,
  loginLimiter,
  validate(schemas.register),
  authController.register
);
router.post(
  '/login',
  rejectLegacyAuthWhenClerk,
  loginLimiter,
  validate(schemas.login),
  authController.login
);
router.post(
  '/clerk/provision',
  loginLimiter,
  requireClerkSession,
  validate(schemas.clerkProvision),
  authController.clerkProvision
);
router.post(
  '/forgot-password',
  rejectLegacyAuthWhenClerk,
  passwordResetLimiter,
  validate(schemas.forgotPassword),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  rejectLegacyAuthWhenClerk,
  passwordResetLimiter,
  validate(schemas.resetPassword),
  authController.resetPassword
);
router.get('/me', authenticate, authController.me);

module.exports = router;
