const axios = require("axios");

const BasicStrategy = require("./strategies/BasicStrategy");
const AverageStrategy = require("./strategies/AverageStrategy");
const PeakHourStrategy = require("./strategies/PeakHourStrategy");
const LoadBasedStrategy = require("./strategies/LoadBasedStrategy");
const StrategyContext = require("./strategies/StrategyContext");

const BACKEND_PORT = process.env.PORT || 5000;

const RIDE_SERVICE_URL =
  process.env.RIDE_SERVICE_URL ||
  `http://localhost:${BACKEND_PORT}/rides`;

const QUEUE_SERVICE_URL =
  process.env.QUEUE_SERVICE_URL ||
  `http://localhost:${BACKEND_PORT}/queue`;

class WaitTimeLogic {
  static async calculateWaitTime(rideId, previousWait = null) {
    try {
      // Fetch queue status
      const queueResponse = await axios.get(
        `${QUEUE_SERVICE_URL}/queueStatus`,
        {
          params: { rideId }
        }
      );

      const queueLength =
        Number(queueResponse.data.totalActive) || 0;

      // Fetch ride details
      const rideResponse = await axios.get(
        `${RIDE_SERVICE_URL}/getRideDetails/${rideId}`
      );

      const { capacity, duration, status } = rideResponse.data;

      // Only OPEN rides allowed
      if (status !== "OPEN") {
        return {
          error: `Ride is currently ${status}`
        };
      }

      const data = {
        queueLength,
        capacity: Number(capacity),
        duration: parseFloat(duration),
        previousWait
      };

      // Validate capacity
      if (data.capacity <= 0) {
        throw new Error("Invalid ride capacity");
      }

      // No queue = no wait
      if (data.queueLength === 0) {
        return {
          rideId,
          estimatedWaitTime: 0,
          strategyUsed: "No Queue",
          queueLength: 0
        };
      }

      const currentHour = new Date().getHours();

      let strategy;
      let strategyName;

      const loadFactor = data.queueLength / data.capacity;

      if (loadFactor > 4) {
        strategy = new LoadBasedStrategy();
        strategyName = "Load Adaptive Prediction";
      } else if (currentHour >= 12 && currentHour <= 16) {
        strategy = new PeakHourStrategy();
        strategyName = "Peak Hour Prediction";
      } else if (previousWait !== null) {
        strategy = new AverageStrategy();
        strategyName = "Stability Prediction";
      } else {
        strategy = new BasicStrategy();
        strategyName = "Standard Prediction";
      }

      const context = new StrategyContext(strategy);

      const estimatedWaitTime = Math.max(
        0,
        Math.round(context.execute(data))
      );

      return {
        rideId,
        estimatedWaitTime,
        strategyUsed: strategyName,
        queueLength: data.queueLength
      };

    } catch (error) {
      console.error("WaitTimeLogic Error:", error.message);

      return {
        error: error.message
      };
    }
  }
}

module.exports = WaitTimeLogic;