const express = require("express");
const path = require("path");
const app = express();
const hostname = "localhost";
const port = 3000;

// Import routes
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");

// Middleware
app.use(express.static(path.join(__dirname, "..", "public")));

// Routes
app.use("/", indexRoutes);
app.use("/auth", authRoutes);

app.listen(port, hostname, function () {
  console.log(`http://${hostname}:${port}`);
});