import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AutoFlagBody {
  enabled: boolean;
  threshold?: number; // default 10
}

function toDateFlexible(v: any): Date | null {
  if (!v) return null;
  if (typeof v.toDate === "function") { try { return v.toDate(); } catch {} }
  if (v instanceof Date) return v as Date;
  if (typeof v === "string") { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AutoFlagBody;
    const enabled = Boolean(body?.enabled);
    const threshold = Number(body?.threshold ?? 10);
    if (!enabled) return NextResponse.json({ ok: true, enabled: false, updatedReports: 0, flaggedUsers: 0, threshold });

    // 1) Fetch all report docs (top-level first, then collectionGroup)
    const docs: Array<{ id: string; data: any; ref: FirebaseFirestore.DocumentReference } > = [];
    try {
      const snap = await adminDb.collection("reports").get();
      snap.forEach((d) => docs.push({ id: d.id, data: d.data(), ref: d.ref }));
    } catch {}
    if (typeof (adminDb as any).collectionGroup === "function") {
      try {
        const cg = await (adminDb as any).collectionGroup("reports").get();
        cg.forEach((d: any) => docs.push({ id: d.id, data: d.data(), ref: d.ref }));
      } catch {}
    }

    // 2) Count reports by uid and by username
    const countsByUid = new Map<string, number>();
    const countsByName = new Map<string, number>();

    for (const { data } of docs) {
      const uid = (data?.reportedUserId ?? "").toString();
      const nameRaw = (data?.reportedUser ?? "").toString();
      if (uid) countsByUid.set(uid, (countsByUid.get(uid) || 0) + 1);
      if (nameRaw) {
        const name = nameRaw.trim();
        countsByName.set(name, (countsByName.get(name) || 0) + 1);
        if (name.startsWith("@")) {
          const alt = name.slice(1);
          countsByName.set(alt, (countsByName.get(alt) || 0) + 1);
        } else {
          const alt = `@${name}`;
          countsByName.set(alt, (countsByName.get(alt) || 0) + 1);
        }
      }
    }

    // 3) Determine flagged sets
    const flaggedUids = new Set<string>(Array.from(countsByUid.entries()).filter(([_, c]) => c >= threshold).map(([k]) => k));
    const flaggedNames = new Set<string>(Array.from(countsByName.entries()).filter(([_, c]) => c >= threshold).map(([k]) => k));
    const flaggedUsersCount = flaggedUids.size + flaggedNames.size;

    if (flaggedUsersCount === 0) {
      return NextResponse.json({ ok: true, enabled: true, threshold, updatedReports: 0, flaggedUsers: 0, updatedDocPaths: [] });
    }

    // 4) Update matching reports to status "Flagged" (do not override terminal statuses)
    const terminal = new Set(["Banned", "Suspended", "Ignored"]);

    const toUpdate: FirebaseFirestore.DocumentReference[] = [];
    for (const { data, ref } of docs) {
      const uid = (data?.reportedUserId ?? "").toString();
      const name = (data?.reportedUser ?? "").toString();
      const status = (data?.status ?? "").toString();
      const match = (uid && flaggedUids.has(uid)) || (name && flaggedNames.has(name)) || (name && flaggedNames.has(name.startsWith("@") ? name.slice(1) : `@${name}`));
      if (!match) continue;
      if (terminal.has(status)) continue;
      if (status === "Flagged") continue;
      toUpdate.push(ref);
    }

    // 5) Batch updates (respect 500 writes per batch)
    let updated = 0;
    let batch = adminDb.batch();
    for (let i = 0; i < toUpdate.length; i++) {
      const ref = toUpdate[i];
      batch.set(ref, { status: "Flagged", autoFlagged: true, flaggedAt: new Date() }, { merge: true });
      updated += 1;
      if ((i > 0 && i % 450 === 0) || i === toUpdate.length - 1) {
        await batch.commit();
        if (i !== toUpdate.length - 1) batch = adminDb.batch();
      }
    }

    // 6) Return summary with doc paths for client-side state update
    const updatedDocPaths = toUpdate.map((r) => r.path);
    return NextResponse.json({ ok: true, enabled: true, threshold, updatedReports: updated, flaggedUsers: flaggedUsersCount, updatedDocPaths });
  } catch (e: any) {
    console.error("[api/trust-safety/auto-flag] error", e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
