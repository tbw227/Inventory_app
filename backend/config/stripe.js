const Stripe = require('stripe');
const AppError = require('../utils/AppError');

let client;

/**
 * Lazily create the Stripe client so the app can boot without STRIPE_SECRET_KEY
 * (e.g. local dev, tests). Payment/webhook handlers fail with a clear error when used.
 */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !String(key).trim()) {
    throw new AppError('Stripe is not configured: set STRIPE_SECRET_KEY in your environment', 503);
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

module.exports = getStripe;
