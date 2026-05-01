const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const prismaPaginate = require('../utils/prismaPaginate');
const { formatSupply, formatLocation } = require('../utils/legacyApiShape');

function toUnitPriceDecimal(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError('unit_price must be a non-negative number', 400);
  }
  const cents = Math.round(n * 100) / 100;
  return new Prisma.Decimal(String(cents));
}

function toOptionalPositiveInt(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError('Quantity fields must be non-negative integers', 400);
  }
  return n;
}

function toOptionalTrimmedString(raw, maxLen) {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  return maxLen ? t.slice(0, maxLen) : t;
}

function applySupplyCatalogPricingFromBody(target, data) {
  if (data.catalog_group !== undefined) {
    target.catalogGroup = toOptionalTrimmedString(data.catalog_group, 120);
  }
  if (data.qty_per_unit !== undefined) {
    target.qtyPerUnit = toOptionalTrimmedString(data.qty_per_unit, 80);
  }
  if (data.case_qty !== undefined) {
    target.caseQty = data.case_qty === null || data.case_qty === '' ? null : toOptionalPositiveInt(data.case_qty);
  }
  if (data.min_order_qty !== undefined) {
    target.minOrderQty =
      data.min_order_qty === null || data.min_order_qty === '' ? null : toOptionalPositiveInt(data.min_order_qty);
  }
  if (data.min_order_unit_price !== undefined) {
    target.minOrderUnitPrice = toUnitPriceDecimal(data.min_order_unit_price);
  }
  if (data.discount_r_qty !== undefined) {
    target.discountRQty =
      data.discount_r_qty === null || data.discount_r_qty === '' ? null : toOptionalPositiveInt(data.discount_r_qty);
  }
  if (data.discount_r_unit_price !== undefined) {
    target.discountRUnitPrice = toUnitPriceDecimal(data.discount_r_unit_price);
  }
  if (data.discount_n_qty !== undefined) {
    target.discountNQty =
      data.discount_n_qty === null || data.discount_n_qty === '' ? null : toOptionalPositiveInt(data.discount_n_qty);
  }
  if (data.discount_n_unit_price !== undefined) {
    target.discountNUnitPrice = toUnitPriceDecimal(data.discount_n_unit_price);
  }
}

async function listSupplies(companyId, query, { includePricing = false } = {}) {
  const { data, pagination } = await prismaPaginate(
    prisma,
    'supply',
    { companyId: String(companyId) },
    query,
    { defaultSort: 'name', orderBy: [{ category: 'asc' }, { name: 'asc' }] }
  );
  return {
    data: data.map((s) => formatSupply(s, { includePricing })),
    pagination,
  };
}

function normalizeCategory(raw) {
  const s = String(raw ?? '').trim();
  return s.length ? s.slice(0, 80) : 'General';
}

async function createSupply(companyId, data) {
  const createData = {
    companyId: String(companyId),
    category: normalizeCategory(data.category),
    name: data.name,
    quantityOnHand: data.quantity_on_hand ?? 0,
    reorderThreshold: data.reorder_threshold ?? 5,
  };
  if (data.unit_price !== undefined) {
    createData.unitPrice = toUnitPriceDecimal(data.unit_price);
  }
  applySupplyCatalogPricingFromBody(createData, data);
  const supply = await prisma.supply.create({ data: createData });
  return formatSupply(supply, { includePricing: true });
}

async function bulkCreateSupplies(companyId, items) {
  const cid = String(companyId);
  const rows = (items || [])
    .map((it) => {
      let unitPrice = null;
      if (it.unit_price !== undefined && it.unit_price !== null && it.unit_price !== '') {
        unitPrice = toUnitPriceDecimal(it.unit_price);
      }
      const row = {
        companyId: cid,
        category: normalizeCategory(it.category),
        name: String(it.name ?? '').trim(),
        quantityOnHand: Math.max(0, Math.floor(Number(it.quantity_on_hand) || 0)),
        reorderThreshold: Math.max(0, Math.floor(Number(it.reorder_threshold) || 5)),
        unitPrice,
      };
      const g = toOptionalTrimmedString(it.catalog_group, 120);
      if (g !== undefined) row.catalogGroup = g;
      const qpu = toOptionalTrimmedString(it.qty_per_unit, 80);
      if (qpu !== undefined) row.qtyPerUnit = qpu;
      if (it.case_qty !== undefined && it.case_qty !== null && it.case_qty !== '') {
        const cq = Math.floor(Number(it.case_qty));
        if (Number.isFinite(cq) && cq >= 0) row.caseQty = cq;
      }
      if (it.min_order_qty !== undefined && it.min_order_qty !== null && it.min_order_qty !== '') {
        const mq = Math.floor(Number(it.min_order_qty));
        if (Number.isFinite(mq) && mq >= 0) row.minOrderQty = mq;
      }
      try {
        if (it.min_order_unit_price !== undefined && it.min_order_unit_price !== null && it.min_order_unit_price !== '') {
          row.minOrderUnitPrice = toUnitPriceDecimal(it.min_order_unit_price);
        }
        if (it.discount_r_qty !== undefined && it.discount_r_qty !== null && it.discount_r_qty !== '') {
          const q = Math.floor(Number(it.discount_r_qty));
          if (Number.isFinite(q) && q >= 0) row.discountRQty = q;
        }
        if (it.discount_r_unit_price !== undefined && it.discount_r_unit_price !== null && it.discount_r_unit_price !== '') {
          row.discountRUnitPrice = toUnitPriceDecimal(it.discount_r_unit_price);
        }
        if (it.discount_n_qty !== undefined && it.discount_n_qty !== null && it.discount_n_qty !== '') {
          const q = Math.floor(Number(it.discount_n_qty));
          if (Number.isFinite(q) && q >= 0) row.discountNQty = q;
        }
        if (it.discount_n_unit_price !== undefined && it.discount_n_unit_price !== null && it.discount_n_unit_price !== '') {
          row.discountNUnitPrice = toUnitPriceDecimal(it.discount_n_unit_price);
        }
      } catch {
        /* skip invalid optional price fields on import */
      }
      return row;
    })
    .filter((r) => r.name.length > 0);

  if (!rows.length) {
    throw new AppError('No valid lines to import (each row needs a name)', 400);
  }

  const result = await prisma.supply.createMany({ data: rows });
  return { created: result.count };
}

async function updateSupply(companyId, supplyId, data) {
  const existing = await prisma.supply.findFirst({
    where: { id: String(supplyId), companyId: String(companyId) },
  });
  if (!existing) {
    throw new AppError('Supply not found', 404);
  }
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.category !== undefined) patch.category = normalizeCategory(data.category);
  if (data.quantity_on_hand !== undefined) patch.quantityOnHand = data.quantity_on_hand;
  if (data.reorder_threshold !== undefined) patch.reorderThreshold = data.reorder_threshold;
  if (data.unit_price !== undefined) patch.unitPrice = toUnitPriceDecimal(data.unit_price);
  applySupplyCatalogPricingFromBody(patch, data);
  const supply = await prisma.supply.update({
    where: { id: String(supplyId) },
    data: patch,
  });
  return formatSupply(supply, { includePricing: true });
}

async function deleteSupply(companyId, supplyId) {
  const r = await prisma.supply.deleteMany({
    where: { id: String(supplyId), companyId: String(companyId) },
  });
  if (r.count === 0) {
    throw new AppError('Supply not found', 404);
  }
}

function resolveLocationClient(loc) {
  const raw = loc.client_id ?? loc.clientId;
  if (raw == null) {
    return { id: null, name: 'Unknown client' };
  }
  if (typeof raw === 'object' && raw._id != null) {
    return { id: raw._id, name: raw.name || 'Unknown client' };
  }
  if (typeof raw === 'object' && raw.id != null) {
    return { id: raw.id, name: raw.name || 'Unknown client' };
  }
  return { id: raw, name: 'Unknown client' };
}

async function getInventoryOverview(companyId, { includePricing = false } = {}) {
  if (companyId == null || companyId === '') {
    throw new AppError('Company context missing', 400);
  }

  const [shopRows, clientDocs, locationDocs] = await Promise.all([
    prisma.supply.findMany({
      where: { companyId: String(companyId) },
      orderBy: [{ catalogGroup: 'asc' }, { name: 'asc' }],
    }),
    prisma.client.findMany({
      where: { companyId: String(companyId) },
      select: { id: true, name: true, requiredSupplies: true },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({
      where: { companyId: String(companyId) },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const shop = shopRows.map((s) => formatSupply(s, { includePricing }));

  const byClientId = new Map();
  for (const c of clientDocs) {
    byClientId.set(String(c.id), {
      client_id: c.id,
      name: c.name || 'Client',
      required_supplies: Array.isArray(c.requiredSupplies) ? c.requiredSupplies : c.requiredSupplies || [],
      stations: [],
    });
  }

  for (const loc of locationDocs) {
    const shaped = formatLocation(loc, { nestClient: true });
    const { id: clientObjectId, name: resolvedClientName } = resolveLocationClient(shaped);
    const cid = clientObjectId != null ? String(clientObjectId) : null;
    if (!cid) {
      const orphanKey = '__unassigned';
      if (!byClientId.has(orphanKey)) {
        byClientId.set(orphanKey, {
          client_id: null,
          name: 'Unassigned locations',
          required_supplies: [],
          stations: [],
        });
      }
      byClientId.get(orphanKey).stations.push({
        _id: shaped._id,
        name: shaped.name || 'Station',
        location_code: shaped.location_code || '',
        address: shaped.address || '',
        station_inventory: shaped.station_inventory || [],
      });
      continue;
    }
    if (!byClientId.has(cid)) {
      byClientId.set(cid, {
        client_id: clientObjectId,
        name: resolvedClientName,
        required_supplies: [],
        stations: [],
      });
    }
    byClientId.get(cid).stations.push({
      _id: shaped._id,
      name: shaped.name || 'Station',
      location_code: shaped.location_code || '',
      address: shaped.address || '',
      station_inventory: shaped.station_inventory || [],
    });
  }

  const clients = Array.from(byClientId.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
  );

  let totalClientLines = 0;
  let totalFeUnits = 0;
  for (const c of clients) {
    for (const st of c.stations) {
      const inv = st.station_inventory || [];
      totalClientLines += inv.length;
      for (const row of inv) {
        if (row.is_fire_extinguisher) {
          totalFeUnits += Number(row.quantity) || 0;
        }
      }
    }
  }

  return {
    shop,
    clients,
    totals: {
      shop_skus: shop.length,
      shop_units: shop.reduce((n, s) => n + (Number(s.quantity_on_hand) || 0), 0),
      client_station_lines: totalClientLines,
      client_fire_extinguisher_units: totalFeUnits,
    },
  };
}

async function getSuppliesForExport(companyId, itemIds, { includePricing = false } = {}) {
  const where = {
    companyId: String(companyId),
  };
  if (Array.isArray(itemIds) && itemIds.length > 0) {
    where.id = { in: itemIds.map((id) => String(id)) };
  }
  const rows = await prisma.supply.findMany({
    where,
    orderBy: [{ catalogGroup: 'asc' }, { name: 'asc' }],
  });
  return rows.map((s) => formatSupply(s, { includePricing }));
}

module.exports = {
  listSupplies,
  getInventoryOverview,
  getSuppliesForExport,
  createSupply,
  bulkCreateSupplies,
  updateSupply,
  deleteSupply,
};
