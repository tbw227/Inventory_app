const express = require('express');
const Client = require('../models/Client');
const router = express.Router();

// get all clients for a safety company
router.get('/:companyId', async (req, res) => {
  try {
    const clients = await Client.find({ company_id: req.params.companyId });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// create a client
router.post('/', async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;