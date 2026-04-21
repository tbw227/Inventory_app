const companyService = require('../services/companyService');
const subscriptionService = require('../services/subscriptionService');

exports.get = async (req, res, next) => {
  try {
    const company = await companyService.getCompany(req.user.company_id);
    res.json(company);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const company = await companyService.updateCompany(req.user.company_id, req.validatedData);
    res.json(company);
  } catch (err) {
    next(err);
  }
};

exports.createBillingCheckout = async (req, res, next) => {
  try {
    const { plan } = req.validatedData;
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
    const successUrl = `${base}/settings?billing=success`;
    const cancelUrl = `${base}/settings?billing=cancel`;
    const { url } = await subscriptionService.createSubscriptionCheckoutSession(
      req.user.company_id,
      plan,
      successUrl,
      cancelUrl
    );
    res.json({ url });
  } catch (err) {
    next(err);
  }
};

exports.createBillingPortal = async (req, res, next) => {
  try {
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
    const returnUrl = `${base}/settings`;
    const { url } = await subscriptionService.createBillingPortalSession(req.user.company_id, returnUrl);
    res.json({ url });
  } catch (err) {
    next(err);
  }
};
