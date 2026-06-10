const { buildPhotoUrl } = require('../utils/tenantPhotos');

exports.upload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = buildPhotoUrl(req.user.company_id, req.file.filename);
  res.json({ url });
};
