const locationService = require('../services/locationService');

exports.list = async (req, res, next) => {
  try {
    const locations = await locationService.listLocations(req.user.company_id, req.query.client_id, req.query);
    res.json(locations);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const location = await locationService.getLocation(req.user.company_id, req.params.id);
    res.json(location);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const location = await locationService.createLocation(req.user.company_id, req.validatedData);
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const location = await locationService.updateLocation(req.user.company_id, req.params.id, req.validatedData);
    res.json(location);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await locationService.deleteLocation(req.user.company_id, req.params.id);
    res.json({ message: 'Location deleted' });
  } catch (err) {
    next(err);
  }
};
