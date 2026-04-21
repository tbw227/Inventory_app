const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const prismaPaginate = require('../utils/prismaPaginate');
const { formatLocation } = require('../utils/legacyApiShape');

async function listLocations(companyId, clientId, query) {
  const filter = { companyId: String(companyId) };
  if (clientId) {
    filter.clientId = String(clientId);
  }
  const { data, pagination } = await prismaPaginate(prisma, 'location', filter, query, {
    defaultSort: 'name',
    orderBy: { name: 'asc' },
    include: { client: { select: { id: true, name: true, location: true } } },
  });
  return {
    data: data.map((l) => formatLocation(l, { nestClient: true })),
    pagination,
  };
}

async function getLocation(companyId, locationId) {
  const location = await prisma.location.findFirst({
    where: { id: String(locationId), companyId: String(companyId) },
    include: {
      client: { select: { id: true, name: true, location: true, contactInfo: true } },
    },
  });
  if (!location) {
    throw new AppError('Location not found', 404);
  }
  return formatLocation(location, { nestClient: true });
}

async function createLocation(companyId, data) {
  const client = await prisma.client.findFirst({
    where: { id: String(data.client_id), companyId: String(companyId) },
  });
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  const location = await prisma.location.create({
    data: {
      companyId: String(companyId),
      clientId: String(data.client_id),
      name: data.name,
      address: data.address ?? '',
      locationCode: data.location_code ?? '',
      stationInventory: data.station_inventory ?? [],
    },
    include: { client: { select: { id: true, name: true, location: true } } },
  });
  return formatLocation(location, { nestClient: true });
}

async function updateLocation(companyId, locationId, data) {
  const existing = await prisma.location.findFirst({
    where: { id: String(locationId), companyId: String(companyId) },
  });
  if (!existing) {
    throw new AppError('Location not found', 404);
  }

  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.address !== undefined) patch.address = data.address;
  if (data.location_code !== undefined) patch.locationCode = data.location_code;
  if (data.station_inventory !== undefined) patch.stationInventory = data.station_inventory;

  const location = await prisma.location.update({
    where: { id: String(locationId) },
    data: patch,
    include: { client: { select: { id: true, name: true, location: true } } },
  });
  return formatLocation(location, { nestClient: true });
}

async function deleteLocation(companyId, locationId) {
  const r = await prisma.location.deleteMany({
    where: { id: String(locationId), companyId: String(companyId) },
  });
  if (r.count === 0) {
    throw new AppError('Location not found', 404);
  }
}

module.exports = { listLocations, getLocation, createLocation, updateLocation, deleteLocation };
