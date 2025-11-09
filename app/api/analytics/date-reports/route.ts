import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";

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

function formatReasonLabel(raw: string): string {
  const clean = (raw || "").replace(/_/g, " ").trim();
  if (!clean) return "Other";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 20)));
    const sinceHours = Math.max(0, Math.min(24 * 180, Number(url.searchParams.get("sinceHours") ?? 0)));
    const now = new Date();
    const since = sinceHours > 0 ? new Date(now.getTime() - sinceHours * 3600 * 1000) : null;

    const results: Array<{
      id: string;
      reporterUid?: string;
      reportedUserUid?: string;
      reportBy: string;
      reportedUser: string;
      reason: string;
      createdAtMs: number;
      status?: string;
    }> = [];

    // Top-level 'reports'
    try {
      let q = adminDb.collection("reports").orderBy("createdAt", "desc");
      if (since) q = q.where("createdAt", ">=", since);
      const snap = await q.limit(limit).get();
      snap.forEach((d) => {
        const data = d.data() || {};
        const createdAt = toDate(data.createdAt) || toDate(data.updatedAt) || new Date(0);
        const reporterId = (data.reporterId ?? data.reportedBy ?? data.userId ?? "").toString();
        const reportedUserId = (data.reportedUserId ?? data.reportedUser ?? "").toString();
        const reason = formatReasonLabel((data.reason ?? "other").toString());
        results.push({
          id: d.id,
          reporterUid: reporterId || undefined,
          reportedUserUid: reportedUserId || undefined,
          reportBy: reporterId ? `@${reporterId}` : "-",
          reportedUser: reportedUserId ? (reportedUserId.startsWith('@') ? reportedUserId : `@${reportedUserId}`) : "-",
          reason,
          createdAtMs: createdAt.getTime(),
          status: (data.status ?? "").toString(),
        });
      });
    } catch (e) {
      console.warn("[date-reports] top-level query failed", e);
    }

    if (results.length === 0 && typeof (adminDb as any).collectionGroup === 'function') {
      try {
        let q = (adminDb as any).collectionGroup("reports");
        if (since) q = q.where("createdAt", ">=", since);
        const cg = await q.orderBy("createdAt", "desc").limit(limit).get();
        cg.forEach((d: any) => {
          const data = d.data() || {};
          const createdAt = toDate(data.createdAt) || toDate(data.updatedAt) || new Date(0);
          const reporterId = (data.reporterId ?? data.reportedBy ?? data.userId ?? "").toString();
          const reportedUserId = (data.reportedUserId ?? data.reportedUser ?? "").toString();
          const reason = formatReasonLabel((data.reason ?? "other").toString());
          results.push({
            id: d.id,
            reporterUid: reporterId || undefined,
            reportedUserUid: reportedUserId || undefined,
            reportBy: reporterId ? `@${reporterId}` : "-",
            reportedUser: reportedUserId ? (reportedUserId.startsWith('@') ? reportedUserId : `@${reportedUserId}`) : "-",
            reason,
            createdAtMs: createdAt.getTime(),
            status: (data.status ?? "").toString(),
          });
        });
      } catch (e) {
        console.warn("[date-reports] collectionGroup failed", e);
      }
    }

    // Resolve display names and moderation status using users/profiles/Auth/logs
    const uniqueUids = new Set<string>();
    for (const r of results) {
      if (r.reporterUid) uniqueUids.add(r.reporterUid);
      if (r.reportedUserUid) uniqueUids.add(r.reportedUserUid);
    }
    const nameMap = new Map<string, string>();
    const modStatusMap = new Map<string, string>();
    const avatarMap = new Map<string, string>();
    async function resolveFromProfiles(uid: string): Promise<{ name?: string; status?: string; avatar?: string }> {
      const colls = ["users", "profiles", "userProfiles", "publicUsers", "app_users", "userData", "members"];
      for (const c of colls) {
        try {
          const s = await adminDb.collection(c).doc(uid).get();
          if (s.exists) {
            const u = s.data() || {};
            const username = (u.username ?? u.userName ?? u.handle ?? "").toString().trim();
            const first = (u.firstName ?? u.firstname ?? u.givenName ?? u.name?.first ?? "").toString().trim();
            const last = (u.lastName ?? u.lastname ?? u.familyName ?? u.name?.last ?? "").toString().trim();
            const display = (u.displayName ?? u.name ?? "").toString().trim();
            const full = `${first} ${last}`.trim();
            const name = username ? `@${username}` : (display || full || undefined);
            const avatar = (
              u.photoURL ?? u.avatarUrl ?? u.avatar ?? u.photo ?? u.imageUrl ?? u.profilePic
            ) ? String(u.photoURL ?? u.avatarUrl ?? u.avatar ?? u.photo ?? u.imageUrl ?? u.profilePic) : undefined;
            let status: string | undefined;
            const m = u.moderation || {};
            const nowMs = Date.now();
            const suspendedUntil = toDate(m.suspendedUntil)?.getTime() || 0;
            if (m.banned) status = 'Banned';
            else if (m.suspended && suspendedUntil > nowMs) status = 'Suspended';
            else if ((m.lastAction || '').toString().toLowerCase() === 'warn') status = 'Warned';
            else if ((m.lastAction || '').toString().toLowerCase() === 'ignore') status = 'Ignored';
            return { name, status, avatar };
          }
        } catch {}
      }
      return {};
    }

    await Promise.all(Array.from(uniqueUids).map(async (uid) => {
      // profiles
      let { name, status, avatar } = await resolveFromProfiles(uid);
      // auth fallback for name
      if (!name) {
        try {
          const au = await adminAuth.getUser(uid);
          const dn = (au.displayName ?? "").toString().trim();
          if (dn) name = dn;
          if (!avatar && au.photoURL) avatar = String(au.photoURL);
        } catch {}
      }
      // moderationLogs fallback for status
      if (!status) {
        try {
          let q: any = adminDb.collection('moderationLogs').where('userUids', 'array-contains', uid).orderBy('createdAt', 'desc').limit(1);
          const ls = await q.get();
          if (!ls.empty) {
            const l = ls.docs[0].data() || {};
            const act = (l.action || '').toString().toLowerCase();
            status = act === 'ban' ? 'Banned' : act === 'suspend' ? 'Suspended' : act === 'warn' ? 'Warned' : act === 'ignore' ? 'Ignored' : undefined;
          }
        } catch {}
      }
      nameMap.set(uid, name || `@${uid}`);
      if (status) modStatusMap.set(uid, status);
      if (avatar) avatarMap.set(uid, avatar);
    }));

    const enriched = results.map(r => ({
      ...r,
      reportByDisplay: r.reporterUid ? (nameMap.get(r.reporterUid) || r.reportBy) : r.reportBy,
      reportedUserDisplay: r.reportedUserUid ? (nameMap.get(r.reportedUserUid) || r.reportedUser) : r.reportedUser,
      reportedUserModStatus: r.reportedUserUid ? (modStatusMap.get(r.reportedUserUid) || null) : null,
      reporterAvatarUrl: r.reporterUid ? (avatarMap.get(r.reporterUid) || null) : null,
      reportedUserAvatarUrl: r.reportedUserUid ? (avatarMap.get(r.reportedUserUid) || null) : null,
    }));

    enriched.sort((a, b) => b.createdAtMs - a.createdAtMs);

    return NextResponse.json({ items: enriched.slice(0, limit) }, { status: 200 });
  } catch (e: any) {
    console.error("[api/analytics/date-reports] error", e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
