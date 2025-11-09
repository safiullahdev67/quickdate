import { NextResponse } from "next/server";
import { getRevenueForPeriod } from "@/lib/revenue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Granularity = "daily" | "weekly" | "monthly" | "yearly";

function groupDailyToWeeks(points: Array<{ name: string; value: number; date: Date }>) {
  // Group by ISO week (YYYY-WW)
  const intl = new Intl.DateTimeFormat("en-GB", { week: "numeric", year: "numeric" } as any);
  const weekKey = (d: Date) => {
    // Fallback to simple key: year-weekOfYear
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7; // Monday=1..Sunday=7
    // set to Thursday in current week for ISO week
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  };
  const map = new Map<string, number>();
  const lastDateByKey = new Map<string, Date>();
  for (const p of points) {
    const k = weekKey(p.date);
    map.set(k, (map.get(k) || 0) + p.value);
    if (!lastDateByKey.has(k) || p.date > (lastDateByKey.get(k) as Date)) lastDateByKey.set(k, p.date);
  }
  // Sort by natural week order (based on last date in week)
  const entries = Array.from(map.entries()).sort((a, b) => (lastDateByKey.get(a[0]) as Date).getTime() - (lastDateByKey.get(b[0]) as Date).getTime());
  return entries.map(([k, v]) => ({ name: k, value: v }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const g = (searchParams.get("granularity") || "daily").toLowerCase() as Granularity;

    if (g === "daily") {
      const res = await getRevenueForPeriod("30days");
      // Attach synthetic date for weekly grouping
      const today = new Date();
      let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const points = res.chartData.map((p) => ({ name: p.month, value: p.revenue }));
      return NextResponse.json({ points }, { status: 200 });
    }

    if (g === "weekly") {
      const res = await getRevenueForPeriod("90days");
      // We don't have raw dates, so re-derive dates by walking back from end with length of series
      const end = new Date(); // exclusive
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const days = res.chartData.length;
      const withDates = res.chartData.map((p, idx) => {
        const d = new Date(start);
        d.setDate(d.getDate() - (days - idx));
        return { name: p.month, value: p.revenue, date: d };
      });
      const weeks = groupDailyToWeeks(withDates).slice(-12); // last ~12 weeks
      return NextResponse.json({ points: weeks }, { status: 200 });
    }

    if (g === "monthly") {
      const res = await getRevenueForPeriod("6months");
      const points = res.chartData.map((p) => ({ name: p.month, value: p.revenue }));
      return NextResponse.json({ points }, { status: 200 });
    }

    // yearly
    const res = await getRevenueForPeriod("12months");
    const points = res.chartData.map((p) => ({ name: p.month, value: p.revenue }));
    return NextResponse.json({ points }, { status: 200 });
  } catch (e) {
    console.error("[api/analytics/revenue-series] error", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
