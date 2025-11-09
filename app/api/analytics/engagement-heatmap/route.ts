import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateFlexible(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === 'function') { try { return v.toDate(); } catch {} }
  if (v instanceof Date) return v;
  if (typeof v === 'string') { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  return null;
}

function timeLabel(hour: number) {
  const h12 = ((hour + 11) % 12) + 1; // 0->12, 13->1
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12} ${ampm}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.max(1, Math.min(14, Number(searchParams.get('days') || 7)));

    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days);

    // Fetch messages from last N days
    const docs: any[] = [];
    const useCollectionGroup = process.env.TS_USE_COLLECTION_GROUP === 'true' && typeof (adminDb as any).collectionGroup === 'function';
    if (useCollectionGroup) {
      try {
        const snap = await (adminDb as any)
          .collectionGroup('messages')
          .where('createdAt', '>=', start)
          .where('createdAt', '<', end)
          .get();
        if (!snap.empty) snap.forEach((d: any) => docs.push(d));
      } catch {}

      if (docs.length === 0) {
        try {
          const snap = await (adminDb as any)
            .collectionGroup('messages')
            .where('created_at', '>=', start)
            .where('created_at', '<', end)
            .get();
          if (!snap.empty) snap.forEach((d: any) => docs.push(d));
        } catch {}
      }

      if (docs.length === 0) {
        try {
          const snap = await (adminDb as any).collectionGroup('messages').get();
          snap.forEach((d: any) => {
            const ts = d.get('createdAt') ?? d.get('created_at') ?? d.get('timestamp') ?? d.get('sentAt') ?? d.get('created');
            const dt = toDateFlexible(ts);
            if (dt && dt >= start && dt < end) docs.push(d);
          });
        } catch {}
      }
    }

    // Fallbacks: top-level 'messages' and scanning room collections
    if (docs.length === 0) {
      // Top-level 'messages' time range
      try {
        const snap = await adminDb
          .collection('messages')
          .where('createdAt', '>=', start)
          .where('createdAt', '<', end)
          .limit(2000)
          .get();
        snap.forEach((d) => docs.push(d));
      } catch {}
    }

    if (docs.length === 0) {
      const roomCollections = ['chatRooms', 'rooms', 'chats'];
      for (const rc of roomCollections) {
        try {
          const roomSnap = await adminDb.collection(rc).limit(50).get();
          for (const roomDoc of roomSnap.docs) {
            try {
              const sub = await roomDoc.ref.collection('messages').limit(200).get();
              sub.forEach((d) => {
                const ts = d.get('createdAt') ?? d.get('created_at') ?? d.get('timestamp') ?? d.get('sentAt') ?? d.get('created');
                const dt = toDateFlexible(ts);
                if (dt && dt >= start && dt < end) docs.push(d);
              });
            } catch {}
          }
          if (docs.length > 0) break;
        } catch {}
      }
    }

    // Build 2-hour buckets 0..22 and weekdays Mon..Sun
    const hours = Array.from({ length: 12 }, (_, i) => i * 2);
    const daysOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun with JS getDay (0=Sun)
    const counts: Record<string, Record<string, number>> = {};
    for (const h of hours) counts[h] = {} as any;

    const values: number[] = [];

    for (const d of docs) {
      const ts = d.get('createdAt') ?? d.get('created_at') ?? d.get('timestamp') ?? d.get('sentAt') ?? d.get('created');
      const dt = toDateFlexible(ts);
      if (!dt) continue;
      const jsDay = dt.getDay();
      const slot = Math.floor(dt.getHours() / 2) * 2; // 0,2,4,...,22
      const col = String(jsDay);
      counts[slot][col] = (counts[slot][col] || 0) + 1;
      values.push(counts[slot][col]);
    }

    // Compute thresholds for intensity 1..3
    const nonZero = values.filter((v) => v > 0);
    nonZero.sort((a, b) => a - b);
    const p33 = nonZero.length ? nonZero[Math.floor(nonZero.length * 0.33)] : 1;
    const p66 = nonZero.length ? nonZero[Math.floor(nonZero.length * 0.66)] : 2;

    const rows: Array<Record<string, any>> = hours.map((h) => {
      const row: any = { time: timeLabel(h) };
      for (const jsDay of daysOrder) {
        const c = counts[h][String(jsDay)] || 0;
        let intensity = 0;
        if (c > 0) intensity = c <= p33 ? 1 : c <= p66 ? 2 : 3;
        const key = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][jsDay === 0 ? 6 : jsDay - 1];
        row[key] = intensity;
      }
      return row;
    });

    return NextResponse.json({ rows }, { status: 200 });
  } catch (e) {
    console.error('[api/analytics/engagement-heatmap] error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
