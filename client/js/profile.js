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
                <p class="membership-id">Organization ID: ${orgId || 'N/A'}</p>
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
