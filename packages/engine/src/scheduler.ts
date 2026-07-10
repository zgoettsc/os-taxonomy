// The scheduler — the "brain". Pure logic over the graph + a child's mastery
// state. TypeScript port of the engine/scheduler.mjs prototype.
//
// v1 rules (docs/ROADMAP.md — start simple):
//   • Unlock a topic only when every HARD prerequisite is mastered.
//   • Promote learning -> mastered on success on TWO DISTINCT DAYS.
//   • Plain spaced repetition: expanding intervals, reset on failure.
//   • Interleave the daily packet across topics/subjects.

import type {
  Topic, Graph, MasteryState, MasteryRecord, ScopeOpts, PacketItem, PacketOpts, Stats,
} from './types.ts';

/** Days between reviews, by box level. */
export const INTERVALS: readonly number[] = [1, 3, 7, 16, 35];

function rec(state: MasteryState, id: string): MasteryRecord {
  return state.get(id) ?? { status: 'locked', box: 0, dueAt: null, history: [] };
}

const isMastered = (state: MasteryState, id: string): boolean =>
  state.get(id)?.status === 'mastered';

/** In a chosen subject and at/below the child's age. */
export function inScope(topic: Topic, opts: ScopeOpts): boolean {
  if (opts.subjects && !opts.subjects.includes(topic.subject)) return false;
  return topic.ageRangeStart <= opts.age;
}

/**
 * Ready to START: in scope, not yet touched, and every in-scope hard prereq is
 * mastered. Out-of-scope prereqs are assumed known, so the child isn't blocked
 * by material outside the current focus.
 */
export function readyToStart(state: MasteryState, graph: Graph, opts: ScopeOpts): string[] {
  const out: string[] = [];
  for (const t of graph.byId.values()) {
    if (!inScope(t, opts) || state.has(t.id)) continue;
    const pre = graph.hardPrereqs.get(t.id) ?? [];
    const blocked = pre.some((p) => {
      const pt = graph.byId.get(p);
      return pt !== undefined && inScope(pt, opts) && !isMastered(state, p);
    });
    if (!blocked) out.push(t.id);
  }
  return out;
}

/** Mastered topics whose review is due on `today`. */
export function dueReviews(state: MasteryState, today: number): string[] {
  const out: string[] = [];
  for (const [id, r] of state) {
    if (r.status === 'mastered' && r.dueAt !== null && r.dueAt <= today) out.push(id);
  }
  return out;
}

/** Topics mid-learning that keep getting practice until mastered. */
export function continuing(state: MasteryState): string[] {
  return [...state].filter(([, r]) => r.status === 'learning').map(([id]) => id);
}

/** Today's packet: due reviews + continuing + up to maxNew new, interleaved. */
export function assemblePacket(
  state: MasteryState, graph: Graph, today: number, opts: PacketOpts,
): PacketItem[] {
  const rng = opts.rng ?? Math.random;
  const shuffle = <T>(a: T[]): T[] => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const reviews: PacketItem[] = dueReviews(state, today).map((id) => ({ id, kind: 'review' }));
  const cont: PacketItem[] = continuing(state).map((id) => ({ id, kind: 'learning' }));

  const maxNew = opts.maxNew ?? 2;
  const readyIds = shuffle(readyToStart(state, graph, opts));
  const picked: PacketItem[] = [];
  const usedSubjects = new Set<string>();
  for (const id of readyIds) {
    if (picked.length >= maxNew) break;
    const subj = graph.byId.get(id)!.subject;
    if (usedSubjects.has(subj) && readyIds.length > maxNew) continue; // prefer variety
    usedSubjects.add(subj);
    picked.push({ id, kind: 'new' });
  }
  return shuffle([...reviews, ...cont, ...picked]);
}

/** Record a topic attempt and update mastery/schedule. Returns the new record. */
export function record(
  state: MasteryState, id: string, today: number, passed: boolean,
): MasteryRecord {
  const prev = rec(state, id);
  const r: MasteryRecord = { ...prev, history: [...prev.history, { day: today, passed }] };

  if (r.status === 'mastered') {
    if (passed) {
      r.box = Math.min(r.box + 1, INTERVALS.length - 1);
      r.dueAt = today + INTERVALS[r.box];
    } else {
      r.status = 'learning'; r.box = 0; r.dueAt = null; // forgot it — re-learn
    }
  } else {
    r.status = 'learning';
    // Mastery gate: successful on two DISTINCT days.
    const passDays = new Set(r.history.filter((h) => h.passed).map((h) => h.day));
    if (passDays.size >= 2) { r.status = 'mastered'; r.box = 0; r.dueAt = today + INTERVALS[0]; }
  }
  state.set(id, r);
  return r;
}

export function stats(state: MasteryState): Stats {
  let mastered = 0, learning = 0;
  for (const r of state.values()) {
    if (r.status === 'mastered') mastered++;
    else if (r.status === 'learning') learning++;
  }
  return { mastered, learning, tracked: state.size };
}
