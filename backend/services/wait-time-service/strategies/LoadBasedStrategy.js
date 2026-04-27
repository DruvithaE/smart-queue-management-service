const WaitTimeStrategy = require("./WaitTimeStrategy");

class LoadBasedStrategy extends WaitTimeStrategy {
  calculate(data) {
    const { queueLength, capacity, duration } = data;

    if (capacity === 0) {
      throw new Error("Capacity cannot be zero");
    }

    // Immediate boarding
    if (queueLength <= capacity) {
      return 0;
    }

    const baseWait = (queueLength / capacity) * duration;

    const loadFactor = queueLength / capacity;

    let adjustedWait = baseWait;

    if (loadFactor > 5) {
      adjustedWait = baseWait * 1.3;
    } else if (loadFactor > 3) {
      adjustedWait = baseWait * 1.1;
    }

    return Math.round(adjustedWait);
  }
}

module.exports = LoadBasedStrategy;