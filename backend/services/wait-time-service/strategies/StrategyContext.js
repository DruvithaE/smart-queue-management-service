class StrategyContext {
    constructor(strategy) {
        this.strategy = strategy;
    }

    execute(data) {
        return this.strategy.calculate(data);
    }
}

module.exports = StrategyContext;