const rideService = require('../services/ride_service/rideService');

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

// Alias route for /rides/getRideDetails/:id (matches assignment spec)
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
    if (!status) return res.status(400).json({ error: 'status is required' });
    const ride = await rideService.updateRideStatus(req.params.id, status);
    if (!ride) return res.status(404).json({ error: `Ride ${req.params.id} not found` });
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

module.exports = { getAllRides, getRideById, getRideDetails, createRide, updateRideStatus, deleteRide };