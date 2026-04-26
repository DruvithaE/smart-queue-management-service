class QueueOptimizationStrategy {
  constructor(waitTimeService) {
    this.waitTimeService = waitTimeService;
  }

  async execute(rides) {
    const results = [];

    for (const ride of rides) {
      if (ride.status !== "OPEN") continue;

      const queueLength = ride.queue_length || 0;
      const capacity = ride.capacity || 1;

      const utilization = queueLength / capacity;

      // get predicted wait time
      let waitTime = 0;
      try {
        const res = await this.waitTimeService.calculateWaitTime(ride.id);
        waitTime = res.waitTime || 0;
      } catch {
        waitTime = 0;
      }

      let category;
      let suggestion;

      if (utilization > 1.5) {
        category = "OVERLOADED";
        suggestion = "Avoid — high congestion";
      } else if (utilization < 0.7) {
        category = "UNDERUTILIZED";
        suggestion = "Recommended — low crowd";
      } else {
        category = "BALANCED";
        suggestion = "Moderate wait — acceptable";
      }

      results.push({
        rideId: ride.id,
        name: ride.name,
        utilization: Number(utilization.toFixed(2)),
        waitTime,
        category,
        suggestion,
      });
    }

    // sort: best rides first (underutilized → balanced → overloaded)
    const priority = {
      UNDERUTILIZED: 1,
      BALANCED: 2,
      OVERLOADED: 3,
    };

    results.sort((a, b) => priority[a.category] - priority[b.category]);

    return results;
  }
}

module.exports = QueueOptimizationStrategy;