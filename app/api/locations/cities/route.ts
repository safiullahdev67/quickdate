import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

const DEFAULT_CITIES: Record<string, string[]> = {
  DE: ['Berlin', 'Munich', 'Hamburg'],
  US: ['New York', 'Los Angeles', 'Chicago'],
  GB: ['London', 'Manchester', 'Birmingham'],
  PK: ['Karachi', 'Lahore', 'Islamabad'],
  IN: ['Mumbai', 'Delhi', 'Bangalore'],
  BD: ['Dhaka', 'Chittagong', 'Sylhet'],
  SA: ['Riyadh', 'Jeddah', 'Dammam'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codeParam = (searchParams.get('country') || searchParams.get('code') || '').toUpperCase();
    if (!codeParam) {
      return NextResponse.json({ ok: false, error: 'country (ISO code) is required' }, { status: 400 });
    }

    const ref = adminDb.collection('cities');
    let snap = await ref.where('countryCode', '==', codeParam).get();

    if (snap.empty) {
      // Lookup country name by code
      const countryDoc = await adminDb.collection('countries').doc(codeParam).get();
      const countryName = (countryDoc.data()?.name || '').toString();

      // Try to fetch full countries dataset and seed cities
      try {
        const resp = await fetch('https://countriesnow.space/api/v0.1/countries');
        const payload = (await resp.json()) as { data?: Array<{ country: string; cities: string[] }> };
        const list = payload?.data || [];
        let match = list.find((x) => x.country.toLowerCase() === countryName.toLowerCase());
        // Fallback try contains (to handle naming differences like United States of America vs United States)
        if (!match && countryName) {
          match = list.find((x) => x.country.toLowerCase().includes(countryName.toLowerCase()))
            || list.find((x) => countryName.toLowerCase().includes(x.country.toLowerCase()));
        }
        const cities = (match?.cities || []).slice(0, 500);

        if (cities.length) {
          const batch = adminDb.batch();
          let ops = 0;
          for (const name of cities) {
            const id = `${codeParam}_${name.replace(/\s+/g, '-')}`;
            batch.set(ref.doc(id), { id, name, countryCode: codeParam });
            ops++;
            if (ops >= 450) { await batch.commit(); ops = 0; }
          }
          if (ops > 0) await batch.commit();
          snap = await ref.where('countryCode', '==', codeParam).get();
        }
      } catch {
        // ignore and fall back
      }

      // Fallback to defaults if still empty
      if (snap.empty) {
        const seed = DEFAULT_CITIES[codeParam] || [];
        if (seed.length) {
          const batch = adminDb.batch();
          for (const name of seed) {
            const id = `${codeParam}_${name.replace(/\s+/g, '-')}`;
            batch.set(ref.doc(id), { id, name, countryCode: codeParam });
          }
          await batch.commit();
          snap = await ref.where('countryCode', '==', codeParam).get();
        }
      }
    }

    const items = snap.docs.map((d) => d.data());
    items.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
