// Events page - Load and display all events
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('authToken');

    // If no token, redirect to login
    if (!token) {
        window.location.href = '/auth/login';
        return;
    }

    // Load events
    await loadAllEvents(token);
});

// Load all events
async function loadAllEvents(token) {
    const loading = document.getElementById('loading');
    const eventsList = document.getElementById('events-list');
    const eventsEmpty = document.getElementById('events-empty');
    
    if (loading) loading.classList.remove('hidden');
    if (eventsList) eventsList.classList.add('hidden');
    if (eventsEmpty) eventsEmpty.classList.add('hidden');
    
    try {
        const response = await fetch('/api/events', {
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
                displayEvents(events, token);
            }
        }
    } catch (error) {
        console.error("Failed to load events:", error);
        if (loading) loading.classList.add('hidden');
        if (eventsEmpty) eventsEmpty.classList.remove('hidden');
    }
}

// Display events
async function displayEvents(events, token) {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;
    
    eventsList.innerHTML = '';
    
    // Load RSVPs for all events in parallel
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
        eventCard.style.cursor = 'pointer';
        
        // Add click handler to navigate to event detail page
        eventCard.addEventListener('click', () => {
            window.location.href = `/events/${event.event_id}`;
        });
        
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        const formattedStart = startDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const formattedEnd = endDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format date for display
        const dateStr = startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timeStr = startDate.toLocaleTimeString('en-US', {
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
        
        // Check if event is upcoming or past
        const now = new Date();
        const isUpcoming = startDate > now;
        const isPast = endDate < now;
        const eventStatus = isPast ? 'past' : (isUpcoming ? 'upcoming' : 'ongoing');
        
        eventCard.innerHTML = `
            <div class="event-card-header">
                <div class="event-title-section">
                    <h3>${event.title || 'Untitled Event'}</h3>
                    ${rsvpBadge}
                </div>
            </div>
            <div class="event-card-body">
                <p class="event-description">${event.description || 'No description available.'}</p>
                <div class="event-card-info">
                    <div class="event-info-item">
                        <span class="event-icon">📅</span>
                        <div class="event-info-content">
                            <span class="event-info-label">Date & Time</span>
                            <span class="event-info-value">${dateStr} at ${timeStr}</span>
                        </div>
                    </div>
                    ${event.location ? `
                    <div class="event-info-item">
                        <span class="event-icon">📍</span>
                        <div class="event-info-content">
                            <span class="event-info-label">Location</span>
                            <span class="event-info-value">${event.location}</span>
                        </div>
                    </div>
                    ` : ''}
                    <div class="event-info-item">
                        <span class="event-icon">💰</span>
                        <div class="event-info-content">
                            <span class="event-info-label">Price</span>
                            <span class="event-info-value ${price === 'Free' ? 'event-free' : ''}">${price}</span>
                        </div>
                    </div>
                    ${event.attendee_cap ? `
                    <div class="event-info-item">
                        <span class="event-icon">👥</span>
                        <div class="event-info-content">
                            <span class="event-info-label">Capacity</span>
                            <span class="event-info-value">${event.attendee_cap} attendees</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ${event.restricted_to_org ? '<div class="event-restricted-badge">🔒 Organization Members Only</div>' : ''}
            </div>
        `;
        
        // Add status class for styling
        if (eventStatus === 'past') {
            eventCard.classList.add('event-past');
        } else if (eventStatus === 'ongoing') {
            eventCard.classList.add('event-ongoing');
        }
        
        eventsList.appendChild(eventCard);
    });
}

// Load RSVP for a single event
async function loadEventRsvp(eventId, token) {
    if (!token) return null;
    
    try {
        const response = await fetch(`/api/events/${eventId}/rsvp`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (!response.ok) return null;
        
        const result = await response.json();
        return result.rsvp || null;
    } catch (error) {
        console.error(`Error loading RSVP for event ${eventId}:`, error);
        return null;
    }
}
