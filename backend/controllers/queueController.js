const QueueManager = require("../services/queue_service/queueManager");
const notificationService = require("../services/notification_service/notificationService");
const { pool } = require("../config/db");

const queueManager = QueueManager.getInstance();

// tracks last known positions of users
const lastPositions = new Map();

function parseRideId(rawRideId) {
  const rideId = Number(rawRideId);
  if (!Number.isInteger(rideId) || rideId <= 0) return null;
  return rideId;
}

// fetch wait-time from wait-time service
const getWaitTime = async (rideId, userId) => {
  try {
    const axios = (await import("axios")).default;

    const response = await axios.get(
      `http://localhost:${process.env.PORT}/api/wait-time/predict`,
      {
        params: { rideId, userId }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Wait-time fetch failed:", error.message);
    return null;
  }
};

// get ride capacity (used as threshold)
const getRideCapacity = async (rideId) => {
  const result = await pool.query(
    "SELECT capacity FROM rides WHERE id = $1",
    [rideId]
  );

  return result.rows[0]?.capacity || 5;
};

const notifyNearbyUsers = async (rideId) => {
  const result = await pool.query(`
    SELECT user_id, priority,
           ROW_NUMBER() OVER (
             ORDER BY priority DESC, joined_at ASC, id ASC
           ) AS position
    FROM queue_entries
    WHERE ride_id = $1 AND status = 'ACTIVE'
  `, [rideId]);

  const capacity = await getRideCapacity(rideId);
  const threshold = capacity;

  for (const row of result.rows) {
    const userId = row.user_id;
    const position = row.position;
    const isPriority = row.priority;

    const lastPos = lastPositions.get(userId);

    const waitData = await getWaitTime(rideId, userId);
    const waitTime = Number(waitData?.estimatedWaitTime);

    let message;

    // 🚨 turn reached
    if (waitTime === 0) {
      message = "It's your turn, please proceed to the ride.";
    } else {
      message = isPriority
        ? `You are ${position} in the Fast Pass queue.`
        : `You are ${position} in the queue.`;

      if (!isNaN(waitTime)) {
        message += ` Estimated wait: ${Math.ceil(waitTime)} mins.`;
      }
    }

    // notify only when entering threshold zone
    if (position <= threshold && (lastPos === undefined || lastPos > threshold)) {
      notificationService.sendNotification(userId, message);
    }

    lastPositions.set(userId, position);
  }
};

async function joinQueue(req, res) {
  try {
    const rideId = parseRideId(req.body.rideId);
    const userId = String(req.body.userId || "").trim();
    const fastPass = Boolean(req.body.fastPass ?? req.body.priority);
    const members = Array.isArray(req.body.members) ? req.body.members : [];
    const groupSize = members.length > 0 ? members.length : 1;

    if (!rideId || !userId) {
      return res.status(400).json({ error: "rideId and userId are required" });
    }

    const data = await queueManager.joinQueue({
      rideId,
      userId,
      fastPass,
      members,
      groupSize,
    });

    // 🔥 JOIN NOTIFICATION
    const waitData = await getWaitTime(rideId, userId);
    const waitTime = Number(waitData?.estimatedWaitTime);

    let joinMessage;

    if (waitTime === 0) {
      joinMessage = "It's your turn, please proceed to the ride.";
    } else {
      joinMessage = "You joined the queue.";

      if (!isNaN(waitTime)) {
        joinMessage += ` Estimated wait: ${Math.ceil(waitTime)} mins.`;
      }
    }

    notificationService.sendNotification(userId, joinMessage);

    await notifyNearbyUsers(rideId);

    return res.status(201).json(data);

  } catch (error) {
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

    lastPositions.delete(userId);

    await notifyNearbyUsers(rideId);

    notificationService.sendNotification(
      userId,
      "You have left the queue."
    );

    return res.json(data);

  } catch (error) {
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

async function adminSearchQueue(req, res) {
  try {
    const searchTerm = String(req.query.userId || req.query.search || "").trim();
    const rideId = req.query.rideId ? parseRideId(req.query.rideId) : null;
    const limit = Number(req.query.limit || 50);

    const entries = await queueManager.searchActiveQueueEntries({
      searchTerm,
      rideId,
      limit,
    });

    return res.json({
      count: entries.length,
      entries,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function adminRemoveQueueUser(req, res) {
  try {
    const rideId = parseRideId(req.body.rideId);
    const userId = String(req.body.userId || "").trim();

    if (!rideId || !userId) {
      return res.status(400).json({ error: "rideId and userId are required" });
    }

    const data = await queueManager.adminRemoveUserFromQueue({
      rideId,
      userId,
      removedBy: req.user?.email || req.user?.id || null,
    });

    lastPositions.delete(userId);

    await notifyNearbyUsers(rideId);

    notificationService.sendNotification(
      userId,
      "An admin has removed you from the queue."
    );

    return res.json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  joinQueue,
  leaveQueue,
  queueStatus,
  adminSearchQueue,
  adminRemoveQueueUser,
};