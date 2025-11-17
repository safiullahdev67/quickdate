import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
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
    } catch (e) {
      // Fallback without order if createdAt missing
      console.log('[GET /api/users] orderBy createdAt failed, using fallback:', e);
      snap = await adminDb.collection('users').limit(limit).get();
    }

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log('[GET /api/users] Returning', items.length, 'users');
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    console.error('[GET /api/users] Error:', error);
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
    const password = typeof body.password === 'string' ? body.password : '';

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ ok: false, error: 'first_name, last_name and email are required' }, { status: 400 });
    }

    const birthDateRaw = body.birthday ?? body.birthDate;
    const birthDateStr = typeof birthDateRaw === 'string' ? birthDateRaw.trim() : '';
    const birthDateTs = toTimestamp(birthDateRaw);

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
    let explicitId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : undefined;
    let uid = typeof body.uid === 'string' && body.uid.trim() ? body.uid.trim() : undefined;

    // If password provided, create or update Firebase Auth user and use its uid
    let authUserCreated = false;
    if (password && password.length >= 6) {
      try {
        if (uid) {
          await adminAuth.updateUser(uid, { email, password, disabled: false });
        } else {
          let existingAuth: any | null = null;
          try {
            existingAuth = await adminAuth.getUserByEmail(email);
          } catch {}
          if (existingAuth) {
            uid = existingAuth.uid;
            await adminAuth.updateUser(existingAuth.uid, { password, disabled: false });
          } else {
            const created = await adminAuth.createUser({ email, password, disabled: false });
            uid = created.uid;
            authUserCreated = true;
          }
        }
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to create/update auth user' }, { status: 400 });
      }
    }

    const col = adminDb.collection('users');
    let docRef = explicitId ? col.doc(explicitId) : (uid ? col.doc(uid) : undefined);
    let isNew = false;
    if (!docRef) {
      // Try to find existing by email
      const snap = await col.where('email', '==', email).limit(1).get();
      if (!snap.empty) {
        docRef = col.doc(snap.docs[0].id);
      } else {
        docRef = uid ? col.doc(uid) : col.doc();
        isNew = true;
      }
    } else if (authUserCreated) {
      // If we just created a new Firebase Auth user, treat the Firestore doc as new
      isNew = true;
    }

    const statusRaw = typeof body.status === 'string' ? String(body.status) : undefined;
    const interestedIn = body?.preferences?.interestedIn ?? body?.interestedIn;
    const interestArr: string[] = Array.isArray(body.interests)
      ? body.interests.map((s: any) => String(s))
      : Array.isArray(body.interest)
        ? body.interest.map((s: any) => String(s))
        : [];
    const interestStr = interestArr.join(',');
    const payload: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      email,
      gender,
      // Store birthday as string for app compatibility, and keep a timestamp copy separately if available
      ...(birthDateStr ? { birthday: birthDateStr } : {}),
      ...(birthDateTs ? { birthday_ts: birthDateTs } : {}),
      ...(gallery.length ? { photos: gallery } : {}),
      ...(avatar ? { avatar } : {}),
      ...(interestedIn ? { interestedIn } : {}),
      // For the app, interest is a comma-separated string; keep array copy for web tooling
      ...(interestArr.length ? { interests: interestArr } : {}),
      ...(interestStr ? { interest: interestStr } : {}),
      // Extended profile fields aligned with mobile app
      ...(typeof body.about === 'string' && body.about.trim() ? { about: String(body.about).trim() } : {}),
      ...(typeof body.national_id === 'string' && body.national_id.trim() ? { national_id: String(body.national_id).trim() } : {}),
      ...(typeof body.location === 'string' && body.location.trim() ? { location: String(body.location).trim() } : {}),
      ...(typeof body.state_of_origin === 'string' && body.state_of_origin.trim() ? { state_of_origin: String(body.state_of_origin).trim() } : {}),
      ...(typeof body.current_residence === 'string' && body.current_residence.trim() ? { current_residence: String(body.current_residence).trim() } : {}),
      ...(typeof body.city === 'string' && body.city.trim() ? { city: String(body.city).trim() } : {}),
      ...(typeof body.country === 'string' && body.country.trim() ? { country: String(body.country).trim() } : {}),
      ...(typeof body.height === 'string' && body.height.trim() ? { height: String(body.height).trim() } : {}),
      ...(typeof body.weight === 'string' && body.weight.trim() ? { weight: String(body.weight).trim() } : {}),
      ...(typeof body.blood_group === 'string' && body.blood_group.trim() ? { blood_group: String(body.blood_group).trim() } : {}),
      ...(typeof body.genotype === 'string' && body.genotype.trim() ? { genotype: String(body.genotype).trim() } : {}),
      ...(typeof body.education_level === 'string' && body.education_level.trim() ? { education_level: String(body.education_level).trim() } : {}),
      ...(typeof body.work_status === 'string' && body.work_status.trim() ? { work_status: String(body.work_status).trim() } : {}),
      ...(typeof body.occupation === 'string' && body.occupation.trim() ? { occupation: String(body.occupation).trim() } : {}),
      ...(typeof body.company === 'string' && body.company.trim() ? { company: String(body.company).trim() } : {}),
      ...(typeof body.school === 'string' && body.school.trim() ? { school: String(body.school).trim() } : {}),
      ...(typeof body.tribe === 'string' && body.tribe.trim() ? { tribe: String(body.tribe).trim() } : {}),
      ...(typeof body.primary_language === 'string' && body.primary_language.trim() ? { primary_language: String(body.primary_language).trim() } : {}),
      ...(typeof body.religion === 'string' && body.religion.trim() ? { religion: String(body.religion).trim() } : {}),
      ...(typeof body.relationshipType === 'string' && body.relationshipType.trim() ? { relationship: String(body.relationshipType).trim() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ...(statusRaw ? { status: statusRaw } : (isNew ? { status: '1' } : {})),
      ...(isNew
        ? {
            createdAt: FieldValue.serverTimestamp(),
            uid: uid || undefined,
            // Defaults aligned with mobile app's _prepareUserDataForFirestore
            active: '1',
            is_pro: '0',
            phone_verified: '0',
            email_verified: '0',
            email_code: '',
            is_picture_blurred: '0',
            show_me_only_members: '0',
            confirm_followers: '0',
            facebook: '',
            google: '',
            twitter: '',
            instagram: '',
            linkedin: '',
            snapchat: '',
            youtube: '',
            vk: '',
            pinterest: '',
            email_on_profile_view: '1',
            email_on_new_message: '1',
            email_on_profile_like: '1',
            email_on_purchase_notifications: '1',
            email_on_special_offers: '0',
            email_on_announcements: '1',
            language: 'en',
            timezone: 'UTC',
            balance: '0',
            wallet: '0',
            joined: Date.now().toString(),
            registered: Date.now().toString(),
            last_seen: Date.now().toString(),
            online_status: '1',
            css_file: '',
            paypal_email: '',
            order_posts_by: 'latest',
            social_login: '0',
            android_m_device_id: '',
            ios_m_device_id: '',
            web_device_id: '',
            sms_code: '',
            pro_time: '',
            pro_type: '',
            two_factor: '0',
            two_factor_hash: '',
          }
        : {}),
    };

    await docRef.set(payload, { merge: true });
    const snap = await docRef.get();

    console.log('[POST /api/users] User created/updated:', docRef.id, 'with data:', snap.data());
    return NextResponse.json({ ok: true, id: docRef.id, item: { id: docRef.id, ...snap.data() } }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/users] Error:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
