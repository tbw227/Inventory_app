const authService = require('../services/authService');

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
