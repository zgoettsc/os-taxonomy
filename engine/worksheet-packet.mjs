#!/usr/bin/env node
// Turn a scheduler packet (or a single skill) into printable worksheets —
// and generate as MANY fresh, non-repeating sheets as the parent wants.
//
//   node engine/worksheet-packet.mjs --topic mt_ghF3Vv6taM --count 3 --out DIR
//   node engine/worksheet-packet.mjs --age 6 --warmup 8 --out DIR   # today's packet
//
// Practice is never capped: each requested sheet uses a fresh seed, so the
// problems differ every time (the learning science: kids need different amounts
// of practice — so "generate another" is unlimited). Math answers are computed
// by code, so every extra sheet's answer key is correct by construction.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../scripts/generators.mjs';
import { americanize as A } from '../scripts/americanize.mjs';
import { buildGraph, assemblePacket, record } from './scheduler.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dir, '..', 'data');
const topics = JSON.parse(fs.readFileSync(path.join(dataDir, 'topics.json'), 'utf8')).topics;
const deps = JSON.parse(fs.readFileSync(path.join(dataDir, 'dependencies.json'), 'utf8')).dependencies;
const byId = new Map(topics.map((t) => [t.id, t]));

// Load whatever authored content exists (topic id -> content).
const contentDir = path.join(dir, '..', 'content');
const content = new Map();
for (const f of fs.readdirSync(contentDir)) {
  if (f.endsWith('.json')) { const c = JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')); if (c.topicId) content.set(c.topicId, c); }
}

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }
const count = Number(argv.count) || 1;
const outDir = argv.out || path.join(dir, '..', 'worksheets');
const perTopic = Number(argv.n) || 12;
fs.mkdirSync(outDir, { recursive: true });

// A topic gets code-generated problems only when we can map it CONFIDENTLY to a
// generator (authored content, or an unambiguous name). Otherwise it becomes a
// parent-led activity page — we never fake problems for a topic we can't verify.
function resolveGenerator(topic) {
  const c = content.get(topic.id);
  if (c?.practice?.generator && GENERATORS[c.practice.generator]) return c.practice.generator;
  const n = topic.name.toLowerCase();
  if (/within 5\b/.test(n)) return 'addSubWithin5';
  if (/within 10\b/.test(n)) return 'addSubWithin10';
  if (/within 20\b/.test(n)) return 'addSubWithin20';
  if (/number bond/.test(n) && /10/.test(n)) return 'numberBondsTo10';
  if (/number bond/.test(n) && /5/.test(n)) return 'numberBondsTo5';
  return null;
}

// Decide the packet (the set of topics on the sheet).
function getPacket() {
  if (argv.topic) return [{ id: argv.topic, kind: 'practice' }];
  const age = Number(argv.age) || 6;
  const subjects = (argv.subjects || 'Mathematics').split(',');
  const graph = buildGraph(topics, deps);
  const state = new Map();
  let seed = 999;
  const rng = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const warm = Number(argv.warmup) || 8;
  for (let d = 0; d < warm; d++) for (const it of assemblePacket(state, graph, d, { age, subjects, maxNew: 2, rng })) record(state, it.id, d, rng() < 0.85);
  return assemblePacket(state, graph, warm, { age, subjects, maxNew: 2, rng });
}

const esc = (s) => A(String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sectionHTML(topic, seed) {
  const gen = resolveGenerator(topic);
  if (gen) {
    const items = GENERATORS[gen](seed, perTopic);
    const probs = items.map((it) => `<li><span class="q">${esc(it.prompt.replace(/=\s*\?$/, '='))}</span><span class="blank"></span></li>`).join('');
    const key = items.map((it) => `${esc(it.prompt.replace(/\?$/, ''))}<b>${it.answer}</b>`).join(' &nbsp; ');
    return { body: `<h3>${esc(topic.name)}</h3><ol class="grid">${probs}</ol>`, key: `<p><b>${esc(topic.name)}:</b> ${key}</p>` };
  }
  // Parent-led activity page (no fabricated problems).
  const c = content.get(topic.id);
  const prompt = A((c?.student?.intro) || topic.description || topic.name);
  const task = A((topic.assessmentPrompt || (topic.evidence && topic.evidence[0]) || '').replace('{{name}}', 'your child'));
  return { body: `<h3>${esc(topic.name)}</h3><p class="activity">${esc(prompt)}</p>${task ? `<p class="task"><b>Try together:</b> ${esc(task)}</p>` : ''}<div class="wline"></div><div class="wline"></div>`, key: '' };
}

function renderSheet(packet, seed, n) {
  // Vary the seed per topic so different topics don't share a number stream.
  const built = packet.map((it, i) => sectionHTML(byId.get(it.id), seed + i * 101));
  const body = built.map((s) => s.body).join('');
  const keys = built.map((s) => s.key).filter(Boolean).join('');
  return `<!doctype html><meta charset="utf-8"><title>Worksheet ${n}</title>
<style>
  body{font-family:"Century Gothic",ui-rounded,system-ui,sans-serif;color:#111;background:#f3f3f3;margin:0;padding:0}
  .sheet{background:#fff;width:8.5in;min-height:11in;margin:14px auto;padding:.7in .75in;box-shadow:0 2px 12px rgba(0,0,0,.15)}
  .top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #111;padding-bottom:8px;margin-bottom:8px}
  .top h1{font-size:18pt;margin:0}.top .meta{font-size:9pt;color:#555;text-align:right}
  .nameline{display:flex;gap:26px;font-size:11pt;color:#555;margin:10px 0 16px}.nameline u{flex:1;border-bottom:1.5px solid #bbb}
  h3{font-size:13pt;margin:16px 0 8px;border-bottom:1px solid #eee;padding-bottom:3px}
  ol.grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px 24px;font-size:16pt}
  ol.grid li{display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
  ol.grid .blank{display:inline-block;flex:1;min-width:40px;border-bottom:2px solid #111;height:1.2em}
  .activity{font-size:12pt;margin:0 0 6px}.task{font-size:11pt;color:#333}
  .wline{border-bottom:1.5px solid #bbb;height:28px;margin-top:12px}
  .guide{font-size:10.5pt}.guide h2{font-size:12pt;border-bottom:1px solid #eee;padding-bottom:3px}
  .key{background:#f6f6f6;border:1px solid #ccc;border-radius:8px;padding:10px 12px;font-size:10.5pt;font-variant-numeric:tabular-nums}
  @media print{body{background:#fff}.sheet{box-shadow:none;margin:0;width:auto;min-height:auto}.sheet+.sheet{page-break-before:always}.noprint{display:none}}
  .noprint{max-width:8.5in;margin:10px auto;font-size:12px;color:#555;text-align:center}
</style>
<p class="noprint">Worksheet #${n} — freshly generated. Ctrl/Cmd+P → Save as PDF. Generate as many as you like; each is different.</p>
<section class="sheet">
  <div class="top"><h1>Today's Practice</h1><div class="meta">Sheet #${n}<br>Marble Learn</div></div>
  <div class="nameline"><span>Name: <u></u></span><span>Date: <u></u></span></div>
  ${body}
</section>
${keys ? `<section class="sheet guide"><div class="top"><h1>Answer Key</h1><div class="meta">Sheet #${n} · for the grown-up</div></div><div class="key">${keys}</div></section>` : ''}`;
}

const packet = getPacket();
const base = Number(argv.seed) || 7;
const written = [];
for (let i = 0; i < count; i++) {
  const html = renderSheet(packet, base + i * 1000, i + 1);
  const p = path.join(outDir, `worksheet-${i + 1}.html`);
  fs.writeFileSync(p, html);
  written.push(p);
}
console.log(`Generated ${count} fresh worksheet(s) from a ${packet.length}-topic packet:`);
written.forEach((p) => console.log('  ' + p));
console.log(`\nUnlimited by design: run again (or bump --count) for more — each sheet is freshly seeded, so the problems never repeat.`);
