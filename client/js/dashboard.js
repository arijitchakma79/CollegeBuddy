async function logout() {
    // Clear all auth-related data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('session');
    
    // Clear server-side cookie
    try {
        await fetch('/api/auth/logout', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error during logout:', error);
    }
    
    window.location.href = '/auth/login';
}

document.addEventListener('DOMContentLoaded', async function() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    const token = localStorage.getItem('authToken');

    // If no token, redirect to login
    if (!token) {
        window.location.href = '/auth/login';
        return;
    }

    // Validate token and load user data
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

        // Token is valid, load user data
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
