// Leonida Legend — hand-in program for the gta6-trophy-guide-01 entry.
//
// The guide itself is the static web app in app/ (open app/index.html in a
// browser, served by any static file server, fully offline). This program
// hands the entry in: it copies app/ and screenshots/ into the output
// directory and writes dossier.json there with buildDossier from the kit's
// vendor library, exactly the bytes the scorer rebuilds and compares.
//
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader's container the output directory is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's published caps for this competition: at most 4 screenshots of
// 256 KiB each, at most 993 files and directories in app/, 48 MiB of app
// files in all, and the dossier text capped at 160 KiB.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
  const shotsDir = join(outputDir, 'screenshots');
  mkdirSync(shotsDir, { recursive: true });
  if (existsSync(join(repoDir, 'screenshots'))) {
    cpSync(join(repoDir, 'screenshots'), shotsDir, { recursive: true });
  }
  const dossier = buildDossier(outputDir, DOSSIER_OPTIONS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
