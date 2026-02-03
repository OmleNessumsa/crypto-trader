import type { Candle } from "./coinbase";

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50; // neutral default

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculate4hMomentum(candles: Candle[]): number {
  const recent = candles.slice(0, 6); // most recent 6 candles
  if (recent.length < 2) return 0;

  const lastClose = parseFloat(recent[0].close);
  const firstClose = parseFloat(recent[recent.length - 1].close);

  if (firstClose === 0) return 0;
  return ((lastClose - firstClose) / firstClose) * 100;
}
