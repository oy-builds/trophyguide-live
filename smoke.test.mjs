/* Smoke tests for the Leonida Legend entry.
   Run: node smoke.test.mjs  (from the repository root)
   Checks the kit layout, the trophy data against the official list, the
   vendored library's integrity, and that main.ts hands in a deterministic
   dossier. Exits non-zero on the first failure count > 0. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('.', import.meta.url));
let failures = 0;
function check(label, ok) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + label);
  if (!ok) failures += 1;
}
function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

/* ---- layout ---- */
for (const p of ['main.ts', 'LICENSE', 'README.md', 'app/index.html', 'app/app.js', 'app/style.css',
  'app/data/trophies.json', 'vendor/makefun-frontend.ts', '.makefun/owner.json']) {
  check('exists: ' + p, existsSync(join(root, p)));
}
check('owner.json names the wallet', readFileSync(join(root, '.makefun/owner.json'), 'utf8') === '{"wallet": "7xpK8LwVVh3QD3a1xVMbhgDxUya3wQESHPs9byJshnAU"}');

/* ---- vendor library untouched ---- */
check('vendor/makefun-frontend.ts byte-identical to the kit copy',
  sha256(readFileSync(join(root, 'vendor/makefun-frontend.ts'))) === '4c8da1c8e76490b3a847670f49137d3ec23953e3c988fe6a6cb320fce5739240');

/* ---- trophy data ---- */
const OFFICIAL_NAMES = [
  'Vice Got a Price!', 'Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Vice City, Baby!',
  'Top Of The World, Ma', 'You Gotta Know When to Get Off', 'Trust', 'Break the Bank', 'Family Matters',
  'DWNFALL', 'Hi-Jacked', 'Snow Storm', 'A Long Road', 'Cunning Stunts', 'Master of None', 'The Shootist',
  'Top Fun', 'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler', 'Road to Rehabilitation',
  'This Was No Boat Accident', 'The Lone Rider', 'Strangers & Freaks', 'Supply & Demand', 'Spin On This!',
  'Positive Mental Attitude', 'Fair Game', "Don't Touch My Deck", 'You WAiNKer!', 'One Last Thing',
  'Hot Together', 'Retail Therapy', 'Whip It Good', 'Gunslinger', 'Catch Me If You Can', 'Challenging Tank',
  'Sneakthief', 'Maximum Withdrawal', 'A Classic Blitz Play', 'The Goodtime State', 'Pest Control',
  'In The Beginning…', 'Capital Offense', 'Let’s Go Bowling', 'Personal Best', 'Actions Speak Louder',
  'Bad Luck, I Guess', 'The Truth Is Out There', 'Ten Pin', 'Dime on the Dollar', 'Treat Yo Self',
  'Little Boxes', 'On the Spot'
];
const data = JSON.parse(readFileSync(join(root, 'app/data/trophies.json'), 'utf8'));
const trophies = Array.isArray(data) ? data : data.trophies;
check('exactly 55 trophies', trophies.length === 55);
check('names match the official list, in order',
  JSON.stringify(trophies.map(t => t.name)) === JSON.stringify(OFFICIAL_NAMES));
const split = {};
for (const t of trophies) split[t.grade] = (split[t.grade] || 0) + 1;
check('grade split is 1 platinum / 2 gold / 6 silver / 46 bronze',
  split.platinum === 1 && split.gold === 2 && split.silver === 6 && split.bronze === 46);
check('every trophy has a guide of at least 80 characters',
  trophies.every(t => typeof t.guide === 'string' && t.guide.trim().length >= 80));
check('every trophy cites at least one source',
  trophies.every(t => Array.isArray(t.sources) && t.sources.length >= 1 && t.sources.every(s => typeof s === 'string' && s.length > 0)));
check('every trophy has a non-blank official description',
  trophies.every(t => typeof t.description === 'string' && t.description.trim().length > 0));
check('28 trophies flagged hidden (the published total)',
  trophies.filter(t => t.hidden).length === 28);
check('21 trophies carry a count target (the published total)',
  trophies.filter(t => 'count' in t).length === 21);
check('5 trophies flagged missable, each with an inference note',
  trophies.filter(t => t.missable).length === 5 &&
  trophies.filter(t => t.missable).every(t => typeof t.missableNote === 'string' && t.missableNote.length > 40));
check('every trophy sits in a roadmap stage from 1 to 5',
  trophies.every(t => Number.isInteger(t.stage) && t.stage >= 1 && t.stage <= 5));
check('every trophy has a kind',
  trophies.every(t => ['story', 'collectibles', 'activities', 'online'].includes(t.kind)));

/* ---- app sources ---- */
const appJs = readFileSync(join(root, 'app/app.js'), 'utf8');
let parses = true;
try { new vm.Script(appJs); } catch (err) { parses = false; }
check('app/app.js parses as a classic script', parses);
check('app/app.js loads only the local data file (no external URLs)',
  !/https?:\/\//.test(appJs) && appJs.includes("fetch('data/trophies.json')"));
const indexHtml = readFileSync(join(root, 'app/index.html'), 'utf8');
check('index.html references only style.css and app.js',
  indexHtml.includes('href="style.css"') && indexHtml.includes('src="app.js"') && !/https?:\/\//.test(indexHtml));
check('index.html has no inline scripts or styles to audit',
  !indexHtml.includes('<script>') && !indexHtml.includes('<style'));

/* ---- screenshots ---- */
const shots = readdirSync(join(root, 'screenshots')).filter(f => /\.(png|jpe?g)$/i.test(f));
check('screenshots/ holds 3 or 4 images', shots.length >= 3 && shots.length <= 4);
for (const f of shots) {
  const buf = readFileSync(join(root, 'screenshots', f));
  let dims = null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    dims = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  check('screenshot ' + f + ' is a PNG of at most 256 KiB, long side <= 1280, short side >= 480',
    dims !== null && buf.length <= 262144 && Math.max(dims.w, dims.h) <= 1280 && Math.min(dims.w, dims.h) >= 480);
}

/* ---- main.ts hand-in: deterministic dossier within the cap ---- */
function runHandIn() {
  const out = mkdtempSync(join(tmpdir(), 'leonida-out-'));
  execFileSync('node', [join(root, 'main.ts')], { env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, stdio: 'pipe' });
  return out;
}
const outA = runHandIn();
const outB = runHandIn();
const dossierA = readFileSync(join(outA, 'dossier.json'));
const dossierB = readFileSync(join(outB, 'dossier.json'));
check('two runs of main.ts produce a byte-identical dossier', dossierA.equals(dossierB));
check('dossier is at most 1.5 MiB', dossierA.length <= 1572864);
check('hand-in copies app/ and screenshots/ into the output',
  existsSync(join(outA, 'app', 'index.html')) && existsSync(join(outA, 'app', 'data', 'trophies.json')) &&
  readdirSync(join(outA, 'screenshots')).length === shots.length);
const sizeNote = statSync(join(root, 'app/data/trophies.json')).size;
check('trophies.json is at most 2 MiB', sizeNote <= 2097152);
rmSync(outA, { recursive: true, force: true });
rmSync(outB, { recursive: true, force: true });

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
