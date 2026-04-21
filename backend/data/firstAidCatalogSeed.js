/**
 * First aid / AED catalog (highlighted SKUs from master list).
 * Used by seed: shop rows only; quantities start at 0 until you stock counts.
 */

const CAT = {
  ANSI_CAB: 'ANSI glass, metal & plastic cabinets',
  ANSI_REFILL: 'ANSI refill items',
  INDUSTRIAL_CAB: 'Industrial first aid cabinets',
  KITS_EXTRAS: 'First aid kits extras',
  EMERGENCY: 'Emergency kit supplies',
  KIT_REFILL: 'Kit refill packs',
  AED: 'AEDs',
  ADHESIVE: 'Adhesive bandages',
}

/** Spreadsheet section labels (catalog_group) for group rows in the UI. */
const CATALOG_GROUP = {
  [CAT.ANSI_CAB]: 'ANSI 2015 metal cabinets',
  [CAT.ANSI_REFILL]: 'ANSI refill components',
  [CAT.INDUSTRIAL_CAB]: 'Industrial metal cabinets',
  [CAT.KITS_EXTRAS]: 'First aid kit extras',
  [CAT.EMERGENCY]: 'Emergency kit supplies',
  [CAT.KIT_REFILL]: 'Kit refill packs',
  [CAT.AED]: 'AEDs & accessories',
  [CAT.ADHESIVE]: 'Adhesive bandages',
}

function inferQtyPerUnitAndCaseQty(desc) {
  const d = String(desc)
  let m = d.match(/(\d+)\s*\/\s*bx/i)
  if (m) return { qtyPerUnit: `${m[1]}/bx`, caseQty: Number(m[1]) }
  m = d.match(/(\d+)\s*\/\s*pkg/i)
  if (m) return { qtyPerUnit: `${m[1]}/pkg`, caseQty: Number(m[1]) }
  m = d.match(/(\d+)\s*\/\s*pr/i)
  if (m) return { qtyPerUnit: `${m[1]}/pr`, caseQty: Number(m[1]) }
  m = d.match(/(\d+)\s*\/\s*pair/i)
  if (m) return { qtyPerUnit: `${m[1]}/pair`, caseQty: Number(m[1]) }
  m = d.match(/1\s*\/\s*bx/i)
  if (m) return { qtyPerUnit: '1/bx', caseQty: 1 }
  if (/refill/i.test(d) && /kit/i.test(d)) return { qtyPerUnit: '1 kit', caseQty: 1 }
  return { qtyPerUnit: '1 each', caseQty: 1 }
}

/** @type {{ sku: string, desc: string, category: string, unitPrice: string, reorderThreshold: number }[]} */
const LINES = [
  { sku: '90544', desc: 'ANSI 2015 2 Shelf Metal First Aid Cabinet, 15.5 x 10.25 x 4.625', category: CAT.ANSI_CAB, unitPrice: '58.10', reorderThreshold: 1 },
  { sku: '90548', desc: 'ANSI 2015 3 Shelf Metal First Aid Cabinet, 15.125 x 16.125 x 5.625', category: CAT.ANSI_CAB, unitPrice: '84.22', reorderThreshold: 1 },
  { sku: '90550', desc: 'ANSI 2015 4 Shelf Metal First Aid Cabinet, 15.125 x 22.125 x 5.625', category: CAT.ANSI_CAB, unitPrice: '119.82', reorderThreshold: 1 },
  { sku: '90551', desc: 'ANSI 2015 4 Shelf Wide Metal First Aid Cabinet, 21.125 x 15.125 x 5.625', category: CAT.ANSI_CAB, unitPrice: '119.82', reorderThreshold: 1 },
  { sku: '1-002', desc: '1"x3" Plastic Bandages, 16/bx', category: CAT.ANSI_REFILL, unitPrice: '1.72', reorderThreshold: 5 },
  { sku: '1-007', desc: '1"x3" Fabric Bandages, 16/bx', category: CAT.ANSI_REFILL, unitPrice: '2.44', reorderThreshold: 5 },
  { sku: '1-008', desc: 'Fabric Fingertip Bandages, 10/bx', category: CAT.ANSI_REFILL, unitPrice: '3.24', reorderThreshold: 5 },
  { sku: '1-009', desc: 'Fabric Knuckle Bandages, 8/bx', category: CAT.ANSI_REFILL, unitPrice: '3.15', reorderThreshold: 5 },
  { sku: '1-010', desc: 'Large Fingertip Bandages, 10/bx', category: CAT.ANSI_REFILL, unitPrice: '3.41', reorderThreshold: 5 },
  { sku: '1-012', desc: '1"x3" Woven Bandages, 16/bx', category: CAT.ANSI_REFILL, unitPrice: '2.41', reorderThreshold: 5 },
  { sku: '13-006', desc: 'Ammonia Wipes, 10/bx', category: CAT.ANSI_REFILL, unitPrice: '3.58', reorderThreshold: 5 },
  { sku: '90638', desc: '2 Shelf Metal First Aid Cabinet', category: CAT.INDUSTRIAL_CAB, unitPrice: '44.57', reorderThreshold: 1 },
  { sku: '90639', desc: '3 Shelf Metal First Aid Cabinet', category: CAT.INDUSTRIAL_CAB, unitPrice: '68.42', reorderThreshold: 1 },
  { sku: '90640', desc: '4 Shelf Metal First Aid Cabinet', category: CAT.INDUSTRIAL_CAB, unitPrice: '95.34', reorderThreshold: 1 },
  { sku: '90641', desc: '4 Shelf Wide Metal First Aid Cabinet', category: CAT.INDUSTRIAL_CAB, unitPrice: '95.34', reorderThreshold: 1 },
  { sku: '90642', desc: '5 Shelf Metal First Aid Cabinet', category: CAT.INDUSTRIAL_CAB, unitPrice: '140.23', reorderThreshold: 1 },
  { sku: 'FAE-6003', desc: 'CPR Mask and 2 Nitrile Gloves in Zip Bag', category: CAT.KITS_EXTRAS, unitPrice: '11.08', reorderThreshold: 3 },
  { sku: '21-001', desc: 'Cold Pack, 1/bx', category: CAT.EMERGENCY, unitPrice: '1.20', reorderThreshold: 10 },
  { sku: '21-002', desc: 'Cold Pack, 5" x 7"', category: CAT.EMERGENCY, unitPrice: '1.20', reorderThreshold: 10 },
  { sku: '21-011', desc: 'CPR Face Shield, 1/bx', category: CAT.EMERGENCY, unitPrice: '5.07', reorderThreshold: 5 },
  { sku: '21-026', desc: 'CPR Mask', category: CAT.EMERGENCY, unitPrice: '9.42', reorderThreshold: 3 },
  { sku: '336007', desc: 'Blue Nitrile Gloves, Medium, 2/pair', category: CAT.EMERGENCY, unitPrice: '0.80', reorderThreshold: 20 },
  { sku: '336008', desc: 'Blue Nitrile Gloves, Large, 2/pair', category: CAT.EMERGENCY, unitPrice: '0.80', reorderThreshold: 20 },
  { sku: '90656', desc: '25 Person First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '20.94', reorderThreshold: 2 },
  { sku: '90657', desc: '50 Person First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '36.00', reorderThreshold: 2 },
  { sku: '90658', desc: '75 Person First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '57.00', reorderThreshold: 2 },
  { sku: '90659', desc: '100 Person First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '74.50', reorderThreshold: 2 },
  { sku: '90660', desc: '2 Shelf Cabinet First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '146.40', reorderThreshold: 1 },
  { sku: '90661', desc: '3 Shelf Cabinet First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '213.63', reorderThreshold: 1 },
  { sku: '90662', desc: '4 Shelf Cabinet First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '317.02', reorderThreshold: 1 },
  { sku: '90663', desc: '4 Shelf Wide Cabinet First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '317.02', reorderThreshold: 1 },
  { sku: '90664', desc: '5 Shelf Cabinet First Aid Kit Refill', category: CAT.KIT_REFILL, unitPrice: '443.30', reorderThreshold: 1 },
  { sku: '90708', desc: 'ANSI 2015 Class A 25 Person Kit Refill', category: CAT.KIT_REFILL, unitPrice: '22.42', reorderThreshold: 2 },
  { sku: '90709', desc: 'ANSI 2015 Class A 50 Person Kit Refill', category: CAT.KIT_REFILL, unitPrice: '40.52', reorderThreshold: 2 },
  { sku: '90710', desc: 'ANSI 2015 Class B 2 Shelf Cabinet Kit Refill', category: CAT.KIT_REFILL, unitPrice: '171.18', reorderThreshold: 1 },
  { sku: '90711', desc: 'ANSI 2015 Class B 3 Shelf Cabinet Kit Refill', category: CAT.KIT_REFILL, unitPrice: '252.12', reorderThreshold: 1 },
  { sku: '90712', desc: 'ANSI 2015 Class B 4 Shelf Cabinet Kit Refill', category: CAT.KIT_REFILL, unitPrice: '367.65', reorderThreshold: 1 },
  { sku: '90713', desc: 'ANSI 2015 Class B 4 Shelf Wide Cabinet Kit Refill', category: CAT.KIT_REFILL, unitPrice: '367.65', reorderThreshold: 1 },
  { sku: '90714', desc: 'ANSI 2015 Class B 5 Shelf Cabinet Kit Refill', category: CAT.KIT_REFILL, unitPrice: '517.65', reorderThreshold: 1 },
  { sku: '210-00-1101-01', desc: 'ZOLL AED Plus Package with Case & Pads', category: CAT.AED, unitPrice: '1695.00', reorderThreshold: 1 },
  { sku: '210-00-1101-02', desc: 'ZOLL AED Plus Package with Case & Pads', category: CAT.AED, unitPrice: '1695.00', reorderThreshold: 1 },
  { sku: '8000-0807-01', desc: 'ZOLL AED Plus Defibrillator', category: CAT.AED, unitPrice: '1695.00', reorderThreshold: 1 },
  { sku: '8008-0020-01', desc: 'ZOLL AED Plus CPR-D-Padz Electrode with Rescue Accessory Kit and Cover', category: CAT.AED, unitPrice: '169.00', reorderThreshold: 2 },
  { sku: '8000-0838-01', desc: 'ZOLL AED Plus Pedi-padz II Electrodes', category: CAT.AED, unitPrice: '96.00', reorderThreshold: 2 },
  { sku: '110-00-0101-01', desc: 'ZOLL AED Plus Lithium Battery Pack, (10/pkg)', category: CAT.AED, unitPrice: '68.00', reorderThreshold: 2 },
  { sku: '1-001', desc: '3/4"x3" Plastic Bandages, 100/bx', category: CAT.ADHESIVE, unitPrice: '2.44', reorderThreshold: 5 },
]

/**
 * @param {string} companyId
 * @returns {import('@prisma/client').Prisma.SupplyCreateManyInput[]}
 */
function buildSupplySeedRows(companyId) {
  return LINES.map((row) => {
    const { qtyPerUnit, caseQty } = inferQtyPerUnitAndCaseQty(row.desc)
    return {
      companyId,
      catalogGroup: CATALOG_GROUP[row.category] || null,
      name: `[${row.sku}] ${row.desc}`,
      category: row.category,
      quantityOnHand: 0,
      reorderThreshold: row.reorderThreshold,
      unitPrice: row.unitPrice,
      qtyPerUnit,
      caseQty,
      minOrderQty: 1,
      minOrderUnitPrice: row.unitPrice,
      discountRQty: null,
      discountRUnitPrice: null,
      discountNQty: null,
      discountNUnitPrice: null,
    }
  })
}

module.exports = {
  FIRST_AID_CATALOG_LINE_COUNT: LINES.length,
  buildSupplySeedRows,
}
