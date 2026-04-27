const WaitTimeStrategy = require("./WaitTimeStrategy");

class LoadBasedStrategy extends WaitTimeStrategy {
  calculate(data) {
    const { position, capacity, duration } = data;

    if (capacity <= 0) {
      throw new Error("Capacity cannot be zero");
    }

    if (!position || position <= 0) {
      throw new Error("Invalid position");
    }

    // Base wait using position
    const cycles = Math.floor((position - 1) / capacity);
    const baseWait = cycles * duration;

    // Load factor based on how deep user is in queue
    const loadFactor = position / capacity;

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