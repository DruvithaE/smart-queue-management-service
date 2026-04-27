const express = require("express");
const WaitTimeLogic = require("../services/wait-time-service/logic");

const router = express.Router();

/**
 * GET /api/wait-time/predict?rideId=1
 *
 * Controller responsibility:
 * - validate request
 * - call logic layer
 * - return response
 */
router.get("/predict", async (req, res) => {
    try {
        const { rideId, userId,  previousWait } = req.query;

        // Validate required input
        if (!rideId) {
            return res.status(400).json({
                error: "rideId is required",
            });
        }

        // Validate previousWait if provided
        if (
            previousWait &&
            (isNaN(previousWait) || parseInt(previousWait, 10) < 0)
        ) {
            return res.status(400).json({
                error: "previousWait must be a valid non-negative number",
            });
        }

        // Call service layer
        const result = await WaitTimeLogic.calculateWaitTime(
            rideId,
            userId || null,
            previousWait ? parseInt(previousWait, 10) : null
        );

        // Handle logic errors
        if (result.error) {
            return res.status(500).json({
                error: result.error,
            });
        }

        // Success response
        return res.json({
            rideId,
            ...result,
        });

    } catch (error) {
        console.error("Controller Error:", error.message);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

module.exports = router;