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
  console.log('=== API CALL: POST /api/auth/login ===');
  console.log('Request body:', { email: req.body.email, password: '***' });
  
  const validation = validateLogin(req.body);
  
  if (!validation.isValid) {
    const response = {
      success: false,
      errors: validation.errors
    };
    console.log('Validation failed. Response:', response);
    return res.status(400).json(response);
  }

  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      const response = {
        success: false,
        message: "Invalid email or password",
        error: error.message
      };
      console.log('Login error. Response:', response);
      return res.status(401).json(response);
    }

    const response = {
      success: true,
      message: "Login successful",
      user: data.user,
      session: data.session
    };
    
    // Set cookie with access token for page requests
    if (data.session && data.session.access_token) {
      res.cookie('authToken', data.session.access_token, {
        httpOnly: true, // Prevents JavaScript access (security)
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000 // 1 hour (matches token expiration)
      });
    }
    
    console.log('Login successful. Response:', {
      success: response.success,
      message: response.message,
      hasUser: !!response.user,
      hasSession: !!response.session,
      hasAccessToken: !!(response.session && response.session.access_token)
    });
    console.log('Full session object:', JSON.stringify(response.session, null, 2));
    return res.json(response);

  } catch (err) {
    const response = {
      success: false,
      message: "An error occurred during login",
      error: err.message
    };
    console.log('Exception occurred. Response:', response);
    return res.status(500).json(response);
  }
});

router.get('/me', async (req, res) => {
  console.log('=== API CALL: GET /api/auth/me ===');
  console.log('Authorization header present:', !!req.headers.authorization);
  
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const response = {
        success: false,
        message: "No authentication token provided"
      };
      console.log('No token provided. Response:', response);
      return res.status(401).json(response);
    }

    const token = authHeader.split(" ")[1];  // correct token extraction
    console.log('Token extracted (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      const response = {
        success: false,
        message: "Invalid or expired token",
        error: error?.message
      };
      console.log('Token validation failed. Response:', response);
      return res.status(401).json(response);
    }

    const response = {
      success: true,
      user: data.user
    };
    console.log('Token valid. Response:', {
      success: response.success,
      userId: response.user?.id,
      userEmail: response.user?.email
    });
    return res.json(response);

  } catch (err) {
    const response = {
      success: false,
      message: "Error fetching user",
      error: err.message
    };
    console.log('Exception occurred. Response:', response);
    return res.status(500).json(response);
  }
});

router.post('/logout', (req, res) => {
  // Clear the auth cookie
  res.clearCookie('authToken');
  return res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
