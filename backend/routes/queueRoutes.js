const express = require("express");
const queueController = require("../controllers/queueController");

const router = express.Router();

router.post("/joinQueue", queueController.joinQueue);
router.post("/leaveQueue", queueController.leaveQueue);
router.get("/queueStatus", queueController.queueStatus);

module.exports = router;
