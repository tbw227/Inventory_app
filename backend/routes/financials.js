const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const financialController = require('../controllers/financialController');

const router = express.Router();

router.get('/tax-categories', authenticate, financialController.listTaxCategories);
router.get('/accounts', authenticate, financialController.listAccounts);
router.get('/transactions', authenticate, financialController.listTransactions);
router.post('/transactions', authenticate, authorize('admin'), financialController.createTransaction);
router.put('/transactions/:id', authenticate, authorize('admin'), financialController.updateTransaction);
router.delete('/transactions/:id', authenticate, authorize('admin'), financialController.deleteTransaction);
router.get('/tax-summary', authenticate, financialController.taxSummary);
router.post('/sync/quickbooks', authenticate, authorize('admin'), financialController.syncQuickBooks);

module.exports = router;
