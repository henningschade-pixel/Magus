// Vergleicht die Länge der drei Abschnitte bei KI gegen KI: Aktionen je Abschnitt, aufgeteilt in Weltzüge, Monsterkämpfe und Showdown.
// Aufruf: node tools/balance/phasen.js [Partien=1000] [Regeln als JSON] [Ausgabe.json]
const { M, AI } = require('./load.js');
const N = +process.argv[2] || 1000, rules = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const origApply = M.apply, cur = { s: null, rec: null };
const WORLD = ['draw', 'vendor', 'temple', 'magic', 'spend', 'drawlimit', 'combat'];
M.apply = function (s, a) {
  const st = s.stage, ph = s.phase, mode = s.combat && s.combat.mode, wasTurnW = s.worldTurns;
  const r = origApply.apply(this, arguments);
  if (r && r.ok && cur.rec && !['mark', 'lock'].includes(a.type)) {
    const R = cur.rec[st - 1];
    if (ph === 'world') { R.world++; R.wtype[a.type] = (R.wtype[a.type] || 0) + 1; if (a.type === 'combat' && R.firstAtt < 0) R.firstAtt = R.world; }
    else if (ph === 'combat') { if (mode === 'showdown') R.sd++; else R.mon++; R.ctype[a.type] = (R.ctype[a.type] || 0) + 1; }
  }
  return r;
};
const blank = () => ({ world: 0, mon: 0, sd: 0, firstAtt: -1, wtype: {}, ctype: {}, att: 0, win: 0, lose: 0, flee: 0, none: 0, log: 0, logStart: 0 });
const games = [];
for (let g = 0; g < N; g++) {
  const first = g % 2, seed = 1000 + g, s = M.newGame({ seed, ai: [true, true], first, rules });
  cur.rec = [blank(), blank(), blank()]; let steps = 0, prevStage = 1; cur.rec[0].logStart = 0;
  while (!s.over && steps < 20000) {
    const r = AI.runTurn(s, M.actor(s)); steps++; if (!r.ok) break;
    if (s.stage !== prevStage && !s.over) { cur.rec[prevStage - 1].log = s.log.length - cur.rec[prevStage - 1].logStart; cur.rec[s.stage - 1].logStart = s.log.length; prevStage = s.stage; }
  }
  cur.rec[prevStage - 1].log = s.log.length - cur.rec[prevStage - 1].logStart;
  // Monsterkämpfe je Abschnitt aus dem Protokoll zählen
  let stage = 1, lastAtk = false;
  s.log.forEach(l => { const t = l.txt, m = /^Abschnitt (\d):/.exec(t); if (m) stage = +m[1]; const R = cur.rec[stage - 1];
    if (/ greift .+ an\./.test(t) && !/Showdown/.test(t)) { R.att++; lastAtk = true; }
    if (lastAtk && / besiegt .+/.test(t)) { R.win++; lastAtk = false; } else if (lastAtk && / gewinnt den Kampf\./.test(t)) { R.lose++; lastAtk = false; } else if (lastAtk && /Kein Sieger/.test(t)) { R.none++; lastAtk = false; } });
  if (s.over && s.showdown >= 3) games.push({ seed, first, rec: cur.rec, over: true, steps });
}
const sum = (a, f) => a.reduce((x, y) => x + f(y), 0), mean = (a, f) => sum(a, f) / a.length;
const sd = (a, f) => { const m = mean(a, f); return Math.sqrt(mean(a, x => (f(x) - m) ** 2)); };
const q = (a, f, p) => { const v = a.map(f).sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };
const tot = R => R.world + R.mon + R.sd;
const metrics = { 'Aktionen gesamt': tot, 'Weltzüge': R => R.world, 'Kampfaktionen Monster': R => R.mon, 'Kampfaktionen Showdown': R => R.sd, 'Protokollzeilen': R => R.log, 'Monsterangriffe': R => R.att, '  davon Spieler gewinnt': R => R.win, '  davon Niederlage': R => R.lose, '  davon ohne Sieger/Flucht': R => R.none, 'Weltzüge bis 1. Angriff': R => R.firstAtt < 0 ? R.world : R.firstAtt };
console.log('Partien bis zum Ende:', games.length, 'von', N);
console.log('Kennzahl'.padEnd(28), ['Abschnitt 1', 'Abschnitt 2', 'Abschnitt 3'].map(x => x.padStart(22)).join(''));
console.log(''.padEnd(28), ['Mittel±SD  (P10|Med|P90)', '', ''].map((x, i) => (i ? '' : x).padStart(22)).join(''));
for (const [name, f] of Object.entries(metrics)) console.log(name.padEnd(28), [0, 1, 2].map(i => { const a = games.map(g => g.rec[i]); return (mean(a, f).toFixed(1) + '±' + sd(a, f).toFixed(1) + ' (' + q(a, f, .1) + '|' + q(a, f, .5) + '|' + q(a, f, .9) + ')').padStart(22); }).join(''));
const ratio = games.map(g => { const t = g.rec.map(tot); return Math.max(...t) / Math.min(...t); });
console.log('\nVerhältnis längster/kürzester Abschnitt je Partie: Mittel', mean(ratio, x => x).toFixed(2), 'Median', q(ratio, x => x, .5).toFixed(2), 'P90', q(ratio, x => x, .9).toFixed(2));
const share = [0, 1, 2].map(i => mean(games, g => tot(g.rec[i]) / sum(g.rec, tot)) * 100);
console.log('Anteil an der Partie (Aktionen):', share.map(x => x.toFixed(1) + '%').join(' | '));
console.log('\nWeltaktionen je Abschnitt (Mittel pro Partie):');
const types = [...new Set(games.flatMap(g => g.rec.flatMap(R => Object.keys(R.wtype))))];
types.forEach(t => console.log(' ', t.padEnd(10), [0, 1, 2].map(i => mean(games, g => g.rec[i].wtype[t] || 0).toFixed(2).padStart(8)).join('')));
console.log('Kampfaktionen je Abschnitt (Mittel pro Partie):');
const ct = [...new Set(games.flatMap(g => g.rec.flatMap(R => Object.keys(R.ctype))))];
ct.forEach(t => console.log(' ', t.padEnd(10), [0, 1, 2].map(i => mean(games, g => g.rec[i].ctype[t] || 0).toFixed(2).padStart(8)).join('')));
require('fs').writeFileSync(process.argv[4] || '/dev/null', JSON.stringify(games.map(g => ({ seed: g.seed, first: g.first, rec: g.rec }))));
