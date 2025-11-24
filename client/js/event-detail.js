// Event detail page logic

let currentEventId = null;

// Get event ID from URL
function getEventIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/events\/(\d+)/);
    return match ? match[1] : null;
}

// Load event details
async function loadEvent() {
    const eventId = getEventIdFromUrl();
    if (!eventId) {
        showNotFound();
        return;
    }
    
    currentEventId = eventId;
    
    const loading = document.getElementById('loading');
    const eventDetail = document.getElementById('event-detail');
    const notFound = document.getElementById('not-found');
    
    if (loading) loading.classList.remove('hidden');
    if (eventDetail) eventDetail.classList.add('hidden');
    if (notFound) notFound.classList.add('hidden');
    
    try {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/events/${eventId}`, {
            headers: headers
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            showError(data.message || 'Failed to load event');
            showNotFound();
            return;
        }
        
        const event = data.event;
        
        // Update page content
        if (document.getElementById('event-title')) {
            document.getElementById('event-title').textContent = event.title || 'Untitled Event';
        }
        
        if (document.getElementById('event-description')) {
            document.getElementById('event-description').textContent = event.description || 'No description available.';
        }
        
        // Format dates
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        const formattedStart = startDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long'
        });
        const formattedEnd = endDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long'
        });
        
        const price = event.price_cents ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free';
        
        // Populate event details
        const eventDetails = document.getElementById('event-details');
        if (eventDetails) {
            eventDetails.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Start Time</span>
                    <span class="info-value">${formattedStart}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">End Time</span>
                    <span class="info-value">${formattedEnd}</span>
                </div>
                ${event.location ? `
                <div class="info-item">
                    <span class="info-label">Location</span>
                    <span class="info-value">${event.location}</span>
                </div>
                ` : ''}
                ${event.attendee_cap ? `
                <div class="info-item">
                    <span class="info-label">Attendee Cap</span>
                    <span class="info-value">${event.attendee_cap}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="info-label">Price</span>
                    <span class="info-value">${price}</span>
                </div>
                ${event.restricted_to_org ? `
                <div class="info-item">
                    <span class="info-label">Access</span>
                    <span class="info-value" style="color: #ff6b6b; font-weight: 600;">Restricted to Organization Members</span>
                </div>
                ` : `
                <div class="info-item">
                    <span class="info-label">Access</span>
                    <span class="info-value">Public</span>
                </div>
                `}
                ${event.created_at ? `
                <div class="info-item">
                    <span class="info-label">Created</span>
                    <span class="info-value">${new Date(event.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                </div>
                ` : ''}
            `;
        }
        
        // Show content, hide loading
        if (loading) loading.classList.add('hidden');
        if (eventDetail) eventDetail.classList.remove('hidden');
        if (notFound) notFound.classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading event:', error);
        showError('An error occurred while loading the event');
        showNotFound();
    }
}

// Show error state
function showNotFound() {
    const loading = document.getElementById('loading');
    const eventDetail = document.getElementById('event-detail');
    const notFound = document.getElementById('not-found');
    
    if (loading) loading.classList.add('hidden');
    if (eventDetail) eventDetail.classList.add('hidden');
    if (notFound) notFound.classList.remove('hidden');
}

// Show error message
function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorBanner && errorMessage) {
        errorMessage.textContent = message;
        errorBanner.classList.remove('hidden');
        setTimeout(() => {
            if (errorBanner) errorBanner.classList.add('hidden');
        }, 5000);
    }
}

// Back button handler
function handleBack() {
    // Try to go back to the previous page, or default to organizations
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '/protected/organizations';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadEvent();
    
    // Back button event listener
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', handleBack);
    }
});

