const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? "connected" : "disconnected",
  });
});

module.exports = router;
