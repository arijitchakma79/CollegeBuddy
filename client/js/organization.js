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

// Display all organizations
function displayOrganizations(organizations) {
    const organizationsList = document.getElementById('organizations-list');
    
    if (!organizations || organizations.length === 0) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('not-found').classList.remove('hidden');
        return;
    }

    organizationsList.innerHTML = '';
    
    organizations.forEach(org => {
        const orgCard = document.createElement('div');
        orgCard.className = 'org-card';
        orgCard.innerHTML = `
            <div class="org-card-header">
                <h3>${org.name || 'Unnamed Organization'}</h3>
                <span class="org-card-id">ID: ${org.org_id || 'N/A'}</span>
            </div>
            <div class="org-card-body">
                <p class="org-card-description">${org.description || 'No description available.'}</p>
                <div class="org-card-info">
                    <span class="org-card-date">Created: ${formatDate(org.created_at)}</span>
                </div>
            </div>
        `;
        organizationsList.appendChild(orgCard);
    });

    // Show content, hide loading
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('organizations-list').classList.remove('hidden');
    document.getElementById('not-found').classList.add('hidden');
}

// Show error state
function showNotFound() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('organizations-list').classList.add('hidden');
    document.getElementById('not-found').classList.remove('hidden');
}

// Show error message
function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorBanner && errorMessage) {
        errorMessage.textContent = message;
        errorBanner.classList.remove('hidden');
    }
}

// Hide error message
function hideError() {
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
        errorBanner.classList.add('hidden');
    }
}

// Fetch all organizations
async function loadOrganizations() {
    // Show loading state
    const loading = document.getElementById('loading');
    const organizationsList = document.getElementById('organizations-list');
    const notFound = document.getElementById('not-found');
    
    if (loading) loading.classList.remove('hidden');
    if (organizationsList) organizationsList.classList.add('hidden');
    if (notFound) notFound.classList.add('hidden');
    
    try {
        const response = await fetch('/api/organizations');
        const data = await response.json();

        if (!response.ok) {
            showError(data.message || 'Failed to load organizations');
            showNotFound();
            return;
        }

        if (data.success && data.organizations) {
            displayOrganizations(data.organizations);
        } else {
            showError('Invalid response from server');
            showNotFound();
        }
    } catch (error) {
        console.error('Error loading organizations:', error);
        showError('An error occurred while loading organizations');
        showNotFound();
    }
}

// Modal functions
function openModal() {
    const modal = document.getElementById('create-org-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    const modal = document.getElementById('create-org-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const form = document.getElementById('create-org-form');
        if (form) {
            form.reset();
        }
        // Clear errors
        hideError();
        const nameError = document.getElementById('name-error');
        const descError = document.getElementById('description-error');
        if (nameError) nameError.textContent = '';
        if (descError) descError.textContent = '';
    }
}

// Handle form submission
async function handleCreateOrg(event) {
    event.preventDefault();
    hideError();
    
    const nameError = document.getElementById('name-error');
    const descError = document.getElementById('description-error');
    if (nameError) nameError.textContent = '';
    if (descError) descError.textContent = '';

    const name = document.getElementById('org-name').value.trim();
    const description = document.getElementById('org-description').value.trim();

    if (!name) {
        if (nameError) nameError.textContent = 'Organization name is required';
        return;
    }

    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/organizations/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, description: description || null })
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.errors) {
                if (data.errors.name && nameError) {
                    nameError.textContent = data.errors.name;
                }
                if (data.errors.description && descError) {
                    descError.textContent = data.errors.description;
                }
            }
            showError(data.message || 'Failed to create organization');
            return;
        }

        // Success - close modal and reload organizations
        closeModal();
        loadOrganizations();
    } catch (error) {
        console.error('Error creating organization:', error);
        showError('An error occurred while creating the organization');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadOrganizations();

    // Modal event listeners
    const createBtn = document.getElementById('create-org-btn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-create');
    const form = document.getElementById('create-org-form');

    if (createBtn) {
        createBtn.addEventListener('click', openModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (form) {
        form.addEventListener('submit', handleCreateOrg);
    }

    // Close modal when clicking outside
    const modal = document.getElementById('create-org-modal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
});

