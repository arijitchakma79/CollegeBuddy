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

router.post('/change-password', async (req, res) => {
  console.log('=== API CALL: POST /api/auth/change-password ===');
  
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided"
      });
    }

    const token = authHeader.split(" ")[1];
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required"
      });
    }

    // Validate new password matches confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match"
      });
    }

    // Validate new password meets requirements
    const { validatePassword } = require("../utils/validate");
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.error
      });
    }

    // Get user to verify current password
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    // Verify current password by attempting to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    if (!signInData || !signInData.session || !signInData.session.access_token) {
      console.error('No valid session returned from sign in');
      return res.status(500).json({
        success: false,
        message: "Failed to authenticate. Please try again."
      });
    }

    // Create a new Supabase client instance
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;
    
    // Create a fresh client instance
    const supabaseWithSession = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Set the session first
    const { data: sessionData, error: sessionError } = await supabaseWithSession.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    });

    if (sessionError) {
      console.error('Session set error:', sessionError);
      return res.status(500).json({
        success: false,
        message: "Failed to establish session. Please try again.",
        error: sessionError.message
      });
    }

    // Now update the password with the active session
    const { data: updateData, error: updateError } = await supabaseWithSession.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Update password error:', updateError);
      return res.status(400).json({
        success: false,
        message: "Failed to update password",
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while changing password",
      error: err.message
    });
  }
});

module.exports = router;
