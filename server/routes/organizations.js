const express = require("express");
const path = require("path");
const router = express.Router();

// GET /organizations - Serve organizations list page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'organizations', 'view.html'));
});

// GET /organizations/:id - Serve single organization page
router.get('/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'organizations', 'view.html'));
});

module.exports = router;

