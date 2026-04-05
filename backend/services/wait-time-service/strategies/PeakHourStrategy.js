const WaitTimeStrategy = require("./WaitTimeStrategy");

class PeakHourStrategy extends WaitTimeStrategy {
    calculate(data) {
        const { queueLength, capacity, duration } = data;
        const baseWaitTime = (queueLength / capacity) * duration;

        const currentHour = new Date().getHours();
        if (currentHour >= 12 && currentHour <= 16) {
            return baseWaitTime * 1.2; // Increase wait time by 20% during peak hours
        }

        return baseWaitTime;
    }
}

module.exports = PeakHourStrategy;