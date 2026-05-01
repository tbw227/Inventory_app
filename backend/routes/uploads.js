const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads', 'photos');

router.get('/photos/:filename', authenticate, (req, res) => {
  const safe = path.basename(String(req.params.filename || ''));
  if (!safe || safe.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const resolved = path.resolve(uploadsDir, safe);
  if (!resolved.startsWith(path.resolve(uploadsDir))) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  fs.access(resolved, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).json({ error: 'Not found' });
    res.set('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
    res.sendFile(resolved);
  });
});

module.exports = router;
