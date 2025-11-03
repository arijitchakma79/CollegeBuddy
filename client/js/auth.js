// Login function
async function submitLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  
  if (!email || !password) {
    console.error('Email and password are required');
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
    console.log('Login response:', data);
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Register function
async function submitRegister(event) {
  event.preventDefault();
  
  const fullName = document.getElementById('fullName')?.value;
  const username = document.getElementById('username')?.value;
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  
  if (!fullName || !username || !email || !password || !confirmPassword) {
    console.error('All fields are required');
    return;
  }
  
  if (password !== confirmPassword) {
    console.error('Passwords do not match');
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
    console.log('Register response:', data);
  } catch (error) {
    console.error('Register error:', error);
  }
}

