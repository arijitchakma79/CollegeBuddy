const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { validateRegistration, validateLogin } = require("../utils/validate");

// POST /api/auth/register - Handle user registration
router.post('/register', async (req, res) => {
  const validation = validateRegistration(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }

  const { email, password, fullName, username } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          fullName: fullName
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Registration successful',
      user: data.user
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: err.message
    });
  }
});

// POST /api/auth/login - Handle user login
router.post('/login', async (req, res) => {
  const validation = validateLogin(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }

  const { email, password } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user: data.user,
      session: data.session
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: err.message
    });
  }
});

// GET /api/auth/me - Get current authenticated user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    return res.json({
      success: true,
      user: user
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: err.message
    });
  }
});

module.exports = router;

