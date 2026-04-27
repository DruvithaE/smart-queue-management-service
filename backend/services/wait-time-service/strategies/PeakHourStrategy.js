const WaitTimeStrategy = require("./WaitTimeStrategy");

class PeakHourStrategy extends WaitTimeStrategy {
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
    let wait = cycles * duration;

    const currentHour = new Date().getHours();

    // Peak hours: 12 PM to 4 PM
    if (currentHour >= 12 && currentHour <= 16) {
      wait *= 1.2;
    }

    return Math.round(wait);
  }
}

module.exports = PeakHourStrategy;