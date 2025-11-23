const express = require("express");
const router = express.Router();
const supabase = require("../services/supabaseClient");
const { validateRegistration, validateLogin } = require("../utils/validate");

router.post('/register', async (req, res) => {
  const validation = validateRegistration(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }

  const { email, password, fullName, username, confirmPassword } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName,
          username
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Registration failed",
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: "Registration successful",
      user: data.user
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "An error occurred during registration",
      error: err.message
    });
  }
});

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
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: "Login successful",
      user: data.user,
      session: data.session
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "An error occurred during login",
      error: err.message
    });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided"
      });
    }

    const token = authHeader.split(" ")[1];  // correct token extraction

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: error?.message
      });
    }

    return res.json({
      success: true,
      user: data.user
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: err.message
    });
  }
});


module.exports = router;
