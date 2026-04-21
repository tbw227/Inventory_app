exports.upload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/api/v1/uploads/photos/${req.file.filename}`;
  res.json({ url });
};
