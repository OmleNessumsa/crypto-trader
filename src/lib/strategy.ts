import type { Candle } from "./coinbase";
import { calculateRSI, calculate4hMomentum } from "./indicators";

interface CalculateTargetWeightsParams {
  pairs: string[];
  prices: Record<string, number>;
  candles: Record<string, Candle[]>;
  baseWeights: Record<string, number>;
  aiWeights?: Record<string, number> | null;
}

export function calculateTargetWeights({
  pairs,
  prices,
  candles,
  baseWeights,
  aiWeights,
}: CalculateTargetWeightsParams): Record<string, number> {
  // If AI weights are provided, use them directly
  if (aiWeights && Object.keys(aiWeights).length > 0) {
    return normalizeWeights(aiWeights, pairs);
  }

  const raw: Record<string, number> = {};

  for (const pair of pairs) {
    let weight = baseWeights[pair] ?? 1 / pairs.length;
    const pairCandles = candles[pair] ?? [];

    // Momentum tilt
    const momentum = calculate4hMomentum(pairCandles);
    const momentumTilt = Math.max(-0.15, Math.min(0.15, momentum / 100));
    weight += momentumTilt;

    // RSI adjustment
    const closes = pairCandles.map((c) => parseFloat(c.close));
    const rsi = calculateRSI(closes);
    if (rsi > 70) {
      weight *= 0.8; // reduce overextended
    } else if (rsi < 30) {
      weight *= 1.2; // increase oversold
    }

    raw[pair] = Math.max(0, weight);
  }

  return normalizeWeights(raw, pairs);
}

function normalizeWeights(
  weights: Record<string, number>,
  pairs: string[]
): Record<string, number> {
  const total = pairs.reduce((sum, p) => sum + (weights[p] ?? 0), 0);
  if (total === 0) {
    const equal = 1 / pairs.length;
    const result: Record<string, number> = {};
    for (const p of pairs) result[p] = equal;
    return result;
  }
  const result: Record<string, number> = {};
  for (const p of pairs) {
    result[p] = (weights[p] ?? 0) / total;
  }
  return result;
}
