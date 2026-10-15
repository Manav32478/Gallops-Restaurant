import { createHash } from 'crypto';

/**
 * Deterministic SVG placeholder for dishes without an approved photograph.
 * Offline-safe (no external requests) and clearly not a photo of the dish.
 */
export const dynamic = 'force-dynamic';

const PALETTES = [
  ['#1F2A18', '#3F5C2B', '#A3E635'],
  ['#2A1F14', '#5C3B22', '#F5B860'],
  ['#141F2A', '#22405C', '#67C7E8'],
  ['#2A1420', '#5C2240', '#E86BA0'],
  ['#232A14', '#465C22', '#C9E667'],
  ['#2A2214', '#5C4B22', '#E8C767'],
];

function hash(input: string) {
  return createHash('sha1').update(input).digest();
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const name = (url.searchParams.get('name') ?? 'Dish').slice(0, 80);
  const category = (url.searchParams.get('category') ?? '').slice(0, 60);
  const digest = hash(`${name}:${category}`);
  const palette = PALETTES[digest[0] % PALETTES.length];
  const initials = name
    .split(/\s+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${escapeXml(name)} (illustrative placeholder)">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="55%" stop-color="#0B0B0F"/>
      <stop offset="100%" stop-color="${palette[1]}"/>
    </linearGradient>
    <radialGradient id="plate" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${palette[2]}" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="${palette[2]}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${palette[2]}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bg)"/>
  <circle cx="200" cy="140" r="105" fill="url(#plate)"/>
  <circle cx="200" cy="140" r="78" fill="none" stroke="${palette[2]}" stroke-opacity="0.28" stroke-width="1.5"/>
  <circle cx="200" cy="140" r="60" fill="none" stroke="${palette[2]}" stroke-opacity="0.16" stroke-width="1"/>
  <text x="200" y="152" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="${palette[2]}" fill-opacity="0.85">${escapeXml(initials || 'G')}</text>
  <text x="200" y="248" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" fill="#F5F1E8" fill-opacity="0.62">${escapeXml(name)}</text>
  <text x="200" y="268" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#F5F1E8" fill-opacity="0.38">Illustrative placeholder · photo pending</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] as string,
  );
}
