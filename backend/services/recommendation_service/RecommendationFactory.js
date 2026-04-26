const LowWaitStrategy = require("./strategies/LowWaitStrategy");
const BalancedStrategy = require("./strategies/BalancedStrategy");
const PopularStrategy = require("./strategies/PopularStrategy");

class RecommendationFactory {
  static getStrategy(type) {
    switch (type) {
      case "LOW_WAIT":
        return new LowWaitStrategy();
      case "POPULAR":
        return new PopularStrategy();
      case "BALANCED":
      default:
        return new BalancedStrategy();
    }
  }
}

module.exports = RecommendationFactory;