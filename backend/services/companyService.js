const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const { formatCompany } = require('../utils/legacyApiShape');

const PROTECTED_COMPANY_KEYS = new Set([
  'stripe_customer_id',
  'stripe_subscription_id',
  'subscription_status',
  'subscription_current_period_end',
]);

function sanitizeCompanyUpdate(data) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  PROTECTED_COMPANY_KEYS.forEach((k) => {
    delete out[k];
  });
  return out;
}

function patchToPrisma(safe) {
  const patch = {};
  if (safe.name !== undefined) patch.name = safe.name;
  if (safe.contact_info !== undefined) patch.contactInfo = safe.contact_info;
  if (safe.weather_locations !== undefined) patch.weatherLocations = safe.weather_locations;
  if (safe.subscription_tier !== undefined) patch.subscriptionTier = safe.subscription_tier;
  return patch;
}

async function getCompany(companyId) {
  const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
  if (!company) {
    throw new AppError('Company not found', 404);
  }
  return formatCompany(company);
}

async function updateCompany(companyId, data) {
  const safe = sanitizeCompanyUpdate(data);
  const patch = patchToPrisma(safe);
  if (Object.keys(patch).length === 0) {
    return getCompany(companyId);
  }
  try {
    const company = await prisma.company.update({
      where: { id: String(companyId) },
      data: patch,
    });
    return formatCompany(company);
  } catch (e) {
    if (e.code === 'P2025') throw new AppError('Company not found', 404);
    throw e;
  }
}

module.exports = { getCompany, updateCompany };
