class PopularStrategy {
  recommend(rides) {
    return rides.sort((a, b) => b.queueLength - a.queueLength);
  }
}

module.exports = PopularStrategy;