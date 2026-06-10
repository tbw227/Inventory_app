function parseScopes(sessionClaims) {
  const raw = sessionClaims?.scope ?? sessionClaims?.scp;
  if (!raw) return [];
  return String(raw).split(/\s+/).filter(Boolean);
}

/** Build principal/actor context for human sessions and future agent delegation. */
function buildAuthContext(user, { clerkSession } = {}) {
  const principalUserId = user.id;
  let actorType = 'human';
  let actorId = user.id;
  let scopes = [];

  if (clerkSession?.userId) {
    const claims = clerkSession.sessionClaims || {};
    const delegatedSub = claims.act?.sub;
    if (delegatedSub && delegatedSub !== clerkSession.userId) {
      actorType = 'agent';
      actorId = delegatedSub;
    } else {
      actorId = clerkSession.userId;
    }
    scopes = parseScopes(claims);
  }

  return {
    principalUserId,
    actorType,
    actorId: String(actorId),
    scopes,
    provider: clerkSession ? 'clerk' : 'legacy',
  };
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

function attachAuthContext(req, user, options = {}) {
  attachUserToRequest(req, user);
  req.auth = buildAuthContext(user, options);
}

module.exports = { attachAuthContext, attachUserToRequest, buildAuthContext };
