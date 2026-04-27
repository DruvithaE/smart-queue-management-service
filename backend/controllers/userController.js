const User = require("../models/User");

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUserMembers = async (req, res) => {
  try {
    const { member1, member2, member3, member4 } = req.body;

    const user = await User.updateMembers(
      req.params.id,
      member1,
      member2,
      member3,
      member4
    );

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserMembers,
};