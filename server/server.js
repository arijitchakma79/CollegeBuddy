const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

// IMPORTANT: Fly.io sets PORT automatically
const port = process.env.PORT || 3000;

// ---- ROUTE IMPORTS ----
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const organizationsRoutes = require("./routes/organizations");
const eventsRoutes = require("./routes/events");

// API routes
const authApi = require("./api/auth");
const organizationsApi = require("./api/organizations");
const membershipsApi = require("./api/memberships");
const eventsApi = require("./api/events");

// ---- MIDDLEWARE ----
app.use(express.json());
app.use(cookieParser());

// Serve API routes FIRST
app.use("/api/auth", authApi);
app.use("/api/organizations", organizationsApi);
app.use("/api/memberships", membershipsApi);
app.use("/api/events", eventsApi);

// ---- STATIC FILES ----
app.use(express.static(path.join(__dirname, "..", "client")));

// ---- PAGE ROUTES ----
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.use("/organizations", organizationsRoutes);
app.use("/events", eventsRoutes);

// ---- SERVER START ----
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
