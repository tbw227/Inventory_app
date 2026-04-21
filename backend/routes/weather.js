const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const weatherController = require('../controllers/weatherController');

router.get('/forecast', authenticate, weatherController.forecast);
router.get('/locations', authenticate, weatherController.locations);
router.get('/twc', authenticate, weatherController.twc);
router.get('/extras', authenticate, weatherController.extras);

module.exports = router;
