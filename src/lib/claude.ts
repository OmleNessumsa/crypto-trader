import {
  PortfolioState,
  TradeRecord,
  TradingConfig,
} from "@/lib/store";
import { Candle } from "@/lib/coinbase";

interface AnalyzeParams {
  portfolio: PortfolioState;
  prices: Record<string, number>;
  candles: Record<string, Candle[]>;
  indicators: Record<string, { rsi: number; momentum: number }>;
  recentTrades: TradeRecord[];
  config: TradingConfig;
}

interface AnalyzeResult {
  weights: Record<string, number>;
  stopLosses: Record<string, number>;
  reasoning: string;
}

export async function analyzeMarket(
  params: AnalyzeParams
): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const systemPrompt = `You are a crypto trading AI. Analyze the portfolio and market data. Return JSON with:
- weights: target allocation for BTC-EUR, ETH-EUR, SOL-EUR summing to 1.0
- stopLosses: per-pair stop-loss percentage like 0.05
- reasoning: brief explanation of your analysis

Return ONLY valid JSON, no markdown.`;

  const userPrompt = `Analyze the following market data and provide trading recommendations:

${JSON.stringify(params, null, 2)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const rawText: string = data.content?.[0]?.text ?? "";

  // Parse JSON, handling possible markdown code blocks
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim();
  const parsed = JSON.parse(jsonStr) as AnalyzeResult;

  // Validate and clamp weights
  const weights = parsed.weights;
  for (const key of Object.keys(weights)) {
    weights[key] = Math.min(0.6, Math.max(0, weights[key]));
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const key of Object.keys(weights)) {
      weights[key] = weights[key] / sum;
    }
  }

  return {
    weights,
    stopLosses: parsed.stopLosses,
    reasoning: parsed.reasoning,
  };
}
