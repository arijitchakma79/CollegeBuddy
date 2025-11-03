const express = require("express");
const path = require("path");
const router = express.Router();

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'auth', 'login.html'));
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'auth', 'register.html'));
});

// POST routes for handling form submissions
router.post('/login', (req, res) => {
  console.log('=== LOGIN SUBMISSION ===');
  console.log('Email:', req.body.email);
  console.log('Password:', req.body.password);
  console.log('Full request body:', req.body);
  console.log('=======================');
  
  res.json({ 
    success: true, 
    message: 'Login info received (check server console)' 
  });
});

router.post('/register', (req, res) => {
  console.log('=== REGISTER SUBMISSION ===');
  console.log('Full Name:', req.body.fullName);
  console.log('Username:', req.body.username);
  console.log('Email:', req.body.email);
  console.log('Password:', req.body.password);
  console.log('Confirm Password:', req.body.confirmPassword);
  console.log('Full request body:', req.body);
  console.log('===========================');
  
  res.json({ 
    success: true, 
    message: 'Registration info received (check server console)' 
  });
});

module.exports = router;

