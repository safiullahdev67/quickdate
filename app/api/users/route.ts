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
    if (val instanceof Date) {
      return Timestamp.fromDate(val);
    }
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      snap = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(limit).get();
    } catch {
      // Fallback without order if createdAt missing
      snap = await adminDb.collection('users').limit(limit).get();
    }

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firstName = String(body.first_name ?? body.firstName ?? '').trim();
    const lastName = String(body.last_name ?? body.lastName ?? '').trim();
    const email = String(body.email ?? '').trim();
    const gender = String(body.gender ?? '').toLowerCase();

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ ok: false, error: 'first_name, last_name and email are required' }, { status: 400 });
    }

    const birthDateTs = toTimestamp(body.birthday ?? body.birthDate);

    // Photos from form can be an object {main,gallery} or an array. Persist as flat photos[] and avatar
    const photosInput = body.photos && typeof body.photos === 'object' ? body.photos : {};
    const gallery: string[] = Array.isArray(photosInput.gallery)
      ? photosInput.gallery.map((s: any) => String(s))
      : Array.isArray(body.photos)
        ? (body.photos as any[]).map((s: any) => String(s))
        : [];
    const avatar: string | null = typeof photosInput.main === 'string'
      ? photosInput.main
      : gallery[0] || null;

    // Optional explicit id/uid for upsert
    const explicitId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : undefined;
    const uid = typeof body.uid === 'string' && body.uid.trim() ? body.uid.trim() : undefined;

    const col = adminDb.collection('users');
    let docRef = explicitId ? col.doc(explicitId) : (uid ? col.doc(uid) : undefined);
    let isNew = false;
    if (!docRef) {
      // Try to find existing by email
      const snap = await col.where('email', '==', email).limit(1).get();
      if (!snap.empty) {
        docRef = col.doc(snap.docs[0].id);
      } else {
        docRef = col.doc();
        isNew = true;
      }
    }

    const statusRaw = typeof body.status === 'string' ? String(body.status) : undefined;
    const interestedIn = body?.preferences?.interestedIn ?? body?.interestedIn;
    const interestArr: string[] = Array.isArray(body.interests)
      ? body.interests.map((s: any) => String(s))
      : Array.isArray(body.interest)
        ? body.interest.map((s: any) => String(s))
        : [];
    const payload: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      email,
      gender,
      ...(birthDateTs ? { birthday: birthDateTs } : {}),
      ...(gallery.length ? { photos: gallery } : {}),
      ...(avatar ? { avatar } : {}),
      ...(interestedIn ? { interestedIn } : {}),
      ...(interestArr.length ? { interest: interestArr } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ...(statusRaw ? { status: statusRaw } : (isNew ? { status: 'Active' } : {})),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
    };

    await docRef.set(payload, { merge: true });
    const snap = await docRef.get();

    return NextResponse.json({ ok: true, id: docRef.id, item: { id: docRef.id, ...snap.data() } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
