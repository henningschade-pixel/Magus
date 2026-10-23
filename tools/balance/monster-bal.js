// Monster-Auswertung je Stufe (KI gegen KI): node tools/balance/monster-bal.js <Partien> ['<Regeln-JSON>'] ['<JS-Patch auf MONSTER>'] [seed0]
// Zeigt je Stufe und Monster: Angriffe je Partie, Sieg des Angreifers / Sieg des Monsters / ohne Sieger (Flucht, Erschöpfung, beide fallen) und mittlere Kampflänge.
const { M, AI } = require('./load.js');
const N = +process.argv[2] || 600, rules = JSON.parse(process.argv[3] || '{}'), patch = process.argv[4] || '', seed0 = +process.argv[5] || 3000;
if (patch) new Function('MONSTER', 'M', patch)(M.MONSTER, M);
const agg = {}, key = (st, el) => st + el;
let games = 0, over = 0, steps = [];
for (let g = 0; g < N; g++) {
  const s = M.newGame({ seed: seed0 + g, ai: [true, true], first: g & 1, rules });
  let n = 0, prev = null;
  while (!s.over && n < 20000) {
    const r = AI.runTurn(s, M.actor(s)); n++; if (!r.ok) break;
    const c = s.lastCombat;
    if (c && c !== prev) { prev = c; if (c.mode === 'monster') { const k = key(c.stage, c.elem), a = agg[k] || (agg[k] = { att: 0, win: 0, lose: 0, flee: 0, exh: 0, both: 0, turns: 0 }); a.att++; a.turns += c.turns || 0; if (c.winner === 'a') a.win++; else if (c.winner === 'b') a.lose++; else if (c.reason === 'flee') a.flee++; else if (c.reason === 'exhaustion') a.exh++; else a.both++; } }
  }
  games++; if (s.over) over++; steps.push(n);
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) : '-').padStart(3) + '%';
const names = { F: 'Feuer', E: 'Erde ', W: 'Wasser' };
for (const st of [1, 2, 3]) {
  const tot = { att: 0, win: 0, lose: 0, flee: 0, exh: 0, both: 0, turns: 0 };
  const parts = ['F', 'E', 'W'].map(el => { const a = agg[key(st, el)] || { att: 0, win: 0, lose: 0, flee: 0, exh: 0, both: 0, turns: 0 }; for (const k in tot) tot[k] += a[k]; return names[el].trim().slice(0, 3) + ' ' + pct(a.win, a.att) + '/' + pct(a.lose, a.att); });
  console.log('Stufe ' + 'I'.repeat(st).padEnd(3), 'Angriffe/Partie', (tot.att / games).toFixed(2), '| Sieg/Niederl.:', parts.join(' | '), '| gesamt Sieg', pct(tot.win, tot.att), 'Niederl.', pct(tot.lose, tot.att), 'Flucht', pct(tot.flee, tot.att), 'erschöpft', pct(tot.exh, tot.att), 'beide fallen', pct(tot.both, tot.att), '| Kampfzüge Ø', (tot.turns / Math.max(1, tot.att)).toFixed(1));
}
steps.sort((a, b) => a - b);
console.log('Partien', games, 'beendet', over, '| Aktionen Median', steps[steps.length >> 1], 'P90', steps[Math.floor(steps.length * .9)]);
