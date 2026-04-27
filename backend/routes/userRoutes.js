const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/auth");

router.get("/profile", verifyToken, userController.getProfile);
router.get("/ride-history", verifyToken, userController.getRideHistory);

module.exports = router;