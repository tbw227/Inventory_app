const connectDB = require('./db');
const Company = require('./models/Company');
const User = require('./models/User');
const Client = require('./models/Client');
const Job = require('./models/Job');
const Supply = require('./models/Supply');

require('dotenv').config();

const seedData = async () => {
  await Company.deleteMany();
  await User.deleteMany();
  await Client.deleteMany();
  await Job.deleteMany();
  await Supply.deleteMany();

  const company = await Company.create({
    name: 'SafeCo Services',
    contact_info: 'safe@example.com',
    subscription_tier: 'basic',
  });

  const admin = await User.create({
    company_id: company._id,
    role: 'admin',
    name: 'Alice Admin',
    email: 'alice@example.com',
    password_hash: 'password',
    phone: '555-111-2222',
  });

  const tech = await User.create({
    company_id: company._id,
    role: 'technician',
    name: 'Bob Tech',
    email: 'bob@example.com',
    password_hash: 'password',
    phone: '555-333-4444',
  });

  const client = await Client.create({
    company_id: company._id,
    name: 'Acme Construction',
    location: '123 Main St, Kansas City',
    contact_info: 'contact@acme.com',
  });

  const job = await Job.create({
    company_id: company._id,
    client_id: client._id,
    assigned_user_id: tech._id,
    scheduled_date: new Date(),
  });

  await Supply.create([
    { company_id: company._id, name: 'Bandages', quantity_on_hand: 50, reorder_threshold: 5 },
    { company_id: company._id, name: 'Gauze', quantity_on_hand: 30, reorder_threshold: 5 },
  ]);

  console.log('Seed data inserted');
  process.exit();
};

connectDB().then(seedData).catch(err => console.error(err));