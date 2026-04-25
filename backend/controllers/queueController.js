const QueueManager = require("../services/queue_service/queueManager");
const notificationService = require("../services/notification_service/notificationService");
const { pool } = require("../config/db");

const queueManager = QueueManager.getInstance();

// tracks last known positions of users
const lastPositions = new Map();

function parseRideId(rawRideId) {
  const rideId = Number(rawRideId);
  if (!Number.isInteger(rideId) || rideId <= 0) {
    return null;
  }
  return rideId;
}

// fetch wait-time from wait-time service
const getWaitTime = async (rideId) => {
  try {
    const axios = (await import("axios")).default;

    const response = await axios.get(
      `http://localhost:5000/api/wait-time/predict?rideId=${rideId}`
    );

    return response.data;
  } catch (error) {
    console.error("Wait-time fetch failed:", error.message);
    return null;
  }
};

// returns position of a user in queue
const getQueuePosition = async (rideId, userId) => {
  const result = await pool.query(`
    SELECT user_id,
           ROW_NUMBER() OVER (
             ORDER BY priority DESC, joined_at ASC, id ASC
           ) AS position
    FROM queue_entries
    WHERE ride_id = $1 AND status = 'ACTIVE'
  `, [rideId]);

  const user = result.rows.find(r => r.user_id === userId);
  return user ? user.position : null;
};

// notify users only when they ENTER top 5
const notifyNearbyUsers = async (rideId) => {
  console.log("Running notifyNearbyUsers for ride:", rideId);

  const result = await pool.query(`
    SELECT user_id,
           ROW_NUMBER() OVER (
             ORDER BY priority DESC, joined_at ASC, id ASC
           ) AS position
    FROM queue_entries
    WHERE ride_id = $1 AND status = 'ACTIVE'
  `, [rideId]);

  const waitData = await getWaitTime(rideId);

  result.rows.forEach(row => {
    const userId = row.user_id;
    const position = row.position;

    const lastPos = lastPositions.get(userId);

    console.log("User:", userId, "Prev:", lastPos, "Now:", position);

    // notify only when crossing into top 5
    if (position <= 5 && (lastPos === undefined || lastPos > 5)) {
      let message = `You are ${position} in the queue.`;

      if (waitData && waitData.estimatedWaitTime !== undefined) {
        message += ` Estimated wait: ${Math.ceil(waitData.estimatedWaitTime)} mins.`;
        message += ` (${waitData.strategyUsed})`;
      }

      console.log("Notifying:", userId);

      notificationService.sendNotification(
        userId,
        message
      );
    }

    // update position tracking
    lastPositions.set(userId, position);
  });
};

async function joinQueue(req, res) {
  try {
    const rideId = parseRideId(req.body.rideId);
    const userId = String(req.body.userId || "").trim();
    const fastPass = Boolean(req.body.fastPass);

    if (!rideId || !userId) {
      return res.status(400).json({ error: "rideId and userId are required" });
    }

    const data = await queueManager.joinQueue({ rideId, userId, fastPass });

    // trigger notifications after state change
    await notifyNearbyUsers(rideId);

    return res.status(201).json(data);

  } catch (error) {
    if (error.message.includes("already has an active queue entry")) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("not open")) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
}

async function leaveQueue(req, res) {
  try {
    const rideId = parseRideId(req.body.rideId);
    const userId = String(req.body.userId || "").trim();

    if (!rideId || !userId) {
      return res.status(400).json({ error: "rideId and userId are required" });
    }

    const data = await queueManager.leaveQueue({ rideId, userId });

    // remove user from tracking when they leave
    lastPositions.delete(userId);

    // notify remaining users
    await notifyNearbyUsers(rideId);

    return res.json(data);

  } catch (error) {
    if (error.message.includes("No active queue entry")) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
}

async function queueStatus(req, res) {
  try {
    const rideId = parseRideId(req.query.rideId);
    const userId = req.query.userId ? String(req.query.userId).trim() : "";

    if (!rideId) {
      return res.status(400).json({ error: "rideId is required" });
    }

    const data = await queueManager.queueStatus({
      rideId,
      userId: userId || null
    });

    return res.json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  joinQueue,
  leaveQueue,
  queueStatus,
};