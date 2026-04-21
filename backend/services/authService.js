const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { verifyPassword, generateToken, hashPassword } = require('../utils/auth');
const { sendEmail } = require('../utils/sendEmail');
const AppError = require('../utils/AppError');

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  const companyDoc = user.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          name: true,
          subscriptionStatus: true,
          subscriptionTier: true,
          subscriptionCurrentPeriodEnd: true,
        },
      })
    : null;

  const { passwordHash: _p, ...rest } = user;
  return {
    token,
    user: getProfile({ ...rest, ...companyFieldsFromDoc(companyDoc) }),
  };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const appBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${appBaseUrl}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your FireTrack password',
    text: `We received a request to reset your password.\n\nReset your password using this link (valid for 30 minutes):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
  });
}

async function resetPassword(token, newPassword) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
}

function companyFieldsFromDoc(companyDoc) {
  if (!companyDoc) {
    return {
      company_name: '',
      subscription_status: 'active',
      subscription_tier: 'basic',
      subscription_current_period_end: null,
    };
  }
  return {
    company_name: companyDoc.name || '',
    subscription_status: companyDoc.subscriptionStatus || 'active',
    subscription_tier: companyDoc.subscriptionTier || 'basic',
    subscription_current_period_end: companyDoc.subscriptionCurrentPeriodEnd || null,
  };
}

const DEFAULT_PREFERENCES = {
  weather_theme: 'default',
  dashboard_accent: 'teal',
  weather_city: '',
};

function normalizePreferences(p) {
  return { ...DEFAULT_PREFERENCES, ...(p && typeof p === 'object' ? p : {}) };
}

function getProfile(user) {
  return {
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_id: user.companyId,
    company_name: user.company_name || '',
    subscription_status: user.subscription_status ?? 'active',
    subscription_tier: user.subscription_tier ?? 'basic',
    subscription_current_period_end: user.subscription_current_period_end ?? null,
    phone: user.phone || '',
    photo_url: user.photoUrl || '',
    bio: user.bio || '',
    location: user.location || '',
    birthday: user.birthday || '',
    skills: Array.isArray(user.skills) ? user.skills : [],
    preferences: normalizePreferences(user.preferences),
    createdAt: user.createdAt,
  };
}

async function me(userId) {
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
    },
  });
  if (!user) {
    throw new AppError('User not found', 401);
  }
  const companyDoc = user.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          name: true,
          subscriptionStatus: true,
          subscriptionTier: true,
          subscriptionCurrentPeriodEnd: true,
        },
      })
    : null;
  return getProfile({ ...user, ...companyFieldsFromDoc(companyDoc) });
}

module.exports = { login, forgotPassword, resetPassword, getProfile, me };
