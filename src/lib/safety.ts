export function checkDrawdown(
  currentValue: number,
  peakValue: number,
  maxDrawdown: number
): { paused: boolean; drawdownPercent: number } {
  if (peakValue <= 0) return { paused: false, drawdownPercent: 0 };
  const drawdownPercent = (peakValue - currentValue) / peakValue;
  return {
    paused: drawdownPercent >= maxDrawdown,
    drawdownPercent,
  };
}

export function checkStopLoss(
  entryPrice: number,
  currentPrice: number,
  stopLossPercent: number
): boolean {
  if (entryPrice <= 0) return false;
  const loss = (entryPrice - currentPrice) / entryPrice;
  return loss >= stopLossPercent;
}

export function checkCooldown(
  lastTradeTime: string | null,
  cooldownMinutes: number
): boolean {
  if (!lastTradeTime) return false;
  const elapsed = Date.now() - new Date(lastTradeTime).getTime();
  return elapsed < cooldownMinutes * 60 * 1000;
}

export function clampTradeSize(
  tradeEur: number,
  totalValueEur: number,
  maxTradePercent: number
): number {
  const maxSize = totalValueEur * maxTradePercent;
  return Math.min(tradeEur, maxSize);
}
