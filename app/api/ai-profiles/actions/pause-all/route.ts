import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const ref = adminDb.collection('ai_profiles');
    let updated = 0;
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    // Iterate all documents in chunks of 500
    while (true) {
      let q = ref.orderBy('createdAt', 'desc').limit(500);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      const batch = adminDb.batch();
      snap.docs.forEach((d) => {
        batch.set(d.ref, { status: 'Paused', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        updated++;
      });
      await batch.commit();
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 500) break;
    }
    return NextResponse.json({ ok: true, updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
