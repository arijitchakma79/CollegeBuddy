// Organization detail page logic

let currentOrgId = null;
let userRole = null;
let currentOrg = null;

// Get organization ID from URL
function getOrgIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/organizations\/(\d+)/);
    return match ? match[1] : null;
}

// Load organization details
async function loadOrganization() {
    const orgId = getOrgIdFromUrl();
    if (!orgId) {
        showNotFound();
        return;
    }
    
    currentOrgId = orgId;
    
    const loading = document.getElementById('loading');
    const orgDetail = document.getElementById('org-detail');
    const notFound = document.getElementById('not-found');
    
    if (loading) loading.classList.remove('hidden');
    if (orgDetail) orgDetail.classList.add('hidden');
    if (notFound) notFound.classList.add('hidden');
    
    try {
        const response = await fetch(`/api/organizations/${orgId}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            showError(data.message || 'Failed to load organization');
            showNotFound();
            return;
        }
        
        const org = data.organization;
        currentOrg = org; // Store current org data
        
        // Update page content
        if (document.getElementById('org-title')) {
            document.getElementById('org-title').textContent = org.name || 'Unnamed Organization';
        }
        
        if (document.getElementById('org-description')) {
            document.getElementById('org-description').textContent = org.description || 'No description available.';
        }
        
        // Update member count
        if (document.getElementById('org-member-count')) {
            document.getElementById('org-member-count').textContent = org.member_count || 0;
        }
        
        // Check user's role in organization
        await checkUserRole(orgId);
        
        // Load events for the organization
        await loadEvents(orgId);
        
        // Show content, hide loading
        if (loading) loading.classList.add('hidden');
        if (orgDetail) orgDetail.classList.remove('hidden');
        if (notFound) notFound.classList.add('hidden');
        
    } catch (error) {
        console.error('Error loading organization:', error);
        showError('An error occurred while loading the organization');
        showNotFound();
    }
}

// Show error state
function showNotFound() {
    const loading = document.getElementById('loading');
    const orgDetail = document.getElementById('org-detail');
    const notFound = document.getElementById('not-found');
    
    if (loading) loading.classList.add('hidden');
    if (orgDetail) orgDetail.classList.add('hidden');
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

// Hide error message
function hideError() {
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
        errorBanner.classList.add('hidden');
    }
}

// Check user's role in the organization
async function checkUserRole(orgId) {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    try {
        const response = await fetch(`/api/memberships/organization/${orgId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.userRole) {
                userRole = result.userRole;
                
                // Only show "Edit Organization", "Create Event", and "Delete Organization" buttons if user is admin
                const editOrgBtn = document.getElementById('edit-org-btn');
                const createEventBtn = document.getElementById('create-event-btn');
                const deleteOrgBtn = document.getElementById('delete-org-btn');
                
                if (editOrgBtn) {
                    if (userRole === 'admin') {
                        editOrgBtn.classList.remove('hidden');
                    } else {
                        editOrgBtn.classList.add('hidden');
                    }
                }
                if (createEventBtn) {
                    if (userRole === 'admin') {
                        createEventBtn.classList.remove('hidden');
                    } else {
                        createEventBtn.classList.add('hidden');
                    }
                }
                if (deleteOrgBtn) {
                    if (userRole === 'admin') {
                        deleteOrgBtn.classList.remove('hidden');
                    } else {
                        deleteOrgBtn.classList.add('hidden');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Load events for the organization
async function loadEvents(orgId) {
    const loading = document.getElementById('events-loading');
    const eventsList = document.getElementById('events-list');
    const eventsEmpty = document.getElementById('events-empty');
    
    if (loading) loading.classList.remove('hidden');
    if (eventsList) eventsList.classList.add('hidden');
    if (eventsEmpty) eventsEmpty.classList.add('hidden');
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/events?org_id=${orgId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (loading) loading.classList.add('hidden');
        
        if (!response.ok || !result.success) {
            console.error('Failed to load events:', result.message);
            if (eventsEmpty) eventsEmpty.classList.remove('hidden');
            return;
        }
        
        const events = result.events || [];
        
        if (events.length === 0) {
            if (eventsEmpty) eventsEmpty.classList.remove('hidden');
            if (eventsList) eventsList.classList.add('hidden');
        } else {
            if (eventsEmpty) eventsEmpty.classList.add('hidden');
            if (eventsList) {
                eventsList.classList.remove('hidden');
                displayEvents(events);
            }
        }
    } catch (error) {
        console.error("Failed to load events:", error);
        if (loading) loading.classList.add('hidden');
        if (eventsEmpty) eventsEmpty.classList.remove('hidden');
    }
}

// Display events
async function displayEvents(events) {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;
    
    eventsList.innerHTML = '';
    
    // Load RSVPs for all events in parallel
    const token = localStorage.getItem('authToken');
    const rsvpPromises = events.map(event => loadEventRsvp(event.event_id, token));
    const rsvps = await Promise.all(rsvpPromises);
    const rsvpMap = {};
    rsvps.forEach((rsvp, index) => {
        if (rsvp) {
            rsvpMap[events[index].event_id] = rsvp;
        }
    });
    
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.style.cursor = 'pointer'; // Make it look clickable
        
        // Add click handler to navigate to event detail page
        eventCard.addEventListener('click', () => {
            window.location.href = `/events/${event.event_id}`;
        });
        
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        const formattedStart = startDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const formattedEnd = endDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const price = event.price_cents ? `$${(event.price_cents / 100).toFixed(2)}` : 'Free';
        
        // Get RSVP status for this event
        const rsvp = rsvpMap[event.event_id];
        let rsvpBadge = '';
        if (rsvp) {
            const statusLabels = {
                'going': 'Going',
                'maybe': 'Maybe',
                'not_going': 'Not Going'
            };
            const statusClasses = {
                'going': 'rsvp-badge-going',
                'maybe': 'rsvp-badge-maybe',
                'not_going': 'rsvp-badge-not-going'
            };
            rsvpBadge = `<span class="rsvp-badge ${statusClasses[rsvp.status] || ''}">${statusLabels[rsvp.status] || 'RSVPed'}</span>`;
        }
        
        eventCard.innerHTML = `
            <div class="event-card-header">
                <h4>${event.title || 'Untitled Event'}</h4>
                ${rsvpBadge}
            </div>
            <div class="event-card-body">
                <p class="event-description">${event.description || 'No description available.'}</p>
                <div class="event-card-info">
                    <p class="event-date"><strong>Start:</strong> ${formattedStart}</p>
                    <p class="event-date"><strong>End:</strong> ${formattedEnd}</p>
                    ${event.location ? `<p class="event-location"><strong>Location:</strong> ${event.location}</p>` : ''}
                    ${event.attendee_cap ? `<p class="event-cap"><strong>Attendee Cap:</strong> ${event.attendee_cap}</p>` : ''}
                    <p class="event-price"><strong>Price:</strong> ${price}</p>
                    ${event.restricted_to_org ? '<p class="event-restricted"><strong>Restricted to Organization Members</strong></p>' : ''}
                </div>
            </div>
        `;
        
        eventsList.appendChild(eventCard);
    });
}

// Load RSVP for a single event
async function loadEventRsvp(eventId, token) {
    if (!token) return null;
    
    try {
        const response = await fetch(`/api/events/${eventId}/rsvp`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success && data.rsvp) {
            return data.rsvp;
        }
        return null;
    } catch (error) {
        console.error(`Error loading RSVP for event ${eventId}:`, error);
        return null;
    }
}

// Modal functions
function openEventModal() {
    const modal = document.getElementById('create-event-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeEventModal() {
    const modal = document.getElementById('create-event-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset form
        const form = document.getElementById('create-event-form');
        if (form) {
            form.reset();
        }
        // Clear errors
        hideError();
        const errorSpans = document.querySelectorAll('#create-event-form .error-message');
        errorSpans.forEach(span => span.textContent = '');
    }
}

// Convert datetime-local to ISO string
function convertToISOString(dateTimeLocal) {
    if (!dateTimeLocal) return null;
    const date = new Date(dateTimeLocal);
    return date.toISOString();
}

// Handle form submission - POST to /api/events/create
async function handleCreateEvent(event) {
    // Prevent default form submission
    event.preventDefault();
    event.stopPropagation();
    
    console.log('handleCreateEvent called - submitting POST to /api/events/create');
    hideError();
    
    // Clear previous errors
    const errorSpans = document.querySelectorAll('#create-event-form .error-message');
    errorSpans.forEach(span => span.textContent = '');
    
    // Get form values
    const title = document.getElementById('event-title').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const location = document.getElementById('event-location').value.trim();
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const attendeeCap = document.getElementById('event-attendee-cap').value;
    const price = document.getElementById('event-price').value;
    const isPublic = document.getElementById('event-public').checked;
    
    console.log('Form data:', { title, startTime, endTime, currentOrgId });
    
    // Validation
    if (!title) {
        const titleError = document.getElementById('title-error');
        if (titleError) titleError.textContent = 'Event title is required';
        return;
    }
    
    if (!startTime) {
        const startTimeError = document.getElementById('start-time-error');
        if (startTimeError) startTimeError.textContent = 'Start time is required';
        return;
    }
    
    if (!endTime) {
        const endTimeError = document.getElementById('end-time-error');
        if (endTimeError) endTimeError.textContent = 'End time is required';
        return;
    }
    
    // Validate end time is after start time
    if (new Date(endTime) <= new Date(startTime)) {
        const endTimeError = document.getElementById('end-time-error');
        if (endTimeError) endTimeError.textContent = 'End time must be after start time';
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showError('You must be logged in to create an event');
            return;
        }
        
        // Always include org_id from URL when creating event from organization page
        if (!currentOrgId) {
            showError('Organization ID not found. Please refresh the page.');
            return;
        }
        
        // Prepare event data
        const eventData = {
            title: title,
            start_time: convertToISOString(startTime),
            end_time: convertToISOString(endTime),
            created_by_org_id: parseInt(currentOrgId)
        };
        
        if (description) {
            eventData.description = description;
        }
        
        if (location) {
            eventData.location = location;
        }
        
        if (attendeeCap) {
            eventData.attendee_cap = parseInt(attendeeCap);
        }
        
        if (price) {
            eventData.price_cents = Math.round(parseFloat(price) * 100);
        }
        
        // Set public field (if public is true, restricted_to_org will be false)
        eventData.public = isPublic;
        
        console.log('Sending POST request to /api/events/create with data:', eventData);
        console.log('Auth token present:', !!authToken);
        
        // Make POST request to /api/events/create
        const response = await fetch('/api/events/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(eventData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('Failed to create event:', data);
            if (data.errors) {
                // Handle field-specific errors
                Object.keys(data.errors).forEach(field => {
                    const errorEl = document.getElementById(`${field}-error`);
                    if (errorEl) {
                        errorEl.textContent = data.errors[field];
                    }
                });
            }
            showError(data.message || 'Failed to create event');
            return;
        }
        
        // Success - close modal and reload events
        console.log('Event created successfully:', data);
        closeEventModal();
        showError('Event created successfully!');
        // Reload events to show the new event
        await loadEvents(currentOrgId);
        
    } catch (error) {
        console.error('Error creating event:', error);
        showError('An error occurred while creating the event');
    }
}

// Open edit organization modal
function openEditOrgModal() {
    if (!currentOrg) return;
    
    const modal = document.getElementById('edit-org-modal');
    const nameInput = document.getElementById('edit-org-name');
    const descInput = document.getElementById('edit-org-description');
    
    if (modal && nameInput && descInput) {
        // Populate form with current values
        nameInput.value = currentOrg.name || '';
        descInput.value = currentOrg.description || '';
        
        // Clear any previous errors
        const nameError = document.getElementById('edit-name-error');
        const descError = document.getElementById('edit-description-error');
        if (nameError) nameError.textContent = '';
        if (descError) descError.textContent = '';
        
        modal.classList.remove('hidden');
    }
}

// Close edit organization modal
function closeEditOrgModal() {
    const modal = document.getElementById('edit-org-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle edit organization form submission
async function handleEditOrganization(event) {
    event.preventDefault();
    
    if (!currentOrgId || !currentOrg) return;
    
    const nameInput = document.getElementById('edit-org-name');
    const descInput = document.getElementById('edit-org-description');
    const nameError = document.getElementById('edit-name-error');
    const descError = document.getElementById('edit-description-error');
    
    if (nameError) nameError.textContent = '';
    if (descError) descError.textContent = '';
    
    const name = nameInput?.value.trim();
    const description = descInput?.value.trim();
    
    if (!name) {
        if (nameError) nameError.textContent = 'Organization name is required';
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showError('You must be logged in to update an organization');
        return;
    }
    
    try {
        const response = await fetch(`/api/organizations/${currentOrgId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description || null
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.message || data.error || 'Failed to update organization';
            if (data.errors) {
                if (data.errors.name && nameError) {
                    nameError.textContent = data.errors.name;
                }
                if (data.errors.description && descError) {
                    descError.textContent = data.errors.description;
                }
            }
            showError(errorMsg);
            return;
        }
        
        // Success - update current org data and refresh display
        currentOrg = data.organization;
        if (document.getElementById('org-title')) {
            document.getElementById('org-title').textContent = data.organization.name || 'Unnamed Organization';
        }
        if (document.getElementById('org-description')) {
            document.getElementById('org-description').textContent = data.organization.description || 'No description available.';
        }
        
        closeEditOrgModal();
        showError('Organization updated successfully!');
        
    } catch (error) {
        console.error('Error updating organization:', error);
        showError(`An error occurred while updating the organization: ${error.message}`);
    }
}

// Handle delete event
async function handleDeleteEvent(eventId) {
    if (!eventId) return;
    
    const eventTitle = document.querySelector(`[data-event-id="${eventId}"]`)?.closest('.event-card')?.querySelector('h4')?.textContent || 'this event';
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showError('You must be logged in to delete an event');
        return;
    }
    
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.message || data.error || 'Failed to delete event';
            showError(errorMsg);
            return;
        }
        
        // Success - reload events
        showError('Event deleted successfully!');
        await loadEvents(currentOrgId);
        
    } catch (error) {
        console.error('Error deleting event:', error);
        showError(`An error occurred while deleting the event: ${error.message}`);
    }
}

// Handle delete organization
async function handleDeleteOrganization() {
    if (!currentOrgId) return;
    
    const orgName = document.getElementById('org-title')?.textContent || 'this organization';
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone and will delete all events and memberships associated with this organization.`)) {
        return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showError('You must be logged in to delete an organization');
        return;
    }
    
    try {
        const response = await fetch(`/api/organizations/${currentOrgId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Response is not JSON (likely HTML error page)
            const text = await response.text();
            console.error('Non-JSON response received:', text.substring(0, 200));
            showError('Server returned an error page. Please check the console for details.');
            return;
        }
        
        if (!response.ok) {
            const errorMsg = data.message || data.error || 'Failed to delete organization';
            console.error('Delete organization error:', data);
            showError(errorMsg);
            return;
        }
        
        // Success - redirect to organizations page
        showError('Organization deleted successfully!');
        setTimeout(() => {
            window.location.href = '/protected/organizations';
        }, 1000);
        
    } catch (error) {
        console.error('Error deleting organization:', error);
        showError(`An error occurred while deleting the organization: ${error.message}`);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadOrganization();
    
    // Modal event listeners
    const editOrgBtn = document.getElementById('edit-org-btn');
    const createEventBtn = document.getElementById('create-event-btn');
    const deleteOrgBtn = document.getElementById('delete-org-btn');
    const closeEditOrgModalBtn = document.getElementById('close-edit-org-modal');
    const cancelEditOrgBtn = document.getElementById('cancel-edit-org');
    const editOrgForm = document.getElementById('edit-org-form');
    const closeEventModalBtn = document.getElementById('close-event-modal');
    const cancelEventBtn = document.getElementById('cancel-event');
    const form = document.getElementById('create-event-form');
    
    if (editOrgBtn) {
        editOrgBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openEditOrgModal();
        });
    }
    
    if (closeEditOrgModalBtn) {
        closeEditOrgModalBtn.addEventListener('click', closeEditOrgModal);
    }
    
    if (cancelEditOrgBtn) {
        cancelEditOrgBtn.addEventListener('click', closeEditOrgModal);
    }
    
    if (editOrgForm) {
        editOrgForm.addEventListener('submit', handleEditOrganization);
    }
    
    if (createEventBtn) {
        createEventBtn.addEventListener('click', openEventModal);
    }
    
    if (deleteOrgBtn) {
        deleteOrgBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            handleDeleteOrganization();
        });
    }
    
    if (closeEventModalBtn) {
        closeEventModalBtn.addEventListener('click', closeEventModal);
    }
    
    if (cancelEventBtn) {
        cancelEventBtn.addEventListener('click', closeEventModal);
    }
    
    // Attach form submit handler - ensures POST to /api/events/create
    if (form) {
        console.log('Form found, attaching submit listener for POST /api/events/create');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleCreateEvent(e).catch(err => {
                console.error('Error in handleCreateEvent:', err);
                showError('An error occurred while creating the event');
            });
            return false;
        });
    } else {
        console.error('Create event form not found!');
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('create-event-modal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeEventModal();
            }
        });
    }
});

