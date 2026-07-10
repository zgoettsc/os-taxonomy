// Free public-domain / openly-licensed PHOTO sources.
//
// Real adapters for the `photo` and `nasa` image strategies. Each has a pure
// parser (unit-tested against representative payloads) and a thin fetch wrapper
// (uses global fetch; runs anywhere with network access). For factual subjects —
// real animals, plants, space — a real photo beats a generated image on accuracy
// and safety, and it's free.
//
// Licensing: we keep only permissively-licensed results and record the license +
// attribution on every asset (Wikimedia requires attribution for CC-BY/BY-SA;
// NASA imagery is public domain). We prefer CC0/public-domain, then CC-BY, then
// CC-BY-SA; we skip NC/ND by default (commercial-safe posture).

const LICENSE_RANK = (name = '') => {
  const n = name.toLowerCase();
  if (/nc|noncommercial|nd|noderiv/.test(n)) return 0;          // skip
  if (/cc0|public domain|pd-|no restrictions/.test(n)) return 4;
  if (/\bcc by\b|cc-by(?!-sa)/.test(n)) return 3;
  if (/cc by-sa|cc-by-sa/.test(n)) return 2;
  return 1; // unknown/other permissive-ish — allow but low
};

// ---- NASA Image Library (public domain) ----------------------------------
export function parseNasaResponse(json) {
  const items = json?.collection?.items || [];
  for (const it of items) {
    const d = (it.data || [])[0] || {};
    if (d.media_type && d.media_type !== 'image') continue;
    const link = (it.links || []).find((l) => l.rel === 'preview') || (it.links || [])[0];
    if (!link?.href) continue;
    return {
      url: link.href, source: 'NASA Image Library', license: 'public-domain',
      attribution: d.center ? `NASA/${d.center}` : 'NASA', title: d.title || '', nasaId: d.nasa_id,
    };
  }
  return null;
}
export async function searchNasa(query, { fetchImpl = fetch } = {}) {
  const url = `https://images-api.nasa.gov/search?media_type=image&q=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`NASA API ${res.status}`);
  return parseNasaResponse(await res.json());
}

// ---- Wikimedia Commons (mixed open licenses) -----------------------------
export function parseCommonsResponse(json) {
  const pages = Object.values(json?.query?.pages || {});
  const cands = [];
  for (const p of pages) {
    const info = (p.imageinfo || [])[0];
    if (!info?.url) continue;
    const meta = info.extmetadata || {};
    const lic = meta.LicenseShortName?.value || '';
    const rank = LICENSE_RANK(lic);
    if (rank === 0) continue; // skip NC/ND
    cands.push({
      url: info.url, source: 'Wikimedia Commons', license: lic || 'unknown',
      attribution: (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia Commons',
      licenseUrl: meta.LicenseUrl?.value || null, title: p.title || '', rank,
    });
  }
  cands.sort((a, b) => b.rank - a.rank);
  return cands[0] || null;
}
export async function searchCommons(query, { fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6',
    gsrsearch: query, gsrlimit: '8', prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiextmetadatafilter: 'LicenseShortName|Artist|LicenseUrl',
  });
  const res = await fetchImpl(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'MarbleLearn/0.1 (education; contact: you@example.com)' },
  });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return parseCommonsResponse(await res.json());
}

// Router: pick the source by strategy and return a reviewed-pending asset.
export async function fetchPhoto(brief, opts = {}) {
  const hit = brief.strategy === 'nasa'
    ? await searchNasa(brief.query || brief.altText, opts)
    : await searchCommons(brief.query || brief.altText, opts);
  if (!hit) return { ...brief, status: 'no-result' };
  return { ...brief, status: 'pending-review', asset: hit.url, license: hit.license,
    attribution: hit.attribution, source: hit.source };
}
