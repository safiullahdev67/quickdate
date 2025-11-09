import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const ref = adminDb.collection('ai_profiles');
    let deleted = 0;
    // Iterate in chunks; evaluate expiry in code to avoid requiring composite index
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
        if (typeof expiresAtMs === 'number' && expiresAtMs < Date.now()) {
          batch.delete(d.ref);
          deleted++;
        }
      });
      await batch.commit();
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 500) break;
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
