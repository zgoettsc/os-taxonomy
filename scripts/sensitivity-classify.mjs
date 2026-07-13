#!/usr/bin/env node
// Proposed classification of the sweep candidates (AI-assisted; human confirms).
//   node scripts/sensitivity-classify.mjs
// Encodes a decision per candidate as a BUCKET; buckets map to the fields the
// content system uses (confirmed, domains, gate_default, stances). Edit the map
// to override any call, then re-run. Writes data/sensitivity-classified.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { candidates } = JSON.parse(fs.readFileSync(path.join(root, 'data/sensitivity-candidates.json'), 'utf8'));

// Bucket → the actual policy fields (see docs/content-architecture.md).
const BUCKET = {
  DROP:          { confirmed: false, domains: [],                     gate_default: null,   stances: [],
                   note: 'false positive — treat as neutral, no flag' },
  RELIGION_HIST: { confirmed: true,  domains: ['religion/origins'],   gate_default: 'show', stances: [],
                   note: 'historical belief — teach factual-neutral ("people believed…"); parent-gate-able' },
  ORIGINS_FORK:  { confirmed: true,  domains: ['religion/origins'],   gate_default: 'show', stances: ['factual-neutral', 'faith-inclusive'],
                   note: 'origins / evolution — the genuine stance fork' },
  SEX_ED:        { confirmed: true,  domains: ['body/reproduction'],  gate_default: 'hide', stances: [],
                   note: 'human puberty/reproduction — opt-in; factual-neutral when shown' },
  VIOLENCE:      { confirmed: true,  domains: ['violence/mature'],    gate_default: 'show', stances: [],
                   note: 'war/death — factual-neutral, age-appropriate framing; parent-gate-able' },
  VALUES:        { confirmed: true,  domains: ['politics/current-events'], gate_default: 'show', stances: [],
                   note: 'contested modern values — factual-neutral; parents likely to gate' },
};

// id → bucket (my proposed call for each of the 84; edit freely).
const CALL = {
  mt__BbOjiY5A5:'VALUES', mt_oqvJJKCJXw:'VALUES', mt_pu2mmK27UA:'SEX_ED', mt_6xsEXxKdUX:'DROP',
  mt_tQkCzRcWG7:'SEX_ED', mt_4IVWRAZoNC:'DROP', mt_zexbopQjG0:'DROP', mt_Te_ulgYMUd:'DROP',
  'mt_Te-ulgYMUd':'DROP', mt_yNWt3GQBNp:'DROP', mt_ck57CDFGet:'DROP', mt_wWpa5fFDZP:'DROP',
  mt_o7FJPDsHiW:'DROP', mt_8VA40Tumth:'DROP', mt_5_Zr9xXDNH:'DROP', mt_UR5LvBeyF1:'ORIGINS_FORK',
  mt_XMz_ohNjYO:'VIOLENCE', mt_pTz6u49fQt:'DROP', mt_8ad4U6msea:'DROP', mt_CSGqz245rV:'DROP',
  mt_e1Yr6rhRNW:'VIOLENCE', mt_HZyUwycFvf:'DROP', mt_6nqVnVdexe:'DROP', mt_NnlnxCx1DO:'VIOLENCE',
  'mt__o3TCmfomv':'VIOLENCE', mt_H4bLNkDrGJ:'VIOLENCE', mt_lzCcQzPJZi:'DROP', mt_Nj32xtOhno:'DROP',
  mt_EHiM4_qg1R:'VALUES', mt_8ShghTx0jd:'DROP', mt_14F_x1Xwwp:'VIOLENCE', 'mt_Ik-WC2ARPf':'DROP',
  mt_eosO26KE_Z:'DROP', 'mt_eosO26KE-Z':'DROP', mt_B1LdSGMP66:'VALUES', mt_MlD0gwLSw9:'VIOLENCE',
  mt_vFYFvgrPgD:'DROP', mt_VjxyJLtIbT:'DROP', mt_UMOjbmLcbM:'DROP', mt_zIzJGkaj0Q:'DROP',
  mt_5XLhiqmocP:'VALUES', 'mt_h-z88yf9Pn':'DROP', mt_itldWmVItr:'DROP', mt_LQt4vnKeB4:'DROP',
  mt_edaoZRkK6M:'DROP', mt_Wzj1RETm9A:'VALUES', mt_7QeiS95TRC:'DROP', mt_ZanQuV90qi:'DROP',
  mt_JdAnBKIDnw:'DROP', mt_pitjUcaAdy:'DROP', 'mt__qlBYNP62H':'RELIGION_HIST', mt_B1ATUEVNPz:'RELIGION_HIST',
  mt_bvxkT1nepy:'RELIGION_HIST', mt_5qNMVZi3dQ:'VIOLENCE', mt_W_CNRTBgYR:'RELIGION_HIST', mt_H1pAi4F_Oh:'RELIGION_HIST',
  mt_FDKd7I79JZ:'RELIGION_HIST', mt_PhIZNl2230:'RELIGION_HIST', mt_cUMUYkDqZp:'DROP', mt_f4O__f3OU4:'DROP',
  mt_8qQ2IosZZw:'RELIGION_HIST', mt_uzk7qs4KxE:'RELIGION_HIST', mt_zh_RyesCgZ:'RELIGION_HIST', mt_LuwHnQItF_:'RELIGION_HIST',
  mt_PCX1jZZnf9:'RELIGION_HIST', mt_aXNlkbAeIk:'RELIGION_HIST', mt_szw1Ln490b:'DROP', mt_xAG0aMeAIN:'VALUES',
  'mt_p-8Hlf6_9k':'VALUES', mt_WtO50EZQkf:'DROP', mt_2oswCNuapH:'VALUES', mt_DkzsZdyaL2:'VALUES',
  mt_ohUnzoI_nx:'ORIGINS_FORK', mt_lWqmKn5Jvr:'ORIGINS_FORK', 'mt_-r3B4FQyX3':'ORIGINS_FORK', mt_fqAkSv3cUE:'ORIGINS_FORK',
  mt_LRzjbo1Fn6:'ORIGINS_FORK', mt_FuVEZ1Ac9s:'ORIGINS_FORK', mt_7_XXh9NCp0:'ORIGINS_FORK', mt_IP0PTVfTXp:'ORIGINS_FORK',
  mt_YNrrNE23dZ:'ORIGINS_FORK', mt_EaWjCyn8W2:'ORIGINS_FORK', mt_mKNmXqz_Oo:'ORIGINS_FORK', mt_OiDHqtLoln:'VIOLENCE',
  mt_CqzsM0BDFP:'VIOLENCE', mt_8oAzr0WxRb:'VIOLENCE',
};

const classified = candidates.map((c) => {
  const bucket = CALL[c.id] || 'DROP';
  const b = BUCKET[bucket];
  return { id: c.id, name: c.name, subject: c.subject, bucket,
    confirmed: b.confirmed, domains: b.domains, gate_default: b.gate_default, stances: b.stances,
    note: b.note, matched: c.matched };
});

fs.writeFileSync(path.join(root, 'data/sensitivity-classified.json'),
  JSON.stringify({ generated: 'ai-proposed · confirm before use', total: classified.length, classified }, null, 2) + '\n');

// summary
const byBucket = {}; for (const c of classified) byBucket[c.bucket] = (byBucket[c.bucket] || 0) + 1;
const confirmed = classified.filter((c) => c.confirmed);
process.stderr.write(`Proposed: ${confirmed.length} confirmed sensitive / ${classified.length - confirmed.length} dropped (of ${classified.length})\n`);
process.stderr.write('  buckets: ' + Object.entries(byBucket).map(([b, n]) => `${b}=${n}`).join('  ') + '\n');
