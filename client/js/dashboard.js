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
    // Highlight active nav item based on current page
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
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

        // ⭐ ADD THIS — STORE USER ID FOR PAYMENT FEATURE ⭐
        if (user.id) {
            localStorage.setItem("user_id", user.id);
        }

        // Update navbar username on all pages
        const navbarUsername = document.getElementById('navbar-username');
        if (navbarUsername) {
            navbarUsername.textContent =
                user.user_metadata?.username ||
                user.user_metadata?.fullName ||
                'User';
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
