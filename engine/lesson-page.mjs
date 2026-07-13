#!/usr/bin/env node
// Generate a printable "book page" — the LEARN content that precedes practice.
//
//   node engine/lesson-page.mjs --topic mt_ghF3Vv6taM --out DIR   # a skill lesson
//   node engine/lesson-page.mjs --unit cats --out DIR             # a Lane 2 knowledge page
//
// This is the teaching half of the binder (paper-to-learn): a readable, gently
// illustrated page a child reads/hears BEFORE the worksheet. Math concepts are
// illustrated with SVG manipulatives (the right visual for the idea); knowledge
// pages carry an original short text + facts. Facts/illustrations here are
// prototype-authored and marked unreviewed — production routes them through the
// grounding + verification + review pipeline in docs/content-sourcing.md.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { americanize as A } from '../scripts/americanize.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }
const outDir = argv.out || path.join(dir, '..', 'worksheets');
fs.mkdirSync(outDir, { recursive: true });
const esc = (s) => A(String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- SVG manipulatives for math -------------------------------------------
function group(n, crossed = 0, color = '#e4572e') {
  const r = 13, gap = 32; let s = '';
  for (let i = 0; i < n; i++) {
    const cx = 16 + i * gap;
    s += `<circle cx="${cx}" cy="18" r="${r}" fill="${color}" opacity="${i >= n - crossed ? 0.25 : 1}"/>`;
    if (i >= n - crossed) s += `<line x1="${cx - 9}" y1="9" x2="${cx + 9}" y2="27" stroke="#333" stroke-width="3"/>`;
  }
  return `<svg viewBox="0 0 ${n * gap} 36" height="34" style="vertical-align:middle">${s}</svg>`;
}
function eqVisual(a, op, b, c) {
  if (op === '+') return `<div class="eq">${group(a)}<span class="sym">+</span>${group(b)}<span class="sym">=</span><span class="ans">${c}</span></div>`;
  return `<div class="eq">${group(a, b)}<span class="sym">=</span><span class="ans">${c}</span></div>`; // subtraction: cross out b
}

// ---- Skill lesson (from an authored content file) --------------------------
function skillLesson(topicId) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, '..', 'content', `${topicId}.json`), 'utf8'));
  const eqs = (c.student.examples || []).map((ex) => {
    const m = String(ex.say).match(/(\d+)\s*([+\-−])\s*(\d+)\s*=\s*(\d+)/);
    const vis = m ? eqVisual(+m[1], m[2] === '+' ? '+' : '-', +m[3], +m[4]) : `<div class="eq big">${esc(ex.show)}</div>`;
    return `<div class="example">${vis}<p class="caption">${esc(ex.say)}</p></div>`;
  }).join('');
  return {
    title: c.name, subject: `${c.subject} · Ages ${c.ageRange.join('–')}`, emoji: '🔢',
    intro: c.student.intro,
    bodyHTML: `<h2>Let's look at it</h2>${eqs}
      <div class="bridge"><b>Now it's your turn →</b> flip to today's practice sheet and try some on your own.</div>`,
    reviewed: c.provenance?.reviewed,
  };
}

// ---- Lane 2 knowledge page (prototype unit content, original text) ---------
const UNITS = {
  cats: {
    title: 'Cats: Amazing Animals', subject: 'Knowledge Unit · Science & Reading', emoji: '🐱',
    intro: 'Cats are one of the most popular pets in the whole world. They are soft, curious, and full of surprises. Let\'s meet them!',
    bodyHTML: `
      <div class="hero">🐱</div>
      <h2>Four cool cat facts</h2>
      <ul class="facts">
        <li>🌙 Cats can see well in very dim light, so they are great at moving around at night.</li>
        <li>〰️ A cat's whiskers help it feel its way around and sense whether it can fit through a gap.</li>
        <li>😴 Cats sleep a lot — often more than half the day — to save energy for playing and pouncing.</li>
        <li>🐾 Baby cats are called kittens, and a group of kittens born together is called a litter.</li>
      </ul>
      <h2>Words to know</h2>
      <p class="vocab"><b>whiskers</b> — the long stiff hairs on a cat's face &nbsp;·&nbsp; <b>litter</b> — kittens born together &nbsp;·&nbsp; <b>pounce</b> — to jump quickly onto something</p>
      <div class="wonder"><b>I wonder…</b> Why do you think a cat's whiskers are so useful at night? Talk about it, then draw your own cat below.</div>
      <div class="drawbox">Draw your cat here</div>`,
    reviewed: false,
  },
};

function build(page) {
  const badge = page.reviewed === false ? `<span class="draft">sample · unreviewed</span>` : '';
  return `<!doctype html><meta charset="utf-8"><title>${esc(page.title)}</title>
<style>
  body{font-family:"Century Gothic",ui-rounded,system-ui,sans-serif;color:#20242e;background:#eceef2;margin:0;padding:0}
  .page{background:#fff;width:8.5in;min-height:11in;margin:16px auto;padding:.8in .85in;box-shadow:0 3px 16px rgba(0,0,0,.16)}
  .band{display:flex;align-items:center;gap:14px;border-bottom:3px solid #5b6cff;padding-bottom:12px}
  .band .emoji{font-size:40pt;line-height:1}
  .band h1{font-size:24pt;margin:0 0 2px;letter-spacing:-.01em}
  .band .sub{font-size:10.5pt;color:#5b6273;text-transform:uppercase;letter-spacing:.06em}
  .draft{font-size:8pt;color:#b26a00;background:#fdf1dd;border-radius:20px;padding:3px 9px;margin-left:auto;text-transform:uppercase;letter-spacing:.06em}
  .intro{font-size:14pt;line-height:1.6;margin:18px 0 6px}
  h2{font-size:14pt;color:#5b6cff;margin:22px 0 10px}
  .example{display:flex;flex-direction:column;gap:4px;margin:14px 0;padding:12px 14px;background:#f7f8ff;border-radius:12px}
  .eq{display:flex;align-items:center;gap:12px;font-size:20pt}
  .eq.big{font-size:22pt}.eq .sym{font-size:20pt;color:#5b6273}.eq .ans{font-size:22pt;font-weight:700;color:#e4572e}
  .caption{font-size:12pt;color:#3a3f4b;margin:0}
  .bridge{margin-top:22px;padding:12px 16px;background:#eaf6ee;border-radius:12px;font-size:12.5pt}
  .hero{font-size:64pt;text-align:center;margin:6px 0}
  ul.facts{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
  ul.facts li{font-size:13pt;line-height:1.5;background:#f7f8ff;border-radius:12px;padding:12px 14px}
  .vocab{font-size:12pt;line-height:1.8}
  .wonder{margin-top:20px;padding:12px 16px;background:#fff6e9;border-radius:12px;font-size:12.5pt}
  .drawbox{margin-top:14px;height:2.4in;border:2px dashed #c2c6d2;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#aab;font-size:11pt}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;width:auto;min-height:auto}.noprint{display:none}}
  .noprint{max-width:8.5in;margin:10px auto;text-align:center;font-size:12px;color:#666}
</style>
<p class="noprint">A “book page” to learn from — read it together before the worksheet. Ctrl/Cmd+P → Save as PDF.</p>
<section class="page">
  <div class="band"><span class="emoji">${page.emoji}</span><div><h1>${esc(page.title)}</h1><div class="sub">${esc(page.subject)}</div></div>${badge}</div>
  <p class="intro">${esc(page.intro)}</p>
  ${page.bodyHTML}
</section>`;
}

const page = argv.unit ? UNITS[argv.unit] : skillLesson(argv.topic || 'mt_ghF3Vv6taM');
if (!page) { console.error('Unknown page. Use --topic <id> or --unit cats'); process.exit(1); }
const name = argv.unit ? `lesson-unit-${argv.unit}` : `lesson-${argv.topic || 'mt_ghF3Vv6taM'}`;
const outPath = path.join(outDir, `${name}.html`);
fs.writeFileSync(outPath, build(page));
console.log(`Wrote ${outPath}`);
console.log('This is the LEARN page — it precedes the practice worksheet in the binder.');
