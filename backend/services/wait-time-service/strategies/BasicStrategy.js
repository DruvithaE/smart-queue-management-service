const WaitTimeStrategy = require("./WaitTimeStrategy");

class BasicStrategy extends WaitTimeStrategy {
    calculate(data) {
        const { queueLength, capacity, duration } = data;
        return (queueLength / capacity) * duration;
    }
}

module.exports = BasicStrategy;