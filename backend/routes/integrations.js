const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const quickbooksIntegrationController = require('../controllers/quickbooksIntegrationController');

const router = express.Router();

router.get(
  '/quickbooks/authorize-url',
  authenticate,
  authorize('admin'),
  quickbooksIntegrationController.getAuthorizeUrl
);
router.get('/quickbooks/callback', quickbooksIntegrationController.oauthCallback);
router.delete(
  '/quickbooks/connection',
  authenticate,
  authorize('admin'),
  quickbooksIntegrationController.disconnect
);
router.get(
  '/quickbooks/status',
  authenticate,
  authorize('admin'),
  quickbooksIntegrationController.status
);
router.post(
  '/quickbooks/sync/customers',
  authenticate,
  authorize('admin'),
  quickbooksIntegrationController.syncCustomersPreview
);
router.post(
  '/quickbooks/sync/items',
  authenticate,
  authorize('admin'),
  quickbooksIntegrationController.syncItemsPreview
);

module.exports = router;
