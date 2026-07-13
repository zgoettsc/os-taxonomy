#!/usr/bin/env node
// Print taxonomy topic ids matching filters, one per line — for batch generation.
//   node pipeline/list-topics.mjs --age 4 [--subject Mathematics]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const topics = JSON.parse(fs.readFileSync(path.join(dir, '..', 'data', 'topics.json'), 'utf8')).topics;

const argv = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) argv[a.slice(2)] = process.argv[i + 1]; }
const age = Number(argv.age);
const subject = argv.subject;

let list = topics;
if (age) list = list.filter((t) => t.ageRangeStart <= age && t.ageRangeEnd >= age);
if (subject) list = list.filter((t) => t.subject === subject);
for (const t of list) console.log(t.id);
