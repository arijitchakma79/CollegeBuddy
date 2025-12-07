// Dashboard events - Load and display events filtered by time
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('authToken');

    // If no token, redirect to login
    if (!token) {
        window.location.href = '/auth/login';
        return;
    }

    // Load and display events filtered by time
    await loadDashboardEvents(token);
});

// Load all events and filter by time
async function loadDashboardEvents(token) {
    // Show loading states
    const upcomingLoading = document.getElementById('upcoming-loading');
    const pastLoading = document.getElementById('past-loading');
    if (upcomingLoading) upcomingLoading.classList.remove('hidden');
    if (pastLoading) pastLoading.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/events', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            console.error('Failed to load events:', result.message);
            if (upcomingLoading) upcomingLoading.classList.add('hidden');
            if (pastLoading) pastLoading.classList.add('hidden');
            return;
        }
        
        const events = result.events || [];
        
        // Filter events by time
        const now = new Date();
        const upcomingEvents = [];
        const pastEvents = [];
        
        events.forEach(event => {
            if (!event.start_time || !event.end_time) {
                // Skip events without valid times
                return;
            }
            
            const startDate = new Date(event.start_time);
            const endDate = new Date(event.end_time);
            
            // Validate dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Invalid date for event:', event.event_id, event.start_time, event.end_time);
                return;
            }
            
            // Get time in milliseconds for accurate comparison
            const startTime = startDate.getTime();
            const endTime = endDate.getTime();
            const nowTime = now.getTime();
            
            // Event is past if BOTH start and end times have passed
            // This ensures events that started in the past but haven't ended yet are still considered upcoming
            if (startTime < nowTime && endTime <= nowTime) {
                pastEvents.push(event);
            } 
            // Event is upcoming if it hasn't started yet, or if it started but hasn't ended yet
            else {
                upcomingEvents.push(event);
            }
        });
        
        // Sort upcoming events by start time (earliest first)
        upcomingEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        
        // Sort past events by end time (most recent first)
        pastEvents.sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
        
        // Display upcoming events
        await displayDashboardEvents(upcomingEvents, token, 'upcoming');
        
        // Display past events
        await displayDashboardEvents(pastEvents, token, 'past');
        
    } catch (error) {
        console.error("Failed to load events:", error);
    }
}

// Display events in the dashboard
async function displayDashboardEvents(events, token, type) {
    const eventsList = document.getElementById(`${type}-events-list`);
    const eventsEmpty = document.getElementById(`${type}-events-empty`);
    const loading = document.getElementById(`${type}-loading`);
    
    if (!eventsList) return;
    
    if (loading) loading.classList.add('hidden');
    
    if (!events || events.length === 0) {
        eventsList.classList.add('hidden');
        if (eventsEmpty) eventsEmpty.classList.remove('hidden');
        return;
    }
    
    if (eventsEmpty) eventsEmpty.classList.add('hidden');
    eventsList.classList.remove('hidden');
    
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
        
        // Format dates for display
        const startDateStr = startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const startTimeStr = startDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const endDateStr = endDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const endTimeStr = endDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Combine date and time strings
        const startDateTimeStr = `${startDateStr} at ${startTimeStr}`;
        const endDateTimeStr = `${endDateStr} at ${endTimeStr}`;
        
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
                            <span class="event-info-label">Start Time</span>
                            <span class="event-info-value">${startDateTimeStr}</span>
                        </div>
                    </div>
                    <div class="event-info-item">
                        <span class="event-icon">🕐</span>
                        <div class="event-info-content">
                            <span class="event-info-label">End Time</span>
                            <span class="event-info-value">${endDateTimeStr}</span>
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

