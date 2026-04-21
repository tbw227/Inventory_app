const getStripe = require('../config/stripe');
const paymentService = require('../services/paymentService');

exports.handleStripe = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const status = err.status || 503;
    return res.status(status).json({ error: err.message });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    await paymentService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};
