const rideService = require('../services/ride_service/rideService');
const notificationService = require('../services/notification_service/notificationService');
const { pool } = require('../config/db');

const getAllRides = async (req, res) => {
  try {
    const rides = await rideService.getAllRides();
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRideById = async (req, res) => {
  try {
    const ride = await rideService.getRideById(req.params.id);
    if (!ride) return res.status(404).json({ error: `Ride ${req.params.id} not found` });
    res.json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Alias route
const getRideDetails = async (req, res) => {
  return getRideById(req, res);
};

const createRide = async (req, res) => {
  try {
    const ride = await rideService.createRide(req.body);
    res.status(201).json(ride);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const rideId = req.params.id;

    // update ride status
    const ride = await rideService.updateRideStatus(rideId, status);

    if (!ride) {
      return res.status(404).json({ error: `Ride ${rideId} not found` });
    }

    // fetch users currently in queue
    const users = await pool.query(`
      SELECT user_id
      FROM queue_entries
      WHERE ride_id = $1 AND status = 'ACTIVE'
    `, [rideId]);

    // build message based on status
    let message = "";

    if (status === "CLOSED") {
      message = "Ride is temporarily closed.";
    } else if (status === "OPEN") {
      message = "Ride is now open.";
    } else if (status === "MAINTENANCE") {
      message = "Ride is under maintenance.";
    } else if (status === "FULL") {
      message = "Ride is at full capacity.";
    }

    // send notification to each user
    users.rows.forEach(row => {
      notificationService.sendNotification(row.user_id, message);
    });

    res.json(ride);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteRide = async (req, res) => {
  try {
    const ride = await rideService.deleteRide(req.params.id);
    if (!ride) return res.status(404).json({ error: `Ride ${req.params.id} not found` });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { name, description, capacity, duration, status } = req.body;

    // basic validation
    if (!name || !capacity || !duration || !status) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const ride = await rideService.updateRide(
      rideId,
      name,
      description,  // ✅ ADD THIS
      capacity,
      duration,
      status
    );

    if (!ride) {
      return res.status(404).json({ error: `Ride ${rideId} not found` });
    }

    res.json(ride);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getAllRides,
  getRideById,
  getRideDetails,
  createRide,
  updateRideStatus,
  deleteRide,
  updateRide
};

