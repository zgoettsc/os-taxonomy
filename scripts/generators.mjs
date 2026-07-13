// Parametric practice generators — the "accuracy for free" trick.
//
// Each generator produces practice/assessment items whose answers are computed
// by CODE, not by a language model, so they are correct by construction. An
// LLM only ever writes the surrounding prose (intro, hints, feedback) — never
// the answer key. Generators are seeded so a given (key, seed) always yields
// the same set, which makes content reviewable and tests deterministic.

// mulberry32 — tiny deterministic PRNG so practice sets are reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const intIn = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

// Addition/subtraction fact families that stay within [0, max] and never go
// negative. Covers Marble topics like "Fluent adding and subtracting within 5"
// (mt_ghF3Vv6taM, CCSS K.OA.5) and its within-20 successors.
function addSubWithin(max) {
  return (seed, count) => {
    const r = rng(seed);
    const items = [];
    const seen = new Set();
    let guard = 0;
    while (items.length < count && guard++ < count * 40) {
      const op = r() < 0.5 ? '+' : '-';
      let a, b, answer;
      if (op === '+') {
        a = intIn(r, 0, max);
        b = intIn(r, 0, max - a); // guarantees a + b <= max
        answer = a + b;
      } else {
        a = intIn(r, 0, max);
        b = intIn(r, 0, a); // guarantees a - b >= 0
        answer = a - b;
      }
      const key = `${a}${op}${b}`;
      if (seen.has(key)) continue; // no duplicates in a set
      seen.add(key);
      items.push({
        kind: 'numeric',
        prompt: `${a} ${op} ${b} = ?`,
        answer, // computed here — guaranteed correct
        operands: [a, b],
        operation: op,
      });
    }
    return items;
  };
}

// Number bonds: "what goes with X to make TOTAL?" — same fluency skill, framed
// as a missing addend, which is how the standard actually tests it.
function numberBonds(total) {
  return (seed, count) => {
    const r = rng(seed);
    const items = [];
    for (let i = 0; i < count; i++) {
      const a = intIn(r, 0, total);
      items.push({
        kind: 'numeric',
        prompt: `${a} + ___ = ${total}`,
        answer: total - a,
        operands: [a, total],
        operation: 'bond',
      });
    }
    return items;
  };
}

export const GENERATORS = {
  addSubWithin5: addSubWithin(5),
  addSubWithin10: addSubWithin(10),
  addSubWithin20: addSubWithin(20),
  numberBondsTo5: numberBonds(5),
  numberBondsTo10: numberBonds(10),
};

// Auto-grader for anything a generator produced. Numeric answers are checked
// by strict equality against the code-computed key — no model in the loop.
export function grade(item, response) {
  if (item.kind === 'numeric') return Number(response) === item.answer;
  if (item.kind === 'mcq') return Number(response) === item.answerIndex;
  return null; // constructed responses need a rubric judge, not auto-grading
}
