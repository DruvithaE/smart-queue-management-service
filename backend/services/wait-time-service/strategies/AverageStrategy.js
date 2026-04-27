const WaitTimeStrategy = require("./WaitTimeStrategy");

class AverageStrategy extends WaitTimeStrategy {
  calculate(data) {
    const { queueLength, capacity, duration, previousWait } = data;

    if (queueLength < capacity) {
      return 0;
    }

    const currentWait = (queueLength / capacity) * duration;

    return (previousWait + currentWait) / 2;
  }
}

module.exports = AverageStrategy;