let allEvents = [];

// Events page - Load and display all events
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('authToken');

    // If no token, redirect to login
    if (!token) {
        window.location.href = '/auth/login';
        return;
    }

    // Check for payment success/cancel query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
        showPaymentSuccessMessage();
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancel') {
        showPaymentCancelMessage();
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load events
    await loadAllEvents(token);

    // Set up search functionality
    const searchInput = document.getElementById("searchInputEvent");
    if (searchInput) {
        searchInput.addEventListener("input", applyEventSearch);
    }
});

// Show payment success message
function showPaymentSuccessMessage() {
    // Create success banner
    const banner = document.createElement('div');
    banner.style.cssText = 'background-color: #28a745; color: white; padding: 1rem; margin-bottom: 1rem; border-radius: 6px; text-align: center; font-weight: 600;';
    banner.textContent = '✅ Payment successful! You can now RSVP to the event.';
    
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
        pageContent.insertBefore(banner, pageContent.firstChild);
        
        // Remove banner after 5 seconds
        setTimeout(() => {
            banner.remove();
        }, 5000);
    }
}

// Show payment cancel message
function showPaymentCancelMessage() {
    // Create cancel banner
    const banner = document.createElement('div');
    banner.style.cssText = 'background-color: #ffc107; color: #333; padding: 1rem; margin-bottom: 1rem; border-radius: 6px; text-align: center; font-weight: 600;';
    banner.textContent = '⚠️ Payment was cancelled. Please complete payment to RSVP to paid events.';
    
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
        pageContent.insertBefore(banner, pageContent.firstChild);
        
        // Remove banner after 5 seconds
        setTimeout(() => {
            banner.remove();
        }, 5000);
    }
}

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
        allEvents = events;

        if (events.length === 0) {
            if (eventsEmpty) eventsEmpty.classList.remove('hidden');
            if (eventsList) eventsList.classList.add('hidden');
        } else {
            if (eventsEmpty) eventsEmpty.classList.add('hidden');
            if (eventsList) {
                eventsList.classList.remove('hidden');
                await displayEvents(events, token);
            }
        }
    } catch (error) {
        console.error("Failed to load events:", error);
        if (loading) loading.classList.add('hidden');
        if (eventsEmpty) eventsEmpty.classList.remove('hidden');
    }
}

// Search filter
function applyEventSearch() {
    const input = document.getElementById("searchInputEvent");
    if (!input) return;

    const q = input.value.toLowerCase().trim();
    const token = localStorage.getItem('authToken');

    if (q === "") {
        displayEvents(allEvents, token);
        return;
    }

    const filtered = allEvents.filter(ev =>
        (ev.title && ev.title.toLowerCase().includes(q)) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.location && ev.location.toLowerCase().includes(q))
    );

    displayEvents(filtered, token);
}

// Display events
async function displayEvents(events, token) {
    const eventsList = document.getElementById('events-list');
    const eventsEmpty = document.getElementById('events-empty');

    if (!eventsList) return;

    if (!events || events.length === 0) {
        eventsList.classList.add('hidden');
        if (eventsEmpty) eventsEmpty.classList.remove('hidden');
        return;
    }

    if (eventsEmpty) eventsEmpty.classList.add('hidden');
    eventsList.classList.remove('hidden');

    eventsList.innerHTML = '';

    // Load RSVPs for all events
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

        // Navigate to event detail page when clicking card
        eventCard.addEventListener('click', () => {
            window.location.href = `/events/${event.event_id}`;
        });

        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
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

        const now = new Date();
        const isPast = endDate < now;
        const isUpcoming = startDate > now;
        const eventStatus = isPast ? 'past' : (isUpcoming ? 'upcoming' : 'ongoing');

        // FREE OR PAID BUTTON
        const actionButtonHTML = event.price_cents > 0
            ? `<button class="event-pay-btn" onclick="payForEvent(event, ${event.event_id}, '${event.title}', ${event.price_cents}); event.stopPropagation();">Pay ${price}</button>`
            : `<button class="event-join-btn" onclick="joinEvent(event, ${event.event_id}); event.stopPropagation();">Join Event</button>`;

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
                </div>

                <div class="event-card-actions">
                    ${actionButtonHTML}
                </div>
            </div>
        `;

        if (eventStatus === 'past') {
            eventCard.classList.add('event-past');
        } else if (eventStatus === 'ongoing') {
            eventCard.classList.add('event-ongoing');
        }

        eventsList.appendChild(eventCard);
    });
}

// JOIN FOR FREE EVENTS
async function joinEvent(e, event_id) {
    e.stopPropagation();
    const token = localStorage.getItem("authToken");

    const res = await fetch("/api/event-attendance/join", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ event_id })
    });

    const data = await res.json();
    if (data.success) {
        alert("You joined the event!");
    } else {
        alert(data.message || "Failed to join.");
    }
}

// PAY FOR PAID EVENTS
async function payForEvent(e, event_id, title, price_cents) {
    e.stopPropagation();

    const token = localStorage.getItem("authToken");
    const user_id = localStorage.getItem("user_id");

    const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            event_id,
            title,
            price_cents,
            user_id
        })
    });

    const data = await res.json();

    if (data.success && data.url) {
        window.location.href = data.url;
    } else {
        alert("Unable to start payment.");
    }
}

// Load single RSVP
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
