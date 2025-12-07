// Event detail page logic
let currentEventId = null;
let currentEvent = null;
let currentRsvp = null;
let canDeleteEvent = false;

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

    const loading = document.getElementById("loading");
    const eventDetail = document.getElementById("event-detail");
    const notFound = document.getElementById("not-found");

    if (loading) loading.classList.remove("hidden");
    if (eventDetail) eventDetail.classList.add("hidden");
    if (notFound) notFound.classList.add("hidden");

    try {
        const token = localStorage.getItem("authToken");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`/api/events/${eventId}`, { headers });
        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.message || "Failed to load event");
            showNotFound();
            return;
        }

        const event = data.event;
        currentEvent = event;

        // ⭐ CHECK DELETE PERMISSIONS
        await checkDeletePermission(event);

        // Update title & description
        if (document.getElementById('event-title')) {
            document.getElementById('event-title').textContent = event.title || 'Untitled Event';
        }
        if (document.getElementById('event-description')) {
            document.getElementById('event-description').textContent = event.description || 'No description available.';
        }

        // Format dates
        const formattedStart = new Date(event.start_time).toLocaleString("en-US");
        const formattedEnd = new Date(event.end_time).toLocaleString("en-US");

        const price = event.price_cents ? `$${(event.price_cents / 100).toFixed(2)}` : "Free";

        const eventDetails = document.getElementById("event-details");
        if (eventDetails) {
            eventDetails.innerHTML = `
                <div class="info-item"><span class="info-label">Start Time</span><span class="info-value">${formattedStart}</span></div>
                <div class="info-item"><span class="info-label">End Time</span><span class="info-value">${formattedEnd}</span></div>
                ${event.location ? `<div class="info-item"><span class="info-label">Location</span><span class="info-value">${event.location}</span></div>` : ""}
                ${event.attendee_cap ? `<div class="info-item"><span class="info-label">Attendee Cap</span><span class="info-value">${event.attendee_cap}</span></div>` : ""}
                <div class="info-item"><span class="info-label">Price</span><span class="info-value">${price}</span></div>
            `;
        }

        // ⭐ PAYMENT BUTTON
        const paymentSection = document.getElementById("payment-section");
        const payButton = document.getElementById("pay-button");

        if (event.price_cents > 0) {
            paymentSection.classList.remove("hidden");
            payButton.textContent = `Pay $${(event.price_cents / 100).toFixed(2)}`;
            payButton.onclick = () => payForEvent(event.event_id, event.title, event.price_cents);
        } else {
            paymentSection.classList.add("hidden");
        }

        if (loading) loading.classList.add("hidden");
        if (eventDetail) eventDetail.classList.remove("hidden");
        if (notFound) notFound.classList.add("hidden");

        // RSVP
        if (event.created_by_org_id) {
            document.getElementById("rsvp-section")?.classList.remove("hidden");
            await loadRsvp();
            await loadRsvpCounts();
        } else {
            document.getElementById("rsvp-section")?.classList.add("hidden");
        }

    } catch (error) {
        console.error("Error loading event:", error);
        showError("An error occurred while loading the event");
        showNotFound();
    }
}

// Payment handler
async function payForEvent(event_id, title, price_cents) {
    const token = localStorage.getItem("authToken");
    const user_id = localStorage.getItem("user_id");

    const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id, title, price_cents, user_id }),
    });

    const data = await res.json();
    if (data.success && data.url) {
        window.location.href = data.url;
    } else {
        showError("Unable to start payment.");
    }
}

// Error UI
function showNotFound() {
    document.getElementById("loading")?.classList.add("hidden");
    document.getElementById("event-detail")?.classList.add("hidden");
    document.getElementById("not-found")?.classList.remove("hidden");
}

function showError(message) {
    const errorBanner = document.getElementById("error-banner");
    const errorMessage = document.getElementById("error-message");

    if (errorBanner && errorMessage) {
        errorMessage.textContent = message;
        errorBanner.classList.remove("hidden");
        setTimeout(() => errorBanner.classList.add("hidden"), 5000);
    }
}

// ⭐ DELETE PERMISSION CHECK
async function checkDeletePermission(event) {
    const token = localStorage.getItem("authToken");

    if (!token) return updateDeleteButton(false);

    try {
        const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) return updateDeleteButton(false);

        const data = await res.json();
        const userId = data.user?.id;

        let allowed = false;

        if (event.created_by_user_id === userId) {
            allowed = true;
        } else if (event.created_by_org_id) {
            const orgRes = await fetch(`/api/memberships/organization/${event.created_by_org_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const orgData = await orgRes.json();
            allowed = orgData.success && orgData.userRole === "admin";
        }

        updateDeleteButton(allowed);

    } catch (err) {
        console.error(err);
        updateDeleteButton(false);
    }
}

function updateDeleteButton(show) {
    const btn = document.getElementById("delete-event-btn");
    if (!btn) return;
    btn.classList.toggle("hidden", !show);
}

// ⭐ DELETE EVENT FUNCTION
async function handleDeleteEvent() {
    if (!currentEventId || !currentEvent) return;

    const name = currentEvent.title || "this event";
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;

    const token = localStorage.getItem("authToken");
    if (!token) return showError("You must be logged in to delete an event.");

    try {
        const res = await fetch(`/api/events/${currentEventId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await res.json();

        if (!res.ok) return showError(data.message || "Failed to delete event");

        showError("Event deleted successfully!");

        // ⭐ REDIRECT after deletion
        setTimeout(() => {
            window.location.href = "/events";
        }, 1200);

    } catch (error) {
        showError("An error occurred while deleting the event.");
    }
}

// Back button
function handleBack() {
    window.location.href = "/events";
}

// RSVP FUNCTIONS (unchanged)
async function loadRsvp() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const res = await fetch(`/api/events/${currentEventId}/rsvp`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    currentRsvp = data.success ? data.rsvp : null;

    updateRsvpUI();
}

async function loadRsvpCounts() {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const res = await fetch(`/api/events/${currentEventId}/rsvps`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!data.success) return;

    const rsvps = data.rsvps || [];

    updateRsvpCountsUI({
        going: rsvps.filter(r => r.status === "going").length,
        maybe: rsvps.filter(r => r.status === "maybe").length,
        not_going: rsvps.filter(r => r.status === "not_going").length
    });
}

function updateRsvpUI() {
    const label = {
        going: "You are going",
        maybe: "You might attend",
        not_going: "You are not going"
    };

    const rsvpStatus = document.getElementById("rsvp-status");
    if (!rsvpStatus) return;

    if (!currentRsvp) {
        rsvpStatus.textContent = "You haven't RSVPed yet";
        return;
    }

    rsvpStatus.textContent = label[currentRsvp.status];
}

function updateRsvpCountsUI(counts) {
    const elem = document.getElementById("rsvp-counts");
    if (!elem) return;

    elem.innerHTML = `${counts.going} going`;
}

// Handle RSVP action
async function handleRsvp(status) {
    const token = localStorage.getItem("authToken");
    if (!token) return showError("You must be logged in.");

    const res = await fetch(`/api/events/${currentEventId}/rsvp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });

    await loadRsvp();
    await loadRsvpCounts();
}

document.addEventListener("DOMContentLoaded", () => {
    loadEvent();

    document.getElementById("back-btn")?.addEventListener("click", handleBack);
    document.getElementById("delete-event-btn")?.addEventListener("click", handleDeleteEvent);

    document.getElementById("rsvp-going")?.addEventListener("click", () => handleRsvp("going"));
    document.getElementById("rsvp-maybe")?.addEventListener("click", () => handleRsvp("maybe"));
    document.getElementById("rsvp-not-going")?.addEventListener("click", () => handleRsvp("not_going"));
});
