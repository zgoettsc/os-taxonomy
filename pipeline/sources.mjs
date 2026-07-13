// ============================================================================
// Source registry + grounding compilation.
//
// Facts are GROUNDED in reputable sources (see docs/content-sourcing.md). This
// module is the registry of those sources and the layer that, for a given
// topic, gathers passages from *every enabled source* and compiles them into a
// single layered grounding set — each passage tagged with its source + license.
//
// Commercial switch: every source carries a license, from which a `commercial`
// boolean is derived. Set `allowNonCommercial: false` (one flag) and every
// NonCommercial source (CK-12, Core Knowledge, …) is dropped from the mix — so
// the same pipeline can run "personal" (rich, includes NC) or "commercial"
// (clean licenses only) without touching any other code.
//
// Live fetching is behind a seam (`live: true`) exactly like the image sources:
// the parsers/adapters are here, but actually hitting the network needs egress
// (see docs/image-setup.md). Offline, each adapter returns a deterministic
// representative passage so the registry, filter, and compile logic are fully
// testable.
// ============================================================================

// License → capability flags. `commercial` is what the switch keys off of.
export const LICENSES = {
  'public-domain': { commercial: true,  shareAlike: false, attribution: false },
  'CC0':           { commercial: true,  shareAlike: false, attribution: false },
  'CC-BY':         { commercial: true,  shareAlike: false, attribution: true  },
  'CC-BY-SA':      { commercial: true,  shareAlike: true,  attribution: true  },
  'CC-BY-NC':      { commercial: false, shareAlike: false, attribution: true  },
  'CC-BY-NC-SA':   { commercial: false, shareAlike: true,  attribution: true  },
  'proprietary':   { commercial: false, shareAlike: false, attribution: true  },
};

export function licenseFlags(license) {
  return LICENSES[license] || { commercial: false, shareAlike: false, attribution: true };
}

// The registry. `subjects: '*'` means the source can be consulted for any
// subject. `tier` follows the sourcing hierarchy in content-sourcing.md.
// `fetch(topic, opts)` returns an array of { text, url } passages.
export const SOURCES = [
  // --- Tier 1: public-domain government / institutional (cleanest licenses) ---
  { id: 'nasa',          name: 'NASA',                       url: 'https://api.nasa.gov',                 license: 'public-domain', subjects: ['Science'],            tier: 1,
    note: 'Space, earth science, astronomy — US gov, public domain.' },
  { id: 'noaa',          name: 'NOAA',                       url: 'https://www.noaa.gov',                 license: 'public-domain', subjects: ['Science'],            tier: 1,
    note: 'Weather, climate, oceans — US gov, public domain.' },
  { id: 'usgs',          name: 'USGS',                       url: 'https://www.usgs.gov',                 license: 'public-domain', subjects: ['Science'],            tier: 1,
    note: 'Geology, water, natural hazards — US gov, public domain.' },
  { id: 'smithsonian',   name: 'Smithsonian Open Access',    url: 'https://api.si.edu',                   license: 'CC0',           subjects: ['Science','History'],  tier: 1,
    note: 'Artifacts, specimens, art, history — CC0.' },
  { id: 'loc',           name: 'Library of Congress',        url: 'https://www.loc.gov',                  license: 'public-domain', subjects: ['History','English'],  tier: 1,
    note: 'Primary historical sources — mostly public domain (verify per item).' },
  { id: 'wikidata',      name: 'Wikidata',                   url: 'https://www.wikidata.org',             license: 'CC0',           subjects: '*',                    tier: 1,
    note: 'Structured facts (dates, classifications, measures) — CC0, often no AI needed.' },

  // --- Tier 1/2: openly-licensed, commercial-OK with attribution ---
  { id: 'openstax',      name: 'OpenStax',                   url: 'https://openstax.org',                 license: 'CC-BY',         subjects: ['Science','Mathematics'], tier: 1,
    note: 'Open textbooks (skews older grades) — CC-BY, commercial OK with attribution.' },
  { id: 'simplewiki',    name: 'Simple English Wikipedia',   url: 'https://simple.wikipedia.org',         license: 'CC-BY-SA',      subjects: '*',                    tier: 2,
    note: 'Kid-level explainers on almost anything — CC-BY-SA (attribution + share-alike).' },
  { id: 'wikijunior',    name: 'Wikijunior (Wikibooks)',     url: 'https://en.wikibooks.org/wiki/Wikijunior', license: 'CC-BY-SA',  subjects: '*',                    tier: 2,
    note: 'Books written for children — CC-BY-SA.' },

  // --- NonCommercial: rich, but flagged. Dropped when allowNonCommercial=false ---
  { id: 'ck12',          name: 'CK-12',                      url: 'https://www.ck12.org',                 license: 'CC-BY-NC',      subjects: ['Science','Mathematics'], tier: 2,
    note: 'FlexBooks, concepts, practice (STEM). NonCommercial — disable if the app is sold.' },
  { id: 'coreknowledge', name: 'Core Knowledge',             url: 'https://www.coreknowledge.org',        license: 'CC-BY-NC-SA',   subjects: '*',                    tier: 2,
    note: 'Knowledge-rich sequence + materials. NonCommercial + ShareAlike — disable if sold. (The *Sequence* as scope is usable; the *text* is NC.)' },
].map((s) => ({ ...s, ...licenseFlags(s.license) })); // attach commercial/shareAlike/attribution

// Deterministic offline stand-in for a real fetch, so the compile logic is testable.
function mockPassage(source, topic) {
  return [{
    text: `[${source.name}] Reference material about "${topic.name}" (${topic.subject}). `
        + `In a live run this is replaced by retrieved passages from ${source.name}.`,
    url: source.url,
    mock: true,
  }];
}

// A source applies to a topic if it covers the subject (or is universal '*').
export function sourcesForTopic(topic, { allowNonCommercial = true } = {}) {
  return SOURCES.filter((s) => {
    const subjectOk = s.subjects === '*' || s.subjects.includes(topic.subject);
    const licenseOk = allowNonCommercial || s.commercial;
    return subjectOk && licenseOk;
  });
}

// Gather + compile grounding from every enabled source for a topic.
// Returns the layered grounding plus an auditable summary of what fed it.
export async function gatherGrounding(topic, { allowNonCommercial = true, live = false, fetchImpl } = {}) {
  const chosen = sourcesForTopic(topic, { allowNonCommercial });
  const grounding = [];
  for (const s of chosen) {
    let passages;
    try {
      passages = live
        ? await (fetchImpl ? fetchImpl(s, topic) : s.fetch ? s.fetch(topic) : mockPassage(s, topic))
        : mockPassage(s, topic);
    } catch {
      passages = [];
    }
    for (const p of passages) {
      grounding.push({
        source: s.id,
        sourceName: s.name,
        license: s.license,
        commercial: s.commercial,
        shareAlike: s.shareAlike,
        attribution: s.attribution,
        text: p.text,
        url: p.url,
        verified: p.verified === true,   // live-fetched passages are real sources; mock passages are not
      });
    }
  }
  return {
    topicId: topic.id,
    grounding,                                   // the layered, multi-source material
    sourcesUsed: chosen.map((s) => s.id),
    licenses: [...new Set(chosen.map((s) => s.license))],
    usedNonCommercial: chosen.some((s) => !s.commercial),
    mode: allowNonCommercial ? 'personal' : 'commercial',
  };
}

// Audit: given a stored content item's provenance, does it depend on any NC source?
// Lets you find (and later regenerate) content built on NC material before going commercial.
export function dependsOnNonCommercial(provenance) {
  const used = (provenance && provenance.grounding) || [];
  return used.some((g) => g.commercial === false)
    || (provenance && provenance.usedNonCommercial === true);
}
