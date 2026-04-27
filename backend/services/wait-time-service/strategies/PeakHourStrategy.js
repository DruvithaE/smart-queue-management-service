const WaitTimeStrategy = require("./WaitTimeStrategy");

class PeakHourStrategy extends WaitTimeStrategy {
  calculate(data) {
    const { queueLength, capacity, duration } = data;

    if (capacity === 0) {
      throw new Error("Capacity cannot be zero");
    }

    if (queueLength <= capacity) {
      return 0;
    }

    const cycles = Math.floor(queueLength / capacity);
    let wait = cycles * duration;

    const currentHour = new Date().getHours();

    if (currentHour >= 12 && currentHour <= 16) {
      wait *= 1.2;
    }

    return Math.round(wait);
  }
}

module.exports = PeakHourStrategy;