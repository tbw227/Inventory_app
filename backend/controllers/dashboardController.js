const dashboardService = require('../services/dashboardService');

exports.get = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData(
      req.user.company_id,
      req.user.role,
      req.user._id,
      req.query
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
};
