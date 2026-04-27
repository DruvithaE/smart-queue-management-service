const WaitTimeStrategy = require("./WaitTimeStrategy");

class BasicStrategy extends WaitTimeStrategy {
  calculate(data) {
    const { position, capacity, duration } = data;

    if (capacity <= 0) {
      throw new Error("Capacity cannot be zero");
    }

    if (!position || position <= 0) {
      throw new Error("Invalid position");
    }

    const cycles = Math.floor((position - 1) / capacity);

    return cycles * duration;
  }
}

module.exports = BasicStrategy;