import { adminDb } from "@/lib/firebase/admin";

export type TimePeriod = "30days" | "90days" | "6months" | "12months";

export interface ChartDataPoint {
  month: string; // label for x-axis (day or month)
  revenue: number;
}

export interface RevenueSeriesResult {
  amount: number;
  chartData: ChartDataPoint[];
}

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatDayLabel(d: Date) {
  // e.g., "Nov 6"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthLabel(d: Date) {
  // e.g., "Nov"
  return d.toLocaleDateString("en-US", { month: "short" });
}

function getBounds(period: TimePeriod) {
  const now = new Date();
  const end = new Date(now); // exclusive end
  let start: Date;
  switch (period) {
    case "30days":
      start = addDays(startOfDay(end), -30);
      break;
    case "90days":
      start = addDays(startOfDay(end), -90);
      break;
    case "6months":
      start = new Date(end.getFullYear(), end.getMonth() - 6, 1);
      break;
    case "12months":
    default:
      start = new Date(end.getFullYear(), end.getMonth() - 12, 1);
      break;
  }
  return { start, end } as const;
}

function toDateFlexible(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === "function") {
    try { return v.toDate(); } catch { return null; }
  }
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

async function queryRangeByDate(collectionRef: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query, start: Date, end: Date) {
  try {
    const q = (collectionRef as FirebaseFirestore.CollectionReference)
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .orderBy("created_at");
    const snap = await q.get();
    return snap;
  } catch {
    return null;
  }
}

async function queryRangeByISO(collectionRef: FirebaseFirestore.CollectionReference | FirebaseFirestore.Query, start: Date, end: Date) {
  try {
    const isoStart = start.toISOString();
    const isoEnd = end.toISOString();
    const q = (collectionRef as FirebaseFirestore.CollectionReference)
      .where("created_at", ">=", isoStart)
      .where("created_at", "<", isoEnd)
      .orderBy("created_at");
    const snap = await q.get();
    return snap;
  } catch {
    return null;
  }
}

async function fetchTransactionsInRange(start: Date, end: Date) {
  // Try top-level first, then collection group
  const sources: Array<FirebaseFirestore.Query | FirebaseFirestore.CollectionReference> = [
    adminDb.collection("transactions"),
  ];
  if (typeof (adminDb as any).collectionGroup === "function") {
    sources.push((adminDb as any).collectionGroup("transactions"));
  }

  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  for (const ref of sources) {
    // Try ISO string range
    let snap = await queryRangeByISO(ref, start, end);
    if (!snap || snap.empty) {
      // Try Date range
      snap = await queryRangeByDate(ref, start, end);
    }
    if (snap && !snap.empty) {
      snap.forEach((d) => docs.push(d));
    }
  }

  // If still empty, fallback to scan top-level then group
  if (docs.length === 0) {
    try {
      const snapAll = await adminDb.collection("transactions").get();
      snapAll.forEach((d) => docs.push(d));
    } catch {}
    if (docs.length === 0 && typeof (adminDb as any).collectionGroup === "function") {
      try {
        const snapAllG = await (adminDb as any).collectionGroup("transactions").get();
        snapAllG.forEach((d: any) => docs.push(d));
      } catch {}
    }
    // Filter by date bounds after scanning
    return docs.filter((d) => {
      const dt = toDateFlexible(d.get("created_at"));
      return dt && dt >= start && dt < end;
    });
  }

  return docs;
}

export async function getRevenueForPeriod(period: TimePeriod): Promise<RevenueSeriesResult> {
  const { start, end } = getBounds(period);
  const docs = await fetchTransactionsInRange(start, end);

  const isMonthly = period === "6months" || period === "12months";

  const buckets = new Map<string, number>();
  let total = 0;

  for (const doc of docs) {
    const status = doc.get("status");
    if (status && status !== "completed") continue;
    const amt = doc.get("amount");
    let n = 0;
    if (typeof amt === "number") n = amt;
    else if (typeof amt === "string") {
      const p = Number(amt);
      if (!Number.isNaN(p)) n = p;
    }
    if (!n) continue;

    const dt = toDateFlexible(doc.get("created_at"));
    if (!dt) continue;

    const key = isMonthly
      ? `${dt.getFullYear()}-${dt.getMonth()}`
      : `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;

    buckets.set(key, (buckets.get(key) || 0) + n);
    total += n;
  }

  // Build continuous series including zeros
  const chartData: ChartDataPoint[] = [];
  if (isMonthly) {
    let cursor = startOfMonth(start);
    const endMonthStart = startOfMonth(end);
    while (cursor < endMonthStart) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      chartData.push({ month: formatMonthLabel(cursor), revenue: buckets.get(key) || 0 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else {
    let cursor = startOfDay(start);
    const endDayStart = startOfDay(end);
    while (cursor < endDayStart) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      chartData.push({ month: formatDayLabel(cursor), revenue: buckets.get(key) || 0 });
      cursor = addDays(cursor, 1);
    }
  }

  return { amount: total, chartData };
}
