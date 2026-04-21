const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/auth');
const AppError = require('../utils/AppError');
const prismaPaginate = require('../utils/prismaPaginate');
const { isUuid } = require('../utils/ids');
const { formatUserRecord } = require('../utils/legacyApiShape');

function sameCompany(userCompanyId, requestCompanyId) {
  if (userCompanyId == null || requestCompanyId == null) return false;
  return String(userCompanyId) === String(requestCompanyId);
}

async function listUsers(companyId, query) {
  if (!companyId) {
    throw new AppError('Company context missing', 400);
  }
  const { data, pagination } = await prismaPaginate(
    prisma,
    'user',
    { companyId: String(companyId) },
    query,
    {
      defaultSort: 'name',
      orderBy: { name: 'asc' },
      select: {
        id: true,
        companyId: true,
        role: true,
        name: true,
        email: true,
        phone: true,
        photoUrl: true,
        bio: true,
        location: true,
        birthday: true,
        skills: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    }
  );
  const withNames = await Promise.all(
    data.map(async (u) => {
      const companyDoc = await prisma.company.findUnique({
        where: { id: u.companyId },
        select: { name: true },
      });
      return formatUserRecord(u, { company_name: companyDoc?.name || '' });
    })
  );
  return { data: withNames, pagination };
}

async function getUser(companyId, userId) {
  if (!companyId) {
    throw new AppError('Company context missing', 400);
  }
  if (!isUuid(userId)) {
    throw new AppError('User not found', 404);
  }
  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: {
      id: true,
      companyId: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      bio: true,
      location: true,
      birthday: true,
      skills: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user || !sameCompany(user.companyId, companyId)) {
    throw new AppError('User not found', 404);
  }
  const companyDoc = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });
  return formatUserRecord(user, { company_name: companyDoc?.name || '' });
}

async function createUser(companyId, data) {
  const { password, ...userData } = data;

  const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existingUser) {
    throw new AppError('Email already in use', 400);
  }

  const password_hash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      companyId: String(companyId),
      role: userData.role,
      name: userData.name,
      email: userData.email,
      passwordHash: password_hash,
      phone: userData.phone,
      photoUrl: userData.photo_url ?? '',
      bio: userData.bio ?? '',
      location: userData.location ?? '',
      birthday: userData.birthday ?? '',
      skills: userData.skills ?? [],
      preferences: userData.preferences ?? {},
    },
    select: {
      id: true,
      companyId: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      bio: true,
      location: true,
      birthday: true,
      skills: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const companyDoc = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });
  return formatUserRecord(user, { company_name: companyDoc?.name || '' });
}

async function updateUser(companyId, userId, data) {
  const existing = await prisma.user.findFirst({
    where: { id: String(userId), companyId: String(companyId) },
  });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.photo_url !== undefined) updateData.photoUrl = data.photo_url;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.birthday !== undefined) updateData.birthday = data.birthday;
  if (data.skills !== undefined) updateData.skills = data.skills;

  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  if (data.email) {
    const clash = await prisma.user.findFirst({
      where: { email: data.email, id: { not: String(userId) } },
    });
    if (clash) {
      throw new AppError('Email already in use', 400);
    }
    updateData.email = data.email;
  }

  const user = await prisma.user.update({
    where: { id: String(userId) },
    data: updateData,
    select: {
      id: true,
      companyId: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      bio: true,
      location: true,
      birthday: true,
      skills: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const companyDoc = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });
  return formatUserRecord(user, { company_name: companyDoc?.name || '' });
}

async function updateOwnProfile(companyId, userId, data) {
  const allowed = ['name', 'phone', 'photo_url', 'bio', 'location', 'birthday', 'skills'];
  const updateData = {};
  for (const k of allowed) {
    if (data[k] === undefined) continue;
    if (k === 'photo_url') updateData.photoUrl = data.photo_url;
    else updateData[k] = data[k];
  }
  if (data.preferences && typeof data.preferences === 'object') {
    const current = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { preferences: true },
    });
    const base = current?.preferences && typeof current.preferences === 'object' ? current.preferences : {};
    updateData.preferences = { ...base, ...data.preferences };
  }
  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  const existing = await prisma.user.findFirst({
    where: { id: String(userId), companyId: String(companyId) },
  });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  const user = await prisma.user.update({
    where: { id: String(userId) },
    data: updateData,
    select: {
      id: true,
      companyId: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      bio: true,
      location: true,
      birthday: true,
      skills: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const companyDoc = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });
  return formatUserRecord(user, { company_name: companyDoc?.name || '' });
}

async function deleteUser(companyId, userId, requesterId) {
  if (String(userId) === String(requesterId)) {
    throw new AppError('Cannot delete your own account', 400);
  }

  const r = await prisma.user.deleteMany({
    where: { id: String(userId), companyId: String(companyId) },
  });
  if (r.count === 0) {
    throw new AppError('User not found', 404);
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, updateOwnProfile, deleteUser };
