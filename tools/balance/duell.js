// Vorausschau gegen Basis-KI (oder zwei Einstellungen gegeneinander): node tools/balance/duell.js <Partien> ['<Params A>'] ['<Params B>'] ['<Regeln>'] [Seed]
// Beispiel: node tools/balance/duell.js 96 '{"sim":120}' '{"sim":0}'   (A plant voraus, B ist die Basis-KI; Plätze und Beginner wechseln, gleiche Seeds)
// Ausgabe: Siegquote von A (Remis halb), dazu Kennzahlen der Kämpfe je Seite.
const { M, AI } = require('./load.js');
const N = +process.argv[2] || 40, pa = JSON.parse(process.argv[3] || '{"sim":120}'), pb = JSON.parse(process.argv[4] || '{"sim":0}'), rules = JSON.parse(process.argv[5] || '{}'), seed0 = +process.argv[6] || 9000;
let w = 0, l = 0, d = 0; const st = { A: { mw: 0, ml: 0, sw: 0, combo: 0, ulti: 0 }, B: { mw: 0, ml: 0, sw: 0, combo: 0, ulti: 0 } }, t0 = Date.now();
for (let g = 0; g < N; g++) {
  const seed = seed0 + (g >> 2), first = g & 1, seatA = (g >> 1) & 1;
  const s = M.newGame({ seed, ai: [true, true], first, rules });
  AI.setParams(seatA, pa); AI.setParams(1 - seatA, pb);
  let steps = 0, ln = 0;
  while (!s.over && steps < 20000) {
    const pid = M.actor(s), r = AI.runTurn(s, pid); steps++; if (!r.ok) break;
    for (; ln < s.log.length; ln++) { const e = s.log[ln], k = e.pid === seatA ? 'A' : 'B'; if (e.pid !== null && /Ultimate \d/.test(e.txt)) st[k].ulti++; else if (e.pid !== null && /(Falle|Schild|Hellsicht|Lähmung|Heilung|Läuterung) \d/.test(e.txt)) st[k].combo++; }
  }
  for (const h of s.hist) if (h.ev && h.ev.type === 'showdown' && h.ev.winner !== null) st[h.ev.winner === seatA ? 'A' : 'B'].sw++;
  AI.setParams(0, null); AI.setParams(1, null);
  if (!s.over || s.winner === null) d++; else if (s.winner === seatA) w++; else l++;
}
const share = (w + 0.5 * d) / N;
console.log('A gegen B: ' + (100 * share).toFixed(1) + ' % (±' + (196 * Math.sqrt(0.25 / N)).toFixed(1) + ') Siege ' + w + ' Niederlagen ' + l + ' Remis ' + d + ' · Showdown-Siege A ' + st.A.sw + ' B ' + st.B.sw + ' · Kombos A ' + st.A.combo + ' B ' + st.B.combo + ' · Ultimates A ' + st.A.ulti + ' B ' + st.B.ulti + ' · ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
