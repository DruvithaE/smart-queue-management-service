class LowWaitStrategy {
  recommend(rides) {
    return rides.sort((a, b) =>
      Number(a.waitTime) - Number(b.waitTime)
    );
  }
}

module.exports = LowWaitStrategy;