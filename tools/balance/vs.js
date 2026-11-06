// Vergleich zweier KI-Fassungen (auch aus verschiedenen index.html): node tools/balance/vs.js <Partien> <alte index.html> ['<Params neu>'] ['<Params alt>'] ['<Regeln>']
// Beide KIs spielen auf derselben (aktuellen) Engine; Plätze und Beginner wechseln, gleiche Seeds. Ausgabe: Siegquote der neuen KI (Remis halb).
const fs = require('fs');
const { M, AI } = require('./load.js');
function loadAi(file) {
  const html = fs.readFileSync(file, 'utf8'), scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const src = scripts.find(s => s.includes('einfacher Computergegner')), m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, id => id === './engine.js' ? M : require(id));
  return m.exports;
}
function vs(N, A, B, pa, pb, rules, seed0) {
  seed0 = seed0 || 7000; let w = 0, l = 0, d = 0;
  for (let g = 0; g < N; g++) {
    const seed = seed0 + (g >> 2), first = g & 1, seatA = (g >> 1) & 1;
    const s = M.newGame({ seed, ai: [true, true], first, rules });
    A.setParams(seatA, pa); B.setParams(1 - seatA, pb);
    let steps = 0;
    while (!s.over && steps < 20000) { const pid = M.actor(s); const r = (pid === seatA ? A : B).runTurn(s, pid); steps++; if (!r.ok) break; }
    A.setParams(seatA, null); B.setParams(1 - seatA, null);
    if (!s.over || s.winner === null) d++; else if (s.winner === seatA) w++; else l++;
  }
  return { N, w, l, d, share: (w + 0.5 * d) / N, se: Math.sqrt(0.25 / N) };
}
module.exports = { vs, loadAi };
if (require.main === module) {
  const N = +process.argv[2] || 400, old = loadAi(process.argv[3]), pa = JSON.parse(process.argv[4] || '{}'), pb = JSON.parse(process.argv[5] || '{}'), rules = JSON.parse(process.argv[6] || '{}');
  const t = Date.now(), r = vs(N, AI, old, pa, pb, rules);
  console.log('neu gegen alt: ' + (100 * r.share).toFixed(1) + ' % (±' + (196 * r.se).toFixed(1) + ') Siege ' + r.w + ' Niederlagen ' + r.l + ' Remis ' + r.d + ' · ' + ((Date.now() - t) / 1000).toFixed(0) + ' s');
}
