import { NextResponse } from "next/server";
import { getRevenueForPeriod } from "@/lib/revenue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get("period") || "30days") as any;
    // Guard to allowed values
    const allowed = new Set(["30days", "90days", "6months", "12months"]);
    const period = allowed.has(periodParam) ? (periodParam as any) : ("30days" as const);

    const data = await getRevenueForPeriod(period);
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.warn("[API] /api/revenue error:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
