const crypto = require('crypto');
const { clerkClient } = require('@clerk/express');
const prisma = require('../lib/prisma');
const { hashPassword } = require('../utils/auth');
const AppError = require('../utils/AppError');
const { getProfile } = require('./authService');

async function fetchClerkPrimaryEmail(clerkUserId) {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primary =
    clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId) ||
    clerkUser.emailAddresses?.[0];
  const email = primary?.emailAddress?.trim().toLowerCase();
  if (!email) {
    throw new AppError('Clerk account has no email address', 400);
  }
  return { email, clerkUser };
}

async function resolveUserFromClerkId(clerkUserId) {
  let user = await prisma.user.findFirst({
    where: { clerkUserId },
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
    },
  });
  if (user) return user;

  const { email } = await fetchClerkPrimaryEmail(clerkUserId);
  const byEmail = await prisma.user.findUnique({
    where: { email },
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
      clerkUserId: true,
    },
  });

  if (!byEmail) return null;

  if (!byEmail.clerkUserId) {
    user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkUserId },
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
      },
    });
    return user;
  }

  return byEmail;
}

async function provisionClerkTenant(clerkUserId, { companyName, name }) {
  const existing = await prisma.user.findFirst({ where: { clerkUserId } });
  if (existing) {
    throw new AppError('Clerk account is already linked to a company', 409);
  }

  const { email, clerkUser } = await fetchClerkPrimaryEmail(clerkUserId);
  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) {
    throw new AppError('An account with that email already exists. Sign in with email and password.', 409);
  }

  const displayName =
    (name && String(name).trim()) ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() ||
    email.split('@')[0];

  const unusablePassword = crypto.randomBytes(32).toString('hex');

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName.trim() },
    });
    const user = await tx.user.create({
      data: {
        companyId: company.id,
        role: 'admin',
        name: displayName,
        email,
        passwordHash: await hashPassword(unusablePassword),
        clerkUserId,
      },
    });
    return { company, user };
  });

  return getProfile({
    ...result.user,
    company_name: result.company.name,
    subscription_status: 'active',
    subscription_tier: 'basic',
    subscription_current_period_end: null,
  });
}

module.exports = {
  resolveUserFromClerkId,
  provisionClerkTenant,
};
