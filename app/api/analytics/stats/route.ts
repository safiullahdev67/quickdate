import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

function toDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === "function") { try { return val.toDate(); } catch {} }
  if (val instanceof Date) return val;
  if (typeof val === "string") { const dt = new Date(val); if (!Number.isNaN(dt.getTime())) return dt; }
  return null;
}

async function sumTransactionsInRange(start: Date, end: Date): Promise<number> {
  // Try date range (Date)
  try {
    const q = adminDb.collection("transactions")
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .orderBy("created_at");
    const snap = await q.get();
    let total = 0;
    snap.forEach((doc) => {
      const status = doc.get("status");
      if (status && status !== "completed") return;
      const amt = doc.get("amount");
      if (typeof amt === "number") total += amt; else if (typeof amt === "string") { const n = Number(amt); if (!Number.isNaN(n)) total += n; }
    });
    return total;
  } catch {}
  // Try ISO string range
  try {
    const isoStart = start.toISOString();
    const isoEnd = end.toISOString();
    const q2 = adminDb.collection("transactions")
      .where("created_at", ">=", isoStart)
      .where("created_at", "<", isoEnd)
      .orderBy("created_at");
    const snap2 = await q2.get();
    let total2 = 0;
    snap2.forEach((doc) => {
      const status = doc.get("status");
      if (status && status !== "completed") return;
      const amt = doc.get("amount");
      if (typeof amt === "number") total2 += amt; else if (typeof amt === "string") { const n = Number(amt); if (!Number.isNaN(n)) total2 += n; }
    });
    return total2;
  } catch {}
  // Fallback scan
  try {
    const snap = await adminDb.collection("transactions").get();
    let total = 0;
    snap.forEach((doc) => {
      const status = doc.get("status");
      if (status && status !== "completed") return;
      const c = toDate(doc.get("created_at"));
      if (!c || c < start || c >= end) return;
      const amt = doc.get("amount");
      if (typeof amt === "number") total += amt; else if (typeof amt === "string") { const n = Number(amt); if (!Number.isNaN(n)) total += n; }
    });
    return total;
  } catch {
    return 0;
  }
}

async function countTransactions(): Promise<number> {
  try {
    const snap = await adminDb.collection("transactions").count().get();
    const n = snap.data().count ?? 0; if (n > 0) return n;
  } catch {}
  try {
    const snap = await adminDb.collection("transactions").get();
    return snap.size;
  } catch { return 0; }
}

async function buildRetentionRate(): Promise<{ rate: number; changePct: number }> {
  // Approx retention via unique message senders comparing prev day vs today
  const now = new Date();
  const todayStart = startOfDay(now);
  const yStart = addDays(todayStart, -1);
  const pStart = addDays(todayStart, -2);

  const getUniqueSenders = async (start: Date, end: Date) => {
    const set = new Set<string>();
    // Try createdAt as Date
    try {
      const snap = await (adminDb as any)
        .collectionGroup("messages")
        .where("createdAt", ">=", start)
        .where("createdAt", "<", end)
        .get();
      snap.forEach((doc: any) => {
        const d = doc.data() || {};
        const sender = (d.senderId ?? d.sender ?? d.from ?? d.userId ?? "").toString();
        if (sender) set.add(sender);
      });
      if (set.size > 0) return set;
    } catch {}

    // Try created_at as Date or ISO string
    try {
      const snap = await (adminDb as any)
        .collectionGroup("messages")
        .where("created_at", ">=", start)
        .where("created_at", "<", end)
        .get();
      snap.forEach((doc: any) => {
        const d = doc.data() || {};
        const sender = (d.senderId ?? d.sender ?? d.from ?? d.userId ?? "").toString();
        if (sender) set.add(sender);
      });
      if (set.size > 0) return set;
    } catch {}

    // Fallback: scan and filter timestamps in JS
    try {
      const snap = await (adminDb as any).collectionGroup("messages").get();
      snap.forEach((doc: any) => {
        const d = doc.data() || {};
        const sender = (d.senderId ?? d.sender ?? d.from ?? d.userId ?? "").toString();
        const ts = d.createdAt ?? d.created_at ?? d.timestamp ?? d.sentAt ?? d.created;
        const dt = (typeof ts?.toDate === 'function') ? ts.toDate() : (typeof ts === 'string' ? new Date(ts) : ts);
        if (sender && dt instanceof Date && !Number.isNaN(dt.getTime()) && dt >= start && dt < end) set.add(sender);
      });
      return set;
    } catch {
      return set;
    }
  };

  const todaySenders = await getUniqueSenders(yStart, todayStart); // last 24h ending now
  const prevSenders = await getUniqueSenders(pStart, yStart);
  const prevCount = prevSenders.size;
  const intersection = new Set(Array.from(todaySenders).filter((x) => prevSenders.has(x)));
  const returning = intersection.size;
  const rate = prevCount ? Math.round((returning / prevCount) * 100) : 0;

  // Change vs previous day retention (use a rough estimate by shifting one day back)
  // For simplicity, compute previous rate as proportion of prevSenders who were also active in the day before (requires another query)
  const p2Start = addDays(pStart, -1);
  const prevPrevSenders = await getUniqueSenders(p2Start, pStart);
  const prevIntersection = new Set(Array.from(prevSenders).filter((x) => prevPrevSenders.has(x)));
  const prevRate = prevPrevSenders.size ? Math.round((prevIntersection.size / prevPrevSenders.size) * 100) : 0;
  const changePct = prevRate ? Math.round(((rate - prevRate) / prevRate) * 1000) / 10 : 0;
  return { rate, changePct };
}

export async function GET() {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const yesterdayStart = addDays(todayStart, -1);

    const monthStart = startOfMonth(now);
    const nextMonthStart = startOfMonth(addMonths(now, 1));
    const prevMonthStart = startOfMonth(addMonths(now, -1));

    const [todayRevenue, yesterdayRevenue, monthRevenue, prevMonthRevenue, txCount, retention] = await Promise.all([
      sumTransactionsInRange(todayStart, tomorrowStart),
      sumTransactionsInRange(yesterdayStart, todayStart),
      sumTransactionsInRange(monthStart, nextMonthStart),
      sumTransactionsInRange(prevMonthStart, monthStart),
      countTransactions(),
      buildRetentionRate(),
    ]);

    const todayChangePct = yesterdayRevenue ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10 : 0;
    const monthlyChangePct = prevMonthRevenue ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 1000) / 10 : 0;

    return NextResponse.json({
      todaysRevenue: { amount: todayRevenue, changePct: todayChangePct },
      monthlyRevenue: { amount: monthRevenue, changePct: monthlyChangePct },
      activeSubscriptions: { count: txCount, changePct: 0 },
      retentionRate: { rate: retention.rate, changePct: retention.changePct },
    });
  } catch (e) {
    console.error("[api/analytics/stats] error", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
