const express = require('express');
const User = require('../models/User');
const router = express.Router();

// get users for a company
router.get('/:companyId', async (req, res) => {
  try {
    const users = await User.find({ company_id: req.params.companyId });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// create a user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;