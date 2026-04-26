const express = require("express");
const router = express.Router();

const {
  recommendRides,
  optimizeQueue,
} = require("../controllers/recommendationController");

router.get("/recommendRides", recommendRides);
router.get("/optimizeQueue", optimizeQueue);

module.exports = router;