const express = require("express");
const queueController = require("../controllers/queueController");
const { verifyToken, checkRole } = require("../middleware/auth");

const router = express.Router();

router.post("/joinQueue", queueController.joinQueue);
router.post("/leaveQueue", queueController.leaveQueue);
router.get("/queueStatus", queueController.queueStatus);
router.get(
	"/admin/search",
	verifyToken,
	checkRole(["admin"]),
	queueController.adminSearchQueue
);
router.post(
	"/admin/remove",
	verifyToken,
	checkRole(["admin"]),
	queueController.adminRemoveQueueUser
);

module.exports = router;
