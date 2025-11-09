import { NextResponse } from "next/server";
import { buildLiveFeed } from "@/lib/trustSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 50)));
    const roomId = searchParams.get("roomId") || undefined;
    const sinceHoursRaw = searchParams.get("sinceHours");
    const sinceHours = sinceHoursRaw ? Number(sinceHoursRaw) : undefined;
    const items = await buildLiveFeed({ limit, roomId, sinceHours });
    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    console.error("[api/trust-safety/live-feed] error", e);
    return NextResponse.json({ error: "failed_to_build_live_feed" }, { status: 500 });
  }
}
