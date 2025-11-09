import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === "function") { try { return val.toDate(); } catch {} }
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val); if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sinceHours = Math.max(0, Math.min(24 * 90, Number(url.searchParams.get("sinceHours") ?? 0)));
    const limit = Math.max(10, Math.min(2000, Number(url.searchParams.get("limit") ?? 1000)));
    const now = new Date();
    const since = sinceHours > 0 ? new Date(now.getTime() - sinceHours * 3600 * 1000) : null;

    const results: Array<{ id: string; fromUserId?: string; toUserId?: string; acceptedAt?: Date | null; createdAt?: Date | null }>= [];

    // Try top-level 'matchRequests'
    try {
      const snap = await adminDb.collection("matchRequests").where("status", "==", "accepted").limit(limit).get();
      snap.forEach((d) => {
        const data = d.data() || {};
        const acceptedAt = toDate(data.acceptedAt) || null;
        const createdAt = toDate(data.createdAt) || null;
        if (since && acceptedAt && acceptedAt < since) return;
        results.push({ id: d.id, fromUserId: data.fromUserId, toUserId: data.toUserId, acceptedAt, createdAt });
      });
    } catch (e) {
      console.warn("[ongoing-dates] top-level matchRequests failed", e);
    }

    // Fallback: collectionGroup("matchRequests") if needed
    if (results.length === 0 && typeof (adminDb as any).collectionGroup === 'function') {
      try {
        const cg = await (adminDb as any).collectionGroup("matchRequests").where("status", "==", "accepted").limit(limit).get();
        cg.forEach((d: any) => {
          const data = d.data() || {};
          const acceptedAt = toDate(data.acceptedAt) || null;
          const createdAt = toDate(data.createdAt) || null;
          if (since && acceptedAt && acceptedAt < since) return;
          results.push({ id: d.id, fromUserId: data.fromUserId, toUserId: data.toUserId, acceptedAt, createdAt });
        });
      } catch (e) {
        console.warn("[ongoing-dates] collectionGroup fallback failed", e);
      }
    }

    // Sort by acceptedAt desc, fallback to createdAt desc
    results.sort((a, b) => {
      const atA = (a.acceptedAt?.getTime() ?? a.createdAt?.getTime() ?? 0);
      const atB = (b.acceptedAt?.getTime() ?? b.createdAt?.getTime() ?? 0);
      return atB - atA;
    });

    const count = results.length;
    const recent = results.slice(0, Math.min(50, results.length));

    return NextResponse.json({ count, recent }, { status: 200 });
  } catch (e: any) {
    console.error("[api/analytics/ongoing-dates] error", e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
