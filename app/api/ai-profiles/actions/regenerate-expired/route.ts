import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const ref = adminDb.collection('ai_profiles');
    const now = new Date();
    let regenerated = 0;
    // We cannot paginate with inequality easily without orderBy, so we'll read in chunks by createdAt ordering
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while (true) {
      let q = ref.orderBy('createdAt', 'desc').limit(500);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const ex = data?.expiresAt;
        let expiresAtMs: number | null = null;
        if (ex?.toDate) {
          try { expiresAtMs = ex.toDate().getTime(); } catch {}
        } else if (typeof ex?._seconds === 'number') {
          expiresAtMs = ex._seconds * 1000;
        } else if (typeof ex?.seconds === 'number') {
          expiresAtMs = ex.seconds * 1000;
        }
        if (typeof expiresAtMs === 'number' && expiresAtMs < now.getTime()) {
          const days = Number.isFinite(data?.expireAfterDays) ? Math.max(1, Math.min(60, Number(data.expireAfterDays))) : 30;
          const next = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          batch.set(d.ref, { status: 'Active', expiresAt: Timestamp.fromDate(next), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          regenerated++;
        }
      });
      await batch.commit();
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 500) break;
    }
    return NextResponse.json({ ok: true, regenerated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
