const express = require("express");
const path = require("path");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");

router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'dashboard.html'));
});

module.exports = router;

