const WaitTimeStrategy = require("./WaitTimeStrategy");

class LoadBasedStrategy extends WaitTimeStrategy {
    calculate(data) {
        const { queueLength, capacity, duration } = data;

        if (capacity === 0) {
            throw new Error("Capacity cannot be zero");
        }

        const baseWait = (queueLength / capacity) * duration;

        const loadFactor = queueLength / capacity;

        let adjustedWait = baseWait;

        if (loadFactor > 5) {
            adjustedWait = baseWait * 1.3; // heavy load
        } else if (loadFactor > 3) {
            adjustedWait = baseWait * 1.1; // moderate load
        }

        return Math.round(adjustedWait);
    }
}

module.exports = LoadBasedStrategy;