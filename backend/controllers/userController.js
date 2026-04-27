const User = require("../models/User");
const { pool } = require("../config/db");

const userController = {
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  },

  async getRideHistory(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user.past_rides || []);
    } catch (err) {
      res.status(500).json({
        message: "Server error",
        error: err.message
      });
    }
  }

};

module.exports = userController;