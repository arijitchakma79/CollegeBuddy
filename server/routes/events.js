const express = require("express");
const path = require("path");
const router = express.Router();
const { authenticateUser } = require("../middleware/auth");

// GET /events/:id - Serve single event detail page
router.get('/:id', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'event-detail.html'));
});

// GET /events - Serve events listing page (if needed)
router.get('/', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'protected', 'events.html'));
});

module.exports = router;

