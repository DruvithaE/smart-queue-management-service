const express = require("express");
const WaitTimeLogic = require("../services/wait-time-service/logic");

const router = express.Router();

router.get("/predict", (req, res) => {
    const { rideId, queueLength, capacity, duration, previousWait } = req.query;

    // Validate input
    if (!rideId || !queueLength || !capacity || !duration) {
        return res.status(400).json({
            error: "Missing required query parameters: rideId, queueLength, capacity, duration",
        });
    }

    if (capacity <= 0) {
        return res.status(400).json({
            error: "Capacity must be greater than 0",
        });
    }

    // Parse input values
    const data = {
        queueLength: parseInt(queueLength, 10),
        capacity: parseInt(capacity, 10),
        duration: parseInt(duration, 10),
        previousWait: previousWait ? parseInt(previousWait, 10) : null,
    };

    // Calculate wait time using logic
    const result = WaitTimeLogic.calculateWaitTime(data);

    // Return response
    res.json({
        rideId,
        ...result,
    });
});

module.exports = router;