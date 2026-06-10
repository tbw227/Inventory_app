const prisma = require('../lib/prisma');

async function recordAuditEvent(
  req,
  { action, resourceType = null, resourceId = null, metadata = {} } = {}
) {
  const companyId = req.user?.company_id;
  if (!companyId || !action) return;

  const actorType = req.auth?.actorType || 'human';
  try {
    await prisma.auditEvent.create({
      data: {
        companyId: String(companyId),
        principalUserId: req.auth?.principalUserId ? String(req.auth.principalUserId) : null,
        actorType,
        actorId: String(req.auth?.actorId || req.user._id),
        action,
        resourceType,
        resourceId: resourceId != null ? String(resourceId) : null,
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
      },
    });
  } catch (err) {
    console.warn('[audit] Failed to record event:', err.message);
  }
}

module.exports = { recordAuditEvent };
