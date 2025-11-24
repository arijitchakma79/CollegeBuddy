const express = require("express");
const path = require("path");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");

// GET /organizations/:id - Serve single organization detail page
router.get('/:id', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'organization-detail.html'));
});

module.exports = router;

