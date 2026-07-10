// Image source router + brief builder.
//
// For a factual kids' product, "generate everything" is wrong. This decides,
// per topic, the RIGHT source for its image and builds the brief:
//   • photo    — a real public-domain photograph (accuracy: animals, plants,
//                real places, artifacts). Sources: Wikimedia Commons, Smithsonian
//                Open Access, iNaturalist (CC), Flickr Commons.
//   • nasa     — real public-domain space imagery (NASA image library).
//   • generate — an art-directed AI illustration (scenes, characters, stylized
//                concepts with no real photo). Reviewed before use.
//   • diagram  — a code-drawn diagram (math/abstract); the SVG engine handles it.
//
// The brief is provider-agnostic: the same brief drives whichever image provider
// (or photo API) is plugged in (see pipeline/image-provider.mjs).

// House art direction — a single consistent style so the whole "textbook" looks
// like one book. Applied to every GENERATE brief.
export const ART_DIRECTION = {
  style:
    'warm, friendly children\'s picture-book illustration; soft rounded shapes; '
    + 'clean flat color with gentle shading; bright but not neon; simple '
    + 'uncluttered background; no text in the image',
  avoid:
    'photorealism, uncanny faces, extra limbs or fingers, scary imagery, brand '
    + 'logos, watermarks, text, dense detail',
  aspect: '4:3',
};

const KEY = {
  space: /\b(planet|star|moon|sun|solar system|space|galaxy|orbit|astronom|comet|meteor)\b/i,
  animal: /\b(animal|mammal|bird|fish|insect|reptile|cat|dog|cattle|pet|creature|habitat|camouflage|dinosaur)\b/i,
  plant: /\b(plant|tree|leaf|flower|seed|forest|garden)\b/i,
  place: /\b(country|city|map|ocean|mountain|river|landmark|continent)\b/i,
  history: /\b(ancient|history|historical|king|queen|war|castle|egypt|rome|explorer)\b/i,
  math: /\b(add|subtract|number|count|fraction|multipl|divi|place value|shape|geometr|measure)\b/i,
  language: /\b(noun|verb|sentence|letter|phonics|spelling|grammar|word|rhyme)\b/i,
};

// Decide the source strategy for a topic.
export function routeImage(topic) {
  const hay = `${topic.name} ${topic.domain} ${topic.description || ''}`;
  if (KEY.space.test(hay)) return 'nasa';
  if (KEY.math.test(hay) || topic.subject === 'Mathematics') return 'diagram';
  if (KEY.language.test(hay)) return 'diagram'; // language uses type/word visuals, not photos
  if (KEY.animal.test(hay) || KEY.plant.test(hay) || KEY.place.test(hay)) return 'photo';
  if (KEY.history.test(hay)) return 'photo'; // prefer archival/PD photo; fall back to generate
  return 'generate'; // scenes, concepts, feelings — illustrate
}

// Build the brief the provider will act on.
export function buildImageBrief(topic) {
  const strategy = routeImage(topic);
  const subject = `${topic.name}`;
  const base = {
    topicId: topic.id, strategy,
    altText: `${topic.name} — illustration for ages ${topic.ageRangeStart}-${topic.ageRangeEnd}`,
    status: 'pending', // pending -> sourced/generated -> reviewed
    license: null, source: null, prompt: null, query: null,
  };

  if (strategy === 'nasa') {
    return { ...base, source: 'NASA Image Library (public domain)', license: 'public-domain',
      query: subject };
  }
  if (strategy === 'photo') {
    return { ...base,
      source: 'public-domain photo (Wikimedia Commons / Smithsonian Open Access / iNaturalist CC)',
      license: 'to-confirm (CC0 / CC-BY preferred)',
      query: `${subject} — clear, well-lit reference photograph, kid-friendly` };
  }
  if (strategy === 'diagram') {
    return { ...base, source: 'code-drawn (pipeline/illustrate.mjs)', license: 'CC-BY-SA-4.0',
      prompt: `diagram for "${subject}" (math/language concept)` };
  }
  // generate
  return { ...base, source: 'AI image generation (art-directed, reviewed)', license: 'generated (ours)',
    prompt: `A ${ART_DIRECTION.style}. Subject: ${subject}, for a child aged `
      + `${topic.ageRangeStart}-${topic.ageRangeEnd}. Avoid: ${ART_DIRECTION.avoid}.` };
}
