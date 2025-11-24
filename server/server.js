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

// Import API routes
const authApi = require("./api/auth");
const organizationsApi = require("./api/organizations");

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, "..", "client")));

// Cookie parser for reading cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Page routes - serve HTML pages
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);
app.use("/organizations", organizationsRoutes);

// API routes - handle API endpoints
app.use("/api/auth", authApi);
app.use("/api/organizations", organizationsApi);

app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});