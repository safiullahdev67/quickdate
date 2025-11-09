import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Ensure Node.js runtime so Firebase Admin works
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Preflight: verify admin env vars are present (names only, no secret values exposed)
    const hasSAJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const hasTriplet = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

    if (!hasSAJson && !hasTriplet) {
      const missing: string[] = [];
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) missing.push('FIREBASE_SERVICE_ACCOUNT_KEY');
      if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
      if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');
      return NextResponse.json(
        {
          ok: false,
          error: 'Firebase Admin credentials are not fully configured.',
          missingEnv: missing,
          hint:
            'Set either FIREBASE_SERVICE_ACCOUNT_KEY (full JSON) or the FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY triplet in .env.local, then restart the dev server.',
        },
        { status: 500 }
      );
    }

    const ref = adminDb.collection('health').doc('check');
    await ref.set({ timestamp: Date.now() }, { merge: true });
    const snap = await ref.get();

    return NextResponse.json({
      ok: true,
      data: snap.data() || null,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Unknown error',
        hint:
          'If running locally, ensure FIREBASE_* admin credentials are set in .env.local. See .env.local.example and README.',
      },
      { status: 500 }
    );
  }
}
