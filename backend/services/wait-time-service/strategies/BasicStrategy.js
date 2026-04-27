const WaitTimeStrategy = require("./WaitTimeStrategy");

class BasicStrategy extends WaitTimeStrategy {
  calculate(data) {
    const { queueLength, capacity, duration } = data;

    if (capacity === 0) {
      throw new Error("Capacity cannot be zero");
    }

    if (queueLength <= capacity) {
      return 0;
    }

    const cycles = Math.floor(queueLength / capacity);

    return cycles * duration;
  }
}

module.exports = BasicStrategy;