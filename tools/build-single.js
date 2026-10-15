#!/usr/bin/env node
// Erzeugt dist/magus-single.html: index.html mit allen assets/-Dateien als data:-URIs eingebettet
// (läuft auch per Doppelklick/file:// und als einzelne Datei). Aufruf: node tools/build-single.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const MIME = { webp: 'image/webp', png: 'image/png', mp3: 'audio/mpeg' };
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), n = 0;
html = html.replace(/assets\/[\w\/.-]+\.(webp|png|mp3)/g, (p, ext) => {
  const f = path.join(root, p);
  if (!fs.existsSync(f)) throw new Error('Datei fehlt: ' + p);
  n++; return 'data:' + MIME[ext] + ';base64,' + fs.readFileSync(f).toString('base64');
});
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/magus-single.html'), html);
console.log('dist/magus-single.html:', (html.length / 1048576).toFixed(2), 'MB,', n, 'Assets eingebettet');
