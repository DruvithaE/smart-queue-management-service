const rideService = require("../services/ride_service/rideService");
const RecommendationFactory = require("../services/recommendation_service/RecommendationFactory");
const OptimizationService = require("../services/recommendation_service/optimizationService");
const WaitTimeLogic = require("../services/wait-time-service/logic");
const { pool } = require("../config/db");

console.log("🔥 CONTROLLER LOADED");
// 🎯 RECOMMENDATION API
exports.recommendRides = async (req, res) => {
  try {
    const { strategy = "BALANCED" } = req.query;

    const rides = await rideService.getAllRides();

    // queue lengths
    const queueData = await pool.query(`
      SELECT ride_id, COUNT(*) AS queue_length
      FROM queue_entries
      WHERE status = 'ACTIVE'
      GROUP BY ride_id
    `);

    const queueMap = {};
    queueData.rows.forEach((q) => {
      queueMap[q.ride_id] = Number(q.queue_length);
    });

    // enrich rides
    const enrichedRides = await Promise.all(
      rides.map(async (ride) => {
        let waitTime = 0;

        try {
          const result = await WaitTimeLogic.calculateWaitTime(ride.id);


          waitTime = result?.estimatedWaitTime ?? 0;

        } catch (err) {
          console.error("WaitTime error for ride:", ride.id, err);
        }

        return {
          ...ride,
          queueLength: queueMap[ride.id] || 0,
          waitTime,
        };
      })
    );

    // 🔥 Apply optimization scoring
    const scoredRides = OptimizationService.scoreRides(enrichedRides);

    // Strategy-based recommendation
    const strategyObj = RecommendationFactory.getStrategy(strategy);
    const recommended = strategyObj.recommend(scoredRides);

    res.json({
      strategy,
      recommendations: recommended.slice(0, 5),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Recommendation failed" });
  }
};


// ⚙️ QUEUE OPTIMIZATION API
exports.optimizeQueue = async (req, res) => {
  try {
    const rides = await rideService.getAllRides();

    const queueData = await pool.query(`
      SELECT ride_id, COUNT(*) AS queue_length
      FROM queue_entries
      WHERE status = 'ACTIVE'
      GROUP BY ride_id
    `);

    const queueMap = {};
    queueData.rows.forEach((q) => {
      queueMap[q.ride_id] = Number(q.queue_length);
    });

    // enrich rides
    const enrichedRides = await Promise.all(
      rides.map(async (ride) => {
        let waitTime = 0;

        try {
          const result = await WaitTimeLogic.calculateWaitTime(ride.id);

          waitTime = result?.waitTime ?? 0;

        } catch (err) {
          console.error("WaitTime error for ride:", ride.id, err);
        }

        return {
          ...ride,
          queueLength: queueMap[ride.id] || 0,
          waitTime,
        };
      })
    );
    console.log("ENRICHED RIDES BEFORE OPTIMIZATION:", enrichedRides);
    // 🔥 Centralized optimization logic
    const result = OptimizationService.optimizeQueues(enrichedRides);
    console.log("OPTIMIZATION RESULT:", result);
    res.json({
      optimization: result,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Optimization failed" });
  }
};