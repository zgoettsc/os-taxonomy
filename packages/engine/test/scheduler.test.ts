// Engine tests — prove the four core scheduler behaviors on a tiny synthetic
// graph. Run: node --test --experimental-strip-types  (from packages/engine)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph } from '../src/graph.ts';
import {
  INTERVALS, readyToStart, assemblePacket, record, dueReviews, stats,
} from '../src/scheduler.ts';
import type { Topic, Dependency, MasteryState } from '../src/types.ts';

// A → B (B needs A). Both math, age-appropriate for a 6yo.
const topics: Topic[] = [
  { id: 'A', subject: 'Mathematics', name: 'A', ageRangeStart: 5, ageRangeEnd: 6 },
  { id: 'B', subject: 'Mathematics', name: 'B', ageRangeStart: 5, ageRangeEnd: 6 },
];
const deps: Dependency[] = [{ topicId: 'B', prerequisiteId: 'A', strength: 'hard' }];
const graph = buildGraph(topics, deps);
const opts = { age: 6, subjects: ['Mathematics'] };

test('prerequisite gating: B is locked until A is mastered', () => {
  const state: MasteryState = new Map();
  assert.deepEqual(readyToStart(state, graph, opts).sort(), ['A']); // only A ready
  record(state, 'A', 0, true);
  record(state, 'A', 1, true); // mastered on two distinct days
  assert.equal(state.get('A')!.status, 'mastered');
  assert.ok(readyToStart(state, graph, opts).includes('B')); // B now unlocked
});

test('mastery requires success on two distinct days', () => {
  const state: MasteryState = new Map();
  record(state, 'A', 0, true);
  assert.equal(state.get('A')!.status, 'learning'); // one pass is not enough
  record(state, 'A', 0, true); // same day again — still one distinct day
  assert.equal(state.get('A')!.status, 'learning');
  record(state, 'A', 1, true); // second distinct day
  assert.equal(state.get('A')!.status, 'mastered');
});

test('spaced repetition: intervals expand on success', () => {
  const state: MasteryState = new Map();
  record(state, 'A', 0, true);
  record(state, 'A', 1, true); // mastered, box 0, due at 1 + INTERVALS[0]
  assert.equal(state.get('A')!.dueAt, 1 + INTERVALS[0]);
  const due = state.get('A')!.dueAt!;
  record(state, 'A', due, true); // successful review -> box 1
  assert.equal(state.get('A')!.box, 1);
  assert.equal(state.get('A')!.dueAt, due + INTERVALS[1]); // pushed further out
});

test('forgetting: a failed review resets to learning', () => {
  const state: MasteryState = new Map();
  record(state, 'A', 0, true);
  record(state, 'A', 1, true);
  assert.equal(state.get('A')!.status, 'mastered');
  const due = state.get('A')!.dueAt!;
  record(state, 'A', due, false); // failed the review
  assert.equal(state.get('A')!.status, 'learning');
  assert.equal(state.get('A')!.box, 0);
  assert.equal(state.get('A')!.dueAt, null);
});

test('packet assembles due reviews + new, and dueReviews respects the clock', () => {
  const state: MasteryState = new Map();
  record(state, 'A', 0, true);
  record(state, 'A', 1, true);
  const due = state.get('A')!.dueAt!;
  assert.deepEqual(dueReviews(state, due - 1), []); // not due yet
  assert.deepEqual(dueReviews(state, due), ['A']);  // due now
  const packet = assemblePacket(state, graph, due, { ...opts, maxNew: 2, rng: () => 0.5 });
  assert.ok(packet.some((p) => p.id === 'A' && p.kind === 'review'));
  assert.ok(packet.some((p) => p.kind === 'new')); // B is available as new
  assert.equal(stats(state).mastered, 1);
});
