const fs = require('fs');
const path = require('path');
const {
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
  getStorageBucket,
} = require('../lib/supabaseAdmin');
const {
  ensureCompanyPhotosDir,
  resolveTenantPhotoPath,
  resolveLegacyPhotoPath,
  storageObjectKey,
} = require('../utils/tenantPhotos');

async function uploadTenantPhoto(companyId, filename, buffer, contentType = 'image/webp') {
  const key = storageObjectKey(companyId, filename);
  if (!key) {
    throw new Error('Invalid photo path');
  }

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(getStorageBucket()).upload(key, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      throw new Error(error.message);
    }
    return { storage: 'supabase', key };
  }

  const companyDir = ensureCompanyPhotosDir(companyId);
  const targetPath = path.join(companyDir, filename);
  await fs.promises.writeFile(targetPath, buffer);
  return { storage: 'local', path: targetPath };
}

async function readLocalFile(filePath, contentType = 'image/webp') {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    const buffer = await fs.promises.readFile(filePath);
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function downloadTenantPhoto(companyId, filename) {
  const key = storageObjectKey(companyId, filename);
  if (!key) return null;

  if (isSupabaseStorageConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(getStorageBucket()).download(key);
    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer());
      return { buffer, contentType: data.type || 'image/webp' };
    }
  }

  const localPath = resolveTenantPhotoPath(companyId, filename);
  if (!localPath) return null;
  return readLocalFile(localPath);
}

async function localLegacyPhotoExists(filename) {
  const legacyPath = resolveLegacyPhotoPath(filename);
  if (!legacyPath) return false;
  try {
    await fs.promises.access(legacyPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadLegacyPhoto(filename) {
  const legacyPath = resolveLegacyPhotoPath(filename);
  if (!legacyPath) return null;
  return readLocalFile(legacyPath);
}

module.exports = {
  uploadTenantPhoto,
  downloadTenantPhoto,
  downloadLegacyPhoto,
  localLegacyPhotoExists,
};
