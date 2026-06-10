const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { isUuid } = require('./ids');

const PHOTOS_ROOT = path.join(__dirname, '..', 'uploads', 'photos');

function ensurePhotosRoot() {
  if (!fs.existsSync(PHOTOS_ROOT)) {
    fs.mkdirSync(PHOTOS_ROOT, { recursive: true });
  }
}

function ensureCompanyPhotosDir(companyId) {
  ensurePhotosRoot();
  const dir = companyPhotosDir(companyId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function companyPhotosDir(companyId) {
  return path.join(PHOTOS_ROOT, String(companyId));
}

function safeBasename(filename) {
  const raw = String(filename || '');
  if (!raw || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
    return null;
  }
  const safe = path.basename(raw);
  if (!safe || safe !== raw) return null;
  return safe;
}

function buildPhotoUrl(companyId, filename) {
  return `/api/v1/uploads/photos/${companyId}/${filename}`;
}

function storageObjectKey(companyId, filename) {
  const safe = safeBasename(filename);
  if (!safe || !isUuid(companyId)) return null;
  return `${companyId}/${safe}`;
}

function resolvePathWithinRoot(rootDir, filename) {
  const safe = safeBasename(filename);
  if (!safe) return null;
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, safe);
  if (path.dirname(resolved) !== root) return null;
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

function resolveTenantPhotoPath(companyId, filename) {
  if (!isUuid(companyId)) return null;
  return resolvePathWithinRoot(companyPhotosDir(companyId), filename);
}

function resolveLegacyPhotoPath(filename) {
  return resolvePathWithinRoot(PHOTOS_ROOT, filename);
}

async function companyOwnsLegacyPhoto(companyId, filename) {
  const safe = safeBasename(filename);
  if (!safe || !isUuid(companyId)) return false;

  const pattern = `%${safe}%`;
  const cid = String(companyId);

  const rows = await prisma.$queryRaw`
    SELECT 1 AS ok
    WHERE EXISTS (
      SELECT 1 FROM jobs
      WHERE company_id = ${cid}::uuid
        AND EXISTS (
          SELECT 1 FROM unnest(photos) AS photo_url
          WHERE photo_url LIKE ${pattern}
        )
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE company_id = ${cid}::uuid
        AND photo_url LIKE ${pattern}
    )
    LIMIT 1
  `;

  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  PHOTOS_ROOT,
  ensurePhotosRoot,
  ensureCompanyPhotosDir,
  buildPhotoUrl,
  storageObjectKey,
  resolveTenantPhotoPath,
  resolveLegacyPhotoPath,
  companyOwnsLegacyPhoto,
  safeBasename,
};
