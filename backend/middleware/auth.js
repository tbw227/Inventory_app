const { verifyToken } = require('../utils/auth');
const prisma = require('../lib/prisma');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: String(decoded.userId) },
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
      return res.status(401).json({ error: 'User not found' });
    }

    if (process.env.SUBSCRIPTION_ENFORCE === 'true' && user.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { subscriptionStatus: true },
      });
      if (['cancelled', 'past_due', 'incomplete'].includes(company?.subscriptionStatus)) {
        return res.status(402).json({
          error: 'Your organization subscription is inactive. Please contact support or renew billing.',
          code: 'SUBSCRIPTION_INACTIVE',
        });
      }
    }

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
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
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
