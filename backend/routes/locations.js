const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const locationController = require('../controllers/locationController');

const router = express.Router();

router.get('/', authenticate, locationController.list);
router.get('/:id', authenticate, locationController.get);
router.post('/', authenticate, authorize('admin'), validate(schemas.createLocation), locationController.create);
router.put('/:id', authenticate, authorize('admin'), validate(schemas.updateLocation), locationController.update);
router.delete('/:id', authenticate, authorize('admin'), locationController.remove);

module.exports = router;
