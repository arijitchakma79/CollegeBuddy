function logout() {
    localStorage.removeItem('authToken');
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

    if (!token) {
        window.location.href = "/auth/login";
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!result.success) {
            window.location.href = "/auth/login";
            return;
        }

        const user = result.user;

        document.getElementById('profile-name').textContent = user.user_metadata.fullName;
        document.getElementById('profile-username').textContent = user.user_metadata.username;
        document.getElementById('profile-email').textContent = user.email;

    } catch (error) {
        console.error("Failed to load profile:", error);
        window.location.href = "/auth/login";
    }
});
