const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const companyController = require('../controllers/companyController');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), companyController.get);
router.put('/', authenticate, authorize('admin'), validate(schemas.updateCompany), companyController.update);
router.post(
  '/billing/checkout-session',
  authenticate,
  authorize('admin'),
  validate(schemas.billingCheckoutSession),
  companyController.createBillingCheckout
);
router.post('/billing/portal-session', authenticate, authorize('admin'), companyController.createBillingPortal);

module.exports = router;
