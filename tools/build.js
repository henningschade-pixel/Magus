#!/usr/bin/env node
// Baut index.html aus src/ (Reihenfolge laut src/manifest.json). Aufruf: node tools/build.js [--check]
// --check: baut nur im Speicher und meldet, ob index.html davon abweicht (für Tests und Commit-Prüfung).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
function build() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  return manifest.map(e => e.literal !== undefined ? e.literal : fs.readFileSync(path.join(root, 'src', e.file), 'utf8')).join('');
}
module.exports = { build };
if (require.main === module) {
  const out = build(), target = path.join(root, 'index.html');
  if (process.argv.includes('--check')) {
    const cur = fs.readFileSync(target, 'utf8');
    if (cur !== out) { console.error('index.html weicht von src/ ab: bitte `node tools/build.js` ausführen und committen.'); process.exit(1); }
    console.log('index.html entspricht src/ (' + out.length + ' Zeichen)');
  } else { fs.writeFileSync(target, out); console.log('index.html gebaut:', out.length, 'Zeichen'); }
}
