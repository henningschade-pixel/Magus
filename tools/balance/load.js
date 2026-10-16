// Lädt Regelkern und KI direkt aus index.html (ohne Zwischendateien, damit parallele Prozesse sich nicht in die Quere kommen).
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const eng = scripts.find(s => s.includes('Regelkern (Teil 1)')), ai = scripts.find(s => s.includes('einfacher Computergegner'));
if (!eng || !ai) throw new Error('Regelkern oder KI in index.html nicht gefunden.');
function run(src, req) { const m = { exports: {} }; new Function('module', 'exports', 'require', src)(m, m.exports, req); return m.exports; }
const M = run(eng, require), AI = run(ai, id => id === './engine.js' ? M : require(id));
module.exports = { M, AI };
