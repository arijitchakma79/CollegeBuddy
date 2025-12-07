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

        // ---- PAYMENT BRANCH ADDITION ----
        await checkDeletePermission(event);
        // ---------------------------------

        // Update title & description
        if (document.getElementById("event-title"))
            document.getElementById("event-title").textContent = event.title || "Untitled Event";

        if (document.getElementById("event-description"))
            document.getElementById("event-description").textContent = event.description || "No description available.";

        // Format times
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);

        const formattedStart = startDate.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            weekday: "long",
        });

        const formattedEnd = endDate.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            weekday: "long",
        });

        const price = event.price_cents
            ? `$${(event.price_cents / 100).toFixed(2)}`
            : "Free";

        const eventDetails = document.getElementById("event-details");
        if (eventDetails) {
            eventDetails.innerHTML = `
                <div class="info-item"><span class="info-label">Start Time</span><span class="info-value">${formattedStart}</span></div>
                <div class="info-item"><span class="info-label">End Time</span><span class="info-value">${formattedEnd}</span></div>
                ${event.location ? `<div class="info-item"><span class="info-label">Location</span><span class="info-value">${event.location}</span></div>` : ""}
                ${event.attendee_cap ? `<div class="info-item"><span class="info-label">Attendee Cap</span><span class="info-value">${event.attendee_cap}</span></div>` : ""}
                <div class="info-item"><span class="info-label">Price</span><span class="info-value">${price}</span></div>
                ${
                    event.restricted_to_org
                        ? `<div class="info-item"><span class="info-label">Access</span><span class="info-value" style="color:#ff6b6b;font-weight:600;">Restricted to Organization Members</span></div>`
                        : `<div class="info-item"><span class="info-label">Access</span><span class="info-value">Public</span></div>`
                }
                ${event.created_at ? `<div class="info-item"><span class="info-label">Created</span><span class="info-value">${new Date(event.created_at).toLocaleDateString()}</span></div>` : ""}
            `;
        }

        // ---- PAYMENT BUTTON LOGIC ----
        const paymentSection = document.getElementById("payment-section");
        const payButton = document.getElementById("pay-button");

        if (event.price_cents > 0) {
            paymentSection.classList.remove("hidden");
            payButton.textContent = `Pay $${(event.price_cents / 100).toFixed(2)}`;
            payButton.onclick = () => payForEvent(event.event_id, event.title, event.price_cents);
        } else {
            paymentSection.classList.add("hidden");
        }
        // --------------------------------

        if (loading) loading.classList.add("hidden");
        if (eventDetail) eventDetail.classList.remove("hidden");
        if (notFound) notFound.classList.add("hidden");

        // RSVP section
        const rsvpSection = document.getElementById("rsvp-section");
        if (event.created_by_org_id) {
            if (rsvpSection) rsvpSection.classList.remove("hidden");
            await loadRsvp();
            await loadRsvpCounts();
        } else {
            if (rsvpSection) rsvpSection.classList.add("hidden");
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
    const loading = document.getElementById("loading");
    const eventDetail = document.getElementById("event-detail");
    const notFound = document.getElementById("not-found");

    if (loading) loading.classList.add("hidden");
    if (eventDetail) eventDetail.classList.add("hidden");
    if (notFound) notFound.classList.remove("hidden");
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

// ---- DELETE EVENT LOGIC (FROM payment BRANCH) ----
async function checkDeletePermission(event) {
    const token = localStorage.getItem("authToken");

    if (!token) {
        canDeleteEvent = false;
        updateDeleteButton();
        return;
    }

    try {
        const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            canDeleteEvent = false;
            updateDeleteButton();
            return;
        }

        const data = await response.json();
        const userId = data.user?.id;

        if (!userId) {
            canDeleteEvent = false;
        } else if (event.created_by_user_id === userId) {
            canDeleteEvent = true;
        } else if (event.created_by_org_id) {
            const orgRes = await fetch(`/api/memberships/organization/${event.created_by_org_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const orgData = await orgRes.json();
            canDeleteEvent = orgData.success && orgData.userRole === "admin";
        } else {
            canDeleteEvent = false;
        }
    } catch (err) {
        console.error("Delete check error:", err);
        canDeleteEvent = false;
    }

    updateDeleteButton();
}

function updateDeleteButton() {
    const deleteBtn = document.getElementById("delete-event-btn");
    if (!deleteBtn) return;

    if (canDeleteEvent) deleteBtn.classList.remove("hidden");
    else deleteBtn.classList.add("hidden");
}

async function handleDeleteEvent() {
    if (!currentEventId || !currentEvent) return;

    const title = currentEvent.title || "this event";

    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;

    const token = localStorage.getItem("authToken");
    if (!token) return showError("You must be logged in.");

    try {
        const response = await fetch(`/api/events/${currentEventId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.message || "Failed to delete event");
            return;
        }

        showError("Event deleted successfully!");

        setTimeout(() => {
            if (currentEvent.created_by_org_id)
                window.location.href = `/organizations/${currentEvent.created_by_org_id}`;
            else
                window.location.href = "/protected/organizations";
        }, 1000);
    } catch (err) {
        showError(`An error occurred while deleting the event: ${err.message}`);
    }
}
// ---------------------------------------------------

function handleBack() {
    window.location.href = "/events";
}

// RSVP FUNCTIONS (unchanged)
async function loadRsvp() {
    if (!currentEventId) return;

    const token = localStorage.getItem("authToken");
    if (!token) {
        document.getElementById("rsvp-section")?.classList.add("hidden");
        return;
    }

    try {
        const response = await fetch(`/api/events/${currentEventId}/rsvp`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        currentRsvp = response.ok && data.success ? data.rsvp : null;

        updateRsvpUI();
    } catch {
        currentRsvp = null;
        updateRsvpUI();
    }
}

async function loadRsvpCounts() {
    if (!currentEventId) return;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
        const response = await fetch(`/api/events/${currentEventId}/rsvps`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok || !data.success) return;

        const rsvps = data.rsvps || [];
        updateRsvpCountsUI({
            going: rsvps.filter(r => r.status === "going").length,
            maybe: rsvps.filter(r => r.status === "maybe").length,
            not_going: rsvps.filter(r => r.status === "not_going").length,
        });
    } catch {}
}

function updateRsvpUI() {
    const rsvpStatus = document.getElementById("rsvp-status");
    if (!rsvpStatus) return;

    const going = document.getElementById("rsvp-going");
    const maybe = document.getElementById("rsvp-maybe");
    const notGoing = document.getElementById("rsvp-not-going");

    going?.classList.remove("active");
    maybe?.classList.remove("active");
    notGoing?.classList.remove("active");

    if (currentRsvp) {
        const msg = {
            going: "You are going to this event",
            maybe: "You might attend this event",
            not_going: "You are not going to this event",
        };

        rsvpStatus.innerHTML = `<p class="rsvp-status-text">${msg[currentRsvp.status]}</p>`;

        if (currentRsvp.status === "going") going?.classList.add("active");
        if (currentRsvp.status === "maybe") maybe?.classList.add("active");
        if (currentRsvp.status === "not_going") notGoing?.classList.add("active");
    } else {
        rsvpStatus.innerHTML = `<p class="rsvp-status-text">You haven't RSVPed yet</p>`;
    }
}

function updateRsvpCountsUI(counts) {
    const rsvpCounts = document.getElementById("rsvp-counts");
    if (!rsvpCounts) return;

    const going = counts.going ?? 0;
    const label = going === 1 ? "person" : "people";

    rsvpCounts.innerHTML = `
        <div class="rsvp-count-display">
            <span class="rsvp-count-icon">👥</span>
            <div class="rsvp-count-content">
                <span class="rsvp-count-value">${going}</span>
                <span class="rsvp-count-label">${label} going</span>
            </div>
        </div>
    `;
}

async function handleRsvp(status) {
    if (!currentEventId) return;

    const token = localStorage.getItem("authToken");
    if (!token) return showError("You must be logged in to RSVP");

    try {
        const response = await fetch(`/api/events/${currentEventId}/rsvp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        });

        const data = await response.json();
        if (!response.ok) {
            showError(data.message || "Failed to update RSVP");
            return;
        }

        await loadRsvp();
        await loadRsvpCounts();
    } catch {
        showError("An error occurred while updating RSVP");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadEvent();

    const backBtn = document.getElementById("back-btn");
    if (backBtn) backBtn.addEventListener("click", handleBack);

    const delBtn = document.getElementById("delete-event-btn");
    if (delBtn) delBtn.addEventListener("click", handleDeleteEvent);

    document.getElementById("rsvp-going")?.addEventListener("click", () => handleRsvp("going"));
    document.getElementById("rsvp-maybe")?.addEventListener("click", () => handleRsvp("maybe"));
    document.getElementById("rsvp-not-going")?.addEventListener("click", () => handleRsvp("not_going"));
});
