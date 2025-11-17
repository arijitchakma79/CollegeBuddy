const express = require("express");
const path = require("path");
const router = express.Router();

// Page routes - serve HTML pages
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'auth', 'login.html'));
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'auth', 'register.html'));
});

module.exports = router;

