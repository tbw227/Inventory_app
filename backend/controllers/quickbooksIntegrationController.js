const AppError = require('../utils/AppError');
const quickbooksIntegrationService = require('../services/quickbooksIntegrationService');

function frontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
}

exports.getAuthorizeUrl = async (req, res, next) => {
  try {
    const url = quickbooksIntegrationService.buildAuthorizeUrl(req.user.company_id, req.user._id);
    res.json({ authorization_url: url });
  } catch (err) {
    if (err.code === 'INTUIT_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    next(err);
  }
};

exports.oauthCallback = async (req, res) => {
  const nextUrl = (status) => `${frontendBase()}/settings?integration=qbo&status=${status}`;
  try {
    const { code, state, realmId } = req.query;
    if (!code || !state || !realmId) {
      return res.redirect(nextUrl('missing_params'));
    }
    const payload = quickbooksIntegrationService.verifyOAuthState(state);
    const tokens = await quickbooksIntegrationService.exchangeAuthorizationCode(code);
    await quickbooksIntegrationService.upsertConnection(payload.companyId, realmId, tokens);
    return res.redirect(nextUrl('connected'));
  } catch {
    return res.redirect(nextUrl('error'));
  }
};

exports.disconnect = async (req, res, next) => {
  try {
    await quickbooksIntegrationService.disconnect(req.user.company_id);
    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
};

exports.status = async (req, res, next) => {
  try {
    const row = await quickbooksIntegrationService.getValidConnection(req.user.company_id);
    if (!row) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      realm_id: row.realmId,
      token_expires_at: row.accessTokenExpiresAt,
    });
  } catch (err) {
    next(err);
  }
};

exports.syncCustomersPreview = async (req, res, next) => {
  try {
    const conn = await quickbooksIntegrationService.getValidConnection(req.user.company_id);
    if (!conn) {
      throw new AppError('QuickBooks is not connected for this company', 400);
    }
    const query =
      'select Id, DisplayName, PrimaryEmailAddr from Customer startposition 1 maxresults 50';
    const data = await quickbooksIntegrationService.runQuery(conn, query);
    const list = data.QueryResponse?.Customer;
    const rows = Array.isArray(list) ? list : list ? [list] : [];
    res.json({
      entity: 'Customer',
      qbo_count_in_page: rows.length,
      sample: rows.slice(0, 15).map((c) => ({
        qbo_id: c.Id,
        display_name: c.DisplayName,
        email: c.PrimaryEmailAddr?.Address || null,
        maps_to: 'Client',
      })),
    });
  } catch (err) {
    next(err);
  }
};

exports.syncItemsPreview = async (req, res, next) => {
  try {
    const conn = await quickbooksIntegrationService.getValidConnection(req.user.company_id);
    if (!conn) {
      throw new AppError('QuickBooks is not connected for this company', 400);
    }
    const query = 'select Id, Name, UnitPrice, Type from Item startposition 1 maxresults 50';
    const data = await quickbooksIntegrationService.runQuery(conn, query);
    const list = data.QueryResponse?.Item;
    const rows = Array.isArray(list) ? list : list ? [list] : [];
    res.json({
      entity: 'Item',
      qbo_count_in_page: rows.length,
      sample: rows.slice(0, 15).map((item) => ({
        qbo_id: item.Id,
        name: item.Name,
        unit_price: item.UnitPrice != null ? Number(item.UnitPrice) : null,
        type: item.Type,
        maps_to: 'Supply',
      })),
    });
  } catch (err) {
    next(err);
  }
};
