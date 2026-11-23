#!/usr/bin/env node
/*
 * Build step for Dust Yard.
 * Runs on Vercel at deploy time (NOT committed-source changes).
 * It copies the whole site into dist/ and replaces the readable game
 * JavaScript with an obfuscated version, so only scrambled code ever
 * reaches the browser. The readable source stays in the repo.
 *
 * Obfuscation settings are tuned to NOT hurt a 60fps game:
 *  - renameGlobals: false  -> cross-file globals (S, keys, THREE, supabase,
 *                             touch-controls hooks) keep working.
 *  - controlFlowFlattening / deadCodeInjection: OFF -> they tank frame rate.
 *  - selfDefending + string array -> cheap, makes the code resist
 *    beautifying/reading without costing performance.
 */
const fs = require('fs');
const path = require('path');
const JO = require('javascript-obfuscator');

const SRC = __dirname;
const OUT = path.join(SRC, 'dist');

const OBF = {
  compact: true,
  renameGlobals: false,          // keep S, keys, THREE, supabase, exported fns
  identifierNamesGenerator: 'mangled-shuffled',
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  selfDefending: true,           // resists auto-formatting / tampering
  numbersToExpressions: false,   // keep physics numbers cheap
  simplify: true,
  splitStrings: false,
  controlFlowFlattening: false,  // OFF: would wreck frame rate
  deadCodeInjection: false,      // OFF: bloat + perf
  debugProtection: false,        // OFF by default: can stutter the game loop
  disableConsoleOutput: false,   // keep the "new version" prompt working
  target: 'browser'
};

function obf(code) {
  return JO.obfuscate(code, OBF).getObfuscatedCode();
}

// recursively copy everything except build artifacts / git / node_modules
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (['dist', 'node_modules', '.git', '.vercel'].includes(name)) continue;
    const s = path.join(from, name), d = path.join(to, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('[build] copying site -> dist/');
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(SRC, OUT);

// 1) obfuscate touch-controls.js
const tcPath = path.join(OUT, 'touch-controls.js');
if (fs.existsSync(tcPath)) {
  console.log('[build] obfuscating touch-controls.js');
  fs.writeFileSync(tcPath, obf(fs.readFileSync(tcPath, 'utf8')));
}

// 2) obfuscate the inline game script inside drift.html
//    (the last <script> tag that has no src=)
for (const htmlName of ['drift.html']) {
  const p = path.join(OUT, htmlName);
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');
  // match inline <script> ... </script> blocks (no src attribute)
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let count = 0;
  html = html.replace(re, (full, body) => {
    if (!body.trim()) return full;
    count++;
    const open = full.slice(0, full.indexOf('>') + 1);
    return open + '\n' + obf(body) + '\n</script>';
  });
  console.log(`[build] obfuscated ${count} inline script(s) in ${htmlName}`);
  fs.writeFileSync(p, html);
}

console.log('[build] done.');
