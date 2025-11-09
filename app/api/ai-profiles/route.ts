import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

function normalizeQuality(q?: string): 'good' | 'very_good' | 'bad' {
  const v = String(q || '').toLowerCase().trim();
  if (v === 'very good' || v === 'very_good' || v === 'verygood' || v === 'vg' || v === 'high') return 'very_good';
  if (v === 'bad' || v === 'low') return 'bad';
  if (v === 'medium') return 'good';
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

function allowedContentSource(cs?: string): 'file' | 'stock' | 'generated' | 'custom' {
  const v = String(cs || '').toLowerCase().trim();
  if (v === 'file' || v === 'upload' || v === 'uploader') return 'file';
  if (v === 'generated' || v === 'ai_generated' || v === 'ai') return 'generated';
  if (v === 'custom') return 'custom';
  return 'stock';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

    const snap = await adminDb
      .collection('ai_profiles')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const countRaw = Number(body.numberOfProfiles ?? body.count ?? 1);
    const numberOfProfiles = Number.isFinite(countRaw) ? Math.max(1, Math.min(1000, Math.trunc(countRaw))) : 1;

    const gender = String(body.gender || '').toLowerCase();
    if (!allowedGender(gender)) {
      return NextResponse.json({ ok: false, error: 'Invalid gender. Allowed: male, female, binary' }, { status: 400 });
    }

    const profileQuality = normalizeQuality(body.profileQuality);

    let ageMin = Number(body.ageMin ?? 18);
    let ageMax = Number(body.ageMax ?? 60);
    // also accept "ageRange" like "18-25"
    if (typeof body.ageRange === 'string' && body.ageRange.includes('-')) {
      const [a, b] = body.ageRange.split('-').map((v: string) => Number(v.trim()));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        ageMin = a; ageMax = b;
      }
    }
    if (!Number.isFinite(ageMin) || !Number.isFinite(ageMax)) {
      return NextResponse.json({ ok: false, error: 'Invalid age range' }, { status: 400 });
    }
    if (ageMin < 18 || ageMax > 60 || ageMin > ageMax) {
      return NextResponse.json({ ok: false, error: 'Age range must satisfy 18 <= min <= max <= 60' }, { status: 400 });
    }

    let interests: string[] = [];
    if (Array.isArray(body.interests)) {
      interests = body.interests.map((s: any) => String(s)).slice(0, 50);
    } else if (typeof body.interests === 'string' && body.interests.trim()) {
      interests = [String(body.interests).trim()];
    }

    const contentSource = allowedContentSource(body.contentSource);
    const contentFileUrl = typeof body.contentFileUrl === 'string' ? body.contentFileUrl.trim() : undefined;

    const country = typeof body.country === 'string' ? body.country.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';

    const messagesPerDayRaw = Number(body.messagesPerDay ?? 5);
    const likesPerDayRaw = Number(body.likesPerDay ?? 25);
    const messagesPerDay = Number.isFinite(messagesPerDayRaw) ? Math.max(0, Math.trunc(messagesPerDayRaw)) : 0;
    const likesPerDay = Number.isFinite(likesPerDayRaw) ? Math.max(0, Math.trunc(likesPerDayRaw)) : 0;

    let matchesPerWeek = Number(body.matchesPerWeek ?? 10);
    if (!Number.isFinite(matchesPerWeek)) matchesPerWeek = 10; // default to 10 as requested

    const matchPreference = normalizeMatchPreference(body.matchPreference);

    const expireAfterRaw = Number(body.expireAfter ?? 30);
    if (!Number.isFinite(expireAfterRaw) || expireAfterRaw < 1 || expireAfterRaw > 60) {
      return NextResponse.json({ ok: false, error: 'expireAfter must be between 1 and 60 days' }, { status: 400 });
    }
    const expireAfter = Math.trunc(expireAfterRaw);

    const autoRegenerate = Boolean(body.autoRegenerate ?? false);

    // Prepare batched writes (max 500 per Firestore batch; we use 450 safety)
    const col = adminDb.collection('ai_profiles');
    const createdIds: string[] = [];
    const now = new Date();
    const expiresAt = Timestamp.fromDate(new Date(now.getTime() + expireAfter * 24 * 60 * 60 * 1000));

    let batch = adminDb.batch();
    let opsInBatch = 0;

    for (let i = 0; i < numberOfProfiles; i++) {
      const docRef = col.doc();
      const effectiveName = numberOfProfiles > 1
        ? (name ? `${name} ${i + 1}` : `AI Profile ${i + 1}`)
        : (name || 'AI Profile');

      const docData = {
        name: effectiveName,
        gender,
        interests,
        profileQuality,
        age: { min: ageMin, max: ageMax },
        location: { country, city },
        content: { source: contentSource, fileUrl: (contentSource === 'file' || contentSource === 'custom') ? (contentFileUrl || null) : null },
        messagesPerDay,
        likesPerDay,
        matchesPerWeek,
        matchPreference,
        expireAfterDays: expireAfter,
        autoRegenerate,
        status: 'Active' as const,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt,
      };

      batch.set(docRef, docData);
      createdIds.push(docRef.id);
      opsInBatch++;

      if (opsInBatch >= 450) {
        await batch.commit();
        batch = adminDb.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    return NextResponse.json({ ok: true, createdCount: numberOfProfiles, ids: createdIds.slice(0, 50) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
