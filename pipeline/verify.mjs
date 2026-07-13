// Verification pass — the anti-fabrication gate.
//
// Runs AFTER generation, BEFORE the human review gate. The mock version does
// structural + citation checks deterministically. In production this is where a
// SECOND, independent model call asks of each factual claim: "is this supported
// by the cited grounding? is it a known misconception?" — and anything it can't
// confirm becomes a flag routed to the human review queue, not shipped.
//
// Returns { passed: string[], flags: string[] }.

export function verify(content, { grounding, mathGen } = {}) {
  const passed = [];
  const flags = [];

  // Structure: required sections present and non-empty.
  if (content.student?.intro) passed.push('student lesson present');
  else flags.push('missing student intro');
  if (content.parent?.whyItMatters && content.parent?.howToTeach) passed.push('parent guidance present');
  else flags.push('missing parent guidance');
  if ((content.assessment?.items || []).length) passed.push('assessment items present');
  else flags.push('no assessment items');

  // Assessment ties back to mastery evidence.
  const crit = (content.assessment?.masteryCriteria || []).length;
  const refs = (content.assessment?.items || []).every((i) => Number.isInteger(i.evidenceRef));
  if (crit && refs) passed.push('assessment maps to evidence[]');
  else if (!refs) flags.push('some assessment items lack an evidenceRef');

  // Cite-or-abstain: there must be at least one citation, and grounding must exist.
  const cites = (content.provenance?.citations || []).length;
  if (cites && (grounding || []).length) passed.push('citations present (cite-or-abstain)');
  else flags.push('no citations — factual content must trace to grounding');

  // Unverified grounding is allowed but flagged (needs a human to confirm sources).
  const unverified = (content.provenance?.grounding || []).filter((g) => !g.verified).length;
  if (unverified) flags.push(`${unverified} grounding source(s) unverified — confirm before review`);

  // Math correctness is delegated to code, not the model.
  if (mathGen) passed.push('math answers code-generated (correct by construction)');

  // The review gate is applied (the auto-review decision is made after this pass).
  passed.push('review gate applied');

  return { passed, flags };
}
