const authService = require('../services/authService');
const { provisionClerkTenant } = require('../services/clerkAuthService');
const { recordAuditEvent } = require('../services/auditService');

exports.register = async (req, res, next) => {
  try {
    const { companyName, name, email, password } = req.validatedData;
    const result = await authService.register(companyName, name, email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validatedData;
    await authService.forgotPassword(email);
    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.validatedData;
    await authService.resetPassword(token, newPassword);
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const profile = await authService.me(req.user._id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

exports.clerkProvision = async (req, res, next) => {
  try {
    const { companyName, name } = req.validatedData;
    const profile = await provisionClerkTenant(req.clerkUserId, { companyName, name });
    req.user = { _id: profile.id, company_id: profile.company_id };
    req.auth = {
      principalUserId: profile.id,
      actorType: 'human',
      actorId: req.clerkUserId,
      scopes: [],
      provider: 'clerk',
    };
    await recordAuditEvent(req, {
      action: 'tenant.provisioned',
      resourceType: 'company',
      resourceId: profile.company_id,
      metadata: { companyName },
    });
    res.status(201).json({ user: profile });
  } catch (err) {
    next(err);
  }
};
