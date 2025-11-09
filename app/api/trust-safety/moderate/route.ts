import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ModerateBody {
  action: "warn" | "ban" | "suspend" | "ignore";
  reports?: Array<{ id?: string; docPath?: string }>;
  userUids?: string[];
  reportedNames?: string[];
  reason?: string;
  durationDays?: number; // for suspend
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ModerateBody;
    const action = body?.action;
    if (!action || !["warn", "ban", "suspend", "ignore"].includes(action)) {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    // Status by action (used for UI filters). We'll also set resolved=true flag.
    const statusMap: Record<ModerateBody["action"], string> = {
      warn: "Warned",
      ban: "Banned",
      suspend: "Suspended",
      ignore: "Ignored",
    };

    const reportRefSet = new Map<string, FirebaseFirestore.DocumentReference>();
    for (const r of body.reports || []) {
      if (r.docPath) {
        const ref = adminDb.doc(r.docPath);
        reportRefSet.set(ref.path, ref);
      }
    }

    const uids = Array.from(new Set((body.userUids || []).filter(Boolean)));
    const namesRaw = Array.from(new Set((body.reportedNames || []).filter(Boolean))) as string[];
    // Normalize names: keep as-is and without leading '@'
    const names: string[] = [];
    for (const n of namesRaw) {
      const t = n.trim();
      if (!t) continue;
      names.push(t);
      if (t.startsWith('@')) names.push(t.slice(1));
      else names.push(`@${t}`);
    }

    const batch = adminDb.batch();
    const now = new Date();
    const status = statusMap[action];

    // Find all reports for supplied userUids as well
    for (const uid of uids) {
      try {
        const top = await adminDb.collection("reports").where("reportedUserId", "==", uid).get();
        top.forEach((d) => reportRefSet.set(d.ref.path, d.ref));
      } catch {}
      try {
        const top2 = await adminDb.collection("reports").where("reportedUser", "==", uid).get();
        top2.forEach((d) => reportRefSet.set(d.ref.path, d.ref));
      } catch {}
      if (typeof (adminDb as any).collectionGroup === 'function') {
        try {
          const cg = await (adminDb as any).collectionGroup('reports').where('reportedUserId', '==', uid).get();
          cg.forEach((d: any) => reportRefSet.set(d.ref.path, d.ref));
        } catch {}
        try {
          const cg2 = await (adminDb as any).collectionGroup('reports').where('reportedUser', '==', uid).get();
          cg2.forEach((d: any) => reportRefSet.set(d.ref.path, d.ref));
        } catch {}
      }
    }

    // Also find reports by reportedNames (username strings)
    for (const name of names) {
      try {
        const topByName = await adminDb.collection("reports").where("reportedUser", "==", name).get();
        topByName.forEach((d) => reportRefSet.set(d.ref.path, d.ref));
      } catch {}
      if (typeof (adminDb as any).collectionGroup === 'function') {
        try {
          const cgByName = await (adminDb as any).collectionGroup('reports').where('reportedUser', '==', name).get();
          cgByName.forEach((d: any) => reportRefSet.set(d.ref.path, d.ref));
        } catch {}
      }
    }

    // Update report statuses
    for (const ref of reportRefSet.values()) {
      const update: any = {
        status, // show specific action as status for filtering
        updatedAt: now,
        moderationAction: action,
        resolutionAction: action,
        resolutionAt: now,
        resolved: true,
      };
      if (action === 'ignore') update.ignored = true;
      batch.set(ref, update, { merge: true });
    }

    // Update user moderation fields
    for (const uid of uids) {
      const uref = adminDb.collection("users").doc(uid);
      if (action === "warn") {
        batch.set(
          uref,
          {
            moderation: {
              warningsCount: FieldValue.increment(1),
              lastWarnedAt: now,
              lastAction: "warn",
            },
          },
          { merge: true }
        );
      } else if (action === "ban") {
        batch.set(
          uref,
          {
            moderation: {
              banned: true,
              bannedAt: now,
              lastAction: "ban",
            },
          },
          { merge: true }
        );
      } else if (action === "suspend") {
        const days = Number(body.durationDays || 7);
        const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        batch.set(
          uref,
          {
            moderation: {
              suspended: true,
              suspendedAt: now,
              suspendedUntil: until,
              lastAction: "suspend",
            },
          },
          { merge: true }
        );
      } else if (action === "ignore") {
        batch.set(
          uref,
          {
            moderation: {
              ignoredAt: now,
              lastAction: "ignore",
            },
          },
          { merge: true }
        );
      }
    }

    // Moderation log document
    const logRef = adminDb.collection("moderationLogs").doc();
    batch.set(logRef, {
      action,
      status, // Warned/Banned/Suspended/Ignored
      reason: body.reason || null,
      reportDocPaths: Array.from(reportRefSet.values()).map((r) => r.path),
      userUids: uids,
      createdAt: now,
      durationDays: action === "suspend" ? Number(body.durationDays || 7) : null,
    });

    await batch.commit();

    return NextResponse.json(
      {
        ok: true,
        updatedReports: reportRefSet.size,
        affectedUsers: uids.length,
        status,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[api/trust-safety/moderate] error", e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
