const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { authenticate } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads', 'photos');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files (jpeg, png, gif, webp) are allowed'));
  },
});

async function optimizeUploadedImage(req, _res, next) {
  if (!req.file?.buffer) return next();

  try {
    const sourceBuffer = req.file.buffer;
    const image = sharp(sourceBuffer, { animated: true });
    const metadata = await image.metadata();
    const longestEdge = Math.max(metadata.width || 0, metadata.height || 0);
    const alreadyOptimizedWebp =
      req.file.mimetype === 'image/webp' && sourceBuffer.length <= 200 * 1024 && longestEdge <= 1600;

    const finalBuffer = alreadyOptimizedWebp
      ? sourceBuffer
      : await sharp(sourceBuffer, { animated: true })
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
    const targetPath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(targetPath, finalBuffer);

    req.file.filename = filename;
    req.file.path = targetPath;
    req.file.size = finalBuffer.length;
    req.file.mimetype = 'image/webp';
  } catch (err) {
    next(err);
    return;
  }

  next();
}

router.post('/', authenticate, upload.single('photo'), optimizeUploadedImage, uploadController.upload);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }
  }
  next(err);
});

module.exports = router;
