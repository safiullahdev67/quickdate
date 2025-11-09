import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

function normalizeQuality(q?: string): 'good' | 'very_good' | 'bad' {
  const v = String(q || '').toLowerCase().trim();
  if (v === 'very good' || v === 'very_good' || v === 'verygood' || v === 'vg') return 'very_good';
  if (v === 'bad') return 'bad';
  return 'good';
}

function normalizeMatchPreference(mp?: string): 'city' | 'country' | 'gender' | 'age' {
  const v = String(mp || '').toLowerCase().replace(/\s+/g, '');
  if (v.includes('city')) return 'city';
  if (v.includes('country')) return 'country';
  if (v.includes('gender')) return 'gender';
  if (v.includes('age')) return 'age';
  return 'city';
}

function allowedGender(g?: string): g is 'male' | 'female' | 'binary' {
  const v = String(g || '').toLowerCase();
  return v === 'male' || v === 'female' || v === 'binary';
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ref = adminDb.collection('ai_profiles').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, item: { id: snap.id, ...snap.data() } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

    if (body.name) updates.name = String(body.name).trim();
    if (body.gender) {
      const g = String(body.gender).toLowerCase();
      if (!allowedGender(g)) return NextResponse.json({ ok: false, error: 'Invalid gender' }, { status: 400 });
      updates.gender = g;
    }
    if (Array.isArray(body.interests)) updates.interests = body.interests.map((s: any) => String(s)).slice(0, 50);
    if (body.profileQuality) updates.profileQuality = normalizeQuality(body.profileQuality);

    const ageMin = body.ageMin != null ? Number(body.ageMin) : undefined;
    const ageMax = body.ageMax != null ? Number(body.ageMax) : undefined;
    if (Number.isFinite(ageMin) || Number.isFinite(ageMax)) {
      const refSnap = await adminDb.collection('ai_profiles').doc(id).get();
      const curAge = (refSnap.data()?.age ?? { min: 18, max: 60 }) as { min: number; max: number };
      const minV = Number.isFinite(ageMin) ? (ageMin as number) : curAge.min;
      const maxV = Number.isFinite(ageMax) ? (ageMax as number) : curAge.max;
      if (minV < 18 || maxV > 60 || minV > maxV) {
        return NextResponse.json({ ok: false, error: 'Age range must satisfy 18 <= min <= max <= 60' }, { status: 400 });
      }
      updates.age = { min: minV, max: maxV };
    }

    if (body.country || body.city) {
      const refSnap = await adminDb.collection('ai_profiles').doc(id).get();
      const curLoc = (refSnap.data()?.location ?? { country: '', city: '' }) as { country: string; city: string };
      updates.location = {
        country: body.country ? String(body.country) : curLoc.country,
        city: body.city ? String(body.city) : curLoc.city,
      };
    }

    if (body.contentSource) {
      const v = String(body.contentSource).toLowerCase();
      updates.content = updates.content || {};
      if (v === 'file' || v === 'upload') updates.content.source = 'file';
      else if (v === 'generated' || v === 'ai_generated' || v === 'ai') updates.content.source = 'generated';
      else if (v === 'custom') updates.content.source = 'custom';
      else updates.content.source = 'stock';
    }
    if (body.contentFileUrl) {
      updates.content = { ...(updates.content || {}), fileUrl: String(body.contentFileUrl) };
    }

    if (body.messagesPerDay != null) updates.messagesPerDay = Math.max(0, Math.trunc(Number(body.messagesPerDay)) || 0);
    if (body.likesPerDay != null) updates.likesPerDay = Math.max(0, Math.trunc(Number(body.likesPerDay)) || 0);
    if (body.matchesPerWeek != null) updates.matchesPerWeek = Math.max(0, Math.trunc(Number(body.matchesPerWeek)) || 0);

    if (body.matchPreference) updates.matchPreference = normalizeMatchPreference(body.matchPreference);

    if (body.expireAfter != null) {
      const days = Math.trunc(Number(body.expireAfter));
      if (!Number.isFinite(days) || days < 1 || days > 60) {
        return NextResponse.json({ ok: false, error: 'expireAfter must be between 1 and 60 days' }, { status: 400 });
      }
      updates.expireAfterDays = days;
      updates.expiresAt = Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
    }

    if (body.autoRegenerate != null) updates.autoRegenerate = Boolean(body.autoRegenerate);
    if (body.status) updates.status = String(body.status);

    await adminDb.collection('ai_profiles').doc(id).set(updates, { merge: true });
    const snap = await adminDb.collection('ai_profiles').doc(id).get();
    return NextResponse.json({ ok: true, item: { id: snap.id, ...snap.data() } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await adminDb.collection('ai_profiles').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
