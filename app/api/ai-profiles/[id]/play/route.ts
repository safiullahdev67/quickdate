import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const ref = adminDb.collection('ai_profiles').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    await ref.set({ status: 'Active', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const after = await ref.get();
    return NextResponse.json({ ok: true, item: { id: after.id, ...after.data() } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
