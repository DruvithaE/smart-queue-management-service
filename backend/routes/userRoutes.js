const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/auth");

const userController = require("../controllers/userController");

router.get("/:id", userController.getUserProfile);
router.put("/:id/members", userController.updateUserMembers);
router.get("/profile", verifyToken, userController.getProfile);
router.get("/ride-history", verifyToken, userController.getRideHistory);

module.exports = router;