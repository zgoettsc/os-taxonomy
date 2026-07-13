#!/usr/bin/env node
// Generate a PRINTABLE worksheet + parent guide for a topic — paper first.
//
//   node scripts/worksheet.mjs mt_ghF3Vv6taM --n 15 --seed 7 --out math.html
//   node scripts/worksheet.mjs mt_yBJyCfhtem --out grammar.html
//
// Output is a black-on-white HTML file sized for US Letter. Open it and either
// print it or "Save as PDF" from the browser. Page 1 is the child's worksheet
// (no answers, room to write); page 2 is the parent guide + answer key. Math
// problems come from the code generator, so the answer key is correct by
// construction. All text is normalized to American English on the way out.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from './generators.mjs';
import { americanize as A } from './americanize.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const argv = {};
for (let i = 3; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]?.startsWith('--') ? true : process.argv[++i];
}
const id = process.argv[2];
if (!id) { console.error('Usage: node scripts/worksheet.mjs <topicId> [--n 15] [--seed 7] [--out file.html]'); process.exit(1); }
const c = JSON.parse(fs.readFileSync(path.join(dir, '..', 'content', `${id}.json`), 'utf8'));
const N = Number(argv.n) || 15;
const SEED = Number(argv.seed) || 7;
const out = argv.out || path.join(dir, '..', 'worksheets', `${id}.html`);

const esc = (s) => A(String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join('');

// --- build the child worksheet + answer key from the content -----------------
let worksheetBody = '', answerKey = '';

if (c.practice?.generator && GENERATORS[c.practice.generator]) {
  // Math: a grid of computation problems with a blank to fill in.
  const items = GENERATORS[c.practice.generator](SEED, N);
  worksheetBody = `<ol class="grid">${items.map((it) =>
    `<li><span class="q">${esc(it.prompt.replace(/=\s*\?$/, '='))}</span><span class="blank"></span></li>`).join('')}</ol>`;
  answerKey = `<ol class="keygrid">${items.map((it) =>
    `<li>${esc(it.prompt.replace(/\?$/, ''))}<b>${it.answer}</b></li>`).join('')}</ol>`;
} else {
  // Non-math: turn multiple-choice practice into circle-the-answer items.
  const items = (c.practice?.items || []).filter((x) => x.kind === 'mcq');
  worksheetBody = `<ol class="qlist">${items.map((it) =>
    `<li><div class="qtext">${esc(it.prompt)}</div><div class="opts">${
      it.choices.map((ch) => `<span class="opt">${esc(ch)}</span>`).join('')}</div></li>`).join('')}</ol>
    <div class="writebox"><div class="qtext">Now write your own sentence using a naming word and a doing word:</div>
      <div class="wline"></div><div class="wline"></div></div>`;
  answerKey = `<ol class="keylist">${items.map((it) =>
    `<li>${esc(it.prompt)} → <b>${esc(it.choices[it.answerIndex])}</b></li>`).join('')}</ol>`;
}

const criteria = c.assessment?.masteryCriteria || [];

// --- page --------------------------------------------------------------------
const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)} — worksheet</title>
<style>
  :root{--ink:#111;--soft:#555;--line:#bbb;--rule:#e6e6e6}
  *{box-sizing:border-box}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;color:var(--ink);background:#f3f3f3;
    font-family:"Century Gothic",ui-rounded,"Segoe UI",system-ui,sans-serif}
  .sheet{background:#fff;width:8.5in;min-height:11in;margin:16px auto;padding:0.7in 0.75in;
    box-shadow:0 2px 12px rgba(0,0,0,.15)}
  .top{display:flex;justify-content:space-between;align-items:flex-end;
    border-bottom:2.5px solid var(--ink);padding-bottom:8px;margin-bottom:6px}
  .top h1{font-size:20pt;margin:0;letter-spacing:-.01em}
  .top .meta{font-size:9pt;color:var(--soft);text-align:right}
  .nameline{display:flex;gap:26px;font-size:11pt;color:var(--soft);margin:12px 0 20px}
  .nameline u{flex:1;border-bottom:1.5px solid var(--line);min-width:120px}
  .instr{font-size:11.5pt;margin:0 0 16px}
  .stars{font-size:13pt;letter-spacing:3px}

  /* math grid */
  ol.grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(3,1fr);
    gap:20px 26px;font-size:17pt}
  ol.grid li{display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}
  ol.grid .q{white-space:nowrap}
  ol.grid .blank{display:inline-block;flex:1;min-width:42px;border-bottom:2px solid var(--ink);height:1.2em}

  /* mcq -> circle the answer */
  ol.qlist{padding-left:1.2em;margin:0;font-size:13pt}
  ol.qlist li{margin:0 0 16px}
  ol.qlist .qtext{margin-bottom:8px}
  ol.qlist .opts{display:flex;gap:14px;flex-wrap:wrap}
  ol.qlist .opt{border:2px solid var(--ink);border-radius:22px;padding:6px 18px;font-weight:700;font-size:13pt}
  .writebox{margin-top:8px}
  .wline{border-bottom:1.5px solid var(--line);height:30px;margin-top:14px}

  /* parent guide */
  .guide h2{font-size:13pt;margin:20px 0 6px;border-bottom:1px solid var(--rule);padding-bottom:3px}
  .guide h2:first-of-type{margin-top:4px}
  .guide p{font-size:11pt;margin:0 0 8px}
  .guide ul{font-size:11pt;margin:0;padding-left:1.2em}
  .guide ul li{margin-bottom:5px}
  .badge{display:inline-block;font-size:8pt;text-transform:uppercase;letter-spacing:.08em;
    border:1.5px solid var(--soft);color:var(--soft);border-radius:20px;padding:2px 8px}
  .key{background:#f6f6f6;border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-top:6px}
  ol.keygrid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(3,1fr);
    gap:6px 22px;font-size:11pt;font-variant-numeric:tabular-nums}
  ol.keygrid b{margin-left:4px}
  ol.keylist,ol.keygrid{font-size:11pt}
  ol.keylist{margin:0;padding-left:1.2em}

  @media print{
    body{background:#fff}
    .sheet{box-shadow:none;margin:0;width:auto;min-height:auto;padding:0.5in 0.6in}
    .sheet + .sheet{page-break-before:always}
    .noprint{display:none}
  }
  .noprint{max-width:8.5in;margin:12px auto;font-size:12px;color:#555;text-align:center}
</style>

<p class="noprint">📄 This is a printable worksheet. Press <b>Ctrl/Cmd + P</b> → choose <b>Save as PDF</b> or print. Page 1 = your child's sheet · Page 2 = your guide + answer key.</p>

<!-- PAGE 1 — CHILD WORKSHEET -->
<section class="sheet">
  <div class="top">
    <h1>${esc(c.name)}</h1>
    <div class="meta">${esc(c.subject)} · Ages ${c.ageRange.join('–')}<br>Marble Learn</div>
  </div>
  <div class="nameline"><span>Name: <u></u></span><span>Date: <u></u></span></div>
  <p class="instr"><b>Let's practice!</b> ${esc(c.student.intro)}</p>
  ${worksheetBody}
  <p style="margin-top:26px;font-size:11pt;color:var(--soft)">How did it feel? Color the stars: <span class="stars">☆ ☆ ☆ ☆ ☆</span></p>
</section>

<!-- PAGE 2 — PARENT GUIDE -->
<section class="sheet guide">
  <div class="top">
    <h1>Parent Guide</h1>
    <div class="meta">${esc(c.name)}<br><span class="badge">for the grown-up</span></div>
  </div>
  <h2>Why this matters</h2>
  <p>${esc(c.parent.whyItMatters)}</p>
  <h2>How to teach it</h2>
  <p>${esc(c.parent.howToTeach)}</p>
  ${c.parent.watchFor ? `<h2>What to watch for</h2><ul>${li(c.parent.watchFor)}</ul>` : ''}
  ${c.parent.tryAtHome ? `<h2>Try at home (no worksheet needed)</h2><ul>${li(c.parent.tryAtHome)}</ul>` : ''}
  <h2>They've got it when…</h2>
  <ul>${li(criteria)}</ul>
  <h2>Answer key</h2>
  <div class="key">${answerKey}</div>
</section>
</html>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${out}  (${(html.length / 1024).toFixed(1)} KB) — open it and Ctrl/Cmd+P → Save as PDF`);
