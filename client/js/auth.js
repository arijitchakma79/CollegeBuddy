function showError(message) {
  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');
  if (errorBanner && errorMessage) {
    errorMessage.textContent = message;
    errorBanner.style.display = 'block';
  }
}

function hideError() {
  const errorBanner = document.getElementById('error-banner');
  if (errorBanner) {
    errorBanner.style.display = 'none';
  }
}

function clearFieldErrors() {
  const errorSpans = document.querySelectorAll('.error-message');
  errorSpans.forEach(span => {
    span.textContent = '';
  });
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
    const response = await fetch('/auth/login', {
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
            errorSpan.style.color = '#ff4444';
          }
        });
      }
      showError(data.message || 'Login failed. Please check your credentials.');
    } else {
      hideError();
      console.log('Login successful:', data);
      window.location.href = '/';
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
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: fullName,
        username: username,
        email: email,
        password: password,
        confirmPassword: confirmPassword
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.errors) {
        Object.keys(data.errors).forEach(field => {
          const errorSpan = document.getElementById(`${field}-error`);
          if (errorSpan) {
            errorSpan.textContent = data.errors[field];
            errorSpan.style.color = '#ff4444';
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

