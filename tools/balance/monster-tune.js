// Monster-Abstimmung: Werte je Stufe frei setzen und im KI-Selbstspiel messen.
//   node tools/balance/monster-tune.js <Partien> '<Spezifikation als JSON-Liste>'
// Spezifikation je Eintrag: { "s1": [hp, mana, limit], "s2": [hp, mana, limit], "s3": [hp, mana, limit] } (Stufe-Endwerte der Grundform; Teilangaben lassen den Rest beim Standard).
// Die Varianten (Mana −1 / +1 bzw. Stufe I Mana +1) bleiben wie im Spiel. Ausgabe je Eintrag und Stufe: Sieg / Niederlage / Flucht des Angreifers.
const { fork } = require('child_process');
if (process.argv[2] === '__w') {
  const { M, AI } = require('./load.js');
  process.on('message', ({ id, N, spec, seed0, rules }) => {
    const MON = M.MONSTER, rep = (n, f) => Array(Math.max(0, n)).fill(f);
    MON.startLimit = 2;
    const a = spec.s1, b = spec.s2, c = spec.s3;
    if (spec.up) MON.upgrades = { F: spec.up[0], E: spec.up[1], W: spec.up[2] };   // Karten des Stufe-I-Startdecks, die auf Stufe 2 gehoben werden
    const cur = { hp: 3, mana: 4, lim: 2 };   // Ausgangswerte: Monster ohne Tempel-Schritte
    const L1 = a ? [...rep(a[2] - 2, 'limit'), ...rep(a[0] - 3, 'hp'), ...rep(a[1] - 4, 'mana')] : [];
    if (a) { MON.stage1Temple = { F: [], E: [], W: [] }; MON.variants.temple1 = { F: [L1, [...L1, 'mana']], E: [L1, [...L1, 'mana']], W: [L1, [...L1, 'mana']] }; }
    if (b) {
      const base = [...rep(b[2] - 2, 'limit'), ...rep(b[0] - 3, 'hp'), ...rep(b[1] - 4, 'mana')], lo = base.slice(0, base.lastIndexOf('mana') >= 0 ? base.lastIndexOf('mana') : base.length), hi = [...base, 'mana'];
      for (const e of ['F', 'E', 'W']) { MON.temple[2][e] = base; MON.variants.temple[2][e] = [base, lo, hi]; }
    }
    if (c) {
      const p = b || [8, 5, 2];
      const base = [...rep(c[2] - p[2], 'limit'), ...rep(c[0] - p[0], 'hp'), ...rep(c[1] - p[1], 'mana')], lo = base.slice(0, base.lastIndexOf('mana') >= 0 ? base.lastIndexOf('mana') : base.length), hi = [...base, 'mana'];
      for (const e of ['F', 'E', 'W']) { MON.temple[3][e] = base; MON.variants.temple[3][e] = [base, lo, hi]; }
    }
    const agg = {};
    for (let g = 0; g < N; g++) {
      const s = M.newGame({ seed: seed0 + g, ai: [true, true], first: g & 1, rules });
      let n = 0, prev = null;
      while (!s.over && n < 20000) {
        const r = AI.runTurn(s, M.actor(s)); n++; if (!r.ok) break;
        const lc = s.lastCombat;
        if (lc && lc !== prev) { prev = lc; if (lc.mode === 'monster') { const A = agg[lc.stage] || (agg[lc.stage] = { att: 0, win: 0, lose: 0, flee: 0, fa: 0, turns: 0 }); A.att++; A.turns += lc.turns || 0; if (lc.winner === 'a') A.win++; else if (lc.winner === 'b') A.lose++; else { A.flee++; if (lc.fled === 'a') A.fa++; } } }
      }
      agg.games = (agg.games || 0) + 1; agg.steps = (agg.steps || 0) + n; agg.sd = (agg.sd || 0) + (s.showdown || 0);
    }
    process.send({ id, agg });
  });
} else {
  const N = +process.argv[2] || 400, specs = JSON.parse(process.argv[3] || '[{}]'), seed0 = +process.argv[4] || 3000;
  const W = [0, 1, 2, 3].map(() => fork(__filename, ['__w'])), q = specs.map((spec, id) => ({ id, spec })), out = [];
  let done = 0;
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0).toString().padStart(3);
  const feed = w => { const j = q.shift(); if (j) w.send({ id: j.id, N, spec: j.spec, seed0, rules: {} }); };
  W.forEach(w => { w.on('message', ({ id, agg }) => {
    const row = [1, 2, 3].map(st => { const a = agg[st] || { att: 0, win: 0, lose: 0, flee: 0, fa: 0, turns: 0 }; return 'S' + st + ' ' + (a.att / agg.games).toFixed(1).padStart(4) + 'x ' + pct(a.win, a.att) + '/' + pct(a.lose, a.att) + '/' + pct(a.flee - a.fa, a.att) + '+' + pct(a.fa, a.att) + ' z' + (a.turns / Math.max(1, a.att)).toFixed(0).padStart(2); });
    out[id] = JSON.stringify(specs[id]).padEnd(58) + row.join(' | ') + ' | Akt ' + Math.round(agg.steps / agg.games);
    if (++done === specs.length) { console.log('Format je Stufe: Angriffe je Partie, Sieg/Niederlage/Flucht des Monsterführers+Flucht des Angreifers in %, z = Kampfzüge\n' + out.join('\n')); W.forEach(x => x.kill()); process.exit(0); }
    feed(w); }); feed(w); });
}
