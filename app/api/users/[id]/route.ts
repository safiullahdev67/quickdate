import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

function toTimestamp(val: any): Timestamp | null {
  try {
    if (!val) return null;
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return Timestamp.fromDate(d);
    }
    if (val instanceof Date) return Timestamp.fromDate(val);
    if (typeof val === 'number') {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return Timestamp.fromDate(d);
    }
    if (typeof val === 'object') {
      const s = (val.seconds ?? val._seconds) as number | undefined;
      if (typeof s === 'number') return Timestamp.fromMillis(s * 1000);
    }
  } catch {}
  return null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const doc = await adminDb.collection('users').doc(id).get();
    if (!doc.exists) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, item: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    const firstName = String(body.first_name ?? body.firstName ?? '').trim();
    const lastName = String(body.last_name ?? body.lastName ?? '').trim();
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;

    if (typeof body.email === 'string') updates.email = String(body.email).trim();
    if (typeof body.gender === 'string') updates.gender = String(body.gender).toLowerCase();

    const bday = toTimestamp(body.birthday ?? body.birthDate);
    if (bday) updates.birthday = bday;

    // Photos mapping
    const photosInput = body.photos && typeof body.photos === 'object' ? body.photos : {};
    const gallery: string[] = Array.isArray(photosInput.gallery)
      ? photosInput.gallery.map((s: any) => String(s))
      : Array.isArray(body.photos)
        ? (body.photos as any[]).map((s: any) => String(s))
        : [];
    const avatar: string | null = typeof photosInput.main === 'string'
      ? photosInput.main
      : (gallery[0] || null);
    if (gallery.length) updates.photos = gallery;
    if (avatar) updates.avatar = avatar;

    // Preferences -> interestedIn
    const interestedIn = body?.preferences?.interestedIn ?? body?.interestedIn;
    if (interestedIn) updates.interestedIn = interestedIn;

    // interests -> interest
    const interestArr: string[] = Array.isArray(body.interests)
      ? body.interests.map((s: any) => String(s))
      : Array.isArray(body.interest)
        ? body.interest.map((s: any) => String(s))
        : [];
    if (interestArr.length) updates.interest = interestArr;

    if (typeof body.status === 'string') updates.status = String(body.status);

    await adminDb.collection('users').doc(id).set(updates, { merge: true });
    const snap = await adminDb.collection('users').doc(id).get();
    return NextResponse.json({ ok: true, item: { id: snap.id, ...snap.data() } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await adminDb.collection('users').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
