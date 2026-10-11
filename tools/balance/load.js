// Extrahiert Regelkern und KI aus index.html (nach .gen/) und lädt sie, damit die Simulation immer den aktuellen Spielstand testet.
const fs = require('fs'), path = require('path');
const gen = path.join(__dirname, '.gen');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const eng = scripts.find(s => s.includes('Regelkern (Teil 1)')), ai = scripts.find(s => s.includes('einfacher Computergegner'));
if (!eng || !ai) throw new Error('Regelkern oder KI in index.html nicht gefunden.');
fs.mkdirSync(gen, { recursive: true });
fs.writeFileSync(path.join(gen, 'engine.js'), eng);
fs.writeFileSync(path.join(gen, 'ai.js'), ai);
module.exports = { M: require('./.gen/engine.js'), AI: require('./.gen/ai.js') };
