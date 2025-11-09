import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { guessCountry } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateFlexible(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === "function") { try { return v.toDate(); } catch {} }
  if (v instanceof Date) return v as Date;
  if (typeof v === "string") { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  return null;
}

function getBounds(period: string) {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  switch (period) {
    case "all":
      start = new Date(0); // Jan 1, 1970
      break;
    case "90days": start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 90); break;
    case "6months": start = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate()); break;
    case "12months": start = new Date(end.getFullYear(), end.getMonth() - 12, end.getDate()); break;
    case "30days":
    default: start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 30); break;
  }
  return { start, end } as const;
}

async function fetchUsers(max: number) {
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  try {
    const snap = await adminDb.collection("users").limit(max).get();
    snap.forEach((d) => docs.push(d));
  } catch {}
  if (docs.length === 0 && typeof (adminDb as any).collectionGroup === "function") {
    try {
      const cg = await (adminDb as any).collectionGroup("users").limit(max).get();
      cg.forEach((d: any) => docs.push(d));
    } catch {}
  }
  return docs;
}

function toDateFromDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): Date | null {
  const fields = ["created_at", "createdAt", "timestamp", "created", "date"]; // common variants
  for (const f of fields) {
    const v = (doc as any).get(f);
    const d = toDateFlexible(v);
    if (d) return d;
  }
  return null;
}

async function fetchTransactionsInRange(start: Date, end: Date) {
  const sources: Array<FirebaseFirestore.Query | FirebaseFirestore.CollectionReference> = [
    adminDb.collection("transactions"),
  ];
  if (typeof (adminDb as any).collectionGroup === "function") {
    sources.push((adminDb as any).collectionGroup("transactions"));
  }
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const ref of sources) {
    // Try ISO on created_at
    try {
      const q = (ref as FirebaseFirestore.CollectionReference)
        .where("created_at", ">=", start.toISOString())
        .where("created_at", "<", end.toISOString())
        .orderBy("created_at");
      const s = await q.get();
      if (!s.empty) s.forEach((d) => docs.push(d));
    } catch {}
    // Try Date on created_at
    if (docs.length === 0) {
      try {
        const q2 = (ref as FirebaseFirestore.CollectionReference)
          .where("created_at", ">=", start)
          .where("created_at", "<", end)
          .orderBy("created_at");
        const s2 = await q2.get();
        if (!s2.empty) s2.forEach((d) => docs.push(d));
      } catch {}
    }
  }
  if (docs.length > 0) return docs;
  // Fallback scan and filter in memory by flexible date fields
  const scanned: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  try {
    const all = await adminDb.collection("transactions").get();
    all.forEach((d) => scanned.push(d));
  } catch {}
  if (scanned.length === 0 && typeof (adminDb as any).collectionGroup === "function") {
    try {
      const allG = await (adminDb as any).collectionGroup("transactions").get();
      allG.forEach((d: any) => scanned.push(d));
    } catch {}
  }
  return scanned.filter((d) => {
    const dt = toDateFromDoc(d);
    return dt && dt >= start && dt < end;
  });
}

function getAmountFlexible(doc: FirebaseFirestore.QueryDocumentSnapshot): number {
  const candidates = [
    doc.get("amount"),
    doc.get("total"),
    doc.get("value"),
    doc.get("price"),
    doc.get("amount_cents"),
    doc.get("amountCents"),
  ];
  for (const v of candidates) {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      // Try direct parse
      let n = Number(v);
      if (Number.isNaN(n)) {
        // Strip non-numeric except sign and dot
        const cleaned = v.replace(/[^0-9.\-]/g, "");
        n = Number(cleaned);
      }
      if (!Number.isNaN(n)) return n;
    }
  }
  // amount in cents variants
  const cents = (typeof doc.get("amount_cents") === "number" ? doc.get("amount_cents") :
                typeof doc.get("amountCents") === "number" ? doc.get("amountCents") : 0) as number;
  if (cents) return cents / 100;
  return 0;
}

async function fetchRecentMessages(start: Date | null) {
  if (typeof (adminDb as any).collectionGroup !== "function") return [] as any[];
  try {
    let query = (adminDb as any).collectionGroup("messages");
    if (start) {
      query = query.where("createdAt", ">=", start);
    }
    query = query.orderBy("createdAt", "desc").limit(50000);
    const snap = await query.get();
    const arr: any[] = [];
    snap.forEach((d: any) => arr.push({ id: d.id, data: d.data() }));
    return arr;
  } catch {
    return [] as any[];
  }
}

function isTransactionPaid(doc: FirebaseFirestore.QueryDocumentSnapshot): boolean {
  const paidFlag = doc.get("paid");
  if (paidFlag === true) return true;
  const raw = (doc.get("status") ?? doc.get("payment_status") ?? "").toString().toLowerCase();
  if (!raw) return true; // treat missing status as paid to avoid undercounting
  const ok = new Set(["completed", "success", "succeeded", "paid", "captured", "settled"]);
  const bad = new Set(["failed", "refund", "refunded", "chargeback", "disputed", "cancelled", "canceled", "voided"]);
  if (ok.has(raw)) return true;
  if (bad.has(raw)) return false;
  // unknown statuses treated as paid
  return true;
}

function extractUserIdFromTx(doc: FirebaseFirestore.QueryDocumentSnapshot): string {
  const candidates = [
    doc.get("userId"), doc.get("uid"), doc.get("user_id"), doc.get("buyerId"),
    doc.get("customerId"), doc.get("payerId"), doc.get("user"), doc.get("profileId"),
  ];
  for (const v of candidates) {
    if (!v) continue;
    if (typeof v === 'string') return v;
    // Firestore DocumentReference
    if (typeof v === 'object' && v && typeof (v as any).id === 'string') return (v as any).id;
    if (typeof v === 'object' && v && typeof (v as any).path === 'string') {
      const path: string = (v as any).path;
      const parts = path.split('/');
      const last = parts[parts.length - 1];
      if (last) return last;
    }
  }
  return "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30days";
    const maxUsers = Number(searchParams.get("maxUsers") || 5000);
    const { start, end } = getBounds(period);

    // 1) Users by country
    const userDocs = await fetchUsers(maxUsers);
    const byCountry = new Map<string, { name: string; users: number; userIds: Set<string> }>();
    const userToCode = new Map<string, string>();
    for (const d of userDocs) {
      const data = d.data() || {} as any;
      const uid = d.id;
      let lat: number | null = null;
      let lng: number | null = null;
      const loc = data.location ?? data.geo ?? data.position ?? null;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') { lat = loc.latitude; lng = loc.longitude; }
      else if (loc && typeof loc._latitude === 'number' && typeof loc._longitude === 'number') { lat = loc._latitude; lng = loc._longitude; }
      else {
        const latRaw = data.lat ?? data.latitude; const lngRaw = data.lng ?? data.longitude;
        const lt = typeof latRaw === 'string' ? Number(latRaw) : latRaw;
        const lg = typeof lngRaw === 'string' ? Number(lngRaw) : lngRaw;
        if (Number.isFinite(lt) && Number.isFinite(lg)) { lat = lt as number; lng = lg as number; }
      }
      if (lat == null || lng == null) continue;
      const guess = guessCountry(lat, lng);
      if (!guess || !guess.code) continue;
      const code = guess.code;
      const rec = byCountry.get(code) || { name: guess.name, users: 0, userIds: new Set<string>() };
      rec.users += 1; rec.userIds.add(uid);
      // keep earliest meaningful name
      if (!rec.name) rec.name = guess.name;
      byCountry.set(code, rec);
      userToCode.set(uid, code);
    }

    // 2) Revenue by country from transactions in range
    const txDocs = await fetchTransactionsInRange(start, end);
    const revenueByCountry = new Map<string, number>();
    for (const doc of txDocs) {
      if (!isTransactionPaid(doc)) continue;
      const n = getAmountFlexible(doc);
      if (!n) continue;
      const uid = extractUserIdFromTx(doc);
      if (!uid) continue;
      // fast lookup via user index; if missing, fetch the user doc and map its location on the fly
      let code = userToCode.get(uid);
      if (!code) {
        try {
          const uSnap = await adminDb.collection("users").doc(uid).get();
          const u = uSnap.data() || {} as any;
          let lat: number | null = null; let lng: number | null = null;
          const loc = u.location ?? u.geo ?? u.position ?? null;
          if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') { lat = loc.latitude; lng = loc.longitude; }
          else if (loc && typeof loc._latitude === 'number' && typeof loc._longitude === 'number') { lat = loc._latitude; lng = loc._longitude; }
          else {
            const latRaw = u.lat ?? u.latitude; const lngRaw = u.lng ?? u.longitude;
            const lt = typeof latRaw === 'string' ? Number(latRaw) : latRaw;
            const lg = typeof lngRaw === 'string' ? Number(lngRaw) : lngRaw;
            if (Number.isFinite(lt) && Number.isFinite(lg)) { lat = lt as number; lng = lg as number; }
          }
          if (lat != null && lng != null) {
            const g = guessCountry(lat, lng);
            if (g && g.code) {
              code = g.code;
              userToCode.set(uid, code);
              const rec = byCountry.get(code) || { name: g.name, users: 0, userIds: new Set<string>() };
              if (!rec.userIds.has(uid)) {
                rec.userIds.add(uid);
                rec.users += 1; // count users discovered via transactions as well
              }
              if (!rec.name) rec.name = g.name;
              byCountry.set(code, rec);
            }
          }
        } catch {}
      }
      if (code) revenueByCountry.set(code, (revenueByCountry.get(code) || 0) + n);
    }

    // 3) Engagement: recent messages per user → avg per country
    const messages = await fetchRecentMessages(period === "all" ? null : start);
    const msgCountByUid = new Map<string, number>();
    for (const { data } of messages) {
      const sender = (data?.senderId ?? data?.sender ?? data?.from ?? data?.userId ?? "").toString();
      if (!sender) continue;
      msgCountByUid.set(sender, (msgCountByUid.get(sender) || 0) + 1);
    }
    const engagement: Map<string, { totalMsgs: number; users: number }> = new Map();
    for (const [code, rec] of byCountry.entries()) {
      let totalMsgs = 0;
      for (const uid of rec.userIds) totalMsgs += (msgCountByUid.get(uid) || 0);
      // use actual unique users we have ids for
      const ucount = rec.userIds.size || rec.users;
      engagement.set(code, { totalMsgs, users: ucount });
    }

    const classify = (avg: number) => avg >= 5 ? "High" : avg >= 2 ? "Medium" : "Low";

    const result = Array.from(byCountry.entries()).map(([code, rec]) => {
      const rev = revenueByCountry.get(code) || 0;
      const eng = engagement.get(code) || { totalMsgs: 0, users: rec.userIds.size || rec.users };
      const denom = eng.users || (rec.userIds.size || rec.users);
      const avg = denom > 0 ? eng.totalMsgs / denom : 0;
      return {
        code,
        country: rec.name,
        users: rec.userIds.size || rec.users,
        revenue: rev,
        engagement: classify(avg),
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ items: result });
  } catch (e: any) {
    console.error("[region-insights] error", e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
