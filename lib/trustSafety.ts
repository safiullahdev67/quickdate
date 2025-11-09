import { adminDb, adminAuth } from "@/lib/firebase/admin";
import type { LiveFeedItem } from "@/lib/trustSafetyMockData";
import type { Report, ReportCategory, TrustSafetyData } from "@/lib/trustSafetyMockData";
import type { RegionData } from "@/types/schema";
import { guessCountry } from "@/lib/geo";

function toDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val.toDate === "function") {
    try { return val.toDate(); } catch {}
  }
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function formatReasonLabel(raw: string): string {
  const clean = (raw || "").replace(/_/g, " ").trim();
  if (!clean) return "Other";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Pick a human-friendly sender name from a message payload, if present
function pickSenderName(data: any): string | undefined {
  try {
    const candidates = [
      data?.senderName, data?.sender_name, data?.senderDisplayName, data?.displayName,
      data?.username, data?.userName, data?.handle, data?.name,
    ];
    for (const c of candidates) {
      if (!c) continue;
      const s = String(c).trim();
      if (s) return s.startsWith('@') ? s : `@${s}`;
    }
  } catch {}
  return undefined;
}

// Try to infer a display name for a sender from the room document:
// - names/usernames/handles map keyed by uid
// - participants array with name/otherName fields
function pickSenderNameFromRoom(roomData: any, senderId: string): string | undefined {
  try {
    if (!roomData) return undefined;
    const namesObj = roomData.names || roomData.usernames || roomData.handles;
    if (namesObj && typeof namesObj === 'object' && namesObj[senderId]) {
      const v = String(namesObj[senderId]).trim();
      if (v) return v.startsWith('@') ? v : `@${v}`;
    }
    const participants = Array.isArray(roomData.participants) ? roomData.participants.map((x: any) => String(x)) : [];
    if (participants.length >= 2) {
      const idx = participants.indexOf(String(senderId));
      if (idx === 0 && roomData.name) {
        const v = String(roomData.name).trim();
        if (v) return v.startsWith('@') ? v : `@${v}`;
      }
      if (idx === 1 && roomData.otherName) {
        const v = String(roomData.otherName).trim();
        if (v) return v.startsWith('@') ? v : `@${v}`;
      }
    }
  } catch {}
  return undefined;
}

export async function fetchReportsFromFirestore() {
  const docs: any[] = [];
  // Try top-level 'reports'
  try {
    const snap = await adminDb.collection("reports").get();
    snap.forEach((d) => docs.push({ id: d.id, data: d.data(), path: d.ref.path }));
  } catch (e) {
    console.warn("[TrustSafety] failed to fetch top-level reports:", e);
  }
  // Fallback to collectionGroup
  if (docs.length === 0 && typeof (adminDb as any).collectionGroup === "function") {
    try {
      const cg = await (adminDb as any).collectionGroup("reports").get();
      cg.forEach((d: any) => docs.push({ id: d.id, data: d.data(), path: d.ref.path }));
    } catch (e) {
      console.warn("[TrustSafety] failed to fetch collectionGroup('reports'):", e);
    }
  }
  return docs;
}

export async function buildReportsSummary() {
  const raw = await fetchReportsFromFirestore();

  const reports: Report[] = [];
  const byReason = new Map<string, number>();
  let total = 0;
  let resolved = 0;
  let pending = 0;

  // Helper: stable numeric from doc id → 1000..9999
  const toRPT = (docId: string) => {
    let hash = 0;
    for (let i = 0; i < docId.length; i++) {
      hash = (hash * 31 + docId.charCodeAt(i)) | 0;
    }
    const num = Math.abs(hash % 9000) + 1000; // 1000..9999
    return `RPT-${num}`;
  };

  // Collect unique reported user ids for name lookup
  const uniqueReported = new Set<string>();
  for (const { data } of raw) {
    const reportedUserId = (data?.reportedUserId ?? data?.reportedUser ?? "").toString();
    if (reportedUserId) uniqueReported.add(reportedUserId);
  }

  // Fetch usernames (preferred) and fallbacks
  const nameMap = new Map<string, string>();
  await Promise.all(
    Array.from(uniqueReported).map(async (uid) => {
      try {
        const snap = await adminDb.collection("users").doc(uid).get();
        const u = snap.data() || {};
        const username = (u.username ?? u.userName ?? u.handle ?? "").toString().trim();
        const first = (u.firstName ?? u.firstname ?? u.givenName ?? u.name?.first ?? "").toString().trim();
        const last = (u.lastName ?? u.lastname ?? u.familyName ?? u.name?.last ?? "").toString().trim();
        const display = (u.displayName ?? u.name ?? "").toString().trim();
        const full = `${first} ${last}`.trim();
        const finalVal = username ? `@${username}` : (full || display || `@${uid}`);
        nameMap.set(uid, finalVal);
      } catch {}
    })
  );

  for (const { id, data, path } of raw) {
    const reasonRaw = (data?.reason ?? "other").toString();
    const reason = formatReasonLabel(reasonRaw);
    const statusRaw = (data?.status ?? "pending").toString().toLowerCase();
    const reportedUserId = (data?.reportedUserId ?? data?.reportedUser ?? "").toString();

    total += 1;
    const resolvedLike = (
      statusRaw === "resolved" ||
      statusRaw === "warned" ||
      statusRaw === "banned" ||
      statusRaw === "suspended" ||
      statusRaw === "ignored" ||
      Boolean(data?.resolved === true)
    );
    if (resolvedLike) {
      resolved += 1;
    } else if (statusRaw === "pending" || !statusRaw) {
      pending += 1;
    }
    byReason.set(reason, (byReason.get(reason) || 0) + 1);

    const displayName = reportedUserId ? (nameMap.get(reportedUserId) || `@${reportedUserId}`) : "-";

    // Do not show ignored reports in the table (but they are included in Status Card totals above)
    if (statusRaw === "ignored" || data?.ignored === true) {
      continue;
    }

    // Each doc counts as one report in the table
    reports.push({
      id: id, // preserve original
      userId: toRPT(id), // format shown in table as Report ID
      reportedUser: displayName,
      reportedUserUid: reportedUserId || undefined,
      docPath: typeof path === 'string' ? path : undefined,
      reason,
      reportCount: 1,
      status: (statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)) as any,
    });
  }

  // Build categories with percentages and stable colors
  const palette = ["#1abc9c", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#eab308", "#10B981", "#F43F5E"];
  const categories: ReportCategory[] = Array.from(byReason.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], idx) => ({
      name,
      value,
      percentage: total ? Number(((value / total) * 100).toFixed(1)) : 0,
      color: palette[idx % palette.length],
    }));

  return {
    reports,
    statusCard: {
      totalReports: total,
      resolved,
      pending,
      categories,
    },
  } as Pick<TrustSafetyData, "reports" | "statusCard">;
}

function normalizeText(text: string): string {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function isPhishing(text: string): boolean {
  const urlRegex = /https?:\/\/[^\s)]+/i;
  if (!urlRegex.test(text)) return false;
  const suspiciousHosts = [
    "bit.ly", "tinyurl.com", "t.me", "wa.me", "discord.gg", "goo.gl",
  ];
  const suspiciousTLD = [
    ".ru", ".cn", ".xyz", ".top", ".pw", ".click", ".link", ".icu",
  ];
  try {
    const matches = text.match(urlRegex) || [];
    for (const u of matches) {
      try {
        const url = new URL(u);
        const host = url.hostname.toLowerCase();
        if (suspiciousHosts.some(h => host.includes(h))) return true;
        if (suspiciousTLD.some(tld => host.endsWith(tld))) return true;
      } catch {}
    }
  } catch {}
  return false; // benign links should not be flagged
}

function isScam(text: string): boolean {
  const patterns = [
    /investment|invest now|roi|double your|crypto|bitcoin|bnb|usdt/i,
    /send money|wire transfer|western union|gift card|paypal|cash app/i,
    /outside the app|off-platform|telegram|whatsapp|contact me on/i,
    /advance fee|lottery|prize|winnings|deposit/i,
  ];
  return patterns.some((re) => re.test(text));
}

export async function buildLiveFeed(arg?: number | { limit?: number; roomId?: string; sinceHours?: number }): Promise<LiveFeedItem[]> {
  const now = new Date();
  const limit = typeof arg === 'number' ? arg : Math.max(1, Math.min(100, Number(arg?.limit ?? 50)));
  const sinceHours = typeof arg === 'number' ? 24 : Math.max(1, Math.min(168, Number(arg?.sinceHours ?? 24)));
  const since = new Date(now.getTime() - sinceHours * 60 * 60 * 1000);

  const items: LiveFeedItem[] = [];
  const messages: Array<{
    id: string; text: string; sender: string; recipient?: string; createdAt: Date; roomId?: string; senderName?: string;
  }> = [];

  // 0) If a specific roomId is provided, scan it directly first
  const roomIdFilter = (typeof arg === 'number' ? undefined : (arg?.roomId || undefined)) as string | undefined;
  if (roomIdFilter) {
    const roomCollections = ["chatRooms", "rooms", "chats"];
    for (const rc of roomCollections) {
      try {
        const roomDoc = await adminDb.collection(rc).doc(roomIdFilter).get();
        if (!roomDoc.exists) continue;
        const roomData = roomDoc.data() || {};
        // Try indexed query first
        let msgSnap: any;
        try {
          msgSnap = await roomDoc.ref
            .collection("messages")
            .where("createdAt", ">=", since)
            .orderBy("createdAt", "desc")
            .limit(200)
            .get();
        } catch {
          try {
            msgSnap = await roomDoc.ref
              .collection("messages")
              .where("createdAt", ">=", since)
              .limit(200)
              .get();
          } catch {
            msgSnap = await roomDoc.ref.collection("messages").limit(200).get();
          }
        }
        msgSnap.forEach((doc: any) => {
          const data = doc.data() || {};
          const text = (
            data.text ?? data.message ?? data.msg ?? data.body ?? data.content ?? data.messageText ?? ""
          ).toString();
          const sender = (data.senderId ?? data.sender ?? data.from ?? data.userId ?? "unknown").toString();
          const recipient = (data.recipientId ?? data.to ?? data.targetId ?? "").toString();
          const createdAt =
            toDate(data.createdAt) ||
            toDate(data.created_at) ||
            toDate(data.timestamp) ||
            toDate(data.sentAt) ||
            toDate(data.created) ||
            new Date();
          if (createdAt >= since && text) {
            const hinted = pickSenderName(data) || pickSenderNameFromRoom(roomData, sender);
            messages.push({ id: doc.id, text, sender, recipient, createdAt, roomId: roomIdFilter, senderName: hinted });
          }
        });
        if (messages.length > 0) {
          // If we found messages in the specific room, skip other sources
          // and continue to detection below.
          // Note: we purposely do not 'break' outer function; we rely on messages array not being empty.
          // Exit the loop once one collection matched.
          break;
        }
      } catch {}
    }
  }

  // 1) Try collectionGroup on messages (opt-in via env)
  const useCollectionGroup = process.env.TS_USE_COLLECTION_GROUP === 'true' && typeof (adminDb as any).collectionGroup === 'function';
  if (useCollectionGroup) {
    try {
      const snap = await (adminDb as any)
        .collectionGroup("messages")
        .where("createdAt", ">=", since)
        .orderBy("createdAt", "desc")
        .limit(1000)
        .get();
      snap.forEach((doc: any) => {
        const data = doc.data() || {};
        const text = (
          data.text ?? data.message ?? data.msg ?? data.body ?? data.content ?? data.messageText ?? ""
        ).toString();
        const sender = (data.senderId ?? data.sender ?? data.from ?? data.userId ?? "unknown").toString();
        const recipient = (data.recipientId ?? data.to ?? data.targetId ?? "").toString();
        const createdAt =
          toDate(data.createdAt) ||
          toDate(data.created_at) ||
          toDate(data.timestamp) ||
          toDate(data.sentAt) ||
          toDate(data.created) ||
          new Date();
        const roomId = doc.ref.parent?.parent?.id;
        const senderName = pickSenderName(data);
        if (text) messages.push({ id: doc.id, text, sender, recipient, createdAt, roomId, senderName });
      });
    } catch (e) {
      console.debug("[TrustSafety] collectionGroup('messages') failed; will use fallbacks");
    }
  }

  // Fallbacks if collectionGroup is unavailable or returned nothing
  if (messages.length === 0) {
    // 1) Try top-level 'messages' collection
    try {
      const snap = await adminDb
        .collection("messages")
        .where("createdAt", ">=", since)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get();
      snap.forEach((doc: any) => {
        const data = doc.data() || {};
        const text = (
          data.text ?? data.message ?? data.msg ?? data.body ?? data.content ?? data.messageText ?? ""
        ).toString();
        const sender = (data.senderId ?? data.sender ?? data.from ?? data.userId ?? "unknown").toString();
        const recipient = (data.recipientId ?? data.to ?? data.targetId ?? "").toString();
        const createdAt =
          toDate(data.createdAt) ||
          toDate(data.created_at) ||
          toDate(data.timestamp) ||
          toDate(data.sentAt) ||
          toDate(data.created) ||
          new Date();
        const roomId = (data.roomId ?? data.chatId ?? data.threadId ?? undefined) as string | undefined;
        const senderName = pickSenderName(data);
        if (text) messages.push({ id: doc.id, text, sender, recipient, createdAt, roomId, senderName });
      });
    } catch (e) {
      console.warn("[TrustSafety] top-level 'messages' fallback failed", e);
    }
  }

  if (messages.length === 0) {
    // 2) Scan a small set of rooms and fetch their subcollection('messages')
    const roomCollections = ["chatRooms", "rooms", "chats"];
    for (const rc of roomCollections) {
      try {
        const roomSnap = await adminDb.collection(rc).limit(50).get();
        for (const roomDoc of roomSnap.docs) {
          const roomId = roomDoc.id;
          const roomData = roomDoc.data() || {};
          try {
            // Prefer indexed query
            let msgSnap: any;
            try {
              msgSnap = await roomDoc.ref
                .collection("messages")
                .where("createdAt", ">=", since)
                .orderBy("createdAt", "desc")
                .limit(50)
                .get();
            } catch {
              // Less strict fallback
              try {
                msgSnap = await roomDoc.ref
                  .collection("messages")
                  .where("createdAt", ">=", since)
                  .limit(50)
                  .get();
              } catch {
                msgSnap = await roomDoc.ref.collection("messages").limit(30).get();
              }
            }
            msgSnap.forEach((doc: any) => {
              const data = doc.data() || {};
              const text = (
                data.text ?? data.message ?? data.msg ?? data.body ?? data.content ?? data.messageText ?? ""
              ).toString();
              const sender = (data.senderId ?? data.sender ?? data.from ?? data.userId ?? "unknown").toString();
              const recipient = (data.recipientId ?? data.to ?? data.targetId ?? "").toString();
              const createdAt =
                toDate(data.createdAt) ||
                toDate(data.created_at) ||
                toDate(data.timestamp) ||
                toDate(data.sentAt) ||
                toDate(data.created) ||
                new Date();
              const senderName = pickSenderName(data) || pickSenderNameFromRoom(roomData, sender);
              if (createdAt >= since && text) {
                messages.push({ id: doc.id, text, sender, recipient, createdAt, roomId, senderName });
              }
            });
          } catch (inner) {
            console.warn(`[TrustSafety] fetching sub-messages for ${rc}/${roomId} failed`, inner);
          }
        }
        if (messages.length > 0) break; // stop after first successful collection
      } catch (e) {
        // continue to next room collection
      }
    }
  }

  // 3) Best-effort: if still empty and collectionGroup is available, fetch a small batch without filters
  if (messages.length === 0 && typeof (adminDb as any).collectionGroup === 'function') {
    try {
      const snap = await (adminDb as any).collectionGroup('messages').limit(300).get();
      snap.forEach((doc: any) => {
        const data = doc.data() || {};
        const text = (
          data.text ?? data.message ?? data.msg ?? data.body ?? data.content ?? data.messageText ?? ""
        ).toString();
        const sender = (data.senderId ?? data.sender ?? data.from ?? data.userId ?? "unknown").toString();
        const recipient = (data.recipientId ?? data.to ?? data.targetId ?? "").toString();
        const createdAt =
          toDate(data.createdAt) ||
          toDate(data.created_at) ||
          toDate(data.timestamp) ||
          toDate(data.sentAt) ||
          toDate(data.created) ||
          new Date(0);
        const roomId = doc.ref.parent?.parent?.id;
        const senderName = pickSenderName(data);
        if (text && createdAt && createdAt >= since) {
          messages.push({ id: doc.id, text, sender, recipient, createdAt, roomId, senderName });
        }
      });
    } catch {}
  }

  // Seed sender names from room documents (if available) for any messages with roomId
  try {
    const roomIds = Array.from(new Set(messages.map(m => m.roomId).filter(Boolean))) as string[];
    const roomCollections = ["chatRooms", "rooms", "chats"] as const;
    const roomDataById = new Map<string, any>();
    // Try each collection until found for each id
    for (const rc of roomCollections) {
      await Promise.all(roomIds.map(async (rid) => {
        if (roomDataById.has(rid)) return;
        try {
          const snap = await adminDb.collection(rc).doc(rid).get();
          if (snap.exists) roomDataById.set(rid, snap.data() || {});
        } catch {}
      }));
    }
    // Attach hints to messages where missing
    for (const m of messages) {
      if (!m.senderName && m.roomId && roomDataById.has(m.roomId)) {
        const hinted = pickSenderNameFromRoom(roomDataById.get(m.roomId), m.sender);
        if (hinted) m.senderName = hinted;
      }
    }
  } catch {}

  // Resolve sender display names (prefer @username; fallback to full/display name; then @id)
  const uniqueSenders = Array.from(new Set(messages.map(m => m.sender))).slice(0, 300);
  const senderNameMap = new Map<string, string>();
  // Seed with any names present on the messages
  for (const m of messages) {
    if (m.senderName && !senderNameMap.has(m.sender)) senderNameMap.set(m.sender, m.senderName);
  }
  // Helper to resolve from common profile collections
  async function resolveFromProfileCollections(uid: string): Promise<string | undefined> {
    const colls = ["users", "profiles", "userProfiles", "publicUsers", "app_users", "userData", "members"]; // best-effort
    for (const c of colls) {
      try {
        const snap = await adminDb.collection(c).doc(uid).get();
        if (snap.exists) {
          const u = snap.data() || {};
          const username = (u.username ?? u.userName ?? u.handle ?? "").toString().trim();
          const first = (u.firstName ?? u.firstname ?? u.givenName ?? u.name?.first ?? "").toString().trim();
          const last = (u.lastName ?? u.lastname ?? u.familyName ?? u.name?.last ?? "").toString().trim();
          const display = (u.displayName ?? u.name ?? "").toString().trim();
          const full = `${first} ${last}`.trim();
          const finalVal = username ? `@${username}` : (full || display || undefined);
          if (finalVal) return finalVal;
        }
      } catch {}
    }
    return undefined;
  }

  await Promise.all(uniqueSenders.map(async (uid) => {
    try {
      // Try common profile collections (includes 'users')
      const fromProfiles = await resolveFromProfileCollections(uid);
      if (fromProfiles) { senderNameMap.set(uid, fromProfiles); return; }
      // Fallback to Firebase Auth user
      try {
        const au = await adminAuth.getUser(uid);
        const dn = (au.displayName ?? "").toString().trim();
        if (dn) { senderNameMap.set(uid, dn); return; }
      } catch {}
      // Last resort
      senderNameMap.set(uid, `@${uid}`);
    } catch {
      // On unexpected errors, still try Auth once
      try {
        const au = await adminAuth.getUser(uid);
        const dn = (au.displayName ?? "").toString().trim();
        if (dn) { senderNameMap.set(uid, dn); return; }
      } catch {}
      senderNameMap.set(uid, `@${uid}`);
    }
  }));
  const nameOf = (uid: string) => senderNameMap.get(uid) || `@${uid}`;

  // Exclude senders that have been 'ignored' recently (within since window)
  const ignoredSenders = new Set<string>();
  await Promise.all(uniqueSenders.map(async (uid) => {
    try {
      const snap = await adminDb.collection('users').doc(uid).get();
      if (!snap.exists) return;
      const u = snap.data() || {};
      const mod = u.moderation || {};
      const last = (mod.lastAction || '').toString().toLowerCase();
      const ignoredAt = toDate(mod.ignoredAt) || toDate(mod.lastIgnoredAt) || null;
      if (last === 'ignore') {
        if (!ignoredAt || ignoredAt >= since) ignoredSenders.add(uid);
      }
    } catch {}
  }));
  const effectiveMessages = messages.filter(m => !ignoredSenders.has(m.sender));

  // 2) Phishing and scam detections per message
  for (const m of effectiveMessages) {
    const t = m.text;
    if (isPhishing(t)) {
      items.push({
        id: `phish-${m.id}`,
        message: `${nameOf(m.sender)} sent suspicious link (phishing)`,
        type: "phishing",
        sender: m.sender,
        recipient: m.recipient || "",
      });
    } else if (isScam(t)) {
      items.push({
        id: `scam-${m.id}`,
        message: `${nameOf(m.sender)} sent suspicious texts (scam detected)`,
        type: "scam",
        sender: m.sender,
        recipient: m.recipient || "",
      });
    }
  }

  // 3) Spam detection: long streak from the same sender without replies in a room
  //    e.g., a user sends 5+ messages consecutively without the other user responding
  const STREAK_THRESHOLD = 5;
  const byRoom = new Map<string, typeof effectiveMessages>();
  for (const m of effectiveMessages) {
    if (!m.roomId) continue;
    const arr = byRoom.get(m.roomId) || [];
    arr.push(m);
    byRoom.set(m.roomId, arr);
  }
  for (const [roomId, arr] of byRoom.entries()) {
    arr.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let curSender = "";
    let streak = 0;
    let lastWhen = new Date(0);
    for (const m of arr) {
      if (m.sender === curSender) {
        streak += 1;
        if (m.createdAt > lastWhen) lastWhen = m.createdAt;
      } else {
        if (curSender && streak >= STREAK_THRESHOLD) {
          items.push({
            id: `spam-streak-${roomId}-${curSender}-${lastWhen.getTime()}`,
            message: `${nameOf(curSender)} sent ${streak} messages in a row without reply (spam detected)`,
            type: "spam",
            sender: curSender,
            recipient: "",
          });
        }
        curSender = m.sender;
        streak = 1;
        lastWhen = m.createdAt;
      }
    }
    if (curSender && streak >= STREAK_THRESHOLD) {
      items.push({
        id: `spam-streak-${roomId}-${curSender}-${lastWhen.getTime()}`,
        message: `${nameOf(curSender)} sent ${streak} messages in a row without reply (spam detected)`,
        type: "spam",
        sender: curSender,
        recipient: "",
      });
    }
  }

  // 4) Spam detection: repeated identical messages from same sender within last 24h
  const spamMap = new Map<string, { count: number; last: Date; sender: string }>();
  for (const m of effectiveMessages) {
    const key = `${m.sender}||${normalizeText(m.text)}`;
    const prev = spamMap.get(key);
    if (prev) {
      prev.count += 1;
      if (m.createdAt > prev.last) prev.last = m.createdAt;
    } else {
      spamMap.set(key, { count: 1, last: m.createdAt, sender: m.sender });
    }
  }
  for (const [key, info] of spamMap.entries()) {
    if (info.count >= 8) {
      const sender = info.sender;
      items.push({
        id: `spam-${sender}-${info.last.getTime()}`,
        message: `${nameOf(sender)} sent ${info.count} identical messages (spam detected)`,
        type: "spam",
        sender,
        recipient: "",
      });
    }
  }

  // Sort recent first and de-dup by id
  const unique = new Map<string, LiveFeedItem>();
  for (const it of items) unique.set(it.id, it);
  const final = Array.from(unique.values()).slice(0, limit);
  return final;
}

// Build Top Regions based on reported users' lat/lng
export async function buildTopRegionsFromReports(limit: number = 3) : Promise<RegionData[]> {
  const raw = await fetchReportsFromFirestore();
  const reportedUserIds = new Set<string>();
  for (const { data } of raw) {
    const uid = (data?.reportedUserId ?? data?.reportedUser ?? "").toString();
    if (uid) reportedUserIds.add(uid);
  }

  // Cap to avoid excessive reads
  const ids = Array.from(reportedUserIds).slice(0, 300);

  // Aggregate by ISO code; keep display name
  const counts = new Map<string, { name: string; count: number }>();
  for (const uid of ids) {
    try {
      const doc = await adminDb.collection("users").doc(uid).get();
      if (!doc.exists) continue;
      const u = doc.data() || {};

      let lat: number | null = null;
      let lng: number | null = null;
      const loc = u.location ?? u.geo ?? u.position ?? null;
      if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        lat = loc.latitude; lng = loc.longitude;
      } else if (loc && typeof loc._latitude === 'number' && typeof loc._longitude === 'number') {
        lat = loc._latitude; lng = loc._longitude;
      } else {
        const latRaw = u.lat ?? u.latitude;
        const lngRaw = u.lng ?? u.longitude;
        const lt = typeof latRaw === 'string' ? Number(latRaw) : latRaw;
        const lg = typeof lngRaw === 'string' ? Number(lngRaw) : lngRaw;
        if (Number.isFinite(lt) && Number.isFinite(lg)) { lat = lt as number; lng = lg as number; }
      }
      if (lat == null || lng == null) continue;
      const guess = guessCountry(lat, lng);
      if (!guess || !guess.code) continue;
      const rec = counts.get(guess.code) || { name: guess.name, count: 0 };
      rec.count += 1;
      counts.set(guess.code, rec);
    } catch {}
  }

  const palette = ["#f64e60", "#ffa800", "#7166f9", "#10B981", "#3B82F6", "#F59E0B"]; // red, orange, purple, green, blue, amber
  const regions: RegionData[] = Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, Math.max(1, limit))
    .map(([code, info], idx) => ({ type: info.name, code, color: palette[idx % palette.length] }));

  return regions;
}
