const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const supplyController = require('../controllers/supplyController');

const router = express.Router();

router.get('/', authenticate, supplyController.list);
router.get('/overview', authenticate, supplyController.overview);
router.post(
  '/import/preview',
  authenticate,
  authorize('admin'),
  validate(schemas.supplyImportPreview),
  supplyController.importPreview
);
router.post(
  '/import/commit',
  authenticate,
  authorize('admin'),
  validate(schemas.supplyImportCommit),
  supplyController.importCommit
);
router.get(
  '/import/jobs/:jobId',
  authenticate,
  authorize('admin'),
  supplyController.importJobStatus
);
router.post('/', authenticate, authorize('admin'), validate(schemas.createSupply), supplyController.create);
router.put('/:id', authenticate, authorize('admin'), validate(schemas.updateSupply), supplyController.update);
router.delete('/:id', authenticate, authorize('admin'), supplyController.remove);

module.exports = router;
