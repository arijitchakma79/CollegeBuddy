const express = require("express");
const path = require("path");
const router = express.Router();

// GET /organizations/:id - Serve organization page
router.get('/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'organizations', 'view.html'));
});

module.exports = router;

