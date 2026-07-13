// Build fast lookups from the taxonomy: id -> topic, and topic -> hard prereqs.
import type { Topic, Dependency, Graph } from './types.ts';

export function buildGraph(topics: Topic[], dependencies: Dependency[]): Graph {
  const byId = new Map<string, Topic>(topics.map((t) => [t.id, t]));
  const hardPrereqs = new Map<string, string[]>();
  for (const d of dependencies) {
    if (d.strength !== 'hard') continue;
    const list = hardPrereqs.get(d.topicId);
    if (list) list.push(d.prerequisiteId);
    else hardPrereqs.set(d.topicId, [d.prerequisiteId]);
  }
  return { byId, hardPrereqs };
}
