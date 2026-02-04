import { NextRequest, NextResponse } from "next/server";
import { getConfig, setConfig, TradingConfig } from "@/lib/store";

export async function GET() {
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<TradingConfig>;
  const current = await getConfig();

  const updated: TradingConfig = {
    ...current,
    ...body,
  };

  await setConfig(updated);
  return NextResponse.json(updated);
}

export async function PUT(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<TradingConfig>;
  const current = await getConfig();

  const updated: TradingConfig = {
    ...current,
    ...body,
  };

  await setConfig(updated);
  return NextResponse.json(updated);
}
