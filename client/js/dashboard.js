function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/auth/login';
}

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');

            // Hide all tab contents
            tabContents.forEach(tab => tab.classList.remove('active'));

            // Show selected tab content
            const selectedTab = document.getElementById(`${targetTab}-tab`);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
        });
    });
});