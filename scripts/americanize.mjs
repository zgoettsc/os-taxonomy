// British -> American English normalizer.
//
// The taxonomy is authored in British English (Mum, maths, colour, recognise,
// "full stop"). This converts text to American English at render time, so we
// never fork Marble's upstream data — we normalize on the way out.
//
// Design rule: ALLOWLIST, never a blanket regex. A naive /ise$/->/ize/ would
// wreck "exercise", "promise", "precise", "tortoise", "advertise" — all already
// American. So every conversion is an explicit, known word (with its inflections
// generated), matched on word boundaries, preserving the original's case.

// Productive families — list the British lemma; inflections are generated.
const ISE = ['recognise','organise','memorise','capitalise','summarise','synthesise',
  'categorise','emphasise','realise','apologise','characterise','minimise','maximise',
  'prioritise','generalise','specialise','visualise','familiarise','regularise',
  'standardise','personalise','normalise','analyse','criticise','hypothesise'];
const OUR = ['colour','behaviour','favour','favourite','neighbour','flavour','labour',
  'honour','humour','rumour','odour','vapour','valour','savour','harbour','endeavour'];
const RE_ = ['centre','metre','litre','theatre','fibre','calibre','sombre','spectre','lustre'];
const DOUBLE_L = ['travelling','travelled','traveller','labelling','labelled','modelling',
  'modelled','cancelling','cancelled','signalling','signalled','marvellous','jewellery'];

// Explicit one-offs (base forms; simple +s plural handled below).
const EXACT = {
  'mum':'mom','mummy':'mommy','mums':'moms',
  'maths':'math','whilst':'while','learnt':'learned','grey':'gray',
  'practise':'practice','practising':'practicing','practised':'practiced',
  'aeroplane':'airplane','programme':'program','catalogue':'catalog','analogue':'analog',
  'defence':'defense','offence':'offense','licence':'license','pretence':'pretense',
  'plough':'plow','mould':'mold','moustache':'mustache','cosy':'cozy','storey':'story',
  'tick':'check','ticks':'checks','ticked':'checked',
  'rubber':'eraser','lorry':'truck','jumper':'sweater','nappy':'diaper',
  'pavement':'sidewalk','trainers':'sneakers','biscuit':'cookie','biscuits':'cookies',
  'full stop':'period','full stops':'periods',
};

// Build the lookup: British(lower) -> American, inflections expanded.
const MAP = new Map();
const put = (b, a) => MAP.set(b.toLowerCase(), a);

for (const w of ISE) {
  const z = w.replace(/ise$/, 'ize');
  put(w, z); put(w + 's', z + 's');
  put(w.replace(/e$/, 'ed'), z.replace(/e$/, 'ed'));
  put(w.replace(/e$/, 'ing'), z.replace(/e$/, 'ing'));
  put(w.replace(/ise$/, 'isation'), z.replace(/ize$/, 'ization'));
  put(w.replace(/ise$/, 'iser'), z.replace(/ize$/, 'izer'));
}
for (const w of OUR) {
  const a = w.replace(/our(?=\w*$)/, 'or');
  put(w, a); put(w + 's', a + 's'); put(w + 'ed', a + 'ed'); put(w + 'ing', a + 'ing');
}
for (const w of RE_) {
  const a = w.replace(/re$/, 'er');
  put(w, a); put(w + 's', a + 's'); put(w + 'd', a + 'd');
}
for (const w of DOUBLE_L) put(w, w.replace(/ll/, 'l').replace('jewelery', 'jewelry'));
put('jewellery', 'jewelry');
for (const [b, a] of Object.entries(EXACT)) put(b, a);

// Longest keys first so "full stop" beats "full".
const KEYS = [...MAP.keys()].sort((a, b) => b.length - a.length);
const boundary = (k) => new RegExp(`\\b${k.replace(/ /g, '\\s+')}\\b`, 'gi');
const RULES = KEYS.map((k) => [boundary(k), MAP.get(k)]);

function matchCase(british, american) {
  if (british === british.toUpperCase() && british !== british.toLowerCase()) return american.toUpperCase();
  if (british[0] === british[0].toUpperCase()) return american[0].toUpperCase() + american.slice(1);
  return american;
}

export function americanize(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [re, am] of RULES) out = out.replace(re, (m) => matchCase(m, am));
  return out;
}

// Report remaining British-isms (for a content-review gate). Returns [{word}].
export function findBritishisms(text) {
  const hits = [];
  for (const k of KEYS) { const m = text.match(boundary(k)); if (m) hits.push(...m); }
  return [...new Set(hits)];
}

// Deep-apply to any JSON structure (strings only).
export function americanizeDeep(v) {
  if (typeof v === 'string') return americanize(v);
  if (Array.isArray(v)) return v.map(americanizeDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, americanizeDeep(x)]));
  return v;
}
