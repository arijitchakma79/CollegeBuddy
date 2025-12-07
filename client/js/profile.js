// Profile page specific logic
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('authToken');

    // If no token, redirect to login
    if (!token) {
        window.location.href = '/auth/login';
        return;
    }

    // Load and display profile data
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!result.success || !result.user) {
            // Token is invalid, clear it and redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('session');
            window.location.href = '/auth/login';
            return;
        }

        // Update profile information
        const user = result.user;
        
        if (document.getElementById('profile-name')) {
            document.getElementById('profile-name').textContent = user.user_metadata?.fullName || 'N/A';
        }
        if (document.getElementById('profile-username')) {
            document.getElementById('profile-username').textContent = user.user_metadata?.username || 'N/A';
        }
        if (document.getElementById('profile-email')) {
            document.getElementById('profile-email').textContent = user.email || 'N/A';
        }
        
        // Load memberships
        await loadMemberships(token);
    } catch (error) {
        console.error("Failed to load profile:", error);
        // On error, clear tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('session');
        window.location.href = '/auth/login';
    }
});

// Load and display user memberships
async function loadMemberships(token) {
    const loadingEl = document.getElementById('memberships-loading');
    const listEl = document.getElementById('memberships-list');
    const emptyEl = document.getElementById('memberships-empty');
    
    console.log('Loading memberships...');
    console.log('Loading element:', loadingEl);
    
    try {
        const response = await fetch('/api/memberships', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        console.log('Memberships response status:', response.status);
        const result = await response.json();
        console.log('Memberships result:', result);
        
        // Always hide loading after API call completes
        if (loadingEl) {
            loadingEl.style.display = 'none';
            loadingEl.classList.add('hidden');
        }
        
        if (!response.ok || !result.success) {
            console.error('Failed to load memberships:', result.message || result.error);
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.classList.remove('hidden');
            }
            if (listEl) {
                listEl.style.display = 'none';
                listEl.classList.add('hidden');
            }
            return;
        }
        
        const memberships = result.memberships || [];
        console.log('Memberships count:', memberships.length);
        
        if (memberships.length === 0) {
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.classList.remove('hidden');
            }
            if (listEl) {
                listEl.style.display = 'none';
                listEl.classList.add('hidden');
            }
        } else {
            if (emptyEl) {
                emptyEl.style.display = 'none';
                emptyEl.classList.add('hidden');
            }
            if (listEl) {
                listEl.style.display = 'block';
                listEl.classList.remove('hidden');
                displayMemberships(memberships);
            }
        }
    } catch (error) {
        console.error("Failed to load memberships:", error);
        if (loadingEl) {
            loadingEl.style.display = 'none';
            loadingEl.classList.add('hidden');
        }
        if (emptyEl) {
            emptyEl.style.display = 'block';
            emptyEl.classList.remove('hidden');
        }
        if (listEl) {
            listEl.style.display = 'none';
            listEl.classList.add('hidden');
        }
    }
}

// Display memberships
function displayMemberships(memberships) {
    const listEl = document.getElementById('memberships-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    memberships.forEach(membership => {
        const org = membership.organizations;
        const orgId = org?.org_id || membership.org_id;
        const membershipCard = document.createElement('div');
        membershipCard.className = 'membership-card';
        membershipCard.style.cursor = 'pointer';
        
        const roleBadge = membership.role === 'admin' ? 'admin' : 'member';
        const roleClass = membership.role === 'admin' ? 'role-admin' : 'role-member';
        
        membershipCard.innerHTML = `
            <div class="membership-card-header">
                <h4>${org?.name || 'Unknown Organization'}</h4>
                <span class="role-badge ${roleClass}">${membership.role || 'member'}</span>
            </div>
            <div class="membership-card-body">
                <p class="membership-description">${org?.description || 'No description available.'}</p>
            </div>
        `;
        
        // Make the card clickable to navigate to organization detail page
        if (orgId) {
            membershipCard.addEventListener('click', () => {
                window.location.href = `/organizations/${orgId}`;
            });
        }
        
        listEl.appendChild(membershipCard);
    });
}

// Handle password change form submission
document.addEventListener('DOMContentLoaded', function() {
    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // Initialize password visibility toggles
    initializePasswordToggles();
});

function initializePasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput) {
                // Toggle input type
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.classList.add('active');
                    this.setAttribute('aria-label', 'Hide password');
                } else {
                    passwordInput.type = 'password';
                    this.classList.remove('active');
                    this.setAttribute('aria-label', 'Show password');
                }
            }
        });
    });
}

async function handlePasswordChange(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showPasswordMessage('Please log in to change your password', 'error');
        return;
    }

    // Clear previous errors
    clearPasswordErrors();
    const messageEl = document.getElementById('password-change-message');
    if (messageEl) {
        messageEl.classList.add('hidden');
    }

    const formData = new FormData(event.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    // Client-side validation
    let hasErrors = false;

    if (!currentPassword) {
        showFieldError('current-password-error', 'Current password is required');
        hasErrors = true;
    }

    if (!newPassword) {
        showFieldError('new-password-error', 'New password is required');
        hasErrors = true;
    } else {
        // Validate password strength client-side
        if (newPassword.length < 8) {
            showFieldError('new-password-error', 'Password must be at least 8 characters long');
            hasErrors = true;
        } else if (!/[A-Z]/.test(newPassword)) {
            showFieldError('new-password-error', 'Password must contain at least one uppercase letter');
            hasErrors = true;
        } else if (!/[a-z]/.test(newPassword)) {
            showFieldError('new-password-error', 'Password must contain at least one lowercase letter');
            hasErrors = true;
        } else if (!/[0-9]/.test(newPassword)) {
            showFieldError('new-password-error', 'Password must contain at least one number');
            hasErrors = true;
        } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
            showFieldError('new-password-error', 'Password must contain at least one special character');
            hasErrors = true;
        }
    }

    if (!confirmPassword) {
        showFieldError('confirm-password-error', 'Please confirm your password');
        hasErrors = true;
    } else if (newPassword && newPassword !== confirmPassword) {
        showFieldError('confirm-password-error', 'Passwords do not match');
        hasErrors = true;
    }

    if (hasErrors) {
        return;
    }

    // Disable submit button
    const submitBtn = event.target.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing Password...';
    }

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            // Log the full error for debugging
            console.error('Password change error:', result);
            
            // Handle field-specific errors
            if (result.message) {
                if (result.message.includes('Current password') || result.message.includes('incorrect')) {
                    showFieldError('current-password-error', result.message);
                } else if (result.message.includes('New password') || (result.message.includes('password') && !result.message.includes('Current'))) {
                    showFieldError('new-password-error', result.message);
                } else if (result.message.includes('confirmation') || result.message.includes('match')) {
                    showFieldError('confirm-password-error', result.message);
                } else {
                    // Show general error message
                    const errorMsg = result.error ? `${result.message}: ${result.error}` : result.message;
                    showPasswordMessage(errorMsg || 'Failed to change password', 'error');
                }
            } else {
                const errorMsg = result.error ? `Error: ${result.error}` : 'Failed to change password';
                showPasswordMessage(errorMsg, 'error');
            }
        } else {
            showPasswordMessage('Password changed successfully!', 'success');
            // Clear form
            event.target.reset();
            // Clear any field errors
            clearPasswordErrors();
        }
    } catch (error) {
        console.error('Password change error:', error);
        showPasswordMessage('An error occurred while changing your password', 'error');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    }
}

function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
    }
}

function clearPasswordErrors() {
    const errorFields = ['current-password-error', 'new-password-error', 'confirm-password-error'];
    errorFields.forEach(fieldId => {
        const errorEl = document.getElementById(fieldId);
        if (errorEl) {
            errorEl.textContent = '';
        }
    });
}

function showPasswordMessage(message, type) {
    const messageEl = document.getElementById('password-change-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `password-change-message ${type}`;
        messageEl.classList.remove('hidden');
        
        // Scroll to message
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}