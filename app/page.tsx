import { Dashboard } from "@/components/dashboard/Dashboard";
import { mockRootProps } from "@/lib/dashboardMockData";
import { adminDb } from "@/lib/firebase/admin";
import { getRevenueForPeriod } from "@/lib/revenue";
import { buildTopRegionsFromReports } from "@/lib/trustSafety";
import { requireAdmin } from "@/lib/auth";

// Ensure Node.js runtime so the Admin SDK can run
export const runtime = "nodejs";
// Always render dynamically so Firestore count isn't cached
export const dynamic = "force-dynamic";

async function getActiveUsersCount(): Promise<number> {
  try {
    const snap = await adminDb.collection("users").count().get();
    return snap.data().count ?? 0;
  } catch (err) {
    console.warn("[Home] Failed to fetch users count from Firestore:", err);
    return 0;
  }
}

async function getAIProfilesCount(): Promise<number> {
  try {
    const snap = await adminDb.collection("ai_profiles").count().get();
    return snap.data().count ?? 0;
  } catch (err) {
    console.warn("[Home] Failed to fetch ai_profiles count from Firestore:", err);
    // Fallback: manual list + size
    try {
      const snap = await adminDb.collection("ai_profiles").get();
      return snap.size;
    } catch (err2) {
      console.warn("[Home] Manual ai_profiles count failed:", err2);
      return 0;
    }
  }
}

// Counts number of documents in `transactions` (supports collectionGroup fallback)
async function getTransactionsCount(): Promise<number> {
  // Prefer COUNT aggregate if available
  try {
    const snap = await adminDb.collection("transactions").count().get();
    const n = snap.data().count ?? 0;
    if (n > 0) return n;
  } catch (err) {
    console.warn("[Home] COUNT on transactions failed; trying other options:", err);
  }

  // Try collection group COUNT if using subcollections
  try {
    if (typeof (adminDb as any).collectionGroup === "function") {
      const cg = await (adminDb as any).collectionGroup("transactions").count().get();
      return cg.data().count ?? 0;
    }
  } catch (err) {
    console.warn("[Home] COUNT on collectionGroup('transactions') failed; falling back to manual:", err);
  }

  // Manual fallback: list and count
  try {
    const snap = await adminDb.collection("transactions").get();
    let total = snap.size;
    if (total === 0 && typeof (adminDb as any).collectionGroup === "function") {
      const cgSnap = await (adminDb as any).collectionGroup("transactions").get();
      total = cgSnap.size ?? 0;
    }
    return total;
  } catch (err) {
    console.warn("[Home] Manual transactions count failed:", err);
    return 0;
  }
}

// Build ReportsData by grouping Firestore `reports` by reason
async function getReportsData() {
  type ReportsData = import("@/types/schema").ReportsData;
  const counts = new Map<string, number>();
  let total = 0;
  // Try top-level collection first
  try {
    const snap = await adminDb.collection("reports").get();
    snap.forEach((doc) => {
      const reason = (doc.get("reason") ?? "Unknown").toString();
      const name = reason.trim() || "Unknown";
      counts.set(name, (counts.get(name) || 0) + 1);
      total += 1;
    });
  } catch (e) {
    console.warn("[Home] Failed to read top-level reports, attempting collection group:", e);
  }
  // If none found, try collectionGroup
  if (total === 0 && typeof (adminDb as any).collectionGroup === "function") {
    try {
      const snap = await (adminDb as any).collectionGroup("reports").get();
      snap.forEach((doc: any) => {
        const reason = (doc.get("reason") ?? "Unknown").toString();
        const name = reason.trim() || "Unknown";
        counts.set(name, (counts.get(name) || 0) + 1);
        total += 1;
      });
    } catch (e) {
      console.warn("[Home] Failed to read collection group reports:", e);
    }
  }

  const breakdown = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, percentage: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const reportsData: ReportsData = { total, breakdown };
  return reportsData;
}
function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end, isoStart: start.toISOString(), isoEnd: end.toISOString() } as const;
}

// Computes today's revenue by summing amounts of transactions created today.
// Supports created_at stored as Firestore Timestamp/Date or ISO string.
async function getTodaysRevenueAmount(): Promise<number> {
  const { start, end, isoStart, isoEnd } = getTodayBounds();

  // Try range query with Date bounds
  try {
    const q = adminDb
      .collection("transactions")
      .where("created_at", ">=", start)
      .where("created_at", "<", end)
      .orderBy("created_at");
    const snap = await q.get();
    let total = 0;
    snap.forEach((doc) => {
      const status = doc.get("status");
      if (status && status !== "completed") return;
      const amt = doc.get("amount");
      if (typeof amt === "number") total += amt;
      else if (typeof amt === "string") {
        const n = Number(amt);
        if (!Number.isNaN(n)) total += n;
      }
    });
    return total;
  } catch (err) {
    console.warn("[Home] Date range query for today's revenue failed; trying ISO string range:", err);
  }

  // Try collection group with Date bounds
  try {
    if (typeof (adminDb as any).collectionGroup === "function") {
      const qg = (adminDb as any)
        .collectionGroup("transactions")
        .where("created_at", ">=", start)
        .where("created_at", "<", end)
        .orderBy("created_at");
      const snapg = await qg.get();
      let totalg = 0;
      snapg.forEach((doc: any) => {
        const status = doc.get("status");
        if (status && status !== "completed") return;
        const amt = doc.get("amount");
        if (typeof amt === "number") totalg += amt;
        else if (typeof amt === "string") {
          const n = Number(amt);
          if (!Number.isNaN(n)) totalg += n;
        }
      });
      if (totalg > 0) return totalg;
    }
  } catch (err) {
    console.warn("[Home] Collection group Date range failed:", err);
  }

  // Try range query with ISO string bounds (if created_at is stored as string)
  try {
    const q2 = adminDb
      .collection("transactions")
      .where("created_at", ">=", isoStart)
      .where("created_at", "<", isoEnd)
      .orderBy("created_at");
    const snap2 = await q2.get();
    let total2 = 0;
    snap2.forEach((doc) => {
      const status = doc.get("status");
      if (status && status !== "completed") return;
      const amt = doc.get("amount");
      if (typeof amt === "number") total2 += amt;
      else if (typeof amt === "string") {
        const n = Number(amt);
        if (!Number.isNaN(n)) total2 += n;
      }
    });
    return total2;
  } catch (err) {
    console.warn("[Home] ISO string range also failed; falling back to scan:", err);
  }

  // Try collection group with ISO string bounds
  try {
    if (typeof (adminDb as any).collectionGroup === "function") {
      const q2g = (adminDb as any)
        .collectionGroup("transactions")
        .where("created_at", ">=", isoStart)
        .where("created_at", "<", isoEnd)
        .orderBy("created_at");
      const snap2g = await q2g.get();
      let total2g = 0;
      snap2g.forEach((doc: any) => {
        const status = doc.get("status");
        if (status && status !== "completed") return;
        const amt = doc.get("amount");
        if (typeof amt === "number") total2g += amt;
        else if (typeof amt === "string") {
          const n = Number(amt);
          if (!Number.isNaN(n)) total2g += n;
        }
      });
      if (total2g > 0) return total2g;
    }
  } catch (err) {
    console.warn("[Home] Collection group ISO range failed:", err);
  }

  // Fallback: scan all transactions and filter in memory
  try {
    const snapAll = await adminDb.collection("transactions").get();
    let total = 0;
    snapAll.forEach((doc) => {
      const status = doc.get("status");
      if (status && status !== "completed") return;
      const createdAt = doc.get("created_at");
      let d: Date | null = null;
      if (createdAt && typeof (createdAt as any).toDate === "function") {
        try { d = (createdAt as any).toDate(); } catch {}
      } else if (createdAt instanceof Date) {
        d = createdAt;
      } else if (typeof createdAt === "string") {
        const parsed = new Date(createdAt);
        if (!Number.isNaN(parsed.getTime())) d = parsed;
      }
      if (!d) return;
      if (d >= start && d < end) {
        const amt = doc.get("amount");
        if (typeof amt === "number") total += amt;
        else if (typeof amt === "string") {
          const n = Number(amt);
          if (!Number.isNaN(n)) total += n;
        }
      }
    });
    return total;
  } catch (err) {
    console.warn("[Home] Fallback scan for today's revenue failed:", err);
    // Try collection group scan
    try {
      if (typeof (adminDb as any).collectionGroup === "function") {
        const snapAllG = await (adminDb as any).collectionGroup("transactions").get();
        let totalg = 0;
        snapAllG.forEach((doc: any) => {
          const status = doc.get("status");
          if (status && status !== "completed") return;
          const createdAt = doc.get("created_at");
          let d: Date | null = null;
          if (createdAt && typeof (createdAt as any).toDate === "function") {
            try { d = (createdAt as any).toDate(); } catch {}
          } else if (createdAt instanceof Date) {
            d = createdAt;
          } else if (typeof createdAt === "string") {
            const parsed = new Date(createdAt);
            if (!Number.isNaN(parsed.getTime())) d = parsed;
          }
          if (!d) return;
          if (d >= start && d < end) {
            const amt = doc.get("amount");
            if (typeof amt === "number") totalg += amt;
            else if (typeof amt === "string") {
              const n = Number(amt);
              if (!Number.isNaN(n)) totalg += n;
            }
          }
        });
        return totalg;
      }
    } catch (err2) {
      console.warn("[Home] Collection group scan for today's revenue failed:", err2);
    }
    return 0;
  }
}

// Sums the `amount` field of all docs in the `transactions` collection.
// Tries to use Firestore aggregate SUM when available; falls back to manual sum.
async function getTotalRevenueAmount(): Promise<number> {
  // Attempt aggregate SUM (available on recent Firestore SDKs)
  try {
    // Dynamic import to avoid type-time dependency if AggregateField isn't present
    const firestoreAdmin: any = await import("firebase-admin/firestore");
    if (firestoreAdmin?.AggregateField && typeof adminDb.collection("transactions").aggregate === "function") {
      const aggSnap = await (adminDb as any)
        .collection("transactions")
        .aggregate({ totalAmount: firestoreAdmin.AggregateField.sum("amount") })
        .get();
      const data = aggSnap.data() as { totalAmount?: number };
      if (typeof data?.totalAmount === "number") {
        return data.totalAmount;
      }
    }
    // Try collection group aggregation if top-level collection doesn't exist
    if (firestoreAdmin?.AggregateField && typeof adminDb.collectionGroup === "function") {
      const groupAggSnap = await (adminDb as any)
        .collectionGroup("transactions")
        .aggregate({ totalAmount: firestoreAdmin.AggregateField.sum("amount") })
        .get();
      const groupData = groupAggSnap.data() as { totalAmount?: number };
      if (typeof groupData?.totalAmount === "number") {
        return groupData.totalAmount;
      }
    }
  } catch (err) {
    console.warn("[Home] Aggregate SUM not available, falling back to manual sum:", err);
  }

  // Fallback: fetch docs and sum amounts server-side
  try {
    const snap = await adminDb.collection("transactions").get();
    let total = 0;
    snap.forEach((doc) => {
      const amt = doc.get("amount");
      if (typeof amt === "number") total += amt;
      else if (typeof amt === "string") {
        const n = Number(amt);
        if (!Number.isNaN(n)) total += n;
      }
    });
    // If no docs found at top-level, attempt collection group manual sum
    if (total === 0 && typeof (adminDb as any).collectionGroup === "function") {
      const cgSnap = await (adminDb as any).collectionGroup("transactions").get();
      cgSnap.forEach((doc: any) => {
        const amt = doc.get("amount");
        if (typeof amt === "number") total += amt;
        else if (typeof amt === "string") {
          const n = Number(amt);
          if (!Number.isNaN(n)) total += n;
        }
      });
    }
    return total;
  } catch (err) {
    console.warn("[Home] Failed to sum transactions from Firestore:", err);
    return 0;
  }
}

export default async function Home() {
  await requireAdmin();
  const [activeCount, aiProfilesCount, todaysRevenueAmount, revenueSeries, reportsReceived, transactionsCount, topRegions] = await Promise.all([
    getActiveUsersCount(),
    getAIProfilesCount(),
    getTodaysRevenueAmount(),
    getRevenueForPeriod("30days"),
    getReportsData(),
    getTransactionsCount(),
    buildTopRegionsFromReports(3),
  ]);

  const props = {
    ...mockRootProps,
    activeUsers: {
      ...mockRootProps.activeUsers,
      count: activeCount,
    },
    aiProfiles: {
      ...mockRootProps.aiProfiles,
      count: aiProfilesCount,
    },
    todaysRevenue: {
      ...mockRootProps.todaysRevenue,
      amount: todaysRevenueAmount,
    },
    activeSubscriptions: {
      ...mockRootProps.activeSubscriptions,
      count: transactionsCount,
    },
    totalRevenue: revenueSeries,
    reportsReceived,
    topRegions: topRegions && topRegions.length ? topRegions : mockRootProps.topRegions,
  } as const;

  return <Dashboard {...props} />;
}