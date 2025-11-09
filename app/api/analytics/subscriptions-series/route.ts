import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return x; }
function formatMonth(d: Date) { return d.toLocaleDateString("en-US", { month: "short" }); }

function toDateFlexible(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') { try { return v.toDate(); } catch {} }
  if (v instanceof Date) return v;
  if (typeof v === 'string') { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  return null;
}

export async function GET() {
  try {
    const end = new Date(); // exclusive
    const start = startOfMonth(addMonths(end, -6));

    // Prefer range query (top-level then group)
    const sources: any[] = [adminDb.collection('transactions')];
    if (typeof (adminDb as any).collectionGroup === 'function') sources.push((adminDb as any).collectionGroup('transactions'));

    const docs: any[] = [];
    for (const ref of sources) {
      try {
        const q = ref.where('created_at', '>=', start).where('created_at', '<', end).orderBy('created_at');
        const snap = await q.get();
        if (!snap.empty) snap.forEach((d: any) => docs.push(d));
      } catch {}
      if (docs.length) break;
    }
    if (docs.length === 0) {
      // Fallback scan
      try {
        const snap = await adminDb.collection('transactions').get();
        snap.forEach((d) => docs.push(d));
      } catch {}
      if (docs.length === 0 && typeof (adminDb as any).collectionGroup === 'function') {
        try {
          const snap = await (adminDb as any).collectionGroup('transactions').get();
          snap.forEach((d: any) => docs.push(d));
        } catch {}
      }
    }

    const isInRange = (d: Date) => d >= start && d < end;
    const buckets = new Map<string, number>();

    for (const doc of docs) {
      const dt = toDateFlexible(doc.get('created_at'));
      if (!dt || !isInRange(dt)) continue;
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    // Build continuous monthly series over last 6 months
    const points: Array<{ name: string; value: number }> = [];
    let cursor = startOfMonth(start);
    const endMonth = startOfMonth(end);
    while (cursor < endMonth) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      points.push({ name: formatMonth(cursor), value: buckets.get(key) || 0 });
      cursor = addMonths(cursor, 1);
    }

    return NextResponse.json({ points }, { status: 200 });
  } catch (e) {
    console.error('[api/analytics/subscriptions-series] error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
