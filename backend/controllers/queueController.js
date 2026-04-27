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
const getWaitTime = async (rideId, userId) => {
  try {
    const axios = (await import("axios")).default;

    const response = await axios.get(
      `http://localhost:${process.env.PORT}/api/wait-time/predict?rideId=${rideId}&userId=${userId}`
    );

    return response.data;
  } catch (error) {
    console.error("Wait-time fetch failed:", error.message);
    return null;
  }
};

const notifyNearbyUsers = async (rideId) => {
  console.log("Running notifyNearbyUsers for ride:", rideId);

  const result = await pool.query(`
    SELECT user_id, priority,
           ROW_NUMBER() OVER (
             ORDER BY priority DESC, joined_at ASC, id ASC
           ) AS position
    FROM queue_entries
    WHERE ride_id = $1 AND status = 'ACTIVE'
  `, [rideId]);

  for (const row of result.rows) {
    const userId = row.user_id;
    const position = row.position;
    const isPriority = row.priority;

    const lastPos = lastPositions.get(userId);
    const threshold = isPriority ? 3 : 5;

    console.log(
      "User:", userId,
      "Priority:", isPriority,
      "Prev:", lastPos,
      "Now:", position
    );

    const waitData = await getWaitTime(rideId, userId);
    const waitTime = waitData?.estimatedWaitTime;

    let message;

    if (waitTime === 0) {
      message = `It's your turn, please proceed to the ride.`;
    } else {
      message = isPriority
        ? `You are ${position} in the Fast Pass queue.`
        : `You are ${position} in the queue.`;

      if (waitTime !== undefined && waitTime !== null) {
        message += ` Estimated wait: ${Math.ceil(waitTime)} mins.`;
      }
    }

    // notify only when entering threshold
    if (position <= threshold && (lastPos === undefined || lastPos > threshold)) {
      console.log("Notifying:", userId);
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

    lastPositions.delete(userId);

    await notifyNearbyUsers(rideId);
    notificationService.sendNotification(
      userId,
      "You have left the queue."
    );

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

async function adminSearchQueue(req, res) {
  try {
    const searchTerm = String(req.query.userId || req.query.search || "").trim();
    const rideIdRaw = req.query.rideId;
    const rideId = rideIdRaw ? parseRideId(rideIdRaw) : null;
    const limitRaw = req.query.limit;
    const limit = limitRaw ? Number(limitRaw) : 50;

    if (rideIdRaw && !rideId) {
      return res.status(400).json({ error: "rideId must be a positive integer" });
    }

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
    if (error.message.includes("No active queue entry")) {
      return res.status(404).json({ error: error.message });
    }
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