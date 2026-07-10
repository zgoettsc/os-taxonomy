// Core types for the Marble learning engine. Pure data — no I/O, no UI.
// Shared by the app and the server (docs/architecture.md).

export interface Topic {
  id: string;
  type?: string;
  subject: string;
  domain?: string;
  name: string;
  description?: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  centrality?: number;
  evidence?: string[];
  standards?: string[];
}

export interface Dependency {
  topicId: string;
  prerequisiteId: string;
  strength: 'hard' | 'soft';
  reason?: string;
}

export type MasteryStatus = 'locked' | 'learning' | 'mastered';

export interface HistoryEntry {
  day: number;
  passed: boolean;
}

/** Per-(child, topic) scheduler state. Mirrors the `mastery` table in db/schema.sql. */
export interface MasteryRecord {
  status: MasteryStatus;
  box: number;          // spaced-repetition level (index into INTERVALS)
  dueAt: number | null; // next review due, as a day number; null until mastered
  history: HistoryEntry[];
}

export type MasteryState = Map<string, MasteryRecord>;

export interface Graph {
  byId: Map<string, Topic>;
  hardPrereqs: Map<string, string[]>;
}

export interface ScopeOpts {
  age: number;
  subjects?: string[];
}

export type PacketKind = 'new' | 'learning' | 'review';

export interface PacketItem {
  id: string;
  kind: PacketKind;
}

export interface PacketOpts extends ScopeOpts {
  maxNew?: number;
  rng?: () => number;
}

export interface Stats {
  mastered: number;
  learning: number;
  tracked: number;
}
