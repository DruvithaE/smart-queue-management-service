const axios = require("axios");

const BasicStrategy = require("./strategies/BasicStrategy");
const AverageStrategy = require("./strategies/AverageStrategy");
const PeakHourStrategy = require("./strategies/PeakHourStrategy");
const LoadBasedStrategy = require("./strategies/LoadBasedStrategy");
const StrategyContext = require("./strategies/StrategyContext");

const BACKEND_PORT = process.env.PORT || 5000;
const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || `http://localhost:${BACKEND_PORT}/rides`;
const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || `http://localhost:${BACKEND_PORT}/queue`;

class WaitTimeLogic {
    static async calculateWaitTime(rideId, previousWait = null) {
        try {
            // Dummy queue length
            const queueResponse = await axios.get(
                `${QUEUE_SERVICE_URL}/queueStatus`,
                {
                  params: { rideId }
                }
              );
        
              const queueLength = queueResponse.data.totalActive || 0;
        
        
            // Fetch Ride Data
            const rideResponse = await axios.get(
                `${RIDE_SERVICE_URL}/getRideDetails/${rideId}`
            );

            const {
                capacity,
                duration,
                status
            } = rideResponse.data;

            if (status === "CLOSED") {
                return {
                    error: "Ride is currently unavailable"
                };
            }

            const data = {
                queueLength: Number(queueLength),
                capacity: Number(capacity),
                duration: parseFloat(duration),
                previousWait
            };

            const currentHour = new Date().getHours();

            let strategy;
            let strategyName;

            const loadFactor = data.capacity > 0 ? data.queueLength / data.capacity : 0;
            if (loadFactor > 4) {
                strategy = new LoadBasedStrategy();
                strategyName = "Load Adaptive Prediction";
            }
            else if (currentHour >= 12 && currentHour <= 16) {
                strategy = new PeakHourStrategy();
                strategyName = "Peak Hour Prediction";
            }
            else if (previousWait !== null) {
                strategy = new AverageStrategy();
                strategyName = "Stability Prediction";
            }
            else {
                strategy = new BasicStrategy();
                strategyName = "Standard Prediction";
            }

            const context = new StrategyContext(strategy);
            const estimatedWaitTime = context.execute(data);

            return {
                estimatedWaitTime,
                strategyUsed: strategyName,
                queueLength: data.queueLength,
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