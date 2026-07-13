// The scheduler — the "brain" of the app (reference implementation).
//
// Pure logic over the taxonomy graph + a child's mastery state. This is the JS
// prototype of what becomes the shared TypeScript engine (docs/architecture.md).
// The state shape mirrors the `mastery` table in db/schema.sql:
//   { status: 'locked'|'learning'|'mastered', box, dueAt, history[] }
//
// v1 rules (docs/ROADMAP.md — start simple):
//   • Unlock a topic only when every HARD prerequisite is mastered.
//   • Promote learning → mastered on success on TWO DISTINCT DAYS (spacing baked
//     into the definition of mastered).
//   • Plain spaced repetition: expanding intervals, reset on failure.
//   • Interleave the daily packet across topics/subjects.
// No encompassing/FIRe yet (that's the deferred sophistication).

export const INTERVALS = [1, 3, 7, 16, 35]; // days between reviews, by box level

// Build fast lookups from the taxonomy.
export function buildGraph(topics, dependencies) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const hardPrereqs = new Map();
  for (const d of dependencies) {
    if (d.strength !== 'hard') continue;
    if (!hardPrereqs.has(d.topicId)) hardPrereqs.set(d.topicId, []);
    hardPrereqs.get(d.topicId).push(d.prerequisiteId);
  }
  return { byId, hardPrereqs };
}

const rec = (state, id) =>
  state.get(id) || { status: 'locked', box: 0, dueAt: null, history: [] };

const isMastered = (state, id) => state.get(id)?.status === 'mastered';

// A topic is in scope if it's in a chosen subject and at/below the child's age.
export function inScope(topic, { age, subjects }) {
  if (subjects && !subjects.includes(topic.subject)) return false;
  return topic.ageRangeStart <= age;
}

// Ready to START: in scope, not yet touched, and every in-scope hard prereq is
// mastered. (Out-of-scope prereqs are assumed known, so the child isn't blocked
// by material outside the current focus.)
export function readyToStart(state, graph, opts) {
  const out = [];
  for (const t of graph.byId.values()) {
    if (!inScope(t, opts) || state.has(t.id)) continue;
    const pre = graph.hardPrereqs.get(t.id) || [];
    const blocked = pre.some(
      (p) => graph.byId.get(p) && inScope(graph.byId.get(p), opts) && !isMastered(state, p),
    );
    if (!blocked) out.push(t.id);
  }
  return out;
}

// Reviews due today = mastered topics whose dueAt has arrived.
export function dueReviews(state, today) {
  const out = [];
  for (const [id, r] of state) if (r.status === 'mastered' && r.dueAt != null && r.dueAt <= today) out.push(id);
  return out;
}

// Topics mid-learning that should keep getting practice until mastered.
export function continuing(state) {
  return [...state].filter(([, r]) => r.status === 'learning').map(([id]) => id);
}

// Assemble today's packet: due reviews + continuing + up to maxNew new topics,
// interleaved (shuffled, and new topics spread across subjects).
export function assemblePacket(state, graph, today, opts) {
  const rng = opts.rng || Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const reviews = dueReviews(state, today).map((id) => ({ id, kind: 'review' }));
  const cont = continuing(state).map((id) => ({ id, kind: 'learning' }));

  // Pick new topics, biased to spread across subjects (interleaving).
  const readyIds = shuffle(readyToStart(state, graph, opts));
  const picked = [];
  const usedSubjects = new Set();
  for (const id of readyIds) {
    if (picked.length >= (opts.maxNew ?? 2)) break;
    const subj = graph.byId.get(id).subject;
    if (usedSubjects.has(subj) && readyIds.length > (opts.maxNew ?? 2)) continue; // prefer variety
    usedSubjects.add(subj);
    picked.push({ id, kind: 'new' });
  }
  return shuffle([...reviews, ...cont, ...picked]);
}

// Record the outcome of a topic attempt and update mastery/schedule.
export function record(state, id, today, passed) {
  const r = { ...rec(state, id) };
  r.history = [...r.history, { day: today, passed }];

  if (r.status === 'mastered') {
    if (passed) { r.box = Math.min(r.box + 1, INTERVALS.length - 1); r.dueAt = today + INTERVALS[r.box]; }
    else { r.status = 'learning'; r.box = 0; r.dueAt = null; } // forgot it — re-learn
  } else {
    r.status = 'learning';
    // Mastery gate: successful on two DISTINCT days.
    const passDays = new Set(r.history.filter((h) => h.passed).map((h) => h.day));
    if (passDays.size >= 2) { r.status = 'mastered'; r.box = 0; r.dueAt = today + INTERVALS[0]; }
  }
  state.set(id, r);
  return r;
}

export function stats(state) {
  let mastered = 0, learning = 0;
  for (const r of state.values()) { if (r.status === 'mastered') mastered++; else if (r.status === 'learning') learning++; }
  return { mastered, learning, tracked: state.size };
}
