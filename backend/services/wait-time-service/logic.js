const BasicStrategy = require("./strategies/BasicStrategy");
const AverageStrategy = require("./strategies/AverageStrategy");
const PeakHourStrategy = require("./strategies/PeakHourStrategy");
const LoadBasedStrategy = require("./strategies/LoadBasedStrategy");
const StrategyContext = require("./strategies/StrategyContext");

class WaitTimeLogic {
    static calculateWaitTime(data) {
        const { queueLength, capacity, duration, previousWait } = data;

        // Choose strategy based on conditions
        const currentHour = new Date().getHours();
        let strategy;
        let strategyName;

        // 🔥 Strategy Selection Logic
        if (queueLength / capacity > 4) {
            strategy = new LoadBasedStrategy();
            strategyName = "LoadBasedStrategy";
        } 
        else if (currentHour >= 12 && currentHour <= 16) {
            strategy = new PeakHourStrategy();
            strategyName = "PeakHourStrategy";
        } 
        else if (previousWait) {
            strategy = new AverageStrategy();
            strategyName = "AverageStrategy";
        } 
        else {
            strategy = new BasicStrategy();
            strategyName = "BasicStrategy";
        }


        // Use strategy context to calculate wait time
        const context = new StrategyContext(strategy);
        const estimatedWaitTime = context.execute({
            queueLength,
            capacity,
            duration,
            previousWait,
        });

        return {
            estimatedWaitTime,
            strategyUsed: strategyName,
        };
    }
}

module.exports = WaitTimeLogic;