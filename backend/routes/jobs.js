const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const jobController = require('../controllers/jobController');

const router = express.Router();

router.get('/', authenticate, jobController.list);
router.get('/:id', authenticate, jobController.get);
router.post('/', authenticate, authorize('admin'), validate(schemas.createJob), jobController.create);
router.put('/:id', authenticate, authorize('admin'), validate(schemas.updateJob), jobController.update);
router.post('/:id/complete', authenticate, validate(schemas.completeJob), jobController.complete);
router.post('/:id/inventory', authenticate, authorize('admin', 'technician'), validate(schemas.addJobInventoryUsed), jobController.addInventoryUsed);

module.exports = router;
