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

        // ⭐ PAYMENT BUTTON - Check payment status first
        const paymentSection = document.getElementById("payment-section");
        const payButton = document.getElementById("pay-button");

        if (event.price_cents > 0) {
            // Check if user has already paid
            const token = localStorage.getItem("authToken");
            if (token) {
                try {
                    const paymentRes = await fetch(`/api/events/${event.event_id}/payment-status`, {
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });
                    const paymentData = await paymentRes.json();
                    
                    if (paymentData.success && paymentData.hasPaid) {
                        // User has already paid, hide payment button
                        paymentSection.classList.add("hidden");
                    } else {
                        // User hasn't paid, show payment button
                        paymentSection.classList.remove("hidden");
                        payButton.textContent = `Pay $${(event.price_cents / 100).toFixed(2)}`;
                        payButton.onclick = () => payForEvent(event.event_id, event.title, event.price_cents);
                    }
                } catch (error) {
                    console.error("Error checking payment status:", error);
                    // On error, show payment button
                    paymentSection.classList.remove("hidden");
                    payButton.textContent = `Pay $${(event.price_cents / 100).toFixed(2)}`;
                    payButton.onclick = () => payForEvent(event.event_id, event.title, event.price_cents);
                }
            } else {
                // No token, show payment button
                paymentSection.classList.remove("hidden");
                payButton.textContent = `Pay $${(event.price_cents / 100).toFixed(2)}`;
                payButton.onclick = () => payForEvent(event.event_id, event.title, event.price_cents);
            }
        } else {
            paymentSection.classList.add("hidden");
        }

        if (loading) loading.classList.add("hidden");
        if (eventDetail) eventDetail.classList.remove("hidden");
        if (notFound) notFound.classList.add("hidden");

        // RSVP - Check payment status first, then load RSVP
        if (event.created_by_org_id) {
            document.getElementById("rsvp-section")?.classList.remove("hidden");
            // Check payment status to enable/disable RSVP buttons
            await checkPaymentStatus(event);
            // Load RSVP status
            await loadRsvp();
            await loadRsvpCounts();
        } else {
            document.getElementById("rsvp-section")?.classList.add("hidden");
        }

        // Check for payment success/cancel query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const sessionId = urlParams.get('session_id');
        
        if (paymentStatus === 'success') {
            showPaymentSuccessMessage();
            // Confirm payment and create RSVP immediately
            if (event.price_cents > 0) {
                if (sessionId) {
                    await confirmPaymentAndRsvp(sessionId, event.event_id);
                } else {
                    // Fallback: try to confirm payment without session_id by checking recent payments
                    await confirmPaymentWithoutSessionId(event.event_id);
                }
                // Wait a moment for payment to be saved
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Check payment status with retries
                await checkPaymentStatusWithRetry(event, 5);
                // Hide payment button since user has paid
                const paymentSection = document.getElementById("payment-section");
                if (paymentSection) {
                    paymentSection.classList.add("hidden");
                }
            }
            // Reload RSVP to show the new status
            await loadRsvp();
            await loadRsvpCounts();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'cancel') {
            showPaymentCancelMessage();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    } catch (error) {
        console.error("Error loading event:", error);
        showError("An error occurred while loading the event");
        showNotFound();
    }
}

// Check payment status and enable/disable RSVP buttons
async function checkPaymentStatus(event) {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    
    // If event is free, no need to check payment
    if (!event.price_cents || event.price_cents === 0) {
        enableRsvpButtons();
        return;
    }
    
    try {
        const res = await fetch(`/api/events/${event.event_id}/payment-status`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (data.success && data.hasPaid) {
            enableRsvpButtons();
            return true;
        } else {
            disableRsvpButtons();
            showPaymentRequiredMessage(event);
            return false;
        }
    } catch (error) {
        console.error("Error checking payment status:", error);
        // On error, disable buttons to be safe
        disableRsvpButtons();
        return false;
    }
}

// Check payment status with retry (for after payment redirect)
async function checkPaymentStatusWithRetry(event, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        // Wait before checking (first check is immediate, then wait 1s, 2s, etc.)
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * i));
        }
        
        const hasPaid = await checkPaymentStatus(event);
        if (hasPaid) {
            console.log(`Payment confirmed after ${i + 1} attempt(s)`);
            return;
        }
    }
    console.warn("Payment status not confirmed after retries. Webhook may be delayed.");
}

function enableRsvpButtons() {
    const rsvpGoing = document.getElementById("rsvp-going");
    const rsvpMaybe = document.getElementById("rsvp-maybe");
    const rsvpNotGoing = document.getElementById("rsvp-not-going");
    
    if (rsvpGoing) {
        rsvpGoing.disabled = false;
        rsvpGoing.style.opacity = "1";
        rsvpGoing.style.cursor = "pointer";
    }
    if (rsvpMaybe) {
        rsvpMaybe.disabled = false;
        rsvpMaybe.style.opacity = "1";
        rsvpMaybe.style.cursor = "pointer";
    }
    if (rsvpNotGoing) {
        rsvpNotGoing.disabled = false;
        rsvpNotGoing.style.opacity = "1";
        rsvpNotGoing.style.cursor = "pointer";
    }
    
    // Hide payment required message if it exists
    const paymentMsg = document.getElementById("payment-required-message");
    if (paymentMsg) {
        paymentMsg.remove();
    }
}

function disableRsvpButtons() {
    const rsvpGoing = document.getElementById("rsvp-going");
    const rsvpMaybe = document.getElementById("rsvp-maybe");
    const rsvpNotGoing = document.getElementById("rsvp-not-going");
    
    if (rsvpGoing) {
        rsvpGoing.disabled = true;
        rsvpGoing.style.opacity = "0.5";
        rsvpGoing.style.cursor = "not-allowed";
    }
    if (rsvpMaybe) {
        rsvpMaybe.disabled = true;
        rsvpMaybe.style.opacity = "0.5";
        rsvpMaybe.style.cursor = "not-allowed";
    }
    if (rsvpNotGoing) {
        rsvpNotGoing.disabled = true;
        rsvpNotGoing.style.opacity = "0.5";
        rsvpNotGoing.style.cursor = "not-allowed";
    }
}

function showPaymentRequiredMessage(event) {
    // Remove existing message if any
    const existingMsg = document.getElementById("payment-required-message");
    if (existingMsg) {
        existingMsg.remove();
    }
    
    // Add message before RSVP buttons
    const rsvpButtons = document.getElementById("rsvp-buttons");
    if (rsvpButtons && event.price_cents > 0) {
        const message = document.createElement("p");
        message.id = "payment-required-message";
        message.style.color = "#dc3545";
        message.style.fontWeight = "600";
        message.style.marginBottom = "1rem";
        message.textContent = `Please pay $${(event.price_cents / 100).toFixed(2)} before RSVPing to this event.`;
        rsvpButtons.parentNode.insertBefore(message, rsvpButtons);
    }
}

// Confirm payment and automatically create RSVP
async function confirmPaymentAndRsvp(sessionId, eventId) {
    const token = localStorage.getItem("authToken");
    if (!token) {
        console.error("No auth token for payment confirmation");
        return;
    }

    try {
        console.log("Confirming payment with session_id:", sessionId);
        const res = await fetch("/api/payments/confirm-payment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                session_id: sessionId,
                event_id: eventId
            })
        });

        const data = await res.json();
        if (data.success) {
            console.log("✅ Payment confirmed and RSVP created");
        } else {
            const errorMsg = data.message || data.error?.message || "Unknown error";
            console.error("Failed to confirm payment:", errorMsg, data);
            showError(`Payment confirmation failed: ${errorMsg}`);
        }
    } catch (error) {
        console.error("Error confirming payment:", error);
        showError(`Error confirming payment: ${error.message}`);
    }
}

// Fallback: Confirm payment without session_id by checking if payment exists
async function confirmPaymentWithoutSessionId(eventId) {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
        console.log("Checking payment status without session_id for event:", eventId);
        // First check if payment exists
        const paymentRes = await fetch(`/api/events/${eventId}/payment-status`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const paymentData = await paymentRes.json();
        
        if (paymentData.success && paymentData.hasPaid) {
            console.log("✅ Payment already exists, creating RSVP");
            // Payment exists, just create RSVP
            await createRsvpAfterPayment(eventId);
        } else {
            console.log("Payment not found yet, will retry...");
        }
    } catch (error) {
        console.error("Error in fallback payment check:", error);
    }
}

// Create RSVP after payment is confirmed
async function createRsvpAfterPayment(eventId) {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
        const res = await fetch(`/api/events/${eventId}/rsvp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: "going" })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            console.log("✅ RSVP created successfully after payment");
        } else {
            console.error("Failed to create RSVP:", data.message);
        }
    } catch (error) {
        console.error("Error creating RSVP:", error);
    }
}

// Show payment success message
function showPaymentSuccessMessage() {
    showError("✅ Payment successful! You have been automatically RSVP'd as 'Going'.");
}

// Show payment cancel message
function showPaymentCancelMessage() {
    showError("⚠️ Payment was cancelled. Please complete payment to RSVP to this event.");
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

    const data = await res.json();
    
    if (!res.ok) {
        showError(data.message || "Failed to update RSVP");
        // If payment is required, refresh payment status
        if (currentEvent && currentEvent.price_cents > 0) {
            await checkPaymentStatus(currentEvent);
        }
        return;
    }

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
