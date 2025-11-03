const express = require("express");
const path = require("path");
const router = express.Router();

router.get('/', async (req, res) => {
    console.log(req.originalUrl, req.headers, req.method);
    res.sendFile(path.join(__dirname, "..", "..", "client", "index.html"));
});

module.exports = router;

