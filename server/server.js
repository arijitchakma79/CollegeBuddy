const express = require("express");
const path = require("path");
const app = express();
const hostname = "localhost";
const port = 3000;

// Import routes
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const organizationsRoutes = require("./routes/organizations");
const eventsRoutes = require("./routes/events");

// Import API routes
const authApi = require("./api/auth");
const organizationsApi = require("./api/organizations");
const membershipsApi = require("./api/memberships");
const eventsApi = require("./api/events");

// Middleware
app.use(express.json()); // Parse JSON bodies

// Cookie parser for reading cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// API routes - handle API endpoints (register BEFORE static files to avoid conflicts)
app.use("/api/auth", authApi);
app.use("/api/organizations", organizationsApi);
app.use("/api/memberships", membershipsApi);
app.use("/api/events", eventsApi);

// Static files middleware (after API routes)
app.use(express.static(path.join(__dirname, "..", "client")));

// Page routes - serve HTML pages
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.use("/organizations", organizationsRoutes);
app.use("/events", eventsRoutes);

// Log registered routes for debugging
console.log('Registered API routes:');
console.log('  - /api/auth');
console.log('  - /api/organizations');
console.log('  - /api/memberships');
console.log('  - /api/events');

app.listen(port, hostname, function () {
  console.log(`Server running at http://${hostname}:${port}`);
});