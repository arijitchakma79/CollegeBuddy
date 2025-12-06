// Format date/time for display
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (e) {
    return dateString;
  }
}

let allEvents = [];

// Display events list
function displayEvents(events) {
  const list = document.getElementById("events-list");

  if (!events || events.length === 0) {
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("not-found").classList.remove("hidden");
    list.classList.add("hidden");
    return;
  }

  list.innerHTML = "";

  events.forEach(ev => {
    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <div class="event-card-header">
        <h3>${ev.title || "Untitled Event"}</h3>
        <span class="event-id">ID: ${ev.event_id}</span>
      </div>

      <div class="event-card-body">
        <p class="event-description">${ev.description || "No description available."}</p>

        <div class="event-info">
          <p><strong>Starts:</strong> ${formatDate(ev.start_time)}</p>
          <p><strong>Ends:</strong> ${formatDate(ev.end_time)}</p>
          <p><strong>Location:</strong> ${ev.location || "N/A"}</p>
        </div>

        <div class="event-card-actions">
          <button class="event-view-btn">View Details</button>
        </div>
      </div>
    `;

    // Clicking card opens event detail page
    card.addEventListener("click", () => {
      window.location.href = `/events/${ev.event_id}`;
    });

    list.appendChild(card);
  });

  document.getElementById("loading").classList.add("hidden");
  list.classList.remove("hidden");
  document.getElementById("not-found").classList.add("hidden");
}

// Show error
function showError(message) {
  const banner = document.getElementById("error-banner");
  const msg = document.getElementById("error-message");
  if (banner && msg) {
    msg.textContent = message;
    banner.classList.remove("hidden");
  }
}

// Load all events
async function loadEvents() {
  const loading = document.getElementById("loading");
  const list = document.getElementById("events-list");
  const notFound = document.getElementById("not-found");

  loading.classList.remove("hidden");
  list.classList.add("hidden");
  notFound.classList.add("hidden");

  try {
    const response = await fetch("/api/events");
    const data = await response.json();

    if (!response.ok) {
      showError(data.message || "Failed to load events");
      return;
    }

    if (data.success && Array.isArray(data.events)) {
      allEvents = data.events;
      displayEvents(allEvents);
    } else {
      showError("Invalid server response");
    }
  } catch (error) {
    console.error("Error loading events:", error);
    showError("An error occurred while loading events");
  }
}

function applyEventSearch() {
  const input = document.getElementById("searchInputEvent");
  if (!input) return;

  const q = input.value.toLowerCase().trim();

  if (q === "") {
    displayEvents(allEvents);
    return;
  }

  const filtered = allEvents.filter(ev =>
    (ev.title && ev.title.toLowerCase().includes(q)) ||
    (ev.description && ev.description.toLowerCase().includes(q)) ||
    (ev.location && ev.location.toLowerCase().includes(q))
  );

  displayEvents(filtered);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadEvents();

  const searchInput = document.getElementById("searchInputEvent");
  if (searchInput) {
    searchInput.addEventListener("input", applyEventSearch);
  }
});
