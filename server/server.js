const express = require("express");
const path = require("path");
const app = express();
const hostname = "localhost";
const port = 3000;

// Import routes
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, "..", "client")));

// Routes
app.use("/", indexRoutes);
app.use("/auth", authRoutes);
app.use("/protected", protectedRoutes);

app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});