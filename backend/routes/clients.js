const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const clientController = require('../controllers/clientController');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), clientController.list);
/** Two-segment path so this never collides with GET /:id. */
router.get('/meta/calendar-events', authenticate, authorize('admin'), clientController.calendarEvents);
router.get('/:id', authenticate, authorize('admin'), clientController.get);
router.post('/', authenticate, authorize('admin'), validate(schemas.createClient), clientController.create);
router.put('/:id', authenticate, authorize('admin'), validate(schemas.updateClient), clientController.update);
router.delete('/:id', authenticate, authorize('admin'), clientController.remove);

module.exports = router;
