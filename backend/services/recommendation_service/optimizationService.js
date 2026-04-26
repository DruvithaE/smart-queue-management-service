// optimizationService.js

class OptimizationService {

  /**
   * Used inside recommendations
   * Adds scoring + category for ranking
   */
  static scoreRides(rides) {
    return rides.map((ride) => {
      const { queueLength, capacity, waitTime, status } = ride;

      // Push non-open rides to bottom
      if (status !== "OPEN") {
        return { ...ride, score: -999 };
      }

      const safeCapacity = capacity || 1;
      const utilization = queueLength / safeCapacity;

      let category;
      let score;
        let reason;

        if (utilization > 1.5) {
        category = "OVERLOADED";
        score = 20 - waitTime;
        reason = "High crowd, not recommended";
        } else if (utilization < 0.7) {
        category = "UNDERUTILIZED";
        score = 100 - waitTime;
        reason = "Low crowd, best choice";
        } else {
        category = "BALANCED";
        score = 60 - waitTime;
        reason = "Moderate wait time";
        }

      return {
        ...ride,
        utilization: Number(utilization.toFixed(2)),
        category,
        score,
        reason,
      };
    });
  }


  /**
   * Used by /optimizeQueue API
   * System-level crowd balancing
   */
  static optimizeQueues(rides) {
    return rides
      .filter((ride) => ride.status === "OPEN")
      .map((ride) => {
        const { queueLength, capacity, waitTime } = ride;

        const safeCapacity = capacity || 1;
        const utilization = queueLength / safeCapacity;

        let category;
        let suggestion;
        let action;

        if (utilization > 1.5) {
          category = "OVERLOADED";
          suggestion = "High congestion";
          action = "Redirect users / reduce inflow";
        } else if (utilization < 0.7) {
          category = "UNDERUTILIZED";
          suggestion = "Low crowd";
          action = "Promote this ride";
        } else {
          category = "BALANCED";
          suggestion = "Optimal usage";
          action = "Maintain flow";
        }

        return {
          rideId: ride.id,
          name: ride.name,
          queueLength,
          capacity,
          waitTime,
          utilization: Number(utilization.toFixed(2)),
          category,
          suggestion,
          action,
        };
      })
      .sort((a, b) => a.utilization - b.utilization); // best first
  }
}

module.exports = OptimizationService;