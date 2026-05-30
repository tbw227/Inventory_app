const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), userController.list);
router.get('/me', authenticate, userController.getMe);
router.get('/me/revenue', authenticate, userController.getMyRevenue);
router.put('/me', authenticate, validate(schemas.updateOwnProfile), userController.updateMe);
router.put(
  '/me/vehicle-inventory',
  authenticate,
  authorize('admin', 'technician'),
  validate(schemas.updateVehicleInventory),
  userController.updateMyVehicleInventory
);
router.put(
  '/:id/vehicle-inventory',
  authenticate,
  authorize('admin'),
  validate(schemas.updateVehicleInventory),
  userController.updateVehicleInventory
);
router.get('/:id/revenue', authenticate, authorize('admin'), userController.getUserRevenue);
router.get('/:id', authenticate, authorize('admin'), userController.get);
router.post('/', authenticate, authorize('admin'), validate(schemas.createUser), userController.create);
router.put('/:id', authenticate, authorize('admin'), validate(schemas.updateUser), userController.update);
router.delete('/:id', authenticate, authorize('admin'), userController.remove);

module.exports = router;
