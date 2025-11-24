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
    } catch (error) {
        console.error("Failed to load profile:", error);
        // On error, clear tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('session');
        window.location.href = '/auth/login';
    }
});
