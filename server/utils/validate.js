function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Invalid email format' };
  }

  const drexelEmailRegex = /^[^\s@]+@drexel\.edu$/i;
  if (!drexelEmailRegex.test(email.trim())) {
    return { isValid: false, error: 'Must use a Drexel email (@drexel.edu)' };
  }

  return { isValid: true, error: null };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }

  return { isValid: true, error: null };
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (trimmedUsername.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (!/^[a-zA-Z]/.test(trimmedUsername)) {
    return { isValid: false, error: 'Username must start with a letter' };
  }

  return { isValid: true, error: null };
}

function validateFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { isValid: false, error: 'Full name is required' };
  }

  const trimmedName = fullName.trim();

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters long' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Full name must be less than 100 characters' };
  }

  const nameParts = trimmedName.split(/\s+/);
  if (nameParts.length < 2) {
    return { isValid: false, error: 'Please enter your full name (first and last name)' };
  }

  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true, error: null };
}

function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword || typeof confirmPassword !== 'string') {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true, error: null };
}

function validateRegistration(data) {
  const errors = {};

  const fullNameValidation = validateFullName(data.fullName);
  if (!fullNameValidation.isValid) {
    errors.fullName = fullNameValidation.error;
  }

  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.isValid) {
    errors.username = usernameValidation.error;
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error;
  }

  if (passwordValidation.isValid) {
    const passwordMatchValidation = validatePasswordMatch(data.password, data.confirmPassword);
    if (!passwordMatchValidation.isValid) {
      errors.confirmPassword = passwordMatchValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validateLogin(data) {
  const errors = {};

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }

  if (!data.password || typeof data.password !== 'string' || data.password.trim().length === 0) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateUsername,
  validateFullName,
  validatePasswordMatch,
  validateRegistration,
  validateLogin
};
