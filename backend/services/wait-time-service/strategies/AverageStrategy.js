const WaitTimeStrategy = require("./WaitTimeStrategy");

class AverageStrategy extends WaitTimeStrategy {
  calculate(data) {
    const {
      position,
      capacity,
      duration,
      previousWait
    } = data;

    if (capacity <= 0) {
      throw new Error("Capacity cannot be zero");
    }

    if (!position || position <= 0) {
      throw new Error("Invalid position");
    }

    // Calculate wait time only using position
    const cycles = Math.floor((position - 1) / capacity);
    const currentWait = cycles * duration;

    // Smooth using previous wait if available
    if (previousWait !== null) {
      return Math.round((previousWait + currentWait) / 2);
    }

    return Math.round(currentWait);
  }
}

module.exports = AverageStrategy;