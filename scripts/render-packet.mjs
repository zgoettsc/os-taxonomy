#!/usr/bin/env node
// Render a real, multi-page printable learning packet from authored content.
//   node scripts/render-packet.mjs > /tmp/packet.html
// Then: chrome --headless --print-to-pdf=out.pdf file:///tmp/packet.html
//
// This is what the app's "Start & print materials" produces once a topic has
// generated content: a grown-up teaching lesson + child practice + answer key,
// per topic. Here we render Hugh's current session (the 4 starter topics).

import { LESSONS, makePractice } from '../content/lessons/starter-4-6.mjs';

const CHILD = process.argv[2] || 'Hugh';
const ORDER = ['mt_n6GhzDPllD', 'mt__h7hvT4tEb', 'mt_4GiE83rJF_', 'mt_NtJYlJdUe9']; // Hugh's session
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ascii = (s) => String(s).replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, ' ').trim();
const fill = (s) => esc(s).replaceAll('Hugh', esc(CHILD));

let R = 0.123456789;                       // tiny deterministic PRNG so the PDF is stable
const rnd = () => (R = (R * 9301 + 49297) % 233280) / 233280;

function parentBlock(L) {
  const p = L.parent;
  const steps = p.teach.map((s, i) => `
    <div class="step"><div class="n">${i + 1}</div>
      <div><div class="say">${fill(s.say)}</div><div class="do">${fill(s.do)}</div></div></div>`).join('');
  return `
  <section class="lesson">
    <div class="tag">For the grown-up · about ${L.minutes} min</div>
    <h2>${fill(L.match)}</h2>
    <div class="sub">${esc(L.subject)} · ${esc(L.domain)} · ages ${esc(L.band)}</div>

    <div class="big"><b>The big idea.</b> ${fill(p.bigIdea)}</div>
    <p class="why"><b>Why it matters.</b> ${fill(p.why)}</p>

    <div class="h">How to teach it</div>
    ${steps}

    <div class="h">Watch it in action</div>
    ${p.worked.map((w) => `<div class="worked">${fill(w)}</div>`).join('')}

    <div class="two">
      <div><div class="h">Common mix-ups to watch for</div><ul>${p.watch.map((w) => `<li>${fill(w)}</li>`).join('')}</ul></div>
      <div class="everyday"><div class="h">Everyday practice</div><p>${fill(p.everyday)}</p></div>
    </div>
  </section>`;
}

function practiceBlock(L) {
  const pr = L.practice;
  let body = `<div class="tag child">For ${esc(CHILD)} · practice</div><h2>${fill(L.match)}</h2>
    <p class="intro">${fill(pr.intro)}</p>`;
  let key = '';

  if (pr.items) { // talk prompts
    body += pr.items.map((it, i) => `<div class="prompt"><b>${i + 1}.</b> ${fill(it.prompt)}</div>`).join('');
    if (pr.sentenceStems) body += `<div class="stems"><b>Sentence starters to practice:</b> ${pr.sentenceStems.map((s) => `<span>${fill(s)}</span>`).join('')}</div>`;
  } else if (pr.generate === 'compare') {
    const items = makePractice('compare', rnd);
    body += `<div class="cmpgrid">` + items.map((it, i) => `
      <div class="cmp">
        <div class="cnum">${i + 1}</div>
        <div class="pair">
          <div class="grp">${'<span class="dot"></span>'.repeat(it.la)}</div>
          <div class="vs">${it.ask === 'fewer' ? 'fewer?' : 'more?'}</div>
          <div class="grp">${'<span class="dot alt"></span>'.repeat(it.rb)}</div>
        </div>
      </div>`).join('') + `</div>`;
    key = items.map((it, i) => `${i + 1}. ${it.la} vs ${it.rb} — circle <b>${esc(it.answer)}</b>`).join(' &nbsp;·&nbsp; ');
  } else if (pr.generate === 'rhyme') {
    const items = makePractice('rhyme', rnd);
    body += items.map((it, i) => `
      <div class="rrow"><span class="cnum">${i + 1}</span>
        <b>${esc(it.target)}</b> rhymes with…
        ${it.options.map((o) => `<span class="opt">${esc(o)}</span>`).join('')}
        <span class="more">…more: ${esc(it.more)}</span></div>`).join('');
    key = items.map((it, i) => `${i + 1}. ${esc(it.target)} → <b>${esc(it.answer)}</b>`).join(' &nbsp;·&nbsp; ');
  } else if (pr.generate === 'measure') {
    const items = makePractice('measure', rnd);
    body += items.map((it, i) => `
      <div class="mrow"><span class="cnum">${i + 1}</span>
        Circle the one that is <b>${esc(it.attr)}</b>:
        <span class="opt">${esc(ascii(it.a))}</span><span class="opt">${esc(ascii(it.b))}</span></div>`).join('');
    key = items.map((it, i) => `${i + 1}. ${esc(it.attr)} → <b>${esc(ascii(it.answer))}</b>`).join(' &nbsp;·&nbsp; ');
  }

  return { html: `<section class="practice">${body}</section>`, key: key ? { name: L.match, key } : null };
}

const parents = ORDER.map((id) => parentBlock(LESSONS[id]));
const practices = ORDER.map((id) => practiceBlock(LESSONS[id]));
const keys = practices.map((p) => p.key).filter(Boolean);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(CHILD)}'s learning materials</title>
<style>
  @page { size: letter; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  body { font: 11.5pt/1.55 "Georgia","Times New Roman",serif; color:#22271f; margin:0; }
  .cover { text-align:center; padding:8mm 0 6mm; border-bottom:3px solid #4c7a34; margin-bottom:7mm; }
  .cover .brand { color:#4c7a34; font-family:system-ui,sans-serif; font-weight:800; letter-spacing:.03em; }
  .cover h1 { font-size:26pt; margin:4px 0 2px; }
  .cover .day { color:#777; font-family:system-ui,sans-serif; }
  .cover .list { margin-top:8px; color:#555; font-family:system-ui,sans-serif; font-size:10pt; }
  h2 { font-size:17pt; margin:2px 0 1px; }
  .sub { color:#6b7160; font-family:system-ui,sans-serif; font-size:9.5pt; margin-bottom:8px; }
  .tag { font-family:system-ui,sans-serif; font-size:8.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.07em;
    color:#4c7a34; background:#eaf1e0; display:inline-block; padding:3px 9px; border-radius:20px; }
  .tag.child { color:#a03a6b; background:#f7e3ec; }
  .lesson, .practice { break-inside:avoid-page; padding:6mm 0; border-bottom:1px solid #e6e8df; }
  .practice { break-before:page; }
  .lesson + .lesson { break-before:page; }
  .big { background:#f2f6ec; border-left:4px solid #4c7a34; padding:9px 12px; border-radius:0 8px 8px 0; margin:8px 0; }
  .why { color:#3a3f33; }
  .h { font-family:system-ui,sans-serif; font-weight:800; font-size:9pt; text-transform:uppercase; letter-spacing:.06em;
    color:#8a9079; margin:13px 0 6px; }
  .step { display:flex; gap:11px; margin:7px 0; break-inside:avoid; }
  .step .n { flex:none; width:23px; height:23px; border-radius:50%; background:#4c7a34; color:#fff; font-family:system-ui,sans-serif;
    font-weight:700; font-size:10pt; display:flex; align-items:center; justify-content:center; }
  .step .say { font-weight:700; color:#2b5719; }
  .step .do { color:#3a3f33; }
  .worked { background:#fbfaf5; border:1px solid #e6e8df; border-radius:9px; padding:10px 12px; font-style:italic; color:#40453a; }
  .two { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; margin-top:6px; }
  .two ul { margin:0; padding-left:18px; } .two li { margin:4px 0; }
  .everyday { background:#f7f2e6; border-radius:9px; padding:4px 12px 10px; }
  .intro { font-family:system-ui,sans-serif; font-size:10pt; color:#555; background:#f7f7f3; padding:8px 11px; border-radius:8px; }
  .prompt { border:1px solid #e6e8df; border-radius:9px; padding:10px 12px; margin:8px 0; }
  .stems { margin-top:12px; font-family:system-ui,sans-serif; font-size:10pt; }
  .stems span { display:inline-block; background:#eef1e8; border-radius:6px; padding:3px 8px; margin:3px 4px 0 0; }
  .cmpgrid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; margin-top:12px; }
  .cmp { border:1.5px solid #dfe2d8; border-radius:11px; padding:12px; break-inside:avoid; }
  .cmp .cnum { font-family:system-ui,sans-serif; font-weight:800; color:#8a9079; font-size:9pt; }
  .pair { display:flex; align-items:center; gap:8px; margin-top:8px; }
  .grp { flex:1; display:flex; flex-wrap:wrap; gap:5px; min-height:34px; align-content:center;
    border:1.5px dashed #cdd2c4; border-radius:9px; padding:8px; }
  .dot { width:15px; height:15px; border-radius:50%; background:#4c7a34; display:inline-block; }
  .dot.alt { background:#c07542; }
  .vs { font-family:system-ui,sans-serif; font-weight:800; color:#a03a6b; font-size:9pt; }
  .rrow, .mrow { padding:9px 2px; border-bottom:1px dashed #e0e2d9; break-inside:avoid; }
  .cnum { font-family:system-ui,sans-serif; font-weight:800; color:#8a9079; margin-right:6px; }
  .opt { display:inline-block; border:1.5px solid #cdd2c4; border-radius:20px; padding:4px 14px; margin:0 5px; font-weight:600; }
  .more { color:#9a9f8c; font-size:9.5pt; font-style:italic; margin-left:6px; }
  .keys { break-before:page; padding-top:6mm; }
  .keys h2 { color:#a03a6b; } .keys .kn { font-family:system-ui,sans-serif; }
  .kb { margin:12px 0; } .kb b.name { display:block; font-family:system-ui,sans-serif; }
  .foot { margin-top:6mm; color:#9a9f8c; font-family:system-ui,sans-serif; font-size:8.5pt; text-align:center; }
</style></head><body>
  <div class="cover">
    <div class="brand">🌱 MARBLE</div>
    <h1>${esc(CHILD)}'s learning materials</h1>
    <div class="day">Today's session · 4 topics across 2 subjects</div>
    <div class="list">Speaking &amp; Listening · Counting &amp; Cardinality · Phonics &amp; Word Reading · Measurement</div>
  </div>

  ${parents.join('\n')}
  ${practices.map((p) => p.html).join('\n')}

  <section class="keys">
    <div class="tag child">Answer key · grown-up copy</div>
    <h2>Answer key</h2>
    ${keys.map((k) => `<div class="kb"><b class="name">${fill(k.name)}</b>${k.key}</div>`).join('')}
  </section>

  <div class="foot">Generated by Marble · facts verified against reputable sources before they reach ${esc(CHILD)} · empowering parents, not screens</div>
</body></html>`;

process.stdout.write(html);
