const QueueManager = require("../services/queue_service/queueManager");

const queueManager = QueueManager.getInstance();

function parseRideId(rawRideId) {
  const rideId = Number(rawRideId);
  if (!Number.isInteger(rideId) || rideId <= 0) {
    return null;
  }
  return rideId;
}

async function joinQueue(req, res) {
  try {
    const rideId = parseRideId(req.body.rideId);
    const userId = String(req.body.userId || "").trim();
    const fastPass = Boolean(req.body.fastPass);

    if (!rideId || !userId) {
      return res.status(400).json({ error: "rideId and userId are required" });
    }

    const data = await queueManager.joinQueue({ rideId, userId, fastPass });
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

    const data = await queueManager.queueStatus({ rideId, userId: userId || null });
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
