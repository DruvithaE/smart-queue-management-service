const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");

// Subscribe to events
router.post("/subscribe", notificationController.subscribe);

// Trigger notification (called by other services)
router.post("/notify", notificationController.notify);

module.exports = router;