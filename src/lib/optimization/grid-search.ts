import type { StrategyParams, PARAMETER_RANGES, BASE_WEIGHT_VARIATIONS } from "../backtesting/types";

/**
 * Parameter range definition for grid search
 */
export interface ParameterRange {
  min: number;
  max: number;
  step: number;
}

/**
 * Default parameter ranges for optimization
 */
export const DEFAULT_PARAMETER_RANGES: Record<string, ParameterRange> = {
  maxTradePercent: { min: 0.1, max: 0.3, step: 0.05 },
  stopLossPercent: { min: 0.03, max: 0.1, step: 0.01 },
  cooldownMinutes: { min: 15, max: 60, step: 15 },
  rsiOversoldThreshold: { min: 25, max: 35, step: 5 },
  rsiOverboughtThreshold: { min: 65, max: 75, step: 5 },
};

/**
 * Default base weight variations
 */
export const DEFAULT_WEIGHT_VARIATIONS: Record<string, number>[] = [
  { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 }, // Equal
  { "BTC-EUR": 0.5, "ETH-EUR": 0.3, "SOL-EUR": 0.2 }, // BTC heavy
  { "BTC-EUR": 0.3, "ETH-EUR": 0.5, "SOL-EUR": 0.2 }, // ETH heavy
  { "BTC-EUR": 0.4, "ETH-EUR": 0.4, "SOL-EUR": 0.2 }, // Balanced majors
];

/**
 * Generate all values for a parameter range
 */
function generateRangeValues(range: ParameterRange): number[] {
  const values: number[] = [];
  for (let v = range.min; v <= range.max; v += range.step) {
    values.push(Math.round(v * 1000) / 1000); // Round to avoid floating point issues
  }
  return values;
}

/**
 * Generate all parameter combinations for grid search
 */
export function generateParameterGrid(
  ranges: Record<string, ParameterRange> = DEFAULT_PARAMETER_RANGES,
  weightVariations: Record<string, number>[] = DEFAULT_WEIGHT_VARIATIONS
): StrategyParams[] {
  const paramValues: Record<string, number[]> = {};

  // Generate values for each parameter
  for (const [param, range] of Object.entries(ranges)) {
    paramValues[param] = generateRangeValues(range);
  }

  // Generate all combinations
  const combinations: StrategyParams[] = [];

  for (const maxTradePercent of paramValues.maxTradePercent) {
    for (const stopLossPercent of paramValues.stopLossPercent) {
      for (const cooldownMinutes of paramValues.cooldownMinutes) {
        for (const rsiOversoldThreshold of paramValues.rsiOversoldThreshold) {
          for (const rsiOverboughtThreshold of paramValues.rsiOverboughtThreshold) {
            for (const baseWeights of weightVariations) {
              combinations.push({
                maxTradePercent,
                stopLossPercent,
                cooldownMinutes,
                rsiOversoldThreshold,
                rsiOverboughtThreshold,
                baseWeights,
              });
            }
          }
        }
      }
    }
  }

  return combinations;
}

/**
 * Generate a reduced parameter grid for faster testing
 * Uses larger steps and fewer weight variations
 */
export function generateReducedGrid(): StrategyParams[] {
  const reducedRanges: Record<string, ParameterRange> = {
    maxTradePercent: { min: 0.15, max: 0.25, step: 0.1 },
    stopLossPercent: { min: 0.04, max: 0.08, step: 0.02 },
    cooldownMinutes: { min: 20, max: 40, step: 20 },
    rsiOversoldThreshold: { min: 25, max: 35, step: 10 },
    rsiOverboughtThreshold: { min: 65, max: 75, step: 10 },
  };

  const reducedWeights = [
    { "BTC-EUR": 0.333, "ETH-EUR": 0.333, "SOL-EUR": 0.334 },
    { "BTC-EUR": 0.5, "ETH-EUR": 0.3, "SOL-EUR": 0.2 },
  ];

  return generateParameterGrid(reducedRanges, reducedWeights);
}

/**
 * Generate parameter combinations around a known good configuration
 * Useful for fine-tuning a successful strategy
 */
export function generateNeighborhoodGrid(
  baseParams: StrategyParams,
  stepMultiplier: number = 0.5
): StrategyParams[] {
  const combinations: StrategyParams[] = [];

  // Small variations around each parameter
  const variations = [-1, 0, 1];

  for (const maxTradeVar of variations) {
    for (const stopLossVar of variations) {
      for (const cooldownVar of variations) {
        for (const rsiOversoldVar of variations) {
          for (const rsiOverboughtVar of variations) {
            const params: StrategyParams = {
              maxTradePercent: Math.max(
                0.05,
                Math.min(0.4, baseParams.maxTradePercent + maxTradeVar * 0.05 * stepMultiplier)
              ),
              stopLossPercent: Math.max(
                0.02,
                Math.min(0.15, baseParams.stopLossPercent + stopLossVar * 0.01 * stepMultiplier)
              ),
              cooldownMinutes: Math.max(
                10,
                Math.min(120, baseParams.cooldownMinutes + cooldownVar * 10 * stepMultiplier)
              ),
              rsiOversoldThreshold: Math.max(
                20,
                Math.min(40, baseParams.rsiOversoldThreshold + rsiOversoldVar * 5 * stepMultiplier)
              ),
              rsiOverboughtThreshold: Math.max(
                60,
                Math.min(80, baseParams.rsiOverboughtThreshold + rsiOverboughtVar * 5 * stepMultiplier)
              ),
              baseWeights: baseParams.baseWeights,
            };

            combinations.push(params);
          }
        }
      }
    }
  }

  // Remove duplicates based on parameter values
  const seen = new Set<string>();
  return combinations.filter((params) => {
    const key = JSON.stringify(params);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Estimate the number of backtests needed for a grid
 */
export function estimateGridSize(
  ranges: Record<string, ParameterRange> = DEFAULT_PARAMETER_RANGES,
  weightVariationsCount: number = DEFAULT_WEIGHT_VARIATIONS.length
): number {
  let total = 1;

  for (const range of Object.values(ranges)) {
    const steps = Math.floor((range.max - range.min) / range.step) + 1;
    total *= steps;
  }

  return total * weightVariationsCount;
}

/**
 * Get a human-readable description of parameter settings
 */
export function describeParameters(params: StrategyParams): string {
  const lines = [
    `Max Trade: ${(params.maxTradePercent * 100).toFixed(0)}%`,
    `Stop Loss: ${(params.stopLossPercent * 100).toFixed(0)}%`,
    `Cooldown: ${params.cooldownMinutes}min`,
    `RSI Oversold: ${params.rsiOversoldThreshold}`,
    `RSI Overbought: ${params.rsiOverboughtThreshold}`,
    `Weights: BTC=${(params.baseWeights["BTC-EUR"] * 100).toFixed(0)}% ETH=${(params.baseWeights["ETH-EUR"] * 100).toFixed(0)}% SOL=${(params.baseWeights["SOL-EUR"] * 100).toFixed(0)}%`,
  ];

  return lines.join(", ");
}
