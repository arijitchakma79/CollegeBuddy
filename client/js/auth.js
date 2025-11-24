// Check if user is already logged in and redirect to dashboard
async function checkExistingAuth() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return; // No token, show login form
  }
  
  try {
    // Validate the token by calling the /me endpoint
    const response = await fetch('/api/auth/me', {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.user) {
      // Token is valid, redirect to dashboard
      window.location.href = '/protected/dashboard';
    } else {
      // Token is invalid, remove it and show login form
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('session');
    }
  } catch (error) {
    // Error validating token, remove it and show login form
    console.error('Error validating token:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('session');
  }
}

async function submitLogin(event) {
  event.preventDefault();
  hideError();
  clearFieldErrors();
  
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  
  if (!email || !password) {
    showError('Email and password are required');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.errors) {
        Object.keys(data.errors).forEach(field => {
          const errorSpan = document.getElementById(`${field}-error`);
          if (errorSpan) {
            errorSpan.textContent = data.errors[field];
          }
        });
      }
      showError(data.message || 'Login failed. Please check your credentials.');
    } else {
      hideError();

      
      // Save tokens to localStorage
      if (data.session) {
        if (data.session.access_token) {
          localStorage.setItem('authToken', data.session.access_token);
        } else {
        }
        
        if (data.session.refresh_token) {
          localStorage.setItem('refreshToken', data.session.refresh_token);
        } else {
          console.warn('No refresh_token in session!');
        }
        
        // Also save the full session for reference
        localStorage.setItem('session', JSON.stringify(data.session));

      } else {
        console.error('No session object in response!');
      }
      
      window.location.href = '/protected/dashboard';
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('An error occurred. Please try again.');
  }
}

async function submitRegister(event) {
  event.preventDefault();
  hideError();
  clearFieldErrors();
  
  const fullName = document.getElementById('fullName')?.value;
  const username = document.getElementById('username')?.value;
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  
  if (!fullName || !username || !email || !password || !confirmPassword) {
    showError('All fields are required');
    return;
  }
  
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        username,
        email,
        password,
        confirmPassword
      })
    });
    
    const data = await response.json();
    console.log("REGISTER RESPONSE:", data);
    console.log("VALIDATION ERRORS:", data.errors);

    
    if (!response.ok) {
      if (data.errors) {
        Object.keys(data.errors).forEach(field => {
          const errorSpan = document.getElementById(`${field}-error`);
          if (errorSpan) {
            errorSpan.textContent = data.errors[field];
          }
        });
      }
      showError(data.message || 'Registration failed. Please check your information.');
    } else {
      hideError();
      console.log('Registration successful:', data);
      window.location.href = '/auth/login';
    }
  } catch (error) {
    console.error('Register error:', error);
    showError('An error occurred. Please try again.');
  }
}

// Toggle password visibility
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const toggleButton = input.nextElementSibling;
  const toggleIcon = toggleButton.querySelector('.toggle-icon');
  
  if (input.type === 'password') {
    input.type = 'text';
    toggleIcon.textContent = '🙈';
  } else {
    input.type = 'password';
    toggleIcon.textContent = '👁️';
  }
}