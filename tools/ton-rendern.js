#!/usr/bin/env node
// Rendert ein Rezept aus der Ton-Werkstatt zu einer mp3 (mittlerer Pegel -20 dB, Spitze höchstens -1 dB).
// Aufruf: NODE_PATH=$(npm root -g) node tools/ton-rendern.js <rezept.json> <ziel.mp3> [regler-json]
// <rezept.json> ist entweder das Rezept selbst oder die Exportdatei der Werkstatt ({ rezept, regler }).
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
(async () => {
  const [src, dst, modArg] = process.argv.slice(2);
  if (!src || !dst) { console.error('Aufruf: node tools/ton-rendern.js <rezept.json> <ziel.mp3> [regler-json]'); process.exit(1); }
  const j = JSON.parse(fs.readFileSync(src, 'utf8')), recipe = j.rezept || j, mod = modArg ? JSON.parse(modArg) : (j.regler || {});
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../werkstatt/ton-werkstatt.html'));
  const pcm = await p.evaluate(async ([r, m]) => { const buf = await TonEngine.renderRecipe(r, m, true); return Array.from(new Int16Array(Array.from(buf.getChannelData(0), v => Math.max(-1, Math.min(1, v)) * 32767 | 0))); }, [recipe, mod]);
  await b.close();
  const raw = Buffer.from(new Int16Array(pcm).buffer);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 's16le', '-ar', '44100', '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-q:a', '5', dst], { input: raw });
  console.log(dst + ': ' + (raw.length / 2 / 44100).toFixed(2) + ' s');
})();
