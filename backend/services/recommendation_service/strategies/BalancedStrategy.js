class BalancedStrategy {
  recommend(rides) {
    return rides
      .filter((ride) => ride.status === "OPEN")
      .sort((a, b) => b.score - a.score); // use optimization score
  }
}

module.exports = BalancedStrategy;