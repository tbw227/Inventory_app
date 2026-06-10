const { getAuth } = require('@clerk/express');
const { verifyToken } = require('../utils/auth');
const prisma = require('../lib/prisma');
const { isClerkConfigured } = require('../config/clerk');
const { resolveUserFromClerkId } = require('../services/clerkAuthService');

const userSelect = {
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
};

async function enforceSubscription(user, res) {
  if (process.env.SUBSCRIPTION_ENFORCE !== 'true' || !user.companyId) return true;
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { subscriptionStatus: true },
  });
  if (['cancelled', 'past_due', 'incomplete'].includes(company?.subscriptionStatus)) {
    res.status(402).json({
      error: 'Your organization subscription is inactive. Please contact support or renew billing.',
      code: 'SUBSCRIPTION_INACTIVE',
    });
    return false;
  }
  return true;
}

function attachUserToRequest(req, user) {
  req.user = {
    _id: user.id,
    company_id: user.companyId,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    photo_url: user.photoUrl,
    bio: user.bio,
    location: user.location,
    birthday: user.birthday,
    skills: user.skills,
    preferences: user.preferences && typeof user.preferences === 'object' ? user.preferences : {},
    createdAt: user.createdAt,
  };
}

async function authenticateWithClerk(req, res) {
  const auth = getAuth(req);
  if (!auth?.userId) return false;

  const user = await resolveUserFromClerkId(auth.userId);
  if (!user) {
    res.status(403).json({
      error: 'No company account linked to this Clerk user. Complete registration first.',
      code: 'CLERK_NEEDS_PROVISIONING',
    });
    return true;
  }

  if (!(await enforceSubscription(user, res))) return true;
  attachUserToRequest(req, user);
  return true;
}

async function authenticateWithJwt(req, res) {
  const header = req.headers.authorization;
  const token = header.split(' ')[1];
  const decoded = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: String(decoded.userId) },
    select: userSelect,
  });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return true;
  }

  if (!(await enforceSubscription(user, res))) return true;
  attachUserToRequest(req, user);
  return true;
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    if (isClerkConfigured()) {
      const clerkHandled = await authenticateWithClerk(req, res);
      if (clerkHandled) {
        if (req.user) return next();
        return undefined;
      }
    }

    const jwtHandled = await authenticateWithJwt(req, res);
    if (jwtHandled) {
      if (req.user) return next();
      return undefined;
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  return res.status(401).json({ error: 'Authentication required' });
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
