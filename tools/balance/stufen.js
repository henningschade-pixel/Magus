// Stufen-Messung: Sind die Monster einer Stufe zu Beginn kaum, mit den Mitteln der Stufe (Gold, Tempel, Magie, Bibliothek) aber gut zu besiegen?
// Und was bringt jedes einzelne Upgrade? Beide Seiten spielen mit der Vorausschau (sim), die Vorauswahl mit der schnellen Basis-KI.
//
//   node tools/balance/stufen.js bauten <Stufe> <eingang.json|start> <Gold> [aus.json] [Regeln]
//       zählt alle Verwendungen des Golds ab dem Eingangsbau auf (Ausbauten, Tempel, Magie), dazu 0/3/6 Bibliothekszüge,
//       und misst jeden Bau gegen die Monster der Stufe. Umgebungsvariablen: N1 (Kämpfe Vorauswahl, 300), TOP (24), N2 (Kämpfe Endmessung, 120), SIM (60).
//   node tools/balance/stufen.js nutzen <Stufe> <referenz.json|start> [Regeln]
//       Grenznutzen: Referenzbau plus je ein Upgrade, gemessen im Monsterkampf und im Showdown gegen den Referenzbau. Umgebungsvariablen: N (100), SIM (60).
//
// Regeln (JSON): hpPerPoint, priceRise, startHp, startLimit, limitCost wie im Spiel; zusätzlich cost: { hp, mana, limit, slot } als Grundpreise in Gold (nur für die Aufzählung der Bauten).
// Ein Bau aus aus.json (Feld pick oder builds) lässt sich als Eingangs- bzw. Referenzbau der nächsten Stufe speichern.
const fs = require('fs');
const L = require('./stufen-lib.js'), run = require('./stufen-run.js');
const pct = (a, b) => (b ? 100 * a / b : 0).toFixed(0).padStart(3);
const load = (f, rules) => (f === 'start' || !f ? L.baseBuild(rules) : JSON.parse(fs.readFileSync(f, 'utf8')));

// Alle Verwendungen von ‚gold‘ ab dem Bau ‚entry‘: Gold-Ausbauten in jeder Kombination, 0 bis alles übrige Gold auf einmal in den Tempel, jede Folge von Magiekäufen.
// Farben: Feuer ist immer eine der stärksten Magien (die übrigen Fälle sind Drehungen davon).
function allocations(entry, gold) {
  const out = [], seen = new Set(), KS = ['hp', 'mana', 'limit', 'slot'];
  const start = L.clone(entry); start.gold += gold;
  const magics = (b, path) => {
    const go = (c, p, minIdx) => {
      let any = false;
      L.EL.forEach((e, idx) => { if (idx < minIdx) return; const d = L.clone(c); if (L.magic(d, e)) { any = true; go(d, p + ' ' + e + d.mag[e], idx); } });
      if (!any && c.mag.F >= c.mag.E && c.mag.F >= c.mag.W) {
        const key = JSON.stringify([c.hp, c.mana, c.limit, c.slots, c.mag, c.gold, c.up]);
        if (!seen.has(key)) { seen.add(key); c.path = p.trim() || '(nichts)'; out.push(c); }
      }
    };
    go(b, path, 0);
  };
  const rec = (b, i, path) => {
    if (i === KS.length) { for (let t = 0; t <= b.gold; t++) { const c = L.clone(b); if (t) L.sacrifice(c, t); magics(c, path + (t ? ' Tempel' + t : '')); } return; }
    rec(b, i + 1, path);
    const c = L.clone(b); let p = path;
    while (L.buy(c, KS[i])) { p += ' ' + KS[i]; rec(L.clone(c), i + 1, p); }
  };
  rec(start, 0, '');
  return out;
}

async function bauten(stage, entryF, gold, outF, rules) {
  const N1 = +process.env.N1 || 300, top = +process.env.TOP || 24, N2 = process.env.N2 === undefined ? 120 : +process.env.N2, sim = +process.env.SIM || 60, libs = [0, 3, 6];
  const entry = load(entryF, rules), builds = [];
  for (const a of allocations(entry, gold)) {
    const hasMag = Object.values(a.mag).some(v => v > 1);
    for (const k of libs) for (const keep of [0, 2]) {
      if ((!hasMag || k === 0) && (k > 0 || keep > 0)) continue;   // ohne Magie über 1 bringt die Bibliothek nichts
      const b = L.clone(a), done = k ? L.library(b, k, keep) : 0;
      if (k && done < k && libs.some(x => x < k && x >= done)) continue;   // schon von der kleineren Zahl abgedeckt
      b.path = a.path + (k ? ' | Bib ' + done + (keep ? ' (je 2 behalten)' : '') : ''); builds.push(b);
    }
  }
  const show = (b, r) => pct(r.win, r.n) + '% Sieg | Monster F/E/W ' + L.EL.map(e => (r.byEl[e] ? pct(r.byEl[e].win, r.byEl[e].n) : '  -')).join('/') + ' | ' + b.path.padEnd(46) + ' ' + L.label(b);
  console.log(builds.length + ' Bauten gegen die Monster der Stufe ' + stage);
  const r1 = await run(builds.map(b => ({ kind: 'monster', a: b, stage, N: N1, sim: 0, rules })));
  builds.forEach((b, i) => { b.r1 = r1[i]; });
  const order = builds.slice().sort((x, y) => y.r1.win / y.r1.n - x.r1.win / x.r1.n);
  console.log('--- Vorauswahl (Basis-KI, ' + N1 + ' Kämpfe je Bau) ---'); order.slice(0, 40).forEach(b => console.log(show(b, b.r1)));
  const pick = order.slice(0, top);
  if (N2 > 0) {
    const r2 = await run(pick.map(b => ({ kind: 'monster', a: b, stage, N: N2, sim, rules })));
    pick.forEach((b, i) => { b.r2 = r2[i]; });
    pick.sort((x, y) => y.r2.win / y.r2.n - x.r2.win / x.r2.n);
    console.log('--- Endmessung (Vorausschau sim ' + sim + ', ' + N2 + ' Kämpfe je Bau, ±' + (196 * Math.sqrt(0.25 / N2)).toFixed(0) + ') ---'); pick.forEach(b => console.log(show(b, b.r2)));
  }
  if (outF) fs.writeFileSync(outF, JSON.stringify({ builds: order, pick }, null, 1));
}

async function nutzen(stage, refF, rules) {
  const N = +process.env.N || 100, sim = +process.env.SIM || 60, ref = load(refF, rules);
  const V = [['Referenz', () => {}], ['+1 HP', b => { b.hp += 1; }], ['+2 HP', b => { b.hp += 2; }], ['+3 HP', b => { b.hp += 3; }], ['+1 Mana', b => { b.mana += 1; }], ['+2 Mana', b => { b.mana += 2; }]];
  if (ref.limit < L.M.MAX_LIMIT) V.push(['+1 Limit', b => { b.limit += 1; }]);
  if (ref.slots < L.M.MAX_SLOTS) V.push(['+1 Hand', b => { b.slots += 1; }]);
  if (ref.slots < L.M.MAX_SLOTS - 1) V.push(['+2 Hand', b => { b.slots += 2; }]);
  V.push(['+2 Bibliothek', b => { L.library(b, 2, 0); }]);
  const top = L.EL.slice().sort((x, y) => ref.mag[y] - ref.mag[x]);
  if (ref.mag[top[0]] < L.M.MAX_MAGIC) V.push(['+1 Magie ' + top[0] + ' und 2 Bibliothek', b => { b.mag[top[0]]++; L.library(b, 2, 0); }]);
  if (ref.mag[top[1]] < L.M.MAX_MAGIC) V.push(['+1 Magie ' + top[1] + ' und 2 Bibliothek', b => { b.mag[top[1]]++; L.library(b, 2, 2); }]);
  const builds = V.map(([name, f]) => { const b = L.clone(ref); f(b); b.name = name; return b; }), jobs = [];
  builds.forEach(b => jobs.push({ kind: 'monster', a: b, stage, N, sim, rules }));
  builds.forEach(b => jobs.push({ kind: 'showdown', a: b, b: ref, N, sim, rules }));
  const r = await run(jobs), n = builds.length;
  console.log('Referenz: ' + L.label(ref) + '   (Stufe ' + stage + ', ' + N + ' Kämpfe, sim ' + sim + ', ±' + (196 * Math.sqrt(0.25 / N)).toFixed(0) + ')');
  console.log('Variante'.padEnd(34) + 'Monster Sieg   Showdown gegen Referenz (Sieg / Niederlage)');
  builds.forEach((b, i) => { const m = r[i], s = r[n + i]; console.log(b.name.padEnd(34) + pct(m.win, m.n) + '%          ' + pct(s.win, s.n) + '% / ' + pct(s.lose, s.n) + '%   ' + L.label(b)); });
}

const [cmd, a1, a2, a3, a4, a5] = process.argv.slice(2);
if (cmd === 'bauten') bauten(+a1, a2, +a3, a4 && a4 !== '-' ? a4 : null, a5 ? JSON.parse(a5) : {});
else if (cmd === 'nutzen') nutzen(+a1, a2, a3 ? JSON.parse(a3) : {});
else if (require.main === module) console.log('Aufruf: node tools/balance/stufen.js bauten <Stufe> <eingang.json|start> <Gold> [aus.json] [Regeln]  |  nutzen <Stufe> <referenz.json|start> [Regeln]');
module.exports = { allocations };
