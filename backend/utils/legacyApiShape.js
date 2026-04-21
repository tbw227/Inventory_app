function formatCompany(c) {
  if (!c) return c;
  return {
    _id: c.id,
    name: c.name,
    contact_info: c.contactInfo ?? null,
    weather_locations: Array.isArray(c.weatherLocations) ? c.weatherLocations : c.weatherLocations || [],
    subscription_tier: c.subscriptionTier,
    subscription_status: c.subscriptionStatus,
    stripe_customer_id: c.stripeCustomerId,
    stripe_subscription_id: c.stripeSubscriptionId,
    subscription_current_period_end: c.subscriptionCurrentPeriodEnd,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function formatClient(c) {
  if (!c) return c;
  return {
    _id: c.id,
    company_id: c.companyId,
    name: c.name,
    location: c.location,
    contact_info: c.contactInfo ?? null,
    service_start_date: c.serviceStartDate,
    service_expiry_date: c.serviceExpiryDate,
    quickbooks: c.quickbooks ?? undefined,
    required_supplies: Array.isArray(c.requiredSupplies) ? c.requiredSupplies : c.requiredSupplies || [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function formatClientBrief(c) {
  if (!c) return c;
  return {
    _id: c.id,
    name: c.name,
    location: c.location,
    service_start_date: c.serviceStartDate,
    service_expiry_date: c.serviceExpiryDate,
  };
}

function formatLocation(l, { nestClient = false } = {}) {
  if (!l) return l;
  return {
    _id: l.id,
    company_id: l.companyId,
    client_id: nestClient && l.client ? formatClient(l.client) : l.clientId,
    name: l.name,
    address: l.address,
    location_code: l.locationCode,
    station_inventory: Array.isArray(l.stationInventory) ? l.stationInventory : l.stationInventory || [],
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

function formatUserShort(u) {
  if (!u) return u;
  return { _id: u.id, name: u.name, email: u.email };
}

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatSupply(s, { includePricing = false } = {}) {
  if (!s) return s;
  const base = {
    _id: s.id,
    company_id: s.companyId,
    category: s.category || 'General',
    catalog_group: s.catalogGroup != null && String(s.catalogGroup).trim() !== '' ? String(s.catalogGroup).trim() : null,
    name: s.name,
    quantity_on_hand: s.quantityOnHand,
    reorder_threshold: s.reorderThreshold,
    qty_per_unit: s.qtyPerUnit != null && String(s.qtyPerUnit).trim() !== '' ? String(s.qtyPerUnit).trim() : null,
    case_qty: s.caseQty != null ? Number(s.caseQty) : null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
  if (includePricing) {
    base.unit_price =
      s.unitPrice != null && s.unitPrice !== '' ? Number(s.unitPrice) : null;
    base.min_order_qty = s.minOrderQty != null ? Number(s.minOrderQty) : null;
    base.min_order_unit_price = numOrNull(s.minOrderUnitPrice);
    base.discount_r_qty = s.discountRQty != null ? Number(s.discountRQty) : null;
    base.discount_r_unit_price = numOrNull(s.discountRUnitPrice);
    base.discount_n_qty = s.discountNQty != null ? Number(s.discountNQty) : null;
    base.discount_n_unit_price = numOrNull(s.discountNUnitPrice);
  }
  return base;
}

function formatUserRecord(u, extra = {}) {
  if (!u) return u;
  return {
    _id: u.id,
    company_id: u.companyId,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? '',
    photo_url: u.photoUrl ?? '',
    bio: u.bio ?? '',
    location: u.location ?? '',
    birthday: u.birthday ?? '',
    skills: Array.isArray(u.skills) ? u.skills : [],
    preferences: u.preferences && typeof u.preferences === 'object' ? u.preferences : {},
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    ...extra,
  };
}

function formatPayment(p) {
  if (!p) return p;
  return {
    _id: p.id,
    company_id: p.companyId,
    job_id: p.jobId,
    technician_id: p.technician ? formatUserShort(p.technician) : p.technicianId,
    amount: p.amount,
    currency: p.currency,
    stripe_payment_intent_id: p.stripePaymentIntentId,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

module.exports = {
  formatCompany,
  formatClient,
  formatClientBrief,
  formatLocation,
  formatUserShort,
  formatSupply,
  formatUserRecord,
  formatPayment,
};
