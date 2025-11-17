// Get organization ID from URL
function getOrganizationId() {
    const pathParts = window.location.pathname.split('/');
    const orgIndex = pathParts.indexOf('organizations');
    if (orgIndex !== -1 && pathParts[orgIndex + 1]) {
        return pathParts[orgIndex + 1];
    }
    return null;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Display organization data
function displayOrganization(org) {
    document.getElementById('org-name').textContent = org.name || 'Unnamed Organization';
    document.getElementById('org-id').textContent = org.org_id || 'N/A';
    document.getElementById('org-id-value').textContent = org.org_id || 'N/A';
    
    const description = org.description || 'No description available.';
    document.getElementById('org-description').textContent = description;
    
    document.getElementById('org-created').textContent = formatDate(org.created_at);
    
    // Show content, hide loading
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('organization-content').classList.remove('hidden');
}

// Show error state
function showNotFound() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('not-found').classList.remove('hidden');
}

// Show error message
function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorBanner.classList.remove('hidden');
}

// Fetch organization data
async function loadOrganization() {
    const orgId = getOrganizationId();
    
    if (!orgId) {
        showError('Invalid organization ID');
        showNotFound();
        return;
    }

    try {
        const response = await fetch(`/api/organizations/${orgId}`);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                showNotFound();
            } else {
                showError(data.message || 'Failed to load organization');
                showNotFound();
            }
            return;
        }

        if (data.success && data.organization) {
            displayOrganization(data.organization);
        } else {
            showError('Invalid response from server');
            showNotFound();
        }
    } catch (error) {
        console.error('Error loading organization:', error);
        showError('An error occurred while loading the organization');
        showNotFound();
    }
}

// Load organization when page loads
document.addEventListener('DOMContentLoaded', loadOrganization);

