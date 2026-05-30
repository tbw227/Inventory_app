const express = require('express');
const { getMetricsText, getContentType, isMetricsEnabled } = require('../lib/metrics');

const router = express.Router();

router.get('/', async (req, res, next) => {
  if (!isMetricsEnabled()) {
    return res.status(404).json({ error: 'Metrics disabled' });
  }
  try {
    res.set('Content-Type', getContentType());
    res.end(await getMetricsText());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
