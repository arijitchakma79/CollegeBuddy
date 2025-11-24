const express = require("express");
const path = require("path");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");

router.get('/dashboard', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'dashboard.html'));
});

router.get('/home', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'home.html'));
});

router.get('/profile', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'profile.html'));
});

router.get('/organizations', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'organizations.html'));
});

module.exports = router;
