/**
 * Financial transaction service — CRUD for income/expense transactions,
 * QuickBooks sync (chart of accounts, invoices, purchases), and
 * tax summary reporting.
 */
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const qbIntegration = require('./quickbooksIntegrationService');

const DEFAULT_TAX_CATEGORIES = [
  { name: 'Vehicle Expenses', irsCode: 'Sch-C-9', description: 'Gas, mileage, maintenance, insurance for business vehicles' },
  { name: 'Supplies & Materials', irsCode: 'Sch-C-22', description: 'Office supplies, inventory, first aid supplies' },
  { name: 'Insurance', irsCode: 'Sch-C-15', description: 'Business liability, workers comp, health insurance' },
  { name: 'Rent & Lease', irsCode: 'Sch-C-20b', description: 'Office/warehouse rent, equipment leases' },
  { name: 'Utilities', irsCode: 'Sch-C-25', description: 'Electricity, water, internet, phone' },
  { name: 'Advertising & Marketing', irsCode: 'Sch-C-8', description: 'Ads, website, business cards, promo materials' },
  { name: 'Contract Labor', irsCode: 'Sch-C-11', description: 'Subcontractors, freelance help (1099)' },
  { name: 'Employee Wages', irsCode: 'Sch-C-26', description: 'Salaries, wages, bonuses' },
  { name: 'Professional Services', irsCode: 'Sch-C-17', description: 'Accountant, lawyer, consulting fees' },
  { name: 'Travel & Meals', irsCode: 'Sch-C-24a', description: 'Business travel, lodging, 50% meals deduction' },
  { name: 'Equipment & Depreciation', irsCode: 'Sch-C-13', description: 'Tools, machinery, Section 179 deductions' },
  { name: 'Software & Subscriptions', irsCode: 'Sch-C-27a', description: 'SaaS tools, software licenses, cloud services' },
  { name: 'Taxes & Licenses', irsCode: 'Sch-C-23', description: 'Business licenses, state taxes, permits' },
  { name: 'Other Expenses', irsCode: 'Sch-C-27a', description: 'Miscellaneous business expenses' },
];

async function ensureDefaultTaxCategories(companyId) {
  const cid = String(companyId);
  const existing = await prisma.taxCategory.count({ where: { companyId: cid } });
  if (existing > 0) return;

  await prisma.taxCategory.createMany({
    data: DEFAULT_TAX_CATEGORIES.map((cat) => ({
      companyId: cid,
      name: cat.name,
      irsCode: cat.irsCode,
      description: cat.description,
    })),
  });
}

// ─── Tax Categories ───────────────────────────────────────────

async function listTaxCategories(companyId) {
  await ensureDefaultTaxCategories(companyId);
  return prisma.taxCategory.findMany({
    where: { companyId: String(companyId) },
    orderBy: { name: 'asc' },
  });
}

// ─── Financial Accounts ───────────────────────────────────────

async function listAccounts(companyId) {
  return prisma.financialAccount.findMany({
    where: { companyId: String(companyId), active: true },
    orderBy: { name: 'asc' },
  });
}

// ─── Transactions CRUD ────────────────────────────────────────

async function listTransactions(companyId, query = {}) {
  const cid = String(companyId);
  const where = { companyId: cid };

  if (query.type) where.type = query.type;
  if (query.taxDeductible === 'true') where.taxDeductible = true;
  if (query.taxCategoryId) where.taxCategoryId = query.taxCategoryId;
  if (query.accountId) where.accountId = query.accountId;

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) where.date.lte = new Date(query.endDate);
  }

  if (query.year) {
    const yr = Number(query.year);
    where.date = { gte: new Date(`${yr}-01-01`), lte: new Date(`${yr}-12-31`) };
  }

  return prisma.financialTransaction.findMany({
    where,
    include: {
      account: { select: { id: true, name: true, accountType: true } },
      taxCategory: { select: { id: true, name: true, irsCode: true } },
    },
    orderBy: { date: 'desc' },
    take: Number(query.limit) || 500,
  });
}

async function createTransaction(companyId, data) {
  return prisma.financialTransaction.create({
    data: {
      companyId: String(companyId),
      type: data.type,
      date: new Date(data.date),
      amount: data.amount,
      description: data.description || '',
      vendor: data.vendor || '',
      accountId: data.account_id || null,
      taxCategoryId: data.tax_category_id || null,
      taxDeductible: data.tax_deductible ?? false,
      receiptUrl: data.receipt_url || null,
      notes: data.notes || '',
    },
    include: {
      account: { select: { id: true, name: true, accountType: true } },
      taxCategory: { select: { id: true, name: true, irsCode: true } },
    },
  });
}

async function updateTransaction(companyId, txnId, data) {
  const existing = await prisma.financialTransaction.findFirst({
    where: { id: String(txnId), companyId: String(companyId) },
  });
  if (!existing) throw new AppError('Transaction not found', 404);

  const patch = {};
  if (data.type !== undefined) patch.type = data.type;
  if (data.date !== undefined) patch.date = new Date(data.date);
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.description !== undefined) patch.description = data.description;
  if (data.vendor !== undefined) patch.vendor = data.vendor;
  if (data.account_id !== undefined) patch.accountId = data.account_id || null;
  if (data.tax_category_id !== undefined) patch.taxCategoryId = data.tax_category_id || null;
  if (data.tax_deductible !== undefined) patch.taxDeductible = data.tax_deductible;
  if (data.receipt_url !== undefined) patch.receiptUrl = data.receipt_url || null;
  if (data.notes !== undefined) patch.notes = data.notes;

  return prisma.financialTransaction.update({
    where: { id: String(txnId) },
    data: patch,
    include: {
      account: { select: { id: true, name: true, accountType: true } },
      taxCategory: { select: { id: true, name: true, irsCode: true } },
    },
  });
}

async function deleteTransaction(companyId, txnId) {
  const r = await prisma.financialTransaction.deleteMany({
    where: { id: String(txnId), companyId: String(companyId) },
  });
  if (r.count === 0) throw new AppError('Transaction not found', 404);
}

// ─── Tax Summary ──────────────────────────────────────────────

async function getTaxSummary(companyId, year) {
  const cid = String(companyId);
  const yr = Number(year) || new Date().getFullYear();
  const startDate = new Date(`${yr}-01-01`);
  const endDate = new Date(`${yr}-12-31`);

  const [income, expenses, deductible, byCategory] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { companyId: cid, type: 'income', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialTransaction.aggregate({
      where: { companyId: cid, type: 'expense', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialTransaction.aggregate({
      where: { companyId: cid, type: 'expense', taxDeductible: true, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financialTransaction.groupBy({
      by: ['taxCategoryId'],
      where: { companyId: cid, type: 'expense', taxDeductible: true, date: { gte: startDate, lte: endDate }, taxCategoryId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const taxCatIds = byCategory.map((g) => g.taxCategoryId).filter(Boolean);
  const taxCats = taxCatIds.length
    ? await prisma.taxCategory.findMany({ where: { id: { in: taxCatIds } }, select: { id: true, name: true, irsCode: true } })
    : [];
  const catMap = new Map(taxCats.map((c) => [c.id, c]));

  return {
    year: yr,
    total_income: Number(income._sum.amount) || 0,
    income_count: income._count,
    total_expenses: Number(expenses._sum.amount) || 0,
    expense_count: expenses._count,
    total_deductible: Number(deductible._sum.amount) || 0,
    deductible_count: deductible._count,
    net_profit: (Number(income._sum.amount) || 0) - (Number(expenses._sum.amount) || 0),
    deductions_by_category: byCategory.map((g) => {
      const cat = catMap.get(g.taxCategoryId);
      return {
        tax_category_id: g.taxCategoryId,
        name: cat?.name || 'Unknown',
        irs_code: cat?.irsCode || '',
        total: Number(g._sum.amount) || 0,
        count: g._count,
      };
    }).sort((a, b) => b.total - a.total),
  };
}

// ─── QuickBooks Sync ──────────────────────────────────────────

async function syncFromQuickBooks(companyId) {
  const conn = await qbIntegration.getValidConnection(companyId);
  if (!conn) throw new AppError('QuickBooks is not connected', 400);

  const cid = String(companyId);
  const results = { accounts: 0, income: 0, expenses: 0, errors: [] };

  try {
    const acctData = await qbIntegration.runQuery(conn, "SELECT * FROM Account WHERE Active = true MAXRESULTS 200");
    const accounts = acctData?.QueryResponse?.Account || [];
    for (const acct of accounts) {
      await prisma.financialAccount.upsert({
        where: { financial_accounts_company_qbo_uniq: { companyId: cid, qboId: String(acct.Id) } },
        create: {
          companyId: cid,
          name: acct.FullyQualifiedName || acct.Name || 'Unnamed',
          accountType: acct.AccountType || 'Other',
          qboId: String(acct.Id),
        },
        update: {
          name: acct.FullyQualifiedName || acct.Name || 'Unnamed',
          accountType: acct.AccountType || 'Other',
          active: acct.Active !== false,
        },
      });
      results.accounts++;
    }
  } catch (err) {
    results.errors.push(`Accounts: ${err.message}`);
  }

  try {
    const invData = await qbIntegration.runQuery(conn, "SELECT * FROM Invoice MAXRESULTS 500");
    const invoices = invData?.QueryResponse?.Invoice || [];
    for (const inv of invoices) {
      const total = Number(inv.TotalAmt) || 0;
      if (total <= 0) continue;
      await prisma.financialTransaction.upsert({
        where: { fin_txns_company_qbo_uniq: { companyId: cid, qboId: String(inv.Id), qboType: 'Invoice' } },
        create: {
          companyId: cid,
          type: 'income',
          date: new Date(inv.TxnDate || inv.MetaData?.CreateTime || new Date()),
          amount: total,
          description: inv.CustomerMemo?.value || `Invoice #${inv.DocNumber || inv.Id}`,
          vendor: inv.CustomerRef?.name || '',
          qboId: String(inv.Id),
          qboType: 'Invoice',
        },
        update: {
          amount: total,
          description: inv.CustomerMemo?.value || `Invoice #${inv.DocNumber || inv.Id}`,
          vendor: inv.CustomerRef?.name || '',
          date: new Date(inv.TxnDate || inv.MetaData?.CreateTime || new Date()),
        },
      });
      results.income++;
    }
  } catch (err) {
    results.errors.push(`Invoices: ${err.message}`);
  }

  try {
    const purchData = await qbIntegration.runQuery(conn, "SELECT * FROM Purchase MAXRESULTS 500");
    const purchases = purchData?.QueryResponse?.Purchase || [];
    for (const p of purchases) {
      const total = Number(p.TotalAmt) || 0;
      if (total <= 0) continue;

      let accountId = null;
      if (p.AccountRef?.value) {
        const acct = await prisma.financialAccount.findFirst({
          where: { companyId: cid, qboId: String(p.AccountRef.value) },
          select: { id: true },
        });
        if (acct) accountId = acct.id;
      }

      await prisma.financialTransaction.upsert({
        where: { fin_txns_company_qbo_uniq: { companyId: cid, qboId: String(p.Id), qboType: 'Purchase' } },
        create: {
          companyId: cid,
          type: 'expense',
          date: new Date(p.TxnDate || p.MetaData?.CreateTime || new Date()),
          amount: total,
          description: p.PrivateNote || `Purchase ${p.Id}`,
          vendor: p.EntityRef?.name || '',
          accountId,
          taxDeductible: true,
          qboId: String(p.Id),
          qboType: 'Purchase',
        },
        update: {
          amount: total,
          description: p.PrivateNote || `Purchase ${p.Id}`,
          vendor: p.EntityRef?.name || '',
          date: new Date(p.TxnDate || p.MetaData?.CreateTime || new Date()),
          accountId,
        },
      });
      results.expenses++;
    }
  } catch (err) {
    results.errors.push(`Purchases: ${err.message}`);
  }

  try {
    const billData = await qbIntegration.runQuery(conn, "SELECT * FROM Bill MAXRESULTS 500");
    const bills = billData?.QueryResponse?.Bill || [];
    for (const b of bills) {
      const total = Number(b.TotalAmt) || 0;
      if (total <= 0) continue;

      await prisma.financialTransaction.upsert({
        where: { fin_txns_company_qbo_uniq: { companyId: cid, qboId: String(b.Id), qboType: 'Bill' } },
        create: {
          companyId: cid,
          type: 'expense',
          date: new Date(b.TxnDate || b.MetaData?.CreateTime || new Date()),
          amount: total,
          description: b.PrivateNote || `Bill from ${b.VendorRef?.name || 'vendor'}`,
          vendor: b.VendorRef?.name || '',
          taxDeductible: true,
          qboId: String(b.Id),
          qboType: 'Bill',
        },
        update: {
          amount: total,
          description: b.PrivateNote || `Bill from ${b.VendorRef?.name || 'vendor'}`,
          vendor: b.VendorRef?.name || '',
          date: new Date(b.TxnDate || b.MetaData?.CreateTime || new Date()),
        },
      });
      results.expenses++;
    }
  } catch (err) {
    results.errors.push(`Bills: ${err.message}`);
  }

  return results;
}

module.exports = {
  listTaxCategories,
  listAccounts,
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTaxSummary,
  syncFromQuickBooks,
  ensureDefaultTaxCategories,
};
