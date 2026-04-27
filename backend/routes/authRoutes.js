const express = require("express");
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/profile", verifyToken, authController.getProfile);

module.exports = router;