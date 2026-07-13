// Tests for the source registry + grounding compilation + the commercial switch.
//   node --test pipeline/sources.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, LICENSES, licenseFlags, sourcesForTopic, gatherGrounding, dependsOnNonCommercial } from './sources.mjs';

const sci = { id: 'mt_x', name: 'Animal Camouflage', subject: 'Science' };
const hist = { id: 'mt_h', name: 'Ancient Egypt', subject: 'History' };

test('license flags derive commercial correctly', () => {
  assert.equal(licenseFlags('CC0').commercial, true);
  assert.equal(licenseFlags('CC-BY').commercial, true);
  assert.equal(licenseFlags('CC-BY-SA').commercial, true);
  assert.equal(licenseFlags('CC-BY-SA').shareAlike, true);
  assert.equal(licenseFlags('CC-BY-NC').commercial, false);
  assert.equal(licenseFlags('CC-BY-NC-SA').commercial, false);
});

test('every source has a known license and derived flags', () => {
  for (const s of SOURCES) {
    assert.ok(LICENSES[s.license], `${s.id} has known license`);
    assert.equal(typeof s.commercial, 'boolean', `${s.id} has commercial flag`);
  }
  // the two NC sources we discussed are present and flagged
  const ck12 = SOURCES.find((s) => s.id === 'ck12');
  const ck = SOURCES.find((s) => s.id === 'coreknowledge');
  assert.equal(ck12.commercial, false);
  assert.equal(ck.commercial, false);
  assert.equal(ck.shareAlike, true);
});

test('personal mode: rich, multi-source grounding incl. NC', async () => {
  const g = await gatherGrounding(sci, { allowNonCommercial: true });
  assert.ok(g.grounding.length >= 4, 'several sources contribute');
  assert.ok(g.sourcesUsed.includes('ck12'), 'CK-12 included in personal mode');
  assert.ok(g.sourcesUsed.includes('coreknowledge'), 'Core Knowledge included');
  assert.ok(g.sourcesUsed.includes('nasa'), 'NASA (public domain) included for Science');
  assert.equal(g.usedNonCommercial, true);
  assert.equal(g.mode, 'personal');
  // every passage carries its provenance + license
  for (const p of g.grounding) {
    assert.ok(p.source && p.license, 'passage tagged with source + license');
    assert.equal(typeof p.commercial, 'boolean');
  }
});

test('commercial mode: NC sources are dropped automatically', async () => {
  const g = await gatherGrounding(sci, { allowNonCommercial: false });
  assert.ok(!g.sourcesUsed.includes('ck12'), 'CK-12 excluded when commercial');
  assert.ok(!g.sourcesUsed.includes('coreknowledge'), 'Core Knowledge excluded when commercial');
  assert.ok(g.sourcesUsed.includes('nasa'), 'clean sources still present');
  assert.equal(g.usedNonCommercial, false);
  assert.equal(g.mode, 'commercial');
  assert.ok(g.grounding.every((p) => p.commercial === true), 'only commercial-OK passages remain');
});

test('subject filtering: history topic pulls history-capable + universal sources', async () => {
  const g = await gatherGrounding(hist, { allowNonCommercial: true });
  assert.ok(g.sourcesUsed.includes('loc'), 'Library of Congress for History');
  assert.ok(g.sourcesUsed.includes('wikidata'), 'universal source included');
  assert.ok(!g.sourcesUsed.includes('noaa'), 'weather source not used for History');
});

test('audit: content built on NC sources is detectable', async () => {
  const personal = await gatherGrounding(sci, { allowNonCommercial: true });
  const commercial = await gatherGrounding(sci, { allowNonCommercial: false });
  assert.equal(dependsOnNonCommercial(personal), true, 'flag content that used NC sources');
  assert.equal(dependsOnNonCommercial(commercial), false, 'clean content passes the audit');
});
