import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

async function fetchAllCountries(): Promise<Array<{ code: string; name: string }>> {
  try {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
    const arr = (await res.json()) as Array<{ name?: { common?: string }; cca2?: string }>; 
    const items: Array<{ code: string; name: string }> = [];
    for (const c of arr) {
      const code = String(c.cca2 || '').toUpperCase();
      const name = String(c.name?.common || '').trim();
      if (code.length === 2 && name) items.push({ code, name });
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  } catch {
    // Minimal fallback
    return [
      { code: 'DE', name: 'Germany' },
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'PK', name: 'Pakistan' },
      { code: 'IN', name: 'India' },
      { code: 'BD', name: 'Bangladesh' },
      { code: 'SA', name: 'Saudi Arabia' },
      { code: 'AE', name: 'United Arab Emirates' },
    ];
  }
}

export async function GET() {
  try {
    const ref = adminDb.collection('countries');
    let snap = await ref.get();

    // If too few entries, seed/merge from restcountries
    if (snap.size < 200) {
      const all = await fetchAllCountries();
      const existing = new Set(snap.docs.map((d) => d.id.toUpperCase()));
      const batch = adminDb.batch();
      let ops = 0;
      for (const c of all) {
        if (!existing.has(c.code)) {
          batch.set(ref.doc(c.code), c, { merge: true });
          ops++;
          if (ops >= 450) { await batch.commit(); ops = 0; }
        }
      }
      if (ops > 0) await batch.commit();
      snap = await ref.get();
    }

    const items = snap.docs.map((d) => d.data() as any);
    items.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
