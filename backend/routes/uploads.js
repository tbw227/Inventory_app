const express = require('express');
const { authenticate } = require('../middleware/auth');
const { companyOwnsLegacyPhoto } = require('../utils/tenantPhotos');
const {
  downloadTenantPhoto,
  downloadLegacyPhoto,
  localLegacyPhotoExists,
} = require('../services/photoStorageService');

const router = express.Router();

function sendPhotoBuffer(res, { buffer, contentType }) {
  res.set('Cache-Control', 'private, max-age=86400, stale-while-revalidate=604800');
  res.set('Content-Type', contentType || 'image/webp');
  res.send(buffer);
}

router.get('/photos/:companyId/:filename', authenticate, async (req, res) => {
  const companyId = String(req.params.companyId || '');
  if (companyId !== String(req.user.company_id)) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const photo = await downloadTenantPhoto(companyId, req.params.filename);
    if (!photo) {
      return res.status(404).json({ error: 'Not found' });
    }
    sendPhotoBuffer(res, photo);
  } catch {
    res.status(500).json({ error: 'Failed to load photo' });
  }
});

router.get('/photos/:filename', authenticate, async (req, res) => {
  const companyId = String(req.user.company_id);
  const { filename } = req.params;

  try {
    const tenantPhoto = await downloadTenantPhoto(companyId, filename);
    if (tenantPhoto) {
      return sendPhotoBuffer(res, tenantPhoto);
    }

    if (!(await localLegacyPhotoExists(filename))) {
      return res.status(404).json({ error: 'Not found' });
    }

    const allowed = await companyOwnsLegacyPhoto(companyId, filename);
    if (!allowed) {
      return res.status(404).json({ error: 'Not found' });
    }

    const legacyPhoto = await downloadLegacyPhoto(filename);
    if (!legacyPhoto) {
      return res.status(404).json({ error: 'Not found' });
    }
    sendPhotoBuffer(res, legacyPhoto);
  } catch {
    res.status(500).json({ error: 'Failed to load photo' });
  }
});

module.exports = router;
