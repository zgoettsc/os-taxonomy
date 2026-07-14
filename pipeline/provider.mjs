// LLM provider abstraction for the content pipeline.
//
// The generator never talks to a model directly — it goes through a provider,
// so the pipeline runs offline with a deterministic MOCK and swaps in the real
// Claude call for production. Keeping the model behind this seam is what lets us
// unit-test the pipeline and keep generation reviewable.
//
// Rule (docs/content-sourcing.md): the model ADAPTS grounded material into the
// content schema — it does not invent facts. Grounding text is passed in; the
// provider returns structured content that must cite it.

// ---- MOCK provider: deterministic, offline, no API key -------------------
// Stands in for the model so the whole pipeline is runnable and testable.
export function mockProvider() {
  return {
    name: 'mock',
    async generateLesson({ topic, grounding }) {
      const n = topic.name;
      const cite = (topic.standards || []).map((s) => ({ source: s, span: 'standard' }));
      return {
        student: {
          intro: `Let's learn about ${n.toLowerCase()}! ${topic.description || ''}`.trim(),
          examples: [{ show: n, say: `Here is a simple example of ${n.toLowerCase()}.` }],
        },
        parent: {
          whyItMatters: `${n} is a building block: mastering it makes later topics easier.`,
          howToTeach: `Introduce ${n.toLowerCase()} with a concrete example, then let the child try.`,
          watchFor: [`A common slip is rushing ${n.toLowerCase()} without checking the idea.`],
          tryAtHome: [`Point out ${n.toLowerCase()} during everyday activities.`],
        },
        practice: (topic.evidence || []).slice(0, 3).map((e, i) => ({
          kind: 'mcq', prompt: `Which shows "${e}"?`, choices: ['A', 'B'], answerIndex: 0, _evidence: i,
        })),
        assessment: (topic.evidence || []).slice(0, 2).map((e, i) => ({
          id: `q${i + 1}`, kind: 'constructed', prompt: `Show that you can: ${e}`,
          rubric: [`Response demonstrates: ${e}`], evidenceRef: i,
        })),
        // Every factual claim must trace to grounding; mock cites the standards.
        citations: cite.length ? cite : [{ source: 'taxonomy', span: 'description' }],
        _groundingUsed: grounding?.length || 0,
      };
    },
  };
}

// ---- CLAUDE provider: the real generation call (production) ---------------
// Lazily imports @anthropic-ai/sdk so this file runs even when the SDK isn't
// installed. Uses structured outputs so the model returns schema-valid JSON,
// and adaptive thinking. Model: claude-opus-4-8.
const LESSON_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['student', 'parent', 'practice', 'assessment', 'citations'],
  properties: {
    // NOTE: Anthropic structured output supports minItems only 0 or 1 (not higher),
    // so we forbid EMPTY sections with minItems:1. The system prompt asks for depth;
    // the verify gate still holds anything thin for human review.
    student: { type: 'object', additionalProperties: false, required: ['intro', 'examples'],
      properties: { intro: { type: 'string', minLength: 200 },
        examples: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['show', 'say'], properties: { show: { type: 'string' }, say: { type: 'string' } } } } } },
    parent: { type: 'object', additionalProperties: false, required: ['whyItMatters', 'howToTeach', 'watchFor', 'tryAtHome'],
      properties: { whyItMatters: { type: 'string', minLength: 40 }, howToTeach: { type: 'string', minLength: 40 },
        watchFor: { type: 'array', minItems: 1, items: { type: 'string' } }, tryAtHome: { type: 'array', minItems: 1, items: { type: 'string' } } } },
    practice: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false,
      required: ['kind', 'prompt'],
      properties: { kind: { type: 'string' }, prompt: { type: 'string' },
        choices: { type: 'array', items: { type: 'string' } },
        answerIndex: { type: 'integer' }, answer: { type: 'string' } } } },
    assessment: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false,
      required: ['id', 'kind', 'prompt', 'evidenceRef'],
      properties: { id: { type: 'string' }, kind: { type: 'string' }, prompt: { type: 'string' },
        rubric: { type: 'array', items: { type: 'string' } }, evidenceRef: { type: 'integer' } } } },
    citations: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['source', 'span'], properties: { source: { type: 'string' }, span: { type: 'string' } } } },
  },
};

export async function claudeProvider() {
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); }
  catch { throw new Error('claude provider needs @anthropic-ai/sdk installed (npm i @anthropic-ai/sdk)'); }
  const client = new Anthropic(); // resolves ANTHROPIC_API_KEY / ant profile
  return {
    name: 'claude',
    async generateLesson({ topic, grounding }) {
      const system =
        'You are an expert children\'s textbook author. Write a COMPLETE, '
        + 'book-quality lesson for the given age by ADAPTING the provided grounding.\n'
        + 'Rules:\n'
        + '1. Use ONLY facts supported by the grounding — never invent. Every factual '
        + 'claim must map to a citation (the source id it came from).\n'
        + '2. Go DEEP and STRUCTURED, the way a good textbook chapter would — not a '
        + 'shallow list. First DEFINE the concept in kid-friendly terms, then TEACH it '
        + 'thoroughly: cover the different kinds/categories, how each one works, what '
        + 'it is FOR, and a vivid example for each. Use everything relevant in the '
        + 'grounding; if the grounding covers categories the examples should span them '
        + '(e.g. for communication: sound, sight, scent, touch — not just sound).\n'
        + '3. Be CONCRETE and MEMORABLE, not vague and descriptive. When the grounding '
        + 'gives a specific name, number, size, or comparison, USE it — name the real '
        + 'thing (the Big Dipper, a specific animal or place), give the real number or '
        + 'a striking comparison a child remembers ("the Sun is so wide that a hundred '
        + 'Earths could line up across it"). A child should finish the lesson knowing '
        + 'specific, true, wonderful facts — not just general statements. Do not leave '
        + 'vivid, age-appropriate detail from the grounding on the table.\n'
        + '4. CALIBRATE to the age. Teach at the grade\'s altitude: at this level cover '
        + 'WHAT happens and the observable pattern; reach for a deeper mechanism only if '
        + 'the grounding states it in age-appropriate terms — do not over-reach into '
        + 'explanations above the grade. But never water it down either: pitched right '
        + 'means substantive AND accessible, not thin.\n'
        + '5. student.intro should be several rich paragraphs — a real explanation a '
        + 'child could learn from — and student.examples should span the full range the '
        + 'grounding supports.\n'
        + '6. Warm, concrete, age-appropriate. American English.\n'
        + '7. practice items may be multiple-choice (kind "mcq" with choices) or short. '
        + 'assessment items are rubric-graded OPEN questions — use kind "short" or '
        + '"constructed" with a rubric, never "mcq" (they have no answer choices).';
      const user =
        `TOPIC: ${topic.name}\nDESCRIPTION: ${topic.description || ''}\n`
        + `AGE: ${topic.ageRangeStart}-${topic.ageRangeEnd}\nSUBJECT: ${topic.subject}\n`
        + `EVIDENCE (mastery criteria):\n${(topic.evidence || []).map((e) => '- ' + e).join('\n')}\n\n`
        + `GROUNDING (write only from this):\n${(grounding || []).map((g) => `[${g.source}] ${g.text}`).join('\n\n')}`;
      const res = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        system,
        messages: [{ role: 'user', content: user }],
        output_config: { format: { type: 'json_schema', schema: LESSON_SCHEMA } },
      });
      const text = res.content.find((b) => b.type === 'text')?.text || '{}';
      return JSON.parse(text);
    },
  };
}

// ---- practice generation: auto-checkable items grounded in a topic's facts ----
const PRACTICE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'],
  properties: {
    items: { type: 'array', minItems: 1, items: {
      type: 'object', additionalProperties: false, required: ['kind', 'prompt'],
      properties: {
        kind: { type: 'string' },            // 'mcq' | 'short'
        prompt: { type: 'string' },
        choices: { type: 'array', items: { type: 'string' } }, // mcq
        answerIndex: { type: 'integer' },                       // mcq
        answer: { type: 'string' },                             // short
      },
    } },
  },
};

// A provider that can make more practice on demand, grounded in `facts` (the
// topic's already-stored cited spans). Returns [{kind,prompt,choices?,answerIndex?,answer?}].
export async function practiceProvider(name) {
  if (name !== 'claude') {
    return { name: 'mock', async generatePractice({ topic, count = 6 }) {
      return Array.from({ length: count }, (_, i) => ({ kind: 'short', prompt: `About ${topic.name}: sample question ${i + 1}?`, answer: 'sample' }));
    } };
  }
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); }
  catch { throw new Error('claude practice provider needs @anthropic-ai/sdk installed'); }
  const client = new Anthropic();
  return {
    name: 'claude',
    async generatePractice({ topic, facts, count = 8, avoid = [] }) {
      const system =
        'You write short, AUTO-CHECKABLE practice questions for a child, GROUNDED ONLY in the provided facts.\n'
        + 'Each item is either multiple-choice (kind "mcq" with exactly 3 choices and an answerIndex 0-2) '
        + 'or exact fill-in (kind "short" with a concise, unambiguous answer).\n'
        + 'Rules: (1) every question AND its answer must be directly supported by the facts — never invent. '
        + '(2) Keep wording at the child\'s age. (3) For mcq, make the wrong choices plausible but clearly wrong. '
        + '(4) Do NOT reuse any prompt in the avoid list; vary what you ask across the different facts.';
      const user =
        `TOPIC: ${topic.name}\nAGE: ${topic.ageRangeStart}-${topic.ageRangeEnd}\nMAKE: ${count} fresh items\n\n`
        + `FACTS (write only from these):\n${(facts || []).map((f) => '- ' + f).join('\n')}\n\n`
        + `AVOID repeating these prompts:\n${(avoid || []).slice(0, 80).map((a) => '- ' + a).join('\n') || '(none yet)'}`;
      const res = await client.messages.create({
        model: 'claude-opus-4-8', max_tokens: 6000, system,
        messages: [{ role: 'user', content: user }],
        output_config: { format: { type: 'json_schema', schema: PRACTICE_SCHEMA } },
      });
      const text = res.content.find((b) => b.type === 'text')?.text || '{}';
      return JSON.parse(text).items || [];
    },
  };
}

// ---- image directives: turn picture-card descriptions into image jobs ----
// For each student.examples[] "show" line, decide whether it's best shown by a
// real PHOTO (a named, real thing) or an ILLUSTRATION (a generic concept), and
// give a clean single-subject scene + a photo search query + alt text. The house
// style is applied later (resolve-images.mjs) so every card in a day matches.
const IMAGE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items'],
  properties: {
    items: { type: 'array', minItems: 1, items: {
      type: 'object', additionalProperties: false, required: ['kind', 'subject', 'query', 'alt'],
      properties: {
        kind: { type: 'string' },      // 'photo' | 'illustration'
        subject: { type: 'string' },   // one clear scene/object, no text, plain background
        query: { type: 'string' },     // 3–6 word photo search terms (photo kind)
        alt: { type: 'string' },       // one-sentence accessible description
      },
    } },
  },
};

export async function imageProvider(name) {
  if (name !== 'claude') {
    return { name: 'mock', async imageDirectives({ examples = [] }) {
      return examples.map((e) => ({ kind: 'illustration', subject: String(e.show || e.say || '').slice(0, 120), query: String(e.show || '').split(/\s+/).slice(0, 5).join(' '), alt: String(e.show || '') }));
    } };
  }
  let Anthropic;
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')); }
  catch { throw new Error('claude image provider needs @anthropic-ai/sdk installed'); }
  const client = new Anthropic();
  return {
    name: 'claude',
    async imageDirectives({ topic, examples = [] }) {
      const system =
        'You turn a children\'s lesson\'s picture-card descriptions into image directives, ONE per card, in order.\n'
        + 'For each card decide kind:\n'
        + '• "photo" — the card depicts a SPECIFIC, real, nameable thing best shown by a real photograph '
        + '(an animal, a plant, a planet, a landmark, a real everyday object). \n'
        + '• "illustration" — a generic concept, comparison, action, or scene with no single real referent.\n'
        + 'For EVERY card provide: subject = one clear SCENE with a SINGLE main object, plain background, no text/letters, '
        + 'uncluttered so a pre-reader instantly sees what it is; query = 3–6 word photo search terms (fill it even for '
        + 'illustration); alt = one age-appropriate sentence describing the picture. Keep everything concrete, calm, and '
        + 'age-appropriate. Return exactly one item per card, same order.';
      const user =
        `TOPIC: ${topic.name} (ages ${topic.ageRangeStart}-${topic.ageRangeEnd}, ${topic.subject})\n\n`
        + `PICTURE CARDS:\n${examples.map((e, i) => `${i + 1}. show: ${e.show || ''}\n   say: ${e.say || ''}`).join('\n')}`;
      const res = await client.messages.create({
        model: 'claude-opus-4-8', max_tokens: 3000, system,
        messages: [{ role: 'user', content: user }],
        output_config: { format: { type: 'json_schema', schema: IMAGE_SCHEMA } },
      });
      const text = res.content.find((b) => b.type === 'text')?.text || '{}';
      return JSON.parse(text).items || [];
    },
  };
}

export async function getProvider(name) {
  if (name === 'claude') return claudeProvider();
  return mockProvider();
}
