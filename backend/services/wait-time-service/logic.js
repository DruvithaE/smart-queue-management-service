const axios = require("axios");

const BasicStrategy = require("./strategies/BasicStrategy");
const AverageStrategy = require("./strategies/AverageStrategy");
const PeakHourStrategy = require("./strategies/PeakHourStrategy");
const LoadBasedStrategy = require("./strategies/LoadBasedStrategy");
const StrategyContext = require("./strategies/StrategyContext");

const BACKEND_PORT = process.env.PORT;

const RIDE_SERVICE_URL =
  process.env.RIDE_SERVICE_URL ||
  `http://localhost:${BACKEND_PORT}/rides`;

const QUEUE_SERVICE_URL =
  process.env.QUEUE_SERVICE_URL ||
  `http://localhost:${BACKEND_PORT}/queue`;

class WaitTimeLogic {
  static async calculateWaitTime(
    rideId,
    userId = null,
    previousWait = null
  ) {
    try {
      // Fetch queue status
    //   console.log(`Fetching queue status for rideId: ${rideId}, userId: ${userId}`);
      const queueResponse = await axios.get(
        `${QUEUE_SERVICE_URL}/queueStatus`,
        {
          params: {
            rideId,
            userId
          }
        }
      );

      const queueData = queueResponse.data;

      const totalActive =
        Number(queueData.totalActive) || 0;

      // If user in queue use real position
      // Else assume next joining position
      const position = queueData.userInQueue
        ? Number(queueData.position)
        : totalActive + 1;

      // Fetch ride details
      const rideResponse = await axios.get(
        `${RIDE_SERVICE_URL}/getRideDetails/${rideId}`
      );

      const { capacity, duration, status } =
        rideResponse.data;

      if (status !== "OPEN") {
        return {
          error: `Ride is currently ${status}`
        };
      }

      const data = {
        position,
        capacity: Number(capacity),
        duration: parseFloat(duration),
        previousWait
      };

      if (data.capacity <= 0) {
        throw new Error("Invalid ride capacity");
      }

      const currentHour = new Date().getHours();

      let strategy;
      let strategyName;

      const loadFactor =
        data.position / data.capacity;

      if (loadFactor > 4) {
        strategy = new LoadBasedStrategy();
        strategyName =
          "Load Adaptive Prediction";
      } else if (
        currentHour >= 12 &&
        currentHour <= 16
      ) {
        strategy = new PeakHourStrategy();
        strategyName =
          "Peak Hour Prediction";
      } else if (previousWait !== null) {
        strategy = new AverageStrategy();
        strategyName =
          "Stability Prediction";
      } else {
        strategy = new BasicStrategy();
        strategyName =
          "Standard Prediction";
      }

      const context =
        new StrategyContext(strategy);

      const estimatedWaitTime = Math.max(
        0,
        Math.round(context.execute(data))
      );

      return {
        rideId,
        estimatedWaitTime,
        strategyUsed: strategyName,
        totalActive,
        position,
        userInQueue:
          queueData.userInQueue || false
      };

    } catch (error) {
      console.error(
        "WaitTimeLogic Error:",
        error.message
      );

      return {
        error: error.message
      };
    }
  }
}

module.exports = WaitTimeLogic;