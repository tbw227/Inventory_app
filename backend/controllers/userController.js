const userService = require('../services/userService');
const authService = require('../services/authService');

exports.getMe = async (req, res, next) => {
  try {
    const profile = await authService.me(req.user._id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const users = await userService.listUsers(req.user.company_id, req.query);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const id = req.params.id && String(req.params.id).trim();
    const user = await userService.getUser(req.user.company_id, id);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.user.company_id, req.validatedData);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.company_id, req.params.id, req.validatedData);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateOwnProfile(req.user.company_id, req.user._id, req.validatedData);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await userService.deleteUser(req.user.company_id, req.params.id, req.user._id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};
