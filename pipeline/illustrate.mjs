// Procedural illustration engine — unique, engaging, printable art with ZERO
// external dependency and ZERO copyright/licensing risk.
//
// Kids need images that feel fresh, not stock clip-art. Every call here returns
// a friendly character/badge that varies deterministically by seed — so each
// topic (and each child) gets its own, and no two look the same. This is the
// "always available, always safe" track; richer illustrative art comes from the
// AI-image track documented in docs/illustrations.md (generate -> review ->
// store -> license), which slots in beside this without changing the callers.

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// Subject-tuned palettes so a math sticker and a science sticker feel related
// but distinct. Neutral, print-friendly, high-contrast.
const PALETTES = {
  Mathematics: ['#5b6cff', '#3fb0ff', '#7a5cff'],
  Science: ['#1f9d8c', '#3fb06a', '#2bb3c0'],
  English: ['#e4572e', '#f2913d', '#e05a8a'],
  History: ['#b8813a', '#c8862a', '#9a6b3f'],
  default: ['#5b6cff', '#1f9d8c', '#e4572e', '#c8862a'],
};

// A friendly "study buddy" character — a rounded creature with a face. Shape,
// color, eyes, and accessory all vary by seed.
export function mascotSVG(seed, subject = 'default', size = 140) {
  const r = rng(seed);
  const pal = PALETTES[subject] || PALETTES.default;
  const body = pick(r, pal);
  const cheek = '#ffffff';
  const shape = pick(r, ['circle', 'blob', 'rounded']);
  const eyeGap = 16 + Math.floor(r() * 10);
  const eyeY = 60 + Math.floor(r() * 8);
  const smile = pick(r, [
    'M50 82 Q70 100 90 82',      // wide smile
    'M52 84 Q70 96 88 84',       // gentle smile
    'M55 86 Q70 98 85 86',       // small smile
  ]);
  const antenna = r() < 0.5;
  const spots = r() < 0.5;

  let bodyPath;
  if (shape === 'circle') bodyPath = `<circle cx="70" cy="72" r="46" fill="${body}"/>`;
  else if (shape === 'rounded') bodyPath = `<rect x="26" y="30" width="88" height="88" rx="26" fill="${body}"/>`;
  else bodyPath = `<path d="M70 26 C104 26 118 52 114 78 C110 106 92 118 70 118 C48 118 30 106 26 78 C22 52 36 26 70 26 Z" fill="${body}"/>`;

  const dots = spots ? Array.from({ length: 3 }, (_, i) => {
    const cx = 44 + i * 26 + Math.floor(r() * 6), cy = 40 + Math.floor(r() * 8);
    return `<circle cx="${cx}" cy="${cy}" r="4" fill="#ffffff" opacity="0.55"/>`;
  }).join('') : '';

  return `<svg viewBox="0 0 140 140" width="${size}" height="${size}" role="img" aria-label="study buddy">
    ${antenna ? `<line x1="70" y1="30" x2="70" y2="14" stroke="${body}" stroke-width="3"/><circle cx="70" cy="11" r="5" fill="${body}"/>` : ''}
    ${bodyPath}${dots}
    <circle cx="${70 - eyeGap}" cy="${eyeY}" r="8" fill="#ffffff"/><circle cx="${70 - eyeGap + 2}" cy="${eyeY + 1}" r="4" fill="#232733"/>
    <circle cx="${70 + eyeGap}" cy="${eyeY}" r="8" fill="#ffffff"/><circle cx="${70 + eyeGap + 2}" cy="${eyeY + 1}" r="4" fill="#232733"/>
    <circle cx="${70 - eyeGap - 6}" cy="${eyeY + 14}" r="5" fill="${cheek}" opacity="0.35"/>
    <circle cx="${70 + eyeGap + 6}" cy="${eyeY + 14}" r="5" fill="${cheek}" opacity="0.35"/>
    <path d="${smile}" fill="none" stroke="#232733" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

// A small corner "topic badge" — a rounded tile with the buddy, for page headers.
export function badgeSVG(seed, subject) {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#f2f3f8;border-radius:16px">${mascotSVG(seed, subject, 52)}</span>`;
}

// Stable seed from a topic id so a topic always gets the same buddy.
export function seedFromId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
