const clientService = require('../services/clientService');

exports.list = async (req, res, next) => {
  try {
    const clients = await clientService.listClients(req.user.company_id, req.query);
    res.json(clients);
  } catch (err) {
    next(err);
  }
};

exports.calendarEvents = async (req, res, next) => {
  try {
    const events = await clientService.listCalendarEvents(req.user.company_id);
    res.json({ events });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const client = await clientService.getClient(req.user.company_id, req.params.id);
    res.json(client);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const client = await clientService.createClient(req.user.company_id, req.validatedData);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.user.company_id, req.params.id, req.validatedData);
    res.json(client);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await clientService.deleteClient(req.user.company_id, req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
