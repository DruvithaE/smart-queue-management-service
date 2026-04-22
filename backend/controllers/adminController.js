const rideService = require('../services/ride_service/rideService');

const getAdminDashboard = async (req, res) => {
  try {
    const dashboard = await rideService.getAdminDashboard();
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAdminDashboard };