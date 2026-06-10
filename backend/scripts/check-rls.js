require('../loadEnv');
const prisma = require('../lib/prisma');

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `;
  const appTables = [
    'companies', 'users', 'clients', 'locations', 'supplies',
    'supply_import_jobs', 'supply_import_rows', 'quickbooks_connections',
    'jobs', 'job_locations', 'financial_accounts', 'tax_categories',
    'financial_transactions', 'payments', 'audit_events',
  ];
  const missing = [];
  const disabled = [];
  for (const name of appTables) {
    const row = rows.find((r) => r.table_name === name);
    if (!row) missing.push(name);
    else if (!row.rls_enabled) disabled.push(name);
  }
  console.log(JSON.stringify({ appTables: appTables.length, missing, disabled, allPublic: rows }, null, 2));
  if (missing.length || disabled.length) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
