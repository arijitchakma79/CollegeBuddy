const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function authenticateUser(req, res, next) {
  try {
    // Check for token in Authorization header (for API calls)
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(" ")[1];
    } 
    // Check for token in cookie (for page requests)
    else if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (!token) {
      // For HTML requests, redirect to login
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/auth/login');
      }
      // For API requests, return JSON error
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      // For HTML requests, redirect to login
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/auth/login');
      }
      // For API requests, return JSON error
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: error?.message
      });
    }

    req.user = data.user;
    next();

  } catch (err) {
    // For HTML requests, redirect to login
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect('/auth/login');
    }
    // For API requests, return JSON error
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: err.message
    });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(" ")[1];
    
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data?.user) {
      req.user = data.user;
    }
  }

  next();
}

module.exports = {
  authenticateUser,
  optionalAuth
};
