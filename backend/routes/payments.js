const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const paymentController = require('../controllers/paymentController');

router.post('/', authenticate, validate(schemas.createPaymentIntent), paymentController.createIntent);
router.get('/revenue/by-job', authenticate, authorize('admin'), paymentController.revenueByJob);
router.get('/revenue', authenticate, authorize('admin'), paymentController.revenueStats);
router.get('/job/:jobId', authenticate, paymentController.listByJob);

module.exports = router;
