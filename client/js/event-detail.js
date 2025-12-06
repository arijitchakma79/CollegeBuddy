// Event detail page logic

let currentEventId = null;
let currentEvent = null;
let currentRsvp = null;

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
        currentEvent = event;
        
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
        
        // Load RSVP information only if event has an organization
        const rsvpSection = document.getElementById('rsvp-section');
        if (event.created_by_org_id) {
            if (rsvpSection) rsvpSection.classList.remove('hidden');
            await loadRsvp();
            await loadRsvpCounts();
        } else {
            if (rsvpSection) rsvpSection.classList.add('hidden');
        }
        
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

// Load current user's RSVP
async function loadRsvp() {
    if (!currentEventId) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        // Hide RSVP section if not authenticated
        const rsvpSection = document.getElementById('rsvp-section');
        if (rsvpSection) rsvpSection.classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`/api/events/${currentEventId}/rsvp`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            currentRsvp = data.rsvp;
            updateRsvpUI();
        } else {
            currentRsvp = null;
            updateRsvpUI();
        }
    } catch (error) {
        console.error('Error loading RSVP:', error);
        currentRsvp = null;
        updateRsvpUI();
    }
}

// Load RSVP counts for the event
async function loadRsvpCounts() {
    if (!currentEventId) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
        const response = await fetch(`/api/events/${currentEventId}/rsvps`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            const rsvps = data.rsvps || [];
            // Status values are normalized by backend, so use frontend format
            const counts = {
                going: rsvps.filter(r => r.status === 'going').length,
                maybe: rsvps.filter(r => r.status === 'maybe').length,
                not_going: rsvps.filter(r => r.status === 'not_going').length
            };
            updateRsvpCountsUI(counts);
        }
    } catch (error) {
        console.error('Error loading RSVP counts:', error);
    }
}

// Update RSVP UI based on current RSVP status
function updateRsvpUI() {
    const rsvpStatus = document.getElementById('rsvp-status');
    const rsvpGoingBtn = document.getElementById('rsvp-going');
    const rsvpMaybeBtn = document.getElementById('rsvp-maybe');
    const rsvpNotGoingBtn = document.getElementById('rsvp-not-going');
    
    if (!rsvpStatus) return;
    
    // Reset button states
    if (rsvpGoingBtn) {
        rsvpGoingBtn.classList.remove('active');
        rsvpGoingBtn.disabled = false;
    }
    if (rsvpMaybeBtn) {
        rsvpMaybeBtn.classList.remove('active');
        rsvpMaybeBtn.disabled = false;
    }
    if (rsvpNotGoingBtn) {
        rsvpNotGoingBtn.classList.remove('active');
        rsvpNotGoingBtn.disabled = false;
    }
    
    if (currentRsvp) {
        // Show current RSVP status
        const statusText = {
            'going': 'You are going to this event',
            'maybe': 'You might attend this event',
            'not_going': 'You are not going to this event'
        };
        rsvpStatus.innerHTML = `<p class="rsvp-status-text">${statusText[currentRsvp.status] || 'You have RSVPed'}</p>`;
        
        // Highlight active button
        if (currentRsvp.status === 'going' && rsvpGoingBtn) {
            rsvpGoingBtn.classList.add('active');
        } else if (currentRsvp.status === 'maybe' && rsvpMaybeBtn) {
            rsvpMaybeBtn.classList.add('active');
        } else if (currentRsvp.status === 'not_going' && rsvpNotGoingBtn) {
            rsvpNotGoingBtn.classList.add('active');
        }
    } else {
        rsvpStatus.innerHTML = '<p class="rsvp-status-text">You haven\'t RSVPed yet</p>';
    }
}

// Update RSVP counts UI
function updateRsvpCountsUI(counts) {
    const rsvpCounts = document.getElementById('rsvp-counts');
    if (!rsvpCounts) return;
    
    const goingCount = counts.going || 0;
    const attendeeText = goingCount === 1 ? 'person' : 'people';
    
    rsvpCounts.innerHTML = `
        <div class="rsvp-count-display">
            <span class="rsvp-count-icon">👥</span>
            <div class="rsvp-count-content">
                <span class="rsvp-count-value">${goingCount}</span>
                <span class="rsvp-count-label">${attendeeText} going</span>
            </div>
        </div>
    `;
}

// Handle RSVP button click
async function handleRsvp(status) {
    if (!currentEventId) return;
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showError('You must be logged in to RSVP');
        return;
    }
    
    try {
        const response = await fetch(`/api/events/${currentEventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: status })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.message || 'Failed to update RSVP');
            return;
        }
        
        // Reload RSVP and counts
        await loadRsvp();
        await loadRsvpCounts();
        
        // Show success message
        const successMessages = {
            'going': 'You are now going to this event!',
            'maybe': 'You marked yourself as maybe attending',
            'not_going': 'You marked yourself as not going'
        };
        showSuccess(successMessages[status] || 'RSVP updated successfully');
        
    } catch (error) {
        console.error('Error updating RSVP:', error);
        showError('An error occurred while updating your RSVP');
    }
}

// Show success message
function showSuccess(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorBanner && errorMessage) {
        errorMessage.textContent = message;
        errorBanner.classList.remove('hidden');
        errorBanner.style.backgroundColor = '#4caf50';
        setTimeout(() => {
            if (errorBanner) {
                errorBanner.classList.add('hidden');
                errorBanner.style.backgroundColor = '';
            }
        }, 3000);
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
    
    // RSVP button event listeners
    const rsvpGoingBtn = document.getElementById('rsvp-going');
    const rsvpMaybeBtn = document.getElementById('rsvp-maybe');
    const rsvpNotGoingBtn = document.getElementById('rsvp-not-going');
    
    if (rsvpGoingBtn) {
        rsvpGoingBtn.addEventListener('click', () => handleRsvp('going'));
    }
    if (rsvpMaybeBtn) {
        rsvpMaybeBtn.addEventListener('click', () => handleRsvp('maybe'));
    }
    if (rsvpNotGoingBtn) {
        rsvpNotGoingBtn.addEventListener('click', () => handleRsvp('not_going'));
    }
});

