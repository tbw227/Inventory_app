require('./loadEnv');

const connectDB = require('./db');
const prisma = require('./lib/prisma');
const { hashPassword } = require('./utils/auth');
const { buildSupplySeedRows, FIRST_AID_CATALOG_LINE_COUNT } = require('./data/firstAidCatalogSeed');

const seedData = async () => {
  await prisma.payment.deleteMany();
  await prisma.jobLocation.deleteMany();
  await prisma.job.deleteMany();
  await prisma.supply.deleteMany();
  await prisma.location.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: 'SafeCo Services',
      contactInfo: 'safe@example.com',
      subscriptionTier: 'basic',
      subscriptionStatus: 'active',
    },
  });

  const adminHash = await hashPassword('Admin123!');
  const techHash = await hashPassword('Tech123!');

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      role: 'admin',
      name: 'Alice Admin',
      email: 'alice@example.com',
      passwordHash: adminHash,
      phone: '555-111-2222',
      bio: 'Operations lead for inspections and compliance.',
      location: 'Kansas City, MO',
      birthday: 'March 15',
      skills: ['Scheduling', 'Compliance', 'Team leadership'],
    },
  });

  const tech = await prisma.user.create({
    data: {
      companyId: company.id,
      role: 'technician',
      name: 'Bob Tech',
      email: 'bob@example.com',
      passwordHash: techHash,
      phone: '555-333-4444',
      bio: 'Field technician — extinguishers, inspections, and inventory.',
      location: 'Kansas City, MO',
      birthday: 'July 8',
      skills: ['NFPA 10', 'Barcode scan', 'Service reports'],
    },
  });

  const svcStart = new Date();
  svcStart.setMonth(svcStart.getMonth() - 2);
  const svcEnd = new Date();
  svcEnd.setFullYear(svcEnd.getFullYear() + 1);

  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Acme Construction',
      location: '123 Main St, Kansas City',
      contactInfo: 'contact@acme.com',
      serviceStartDate: svcStart,
      serviceExpiryDate: svcEnd,
      quickbooks: {
        customer_id: '62',
        display_name: 'Acme Construction',
        notes: 'Example QuickBooks customer link (sample IDs only).',
        sync_enabled: false,
      },
    },
  });

  const siteStation = await prisma.location.create({
    data: {
      companyId: company.id,
      clientId: client.id,
      name: 'Main jobsite — north yard',
      address: 'Gate B, 123 Main St',
      locationCode: 'ACME-NY-01',
      stationInventory: [],
    },
  });

  await prisma.job.create({
    data: {
      companyId: company.id,
      clientId: client.id,
      assignedUserId: tech.id,
      description: 'Monthly safety inspection',
      scheduledDate: new Date(),
      locationId: siteStation.id,
      jobLocations: {
        create: [{ locationId: siteStation.id }],
      },
    },
  });

  const supplyRows = buildSupplySeedRows(company.id);
  await prisma.supply.createMany({ data: supplyRows });

  console.log('Seed data inserted');
  console.log(`  Shop catalog: ${FIRST_AID_CATALOG_LINE_COUNT} supplies (on-hand starts at 0; station inventory cleared)`);
  console.log('  Admin: alice@example.com / Admin123!');
  console.log('  Tech:  bob@example.com / Tech123!');
  process.exit();
};

connectDB()
  .then(seedData)
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
