// Lightweight country lookup by lat/lng.
// It first tries to use the optional 'country-reverse-geocoding' package if present.
// If not installed, it falls back to coarse bounding boxes for common countries.

export type CountryGuess = { code: string; name: string } | null;

// Coarse bounding boxes for selected countries (approximate, not exact polygons)
// minLat, maxLat, minLng, maxLng
const BBOXES: Array<{ code: string; name: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = [
  { code: 'US', name: 'United States', minLat: 24.5, maxLat: 49.5, minLng: -125, maxLng: -66 },
  { code: 'CA', name: 'Canada', minLat: 42, maxLat: 83, minLng: -141, maxLng: -52 },
  { code: 'MX', name: 'Mexico', minLat: 14.5, maxLat: 32.8, minLng: -118.5, maxLng: -86.5 },
  { code: 'BR', name: 'Brazil', minLat: -34, maxLat: 5.3, minLng: -73.9, maxLng: -34.8 },
  { code: 'AR', name: 'Argentina', minLat: -55.1, maxLat: -21.8, minLng: -73.6, maxLng: -53.6 },
  { code: 'GB', name: 'United Kingdom', minLat: 49.8, maxLat: 60.9, minLng: -8.6, maxLng: 1.8 },
  { code: 'FR', name: 'France', minLat: 41, maxLat: 51.1, minLng: -5.3, maxLng: 9.6 },
  { code: 'DE', name: 'Germany', minLat: 47.2, maxLat: 55.1, minLng: 5.8, maxLng: 15.1 },
  { code: 'ES', name: 'Spain', minLat: 36, maxLat: 43.8, minLng: -9.3, maxLng: 4.3 },
  { code: 'IT', name: 'Italy', minLat: 36.6, maxLat: 47.1, minLng: 6.6, maxLng: 18.5 },
  { code: 'NG', name: 'Nigeria', minLat: 4.2, maxLat: 13.9, minLng: 2.7, maxLng: 14.7 },
  { code: 'ZA', name: 'South Africa', minLat: -35, maxLat: -22.1, minLng: 16.5, maxLng: 32.9 },
  { code: 'TR', name: 'Turkey', minLat: 36, maxLat: 42.3, minLng: 26, maxLng: 45 },
  { code: 'SA', name: 'Saudi Arabia', minLat: 16, maxLat: 32.2, minLng: 34.5, maxLng: 55.7 },
  { code: 'AE', name: 'United Arab Emirates', minLat: 22.6, maxLat: 26.1, minLng: 51.5, maxLng: 56.4 },
  { code: 'IN', name: 'India', minLat: 6.5, maxLat: 35.5, minLng: 68.1, maxLng: 97.4 },
  { code: 'PK', name: 'Pakistan', minLat: 23.7, maxLat: 37.1, minLng: 60.9, maxLng: 77.8 },
  { code: 'BD', name: 'Bangladesh', minLat: 20.6, maxLat: 26.7, minLng: 88, maxLng: 92.7 },
  { code: 'LK', name: 'Sri Lanka', minLat: 5.8, maxLat: 10.1, minLng: 79.5, maxLng: 81.9 },
  { code: 'ID', name: 'Indonesia', minLat: -11, maxLat: 6.4, minLng: 95, maxLng: 141 },
  { code: 'PH', name: 'Philippines', minLat: 5, maxLat: 21.3, minLng: 117, maxLng: 126 },
  { code: 'MY', name: 'Malaysia', minLat: 0.8, maxLat: 7.5, minLng: 99.6, maxLng: 119.3 },
  { code: 'TH', name: 'Thailand', minLat: 5.6, maxLat: 20.5, minLng: 97.4, maxLng: 105.6 },
  { code: 'VN', name: 'Vietnam', minLat: 8.2, maxLat: 23.4, minLng: 102.1, maxLng: 109.5 },
  { code: 'CN', name: 'China', minLat: 18, maxLat: 53.6, minLng: 73.4, maxLng: 134.8 },
  { code: 'JP', name: 'Japan', minLat: 24, maxLat: 46, minLng: 123.5, maxLng: 145.8 },
  { code: 'KR', name: 'South Korea', minLat: 33, maxLat: 38.7, minLng: 124, maxLng: 131.1 },
  { code: 'RU', name: 'Russia', minLat: 41.2, maxLat: 82, minLng: 19.6, maxLng: 180 },
  { code: 'AU', name: 'Australia', minLat: -44, maxLat: -10.7, minLng: 112.9, maxLng: 154 },
  { code: 'EG', name: 'Egypt', minLat: 22, maxLat: 31.7, minLng: 24.7, maxLng: 36.9 },
  { code: 'ET', name: 'Ethiopia', minLat: 3.4, maxLat: 14.9, minLng: 32.9, maxLng: 48 },
  { code: 'KE', name: 'Kenya', minLat: -4.7, maxLat: 5.1, minLng: 33.9, maxLng: 41.9 },
];

export function guessCountry(lat: number, lng: number): CountryGuess {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Try optional package if installed
  try {
    // Use eval-based require so bundlers don't attempt to resolve the module at build time
    // This allows the app to run without the package installed, using the fallback below.
    const modName = ['country', '-reverse-', 'geocoding'].join('');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const r: any = (0, eval)('require');
    const maybe = r?.(modName);
    const CountryReverseGeocoding = (maybe?.default || maybe);
    if (CountryReverseGeocoding) {
      const crg = CountryReverseGeocoding();
      const result = crg.get_country(lat, lng);
      if (result && result.code && result.name) {
        return { code: String(result.code).toUpperCase(), name: String(result.name) };
      }
    }
  } catch {}

  // Fallback to coarse bboxes: pick the smallest matching bbox (more specific)
  const candidates = BBOXES.filter(b => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng)
    .map(b => ({ ...b, area: (b.maxLat - b.minLat) * (b.maxLng - b.minLng) }));
  if (candidates.length > 0) {
    candidates.sort((a, b) => a.area - b.area);
    const best = candidates[0];
    return { code: best.code, name: best.name };
  }
  return null;
}
