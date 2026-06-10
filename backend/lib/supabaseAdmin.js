const { createClient } = require('@supabase/supabase-js');

let client = null;

function isSupabaseStorageConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return typeof url === 'string' && url.length > 0 && typeof key === 'string' && key.length > 0;
}

function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'photos';
}

function getSupabaseAdmin() {
  if (!isSupabaseStorageConfigured()) return null;
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function ensurePhotosBucket() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const bucket = getStorageBucket();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.warn(`Supabase Storage: list buckets failed — ${listError.message}`);
    return;
  }

  if (buckets.some((b) => b.id === bucket || b.name === bucket)) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/gif'],
  });

  if (createError) {
    console.warn(`Supabase Storage: create bucket "${bucket}" failed — ${createError.message}`);
    return;
  }

  console.log(`Supabase Storage: bucket "${bucket}" ready`);
}

module.exports = {
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
  getStorageBucket,
  ensurePhotosBucket,
};
