const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const prismaPaginate = require('../utils/prismaPaginate');
const { isUuid } = require('../utils/ids');
const { formatClient } = require('../utils/legacyApiShape');

async function listClients(companyId, query) {
  const { data, pagination } = await prismaPaginate(
    prisma,
    'client',
    { companyId: String(companyId) },
    query,
    { defaultSort: 'name', orderBy: { name: 'asc' } }
  );
  return { data: data.map(formatClient), pagination };
}

async function getClient(companyId, clientId) {
  if (!isUuid(clientId)) {
    throw new AppError('Client not found', 404);
  }
  const client = await prisma.client.findFirst({
    where: { id: String(clientId), companyId: String(companyId) },
  });
  if (!client) {
    throw new AppError('Client not found', 404);
  }
  return formatClient(client);
}

async function createClient(companyId, data) {
  const client = await prisma.client.create({
    data: {
      companyId: String(companyId),
      name: data.name,
      location: data.location,
      contactInfo: data.contact_info,
      serviceStartDate: data.service_start_date ? new Date(data.service_start_date) : null,
      serviceExpiryDate: data.service_expiry_date ? new Date(data.service_expiry_date) : null,
      quickbooks: data.quickbooks,
      requiredSupplies: data.required_supplies ?? [],
    },
  });
  return formatClient(client);
}

async function updateClient(companyId, clientId, data) {
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.location !== undefined) patch.location = data.location;
  if (data.contact_info !== undefined) patch.contactInfo = data.contact_info;
  if (data.service_start_date !== undefined) {
    patch.serviceStartDate = data.service_start_date ? new Date(data.service_start_date) : null;
  }
  if (data.service_expiry_date !== undefined) {
    patch.serviceExpiryDate = data.service_expiry_date ? new Date(data.service_expiry_date) : null;
  }
  if (data.quickbooks !== undefined) patch.quickbooks = data.quickbooks;
  if (data.required_supplies !== undefined) patch.requiredSupplies = data.required_supplies;

  const existing = await prisma.client.findFirst({
    where: { id: String(clientId), companyId: String(companyId) },
  });
  if (!existing) {
    throw new AppError('Client not found', 404);
  }
  const client = await prisma.client.update({
    where: { id: String(clientId) },
    data: patch,
  });
  return formatClient(client);
}

async function deleteClient(companyId, clientId) {
  const r = await prisma.client.deleteMany({
    where: { id: String(clientId), companyId: String(companyId) },
  });
  if (r.count === 0) {
    throw new AppError('Client not found', 404);
  }
}

async function listCalendarEvents(companyId) {
  const clients = await prisma.client.findMany({
    where: { companyId: String(companyId) },
    select: { id: true, name: true, serviceStartDate: true, serviceExpiryDate: true },
  });

  const events = [];
  for (const c of clients) {
    if (c.serviceStartDate) {
      events.push({
        client_id: c.id,
        client_name: c.name,
        kind: 'service_start',
        date: c.serviceStartDate,
      });
    }
    if (c.serviceExpiryDate) {
      events.push({
        client_id: c.id,
        client_name: c.name,
        kind: 'service_expiry',
        date: c.serviceExpiryDate,
      });
    }
  }
  return events;
}

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  listCalendarEvents,
};
