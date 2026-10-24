// Würfel-Auswertung (seit 0.4): Wie stark verschiebt jede Würfelseite den Ausgang der Monsterkämpfe?
// node tools/balance/monster-dice.js <Partien> [Stufen z. B. 1,2,3] [Seiten z. B. hp,mana] ['<n-Überschreibung als JSON: {"hp":[1,2,3]}>'] [seed0]
// Je Seite und Vorzeichen tragen alle Monster genau diese Seite (der andere Würfel ist neutral); die Deckform (spitz/breit) bleibt gewürfelt.
// Ausgabe je Stufe: Stärke des Monsters = Niederlagen minus Siege des Angreifers in Prozentpunkten (je Angriff); in Klammern die Verschiebung gegen die Basis (beide Würfel neutral).
// Eine Seite ist ausgewogen, wenn Plus und Minus die Basis etwa gleich weit nach oben und unten verschieben; Plus und Minus verschiedener Seiten sollten sich ebenfalls ausgleichen.
const { M, AI } = require('./load.js');
const N = +process.argv[2] || 300, stages = (process.argv[3] || '1,2,3').split(',').map(Number), kinds = (process.argv[4] || 'hp,mana,both,cards,hand,regen').split(','), over = JSON.parse(process.argv[5] || '{}'), seed0 = +process.argv[6] || 5000;
const D = M.MONSTER.variants.dice, zero = { k: 'hp', n: [0, 0, 0] };
function measure(plus, minus) {
  D.plus.fill(plus); D.minus.fill(minus);
  const agg = { 1: { att: 0, win: 0, lose: 0 }, 2: { att: 0, win: 0, lose: 0 }, 3: { att: 0, win: 0, lose: 0 } };
  for (let g = 0; g < N; g++) {
    const s = M.newGame({ seed: seed0 + g, ai: [true, true], first: g & 1 });
    let n = 0, prev = null;
    while (!s.over && n < 20000) {
      const r = AI.runTurn(s, M.actor(s)); n++; if (!r.ok) break;
      const c = s.lastCombat;
      if (c && c !== prev) { prev = c; if (c.mode === 'monster') { const a = agg[c.stage]; a.att++; if (c.winner === 'a') a.win++; else if (c.winner === 'b') a.lose++; } }
    }
  }
  return agg;
}
const pct = (a, b) => b ? (100 * a / b).toFixed(0).padStart(3) : '  -';
const orig = { plus: JSON.parse(JSON.stringify(D.plus)), minus: JSON.parse(JSON.stringify(D.minus)) };
const nOf = (k, die) => over[k] || orig[die].find(f => f.k === k).n;
const base = measure(zero, zero);
const sc = (a, st) => 100 * (a[st].lose - a[st].win) / Math.max(1, a[st].att);
console.log('Basis (Niederl. − Siege)', stages.map(st => 'Stufe ' + st + ': ' + sc(base, st).toFixed(0).padStart(4) + ' (Niederl. ' + pct(base[st].lose, base[st].att) + ', Sieg ' + pct(base[st].win, base[st].att) + ', Angriffe ' + base[st].att + ')').join(' | '));
// SCAN=1: jede Seite mit Ausschlag 1, 2 und 3 für alle Stufen (zum Eichen der Ausschläge je Stufe)
const runs = []; for (const k of kinds) { if (process.env.SCAN) [1, 2, 3].forEach(n => runs.push([k, [n, n, n]])); else runs.push([k, nOf(k, 'plus'), nOf(k, 'minus')]); }
for (const [k, n, nm] of runs) {
  const pl = measure({ k, n }, zero), mi = measure(zero, { k, n: nm || n });
  console.log(k.padEnd(6), 'n+=' + JSON.stringify(n).padEnd(8), 'n−=' + JSON.stringify(nm || n).padEnd(8), stages.map(st => {
    const d = a => sc(a, st) - sc(base, st), f = x => (x >= 0 ? '+' : '') + x.toFixed(0);
    return 'St' + st + '  plus ' + f(d(pl)).padStart(4) + '  minus ' + f(d(mi)).padStart(4) + '  Summe ' + f(d(pl) + d(mi)).padStart(4);
  }).join(' | '));
}
