import { NextRequest, NextResponse } from "next/server";
import {
  checkAndPromote,
  manualPromote,
  rejectCandidate,
  getPromotionStatus,
  rollbackConfig,
} from "@/lib/evaluation/promoter";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    switch (action) {
      case "auto":
      case "check": {
        // Automatic promotion check
        const result = await checkAndPromote(body.criteria);
        return NextResponse.json({
          action: "auto_promote",
          ...result,
        });
      }

      case "manual": {
        // Manual promotion of specific candidate
        const candidateId = body.candidateId as number;
        if (!candidateId) {
          return NextResponse.json(
            { error: "candidateId required for manual promotion" },
            { status: 400 }
          );
        }
        const result = await manualPromote(candidateId);
        return NextResponse.json({
          action: "manual_promote",
          ...result,
        });
      }

      case "reject": {
        // Reject a candidate
        const candidateId = body.candidateId as number;
        const reason = body.reason ?? "Manually rejected";
        if (!candidateId) {
          return NextResponse.json(
            { error: "candidateId required for rejection" },
            { status: 400 }
          );
        }
        await rejectCandidate(candidateId, reason);
        return NextResponse.json({
          action: "reject",
          candidateId,
          reason,
        });
      }

      case "rollback": {
        // Rollback to default config
        const result = await rollbackConfig();
        return NextResponse.json({
          action: "rollback",
          ...result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: auto, manual, reject, or rollback` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get promotion status (no auth required for read)
    const status = await getPromotionStatus();
    return NextResponse.json(status);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
