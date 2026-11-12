const test = require('node:test'), assert = require('node:assert/strict');
const { M, AI, cards, STATS, combatSetup } = require('./helpers.js');

test('Kartenkosten: jede gespielte Karte kostet 1 Mana, überlegene Verteidigung ist gratis', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), st = STATS();
  assert.equal(M.evalAttack(st, cards(['F3', 'E2'])).cost, 2);        // Primärkarte + Kombokarte
  assert.equal(M.evalAttack(st, cards(['F1', 'F1', 'E1'])).cost, 3);
  assert.equal(M.evalDefense(st, cards(['W2']), 'F').cost, 0);          // Wasser ist gegen Feuer überlegen
  assert.equal(M.evalDefense(st, cards(['W2', 'F1']), 'F').cost, 1);    // Kombokarte kostet 1
  assert.equal(M.evalDefense(st, cards(['F2']), 'F').cost, 1);          // Verteidigung in der Angriffsfarbe
});

test('Erholen und Regeneration wachsen mit dem Abschnitt (1/2/3)', () => {
  const rules = M.newGame({ seed: 1, ai: [false, false] }).rules;
  assert.deepEqual([1, 2, 3].map(g => M.recoverGain({ rules, stage: g })), [1, 2, 3]);
  assert.deepEqual([1, 2, 3].map(g => M.regenGain({ rules, stage: g })), [1, 2, 3]);
});

test('Lähmung legt 2·S Fluchkarten auf den Ablagestapel des Gegners', () => {
  for (const [hand, expect] of [[['E1', 'F1'], 2], [['E2', 'F2'], 4], [['E3', 'F3'], 6]]) {
    const { s, c, me, op } = combatSetup(11, hand);
    hand.forEach((_, i) => assert.ok(M.apply(s, { pid: 0, type: 'mark', slot: i }).ok));
    const curses = () => op.deck.discard.filter(x => x.id[0] === 'C').length, n0 = curses();
    assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.equal(curses() - n0, expect, hand.join('+'));
  }
});

test('Läuterung zerstört gegnerische Nachziehtokens, ohne sie gutzuschreiben', () => {
  const { s, me, op } = combatSetup(11, ['F1', 'E1']);
  op.stats.freeDraws = 3; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['ot'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(op.stats.freeDraws, 2);
  assert.equal(me.stats.freeDraws, 0);
});

test('Läuterung entfernt auch eigene Manamarker und gibt dafür ein Nachziehtoken', () => {
  const { s, me } = combatSetup(11, ['F1', 'E1']);
  me.stats.manaflow = 3; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['sm'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.manaflow, 2);
  assert.equal(me.stats.freeDraws, 1);
});

test('Ultimate in der Verteidigung: alle drei Farben erlaubt, mit Feuer als zweiter Karte Todesfluch für den Angreifer', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  op.stats.limit = 3; op.stats.mana = 9;
  op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: ['F3', 'W2', 'E2'][i] || x.id }); });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  [1, 0, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));   // erste Karte W2 verteidigt, zweite Karte F3: Feuer-Ultimate (seit 0.11.0.9 entscheidet die Sekundärfarbe, die zweite Farbe)
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
  assert.ok(me.stats.death >= 1, 'Angreifer trägt einen Todesmarker');
  assert.equal(me.stats.deathPhase, undefined, 'Der frisch gesprochene Fluch hat in dieser Phase nicht getickt (Marker verbraucht)');
});

// Schild: Verteidiger op mit lvl Ladungen, Angreifer me schlägt mit F2 zu; def = Verteidigungskarte (oder null = Passen)
function schildFall(lvl, def, att) {
  const { s, me, op } = combatSetup(11, [att || 'F2']);
  op.stats.mag = { F: 3, E: 3, W: 3 }; op.stats.limit = 3; op.stats.mana = 9; op.stats.hp = op.stats.maxHp = 9; me.stats.hp = me.stats.maxHp = 9;
  if (lvl) op.stats.rainbow = lvl;
  if (def) op.deck.hand[0] = Object.assign({}, op.deck.hand[0], { id: def });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  if (def) { assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: 0 }).ok); assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok); }
  else assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  return { me, op };
}
test('Schild mindert nichts, wenn genau so viel verteidigt wurde wie nötig', () => {
  const { me, op } = schildFall(2, 'W2');                               // Block 2 = Schaden 2
  assert.equal(me.stats.hp, 9); assert.equal(op.stats.hp, 9); assert.equal(op.stats.rainbow, 2);
});
test('Schild mindert den nicht geblockten Schaden und verliert dafür je eine Ladung', () => {
  const { me, op } = schildFall(2, 'W1');                               // Block 1 von 2: das Schild mindert 1
  assert.equal(me.stats.hp, 9); assert.equal(op.stats.hp, 9); assert.equal(op.stats.rainbow, 1);
});
test('Schild mindert höchstens seine Ladungen, der Rest geht auf die HP (auch beim Passen)', () => {
  let r = schildFall(3, null);                                          // Schaden 2, 3 Ladungen: alles gemindert
  assert.equal(r.op.stats.hp, 9); assert.equal(r.op.stats.rainbow, 1); assert.equal(r.op.stats.mana, 9, 'Passen in der Verteidigung gibt kein Mana');
  r = schildFall(1, null);                                              // 1 Ladung: 1 gemindert, 1 geht durch
  assert.equal(r.op.stats.hp, 8); assert.equal(r.op.stats.rainbow || 0, 0);
});
test('Schild wirkt gegen jede Farbe und wirft nichts zurück', () => {
  for (const att of ['F2', 'E2', 'W2']) {
    const { me, op } = schildFall(2, null, att);
    assert.equal(op.stats.hp, 9, att); assert.equal(op.stats.rainbow || 0, 0, att); assert.equal(me.stats.hp, 9, att + ': kein Rückwurf');
  }
});
test('Stapeln (0.12.1.1): Ein neues Schild addiert seine Ladungen zu den liegenden, ohne Obergrenze', () => {
  for (const [have, add] of [[1, 2], [3, 2], [5, 1]]) {
    const { s, me } = combatSetup(11, ['E2', 'W2']);
    me.stats.rainbow = have;
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
    assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.equal(me.stats.rainbow, have + (add === 1 ? 2 : add), 'Schild-Stufe 2 addiert sich zu ' + have);
  }
});
test('Stapeln (0.12.1.1): Ultimates addieren Heil-, Mana- und Todesmarker zu den liegenden, ohne Obergrenze', () => {
  let t = combatSetup(11, ['F2', 'E2', 'W2']); t.me.stats.heal = 2;   // Sekundärfarbe Erde: Meditation
  [0, 1, 2].forEach(i => M.apply(t.s, { pid: 0, type: 'mark', slot: i })); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.equal(t.me.stats.heal, 4, 'Heilmarker: 2 + 2');
  t = combatSetup(11, ['F2', 'W2', 'E2']); t.me.stats.manaflow = 3;
  [0, 1, 2].forEach(i => M.apply(t.s, { pid: 0, type: 'mark', slot: i })); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.equal(t.me.stats.manaflow, 5, 'Manamarker: 3 + 2');
  t = combatSetup(11, ['W2', 'F2', 'E2']); t.op.stats.death = 3;
  [0, 1, 2].forEach(i => M.apply(t.s, { pid: 0, type: 'mark', slot: i })); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.equal(t.op.stats.death, 5, 'Todesmarker des Gegners: 3 + 2');
});
test('Stapeln (0.12.1.1): Mehrere Fallen liegen nebeneinander, bei Schaden werden alle aufgedeckt und ihre Rückwürfe addieren sich (zusammen höchstens der eingehende Schaden)', () => {
  const run = (traps, att) => {
    const { s, me, op } = combatSetup(11, [att]);
    op.stats.hp = op.stats.maxHp = 9; me.stats.hp = me.stats.maxHp = 9;
    op.stats.traps = traps.map((t, i) => ({ card: { id: t[0] + '1', uid: 9001 + i }, el: t[0], tier: 1, lvl: t[1] }));
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    return { me, op, s };
  };
  let r = run([['F', 1], ['F', 1]], 'F3'); assert.equal(r.me.stats.hp, 7, 'zwei Rückwürfe à 1'); assert.equal(r.op.stats.traps, undefined);
  assert.ok(r.op.deck.discard.some(x => x.uid === 9001) && r.op.deck.discard.some(x => x.uid === 9002), 'beide Karten abgelegt');
  r = run([['F', 2], ['F', 2]], 'F3'); assert.equal(r.me.stats.hp, 6, 'zusammen höchstens der eingehende Schaden (3)');
  r = run([['F', 1], ['W', 3], ['F', 2]], 'F3'); assert.equal(r.me.stats.hp, 6, 'nur passende Fallen werfen (1 + 2); die falsche Farbe wird trotzdem abgelegt');
  assert.ok(r.op.deck.discard.some(x => x.uid === 9002), 'auch die nicht passende Falle ist abgelegt');
  r = run([['E', 2], ['E', 2]], 'F3'); assert.equal(r.me.stats.hp, 9, 'falsche Farbe: kein Rückwurf');
});
test('Stapeln (0.12.1.1): Eine neue Falle ersetzt die liegende nicht mehr', () => {
  const { s, me } = combatSetup(11, ['W2', 'F2']);
  me.stats.traps = [{ card: { id: 'F1', uid: 9001 }, el: 'F', tier: 1, lvl: 1 }];
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  if (s.combat.forced && s.combat.forced.kind === 'trap') assert.ok(M.apply(s, { pid: 0, type: 'fd', slots: [0] }).ok);
  assert.equal(me.stats.traps.length, 2, 'beide Fallen liegen');
});

test('Monsterwerte je Stufe: Grundform ohne Würfel, mit Würfeln höchstens die Ausschläge der Seiten', () => {
  const s = M.newGame({ seed: 3, ai: [true, true], first: 0 });
  const hp = [3, 4, 7], limit = [2, 3, 4], gold = [1, 2, 3], D = M.MONSTER.variants.dice, maxN = (k, st) => Math.max(...D.plus.concat(D.minus).filter(f => f.k === k).map(f => f.n[st - 1]));
  [1, 2, 3].forEach((st, i) => {
    const base = M.spawnMonsters(st);
    for (const el of Object.keys(base)) { assert.equal(base[el].stats.maxHp, hp[i]); assert.equal(base[el].stats.limit, limit[i]); assert.equal(base[el].label, ''); }
    const r = M.spawnMonsters(st, s.rng);
    for (const el of Object.keys(r)) {
      const m = r[el].stats;
      assert.ok(Math.abs(m.maxHp - hp[i]) <= maxN('hp', st) * 2 || m.maxHp === 1, 'HP Stufe ' + st + ': ' + m.maxHp);
      assert.ok(Math.abs(m.limit - limit[i]) <= 2, 'Limit Stufe ' + st + ': ' + m.limit);
      assert.equal(m.gold, gold[i]);
      assert.ok(m.maxMana >= 1 && m.maxMana <= 6 + 2 * maxN('mana', st), 'Mana Stufe ' + st + ': ' + m.maxMana);
    }
  });
});

test('Monster-Würfel (0.4): Deckform spitz/breit, ein Plus- und ein Minuswürfel, Name Spezialist/Generalist, Etikett „+X, −Y“, Werte folgen den Seiten', () => {
  const D = M.MONSTER.variants.dice, base = { 1: { F: [3, 5], E: [3, 6], W: [3, 5] }, 2: { F: [4, 5], E: [4, 5], W: [4, 5] }, 3: { F: [7, 6], E: [7, 6], W: [7, 6] } }, limit = [0, 2, 3, 4];
  const seenForm = {}, seenPlus = new Set(), seenMinus = new Set();
  for (const st of [1, 2, 3]) for (let seed = 1; seed <= 120; seed++) {
    const r = M.spawnMonsters(st, M.newGame({ seed }).rng);
    for (const el of Object.keys(r)) {
      const m = r[el], v = m.variant, pl = D.plus[v.pl], mi = D.minus[v.mi], [bh, bm] = base[st][m.el];
      assert.ok(v.d === 1 || v.d === 2, 'Deckform spitz oder breit');
      const blank = pl.k === 'none' || mi.k === 'none', same = pl.k === mi.k;   // gleicher Wert auf beiden Würfeln: hebt sich auf und wird nicht gezeigt
      assert.equal(m.name, M.MONSTER.formNames[m.el][v.d] + ' ' + ['', 'I', 'II', 'III'][st]);
      assert.equal(m.label, [].concat(same ? [] : [pl.k === 'none' ? null : '+' + M.MONSTER.variants.diceNames[pl.k], mi.k === 'none' ? null : '\u2212' + M.MONSTER.variants.diceNames[mi.k]].filter(Boolean)).join(', '));
      assert.equal(m.hints.length, same ? 1 : 3 - (pl.k === 'none' ? 1 : 0) - (mi.k === 'none' ? 1 : 0));
      const d = (k) => same ? 0 : (pl.k === k ? pl.n[st - 1] : 0) - (mi.k === k ? mi.n[st - 1] : 0);
      assert.equal(m.stats.maxHp, Math.max(1, bh + d('hp')), 'HP ' + m.label);
      assert.equal(m.stats.maxMana, Math.max(1, bm + d('mana')), 'Mana ' + m.label);
      assert.equal(m.stats.limit, Math.min(M.MONSTER_MAX_LIMIT, Math.max(1, limit[st] + d('limit'))), 'Limit ' + m.label);
      assert.equal(m.stats.handExtra || 0, d('hand')); assert.equal(m.stats.drawLimit, Math.min(M.MAX_DRAW_LIMIT, Math.max(1, 2 + d('draws'))));
      seenForm[v.d] = 1; seenPlus.add(v.pl); seenMinus.add(v.mi);
    }
  }
  assert.equal(Object.keys(seenForm).length, 2); assert.equal(seenPlus.size, 6); assert.equal(seenMinus.size, 6);
});

test('Monster-Würfel: sechs Seiten (Plus: HP, Mana, Magie, Ziehen, Hand, leer; Minus: Limit statt Magie), je 1, in allen Stufen gleich', () => {
  const D = M.MONSTER.variants.dice;
  assert.equal(D.plus.length, 6); assert.equal(D.minus.length, 6);
  assert.deepEqual(D.plus.map(f => [f.k, f.n[0]]), [['hp', 1], ['mana', 1], ['mag', 1], ['draws', 1], ['hand', 1], ['none', 0]]);
  assert.deepEqual(D.minus.map(f => [f.k, f.n[0]]), [['hp', 1], ['mana', 1], ['limit', 1], ['draws', 1], ['hand', 1], ['none', 0]]);
  for (const f of D.plus) assert.ok(f.n[0] === f.n[1] && f.n[1] === f.n[2], 'stufenunabhängig: ' + f.k);
});

test('Monster-Hand folgt den Würfeln', () => {
  const D = M.MONSTER.variants.dice, st = M.newGame({ seed: 9, ai: [true, true] });
  const mk = (kPlus, kMinus) => { const save = [D.plus.slice(), D.minus.slice()]; D.plus.fill(D.plus.find(f => f.k === kPlus)); D.minus.fill(D.minus.find(f => f.k === kMinus)); const r = M.spawnMonsters(2, st.rng); D.plus.splice(0, 6, ...save[0]); D.minus.splice(0, 6, ...save[1]); return r.F; };
  assert.equal(mk('hand', 'hp').stats.handExtra, 1); assert.equal(mk('hp', 'hand').stats.handExtra, -1);
  assert.equal(M.monsterHand(mk('hand', 'hp')), 5, 'höchstens MAX_SLOTS'); assert.equal(M.monsterHand(mk('hp', 'hand')), 4);   // Stufe II: Limit 3 + 2 Handplätze, plus 1 wird bei 5 gekappt, minus 1
});

test('Siegpunkte: Monsterkampf +1 / -1 (nie unter 0), keine Beute, kein Trostpreis, Ende ab 4 nach Showdown 2', () => {
  let decided = 0, floored = 0;
  for (let seed = 7000; seed < 7040; seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1, rules: { surplusSp: 0, startSp: 0 } });   // ohne Überschusspunkte und Start-Siegpunkte, damit nur der Kampf Siegpunkte bewegt und die Untergrenze 0 vorkommt
    let steps = 0, last = null;
    while (!s.over && steps++ < 20000) {
      const before = s.players.map(p => ({ sp: p.sp, gold: p.stats.goldGot }));
      if (!AI.runTurn(s, M.actor(s)).ok) break;
      s.players.forEach(p => assert.ok(p.sp >= 0, 'Siegpunkte nie unter 0'));
      const r = s.lastCombat; if (!r || r === last || r.mode !== 'monster') continue;
      last = r;
      const d = s.players.map((p, i) => p.sp - before[i].sp);
      if (r.winner === null) assert.deepEqual(d, [0, 0], 'Flucht oder Unentschieden ohne Siegpunkte');
      else {
        decided++;
        if (r.winner === 'a') { const w = d.indexOf(1), l = 1 - w; assert.ok(w >= 0, 'der Angreifer erhält 1 Siegpunkt'); assert.equal(d[l], 0, 'der Monsterführer verliert keinen Siegpunkt'); }
        else { assert.ok(d.every(x => x <= 0), 'ein Monstersieg bringt dem Führer keinen Siegpunkt'); assert.ok(d.some(x => x === -1) || before.some(b => b.sp === 0), 'der Angreifer verliert 1 Siegpunkt, aber nie unter 0'); if (d.every(x => x === 0)) floored++; }
      }
      if (r.monsterDefeated) { const g = s.players.map((p, i) => p.stats.goldGot - before[i].gold); assert.deepEqual(g, [0, 0], 'keine Beute für beide Spieler'); }
    }
    assert.ok(!s.log.some(l => /Trostpreis/.test(l.txt)), 'kein Trostpreis');
    if (s.over && s.showdown < 3) { assert.ok(s.showdown >= 1, 'vorzeitiges Ende frühestens nach Showdown 1'); assert.ok(Math.abs(s.players[0].sp - s.players[1].sp) >= 4, 'vorzeitiges Ende nur mit mindestens 4 Siegpunkten Vorsprung'); }
  }
  assert.ok(decided > 0 && floored > 0, 'Monsterkämpfe mit Sieger und Untergrenze 0 kamen vor');
});

test('Showdown: Sieger +1, Verlierer -1 (nie unter 0), Unentschieden und Flucht 0/0', () => {
  let won = 0, drawn = 0;
  for (let seed = 7100; seed < 7140; seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1 });
    let steps = 0, last = null;
    while (!s.over && steps++ < 20000) {
      const before = s.players.map(p => p.sp);
      if (!AI.runTurn(s, M.actor(s)).ok) break;
      const r = s.lastCombat; if (!r || r === last || r.mode !== 'showdown') continue;
      last = r;
      const d = s.players.map((p, i) => p.sp - before[i]);
      if (r.winner === null) { drawn++; assert.deepEqual(d, [0, 0], 'Unentschieden ohne Siegpunkte'); }
      else { won++; const w = d.indexOf(1), l = 1 - w; assert.ok(w >= 0, 'Sieger +1'); assert.equal(d[l], before[l] > 0 ? -1 : 0, 'Verlierer -1, nie unter 0'); }
    }
  }
  assert.ok(won > 0, 'Showdowns mit Sieger kamen vor');
});

test('Kampfende hält den Endstand für die Oberfläche fest (keepSnap)', () => {
  const s = M.newGame({ seed: 21, ai: [true, true], first: 0 }); s.keepSnap = true;
  let steps = 0; while (!s.lastCombat && steps++ < 5000) if (!AI.runTurn(s, M.actor(s)).ok) break;
  assert.ok(s.lastCombat && s.lastCombat.snap && s.lastCombat.snap.sides, 'Snapshot vorhanden');
});

test('Monsterdecks passen zur Magie: zu jeder Magiestufe ab 2 eine Karte dieser Stufe, keine Karte über der Magie ihrer Farbe', () => {
  for (const st of [1, 2, 3]) for (let seed = 1; seed <= 120; seed++) {
    const s = M.newGame({ seed, ai: [true, true] }), r = M.spawnMonsters(st, s.rng);
    for (const el of Object.keys(r)) {
      const m = r[el];
      for (const e of ['F', 'E', 'W']) {
        const tiers = m.deckIds.filter(id => id[0] === e).map(id => +id[1]), mag = m.stats.mag[e];
        if (e !== M.MONSTER.profile[m.el].secondary) assert.ok(!tiers.some(t => t > mag), 'Abschnitt ' + st + ' ' + el + ': Karte über Magie ' + e + mag);   // Ausnahme: die Folgemagie trägt Karten über ihrer Stufe (erst mit dem Pluswürfel nutzbar)
        else assert.ok(tiers.some(t => t > (st === 1 ? 1 : 2)), 'Abschnitt ' + st + ' ' + el + ': keine Karte der Folgemagie über ihrer Grundstufe ' + e);   // Grundstufe der Folgemagie: 1 (Abschnitt I), 2 (II, III)
        if (mag >= 2) assert.ok(tiers.includes(mag) || (e === M.MONSTER.profile[m.el].secondary && tiers.some(t => t > mag)), 'Abschnitt ' + st + ' ' + el + ': keine ' + e + mag + '-Karte');
      }
    }
  }
});

test('Fliehen: nur im Monsterkampf, im eigenen Angriffszug, bei Monster ohne Mana und ohne Todesfluch', () => {
  const fresh = () => combatSetup(11, ['F1']);
  let { s, c, me, op } = fresh();
  s.rules.fleeAllowed = 1;   // seit 0.9.1 standardmäßig aus
  assert.equal(M.canFlee(s, 0), false, 'Monster hat noch Mana');
  assert.equal(M.apply(s, { pid: 0, type: 'flee' }).ok, false);
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, 0), true);
  assert.equal(M.canFlee(s, 1), false, 'nur der Angreifer');
  me.stats.death = 1;
  assert.equal(M.canFlee(s, 0), false, 'Todesfluch');
  assert.equal(M.apply(s, { pid: 0, type: 'flee' }).ok, false);
  delete me.stats.death;
  const hp = c.sides.b.stats.hp, gold = me.stats.gold, sp0 = s.players.map(p => p.sp), g1 = s.players[1].stats.gold;
  const r = M.apply(s, { pid: 0, type: 'flee' });
  assert.deepEqual(s.players.map(p => p.sp), sp0, 'Flucht bringt keine Siegpunkte'); assert.equal(s.players[1].stats.gold, g1, 'kein Gold für den Mitspieler');
  assert.ok(r.ok && r.combatEnd && r.combatEnd.reason === 'flee' && r.combatEnd.winner === null);
  assert.equal(s.phase, 'world'); assert.equal(me.stats.gold, gold, 'keine Beute'); assert.equal(s.lastCombat.monsterDefeated, false);
  assert.equal(s.turn, 1, 'der Gegenspieler ist als Nächster dran');
});
test('Fliehen ist standardmäßig abgeschaltet (0.9.1): canFlee falsch, Aktion abgelehnt, auch bei 0 Mana des Gegners', () => {
  assert.equal(M.DEFAULT_RULES.fleeAllowed, 0);
  const { s, c, me } = combatSetup(11, ['F1']);
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, 0), false);
  const r = M.apply(s, { pid: 0, type: 'flee' });
  assert.equal(r.ok, false);
  assert.equal(s.phase, 'combat', 'der Kampf läuft weiter');
  s.rules.fleeAllowed = 1;
  assert.equal(M.canFlee(s, 0), true, 'mit eingeschaltetem Schalter wieder möglich');
});
test('Fliehen geht nicht, während ein Angriff aussteht', () => {
  const { s, c, me, op } = combatSetup(11, ['F1']);
  s.rules.fleeAllowed = 1;
  c.sides.b.stats.mana = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(s.combat.action, 'defense');
  assert.equal(M.canFlee(s, 0), false);
  assert.equal(M.canFlee(s, 1), false, 'auch der Verteidiger flieht nicht');
});

test('Kartenvorrat: Startdecks aus gemischten Stufe-1-Karten, getauschte Karten gehen zurück in die Bibliothek, vergriffene Karten sind nicht kaufbar', () => {
  const s = M.newGame({ seed: 9, ai: [false, false], first: 0 });
  const total = () => Object.values(s.supply).reduce((a, b) => a + b, 0);
  const inDecks = () => s.players.reduce((a, p) => a + p.deck.draw.length + p.deck.discard.length + p.deck.hand.filter(Boolean).length, 0);
  assert.equal(total() + inDecks(), 54, 'Vorrat und Decks zusammen: Stufe 1 je 8, Stufe 2 je 6, Stufe 3 je 4');
  s.players.forEach(p => assert.equal(p.deck.draw.length + p.deck.discard.length + p.deck.hand.filter(Boolean).length, 12, 'je Spieler 12 Startkarten (alle 24 Stufe-1-Karten gleich verteilt)'));
  assert.equal(s.supply.F2, 6); assert.equal(s.supply.F3, 4); assert.equal(s.supply.F1 + s.supply.E1 + s.supply.W1, 0, 'alle Stufe-1-Karten sind verteilt');
  // zwei F1 gegen F2 tauschen: die beiden F1 kehren in den Vorrat zurück, F2 wird weniger
  const me = s.players[0], d = me.deck; me.stats.limit = 2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });   // (Auswahl wird unten neu gesetzt)
  d.marks = []; me.stats.mag.F = 1;
  d.hand[0] = Object.assign({}, d.hand[0], { id: 'F1' }); d.hand[1] = Object.assign({}, d.hand[1], { id: 'F1' });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.equal(M.vendorPlans(s, 0).some(o => o.result === 'F2'), true, 'seit 0.7 gibt es keine Freischaltung: F2 ist auch mit Magie Feuer 1 kaufbar');
  d.marks = [];
  d.hand[0] = Object.assign({}, d.hand[0], { id: 'F1' }); d.hand[1] = Object.assign({}, d.hand[1], { id: 'F1' });
  const f1 = s.supply.F1, f2 = s.supply.F2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'vendor', result: 'F2', cost: ['F1', 'F1'] }).ok);
  assert.equal(s.supply.F1, f1 + 2); assert.equal(s.supply.F2, f2 - 1);
  assert.equal(total() + inDecks(), 54, 'es gehen keine Karten verloren');
  // vergriffen
  s.supply.W2 = 0; s.turn = 0;
  const w = M.vendorPlans(s, 0).filter(o => o.result === 'W2'); assert.equal(w.length, 0, 'die KI sieht vergriffene Karten nicht');
  d.hand[2] = Object.assign({}, d.hand[2], { id: 'E1' }); d.marks = []; M.apply(s, { pid: 0, type: 'mark', slot: 2 });
  assert.equal(M.apply(s, { pid: 0, type: 'vendor', result: 'W2', cost: ['E1'] }).ok, false);
});

test('Läuterung kann Todesmarker beider Seiten entfernen (eigene und gegnerische), je entferntem Marker ein Gratis-Nachziehen', () => {
  for (const [pick, mineLeft, theirsLeft] of [['sd', 0, 2], ['od', 1, 1]]) {
    const { s, me, op } = combatSetup(11, ['F1', 'E1']);
    me.stats.death = 1; op.stats.death = 2; me.stats.freeDraws = 0;
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
    assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: [pick] }).ok);
    assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.equal(me.stats.death || 0, mineLeft, pick + ': eigene Marker'); assert.equal(op.stats.death || 0, theirsLeft, pick + ': gegnerische Marker');
    assert.equal(me.stats.freeDraws, 1);
  }
});

test('Fliehen im Showdown: bei 0 Mana des Gegners möglich, Showdown endet ohne Sieger (0/0)', () => {
  const s = M.newGame({ seed: 4, ai: [true, true], first: 0 });
  let steps = 0; while (!s.over && !(s.phase === 'combat' && s.combat.mode === 'showdown') && steps++ < 20000) if (!AI.runTurn(s, M.actor(s)).ok) break;
  assert.ok(s.phase === 'combat' && s.combat.mode === 'showdown', 'Showdown erreicht');
  s.rules.fleeAllowed = 1;
  const c = s.combat, att = c.sides.a.ctrl, sp = s.players.map(p => p.sp);
  assert.equal(M.canFlee(s, att), false, 'Gegner hat noch Mana');
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, att), true);
  const r = M.apply(s, { pid: att, type: 'flee' });
  assert.ok(r.ok && r.combatEnd.reason === 'flee' && r.combatEnd.winner === null);
  assert.deepEqual(s.players.map(p => p.sp), sp, 'Flucht bringt keine Siegpunkte');
  assert.equal(s.showdown, 1);
});

test('Läuterung Stufe 3 entfernt beliebig gemischt eigene und gegnerische Mana-, Schild- und Todesmarker', () => {
  const { s, me, op } = combatSetup(11, ['F3', 'E3']);
  me.stats.manaflow = 2; me.stats.death = 1;
  op.stats.rainbow = 1; op.stats.death = 2; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['sm', 'or', 'od'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.manaflow, 1, 'eigener Manamarker −1'); assert.equal(op.stats.rainbow || 0, 0, 'gegnerisches Schild weg');
  assert.equal(op.stats.death, 1, 'gegnerischer Todesmarker −1'); assert.equal(me.stats.death, 1, 'eigener Todesmarker unberührt');
  assert.equal(me.stats.freeDraws, 3, 'je entferntem Marker ein Gratis-Nachziehen');
});

// Falle: Verteidiger op hat eine verdeckte Karte der Farbe el und Stufe lvl liegen, Angreifer me schlägt mit att zu
function trapFall(el, lvl, att, dmgHp) {
  const { s, me, op } = combatSetup(11, [att]);
  op.stats.hp = op.stats.maxHp = 9; me.stats.hp = me.stats.maxHp = 9;
  op.stats.traps = [{ card: { id: el + '1', uid: 9001 }, el, tier: 1, lvl }];
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  return { s, me, op, disc: op.deck.discard };
}
test('Falle: Passt die Farbe des Schadens, werden 1/2/3 unblockbar zurückgeworfen und der eingehende Schaden sinkt entsprechend', () => {
  const { me, op, s } = trapFall('F', 1, 'F3');
  assert.equal(me.stats.hp, 8, 'Stufe 1 wirft 1 zurück');
  assert.equal(op.stats.traps, undefined, 'die Karte ist aufgedeckt und liegt nicht mehr');
  assert.ok(op.deck.discard.some(x => x.uid === 9001), 'Karte auf dem Ablagestapel');
  assert.ok(s.combat.pending <= 2, 'eingehender Schaden um den Rückwurf gemindert');
  const t = trapFall('F', 3, 'F3'); assert.equal(t.me.stats.hp, 6, 'Stufe 3 wirft 3 zurück (der eingehende Schaden ist 3)');
});
test('Falle: Andere Farbe wirkt nicht, die Karte kommt trotzdem auf den Ablagestapel', () => {
  const { me, op, disc } = trapFall('F', 3, 'W2');
  assert.equal(me.stats.hp, 9); assert.equal(op.stats.traps, undefined); assert.ok(disc.some(x => x.uid === 9001));
});
test('Falle: Stufe S wirft S zurück (1/2/3), gedeckelt durch den eingehenden Schaden', () => {
  assert.equal(trapFall('F', 2, 'F3').me.stats.hp, 7);   // Schaden 3, Rückwurf 2
  assert.equal(trapFall('F', 3, 'F1').me.stats.hp, 8);   // Schaden 1, Rückwurf min(3, 1) = 1
  assert.equal(trapFall('F', 3, 'F2').me.stats.hp, 7);   // Schaden 2, Rückwurf min(3, 2) = 2
});
test('Falle legen: Blau + Rot zieht drei Karten vom Stapel (nicht in die Hand), eine liegt verdeckt vor mir, die übrigen kommen auf den Ablagestapel', () => {
  const { s, me, c } = combatSetup(11, ['W2', 'F2']);
  me.deck.draw = ['E1', 'F1', 'W1', 'E2'].map((id, i) => ({ id, uid: 8000 + i }));   // zuletzt gezogen: E2, W1, F1
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  const handN = me.deck.hand.filter(Boolean).length - 2, d0 = me.deck.discard.length;
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(c.forced && c.forced.kind === 'trap' && c.forced.cards.length === 3, 'drei Karten zur Wahl');
  assert.deepEqual(c.forced.cards.map(x => x.id), ['E2', 'W1', 'F1']);
  assert.equal(me.deck.hand.filter(Boolean).length, handN, 'die gezogenen Karten ersetzen die Hand nicht');
  assert.equal(M.apply(s, { pid: 0, type: 'attack' }).ok, false, 'vorher keine andere Aktion');
  assert.ok(M.apply(s, { pid: 0, type: 'fd', slots: [1] }).ok);
  assert.ok(me.stats.traps && me.stats.traps.length === 1 && me.stats.traps[0].el === 'W' && me.stats.traps[0].lvl === 2, 'Falle liegt: W1, Stufe 2');
  assert.deepEqual(me.deck.discard.slice(d0 + 2).map(x => x.id).sort(), ['E2', 'F1'], 'die nicht gewählten kommen auf den Ablagestapel (nach den zwei Kombokarten)');
  assert.equal(me.deck.hand.filter(Boolean).length, handN);
  assert.equal(JSON.stringify(me.deck.marks), '[]');
});

test('Falle und Hellsicht: Reicht der Zugstapel nicht, wird der Ablagestapel gemischt und weitergezogen', () => {
  for (const [hand, kind, n] of [[['W2', 'F2'], 'trap', 3], [['F2', 'W2'], 'sight', 3]]) {
    const { s, me, c } = combatSetup(11, hand);
    me.deck.draw = [{ id: 'E1', uid: 1 }]; me.deck.discard = ['F1', 'W1', 'E2', 'F2'].map((id, i) => ({ id, uid: 10 + i }));
    hand.forEach((_, i) => M.apply(s, { pid: 0, type: 'mark', slot: i }));
    assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.ok(c.forced && c.forced.kind === kind, kind);
    assert.equal(c.forced.cards.length, n, kind + ': volle Kartenzahl trotz kleinem Zugstapel');
    assert.equal(c.forced.cards[0].id, 'E1', kind + ': zuerst die Restkarte des Zugstapels');
    assert.equal(me.deck.discard.length, 0, kind + ': der Ablagestapel ging in den Zugstapel');
  }
  const { s, me, c } = combatSetup(11, ['W2', 'F2']);   // Zugstapel 1 Karte, Ablage leer: die beiden gespielten Kombokarten liegen danach im Ablagestapel und werden mit gemischt
  me.deck.draw = [{ id: 'E1', uid: 1 }]; me.deck.discard = [];
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(c.forced.cards.length, 3, 'E1 plus die zwei gespielten Karten');
});

test('Hellsicht (Rot + Blau): zieht 3 Karten, S davon liegen offen vor dir, der Rest wird abgelegt', () => {
  const { s, me, c } = combatSetup(11, ['F2', 'W2']);
  me.deck.draw = ['E1', 'F1', 'W1', 'E2'].map((id, i) => ({ id, uid: 7000 + i }));   // zuletzt gezogen wird E2
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(c.forced && c.forced.kind === 'sight' && c.forced.cards.length === 3 && c.forced.n === 2, 'Stufe 2: 3 Karten, 2 wählen');
  assert.deepEqual(c.forced.cards.map(x => x.id), ['E2', 'W1', 'F1']);
  assert.equal(M.apply(s, { pid: 0, type: 'fd', pick: ['k', 'a', 'a'] }).ok, false, 'genau n Karten offen');
  assert.equal(M.apply(s, { pid: 0, type: 'fd', pick: ['k', 'k', 'k'] }).ok, false, 'nicht mehr als n');
  assert.equal(M.apply(s, { pid: 0, type: 'attack' }).ok, false, 'vorher keine andere Aktion');
  const bl = M.baseLen(me.deck), disc0 = me.deck.discard.length;
  assert.ok(M.apply(s, { pid: 0, type: 'fd', pick: ['k', 'a', 'k'] }).ok);
  assert.equal(c.forced, null);
  assert.equal(me.deck.extra, 2); assert.equal(me.deck.hand.length, bl + 2, 'offene Karten hängen hinten an, keine Handplätze belegt');
  assert.deepEqual(me.deck.hand.slice(bl).map(x => [x.id, x.free]), [['E2', true], ['F1', true]]);
  assert.equal(me.deck.discard.length, disc0 + 1); assert.equal(me.deck.discard[disc0].id, 'W1', 'abgelegte Karte');
});
test('Hellsicht: offene Karten kosten kein Mana und werden nach dem Ausspielen abgelegt; Rest verfällt am Kampfende', () => {
  const { s, me, c } = combatSetup(11, ['F2', 'W2']);
  me.deck.draw = ['E1', 'F1', 'W1', 'E2'].map((id, i) => ({ id, uid: 7000 + i }));
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  M.apply(s, { pid: 0, type: 'attack' }); M.apply(s, { pid: 0, type: 'fd', pick: ['k', 'a', 'k'] });
  const bl = M.baseLen(me.deck), ex = me.deck.hand[bl];
  const free = M.evalAttack(me.stats, [M.parseCard(ex.id)].map(x => Object.assign({}, x, { free: true })));
  const paid = M.evalAttack(me.stats, [M.parseCard(ex.id)]);
  assert.ok(free.valid && paid.valid);
  assert.equal(free.cost, paid.cost - 1, 'offene Karte kostet 0 statt 1 Mana');
  M.dropSight(me.deck);
  assert.equal(me.deck.extra, 0); assert.equal(me.deck.hand.length, bl); assert.equal(me.deck.discard.length, 2 + 1 + 2, 'Kombokarten, abgelegte und beide offenen Karten im Ablagestapel');
});
test('Hellsicht: Sind höchstens S Karten brauchbar, entfällt die Wahl; Flüche bleiben nie offen', () => {
  const { s, me, c } = combatSetup(11, ['F3', 'W3']);
  me.deck.draw = ['E1', 'F1', 'W1'].map((id, i) => ({ id, uid: 7100 + i }));
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(!c.forced, 'Stufe 3 bei 3 Karten: keine Wahl');
  assert.equal(me.deck.extra, 3);
  const u = combatSetup(11, ['F2', 'W2']);
  u.me.deck.draw = [{ id: 'E1', uid: 1 }, { id: 'F1', uid: 2 }, { id: 'W1', uid: 3 }];
  u.me.deck.draw.push({ id: 'E2', uid: 4 });
  M.apply(u.s, { pid: 0, type: 'mark', slot: 0 }); M.apply(u.s, { pid: 0, type: 'mark', slot: 1 });
  M.apply(u.s, { pid: 0, type: 'attack' });
  assert.equal(u.c.forced.n, 2);
  assert.equal(M.apply(u.s, { pid: 0, type: 'fd', pick: ['k', 'k'] }).ok, false, 'je Karte eine Entscheidung');
});


// Bibliothekstausch F1+F1 -> F2 (eine echte Zugaktion; Magie, Upgrades und Opfern sind es seit 0.9.3 nicht mehr)
function vendF2(s, pid) {
  const p = s.players[pid], d = p.deck; p.stats.limit = 2; d.marks = [];
  d.hand[0] = Object.assign({}, d.hand[0], { id: 'F1' }); d.hand[1] = Object.assign({}, d.hand[1], { id: 'F1' });
  M.apply(s, { pid, type: 'mark', slot: 0 }); M.apply(s, { pid, type: 'mark', slot: 1 });
  return M.apply(s, { pid, type: 'vendor', result: 'F2', cost: ['F1', 'F1'] });
}

test('Nachziehmarker Weltphase: Nachziehen bei rotem Marker gibt dem Gegner 1 Gold, jede andere Aktion (Bibliothek, Kampf) stellt auf grün zurück, Upgrades nicht', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), g1 = () => s.players[1].stats.gold;
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  const base = g1();
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // grün -> rot, keine Strafe
  assert.equal(s.players[0].drawRed, true); assert.equal(g1(), base);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // rot: Strafe
  assert.equal(g1(), base + 1);
  s.players[1].stats.gold += 5; assert.ok(M.apply(s, { pid: 1, type: 'spend', what: 'hp' }).ok);   // Upgrade ist keine Aktion (seit 0.9.3, wie das Opfern seit 0.7.6.4): Zug und Marker bleiben
  assert.equal(s.turn, 1); assert.equal(s.players[1].drawRed, true);
  assert.ok(vendF2(s, 1).ok);   // andere Aktion: Marker von Spieler 1 wieder grün
  assert.equal(s.players[1].drawRed, false); assert.equal(s.turn, 0);
  const g0 = s.players[0].stats.gold; s.players[0].stats.gold += 5;
  assert.ok(M.apply(s, { pid: 0, type: 'spend', what: 'hp' }).ok);
  assert.equal(s.turn, 0); assert.equal(s.players[0].drawRed, true);
  assert.ok(vendF2(s, 0).ok);
  assert.equal(s.players[0].drawRed, false);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // wieder grün -> rot ohne Strafe
  assert.equal(s.players[1].drawRed, true);
  assert.equal(s.players[0].stats.gold <= g0 + 5, true);
});

test('Nachziehmarker Kampf: Nachziehen bei rotem Marker kostet 1 Mana, der Gegner bekommt kein Token', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  const m0 = me.stats.mana;
  assert.equal(op.stats.freeDraws || 0, 0);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);   // grün -> rot: gratis
  assert.equal(me.stats.mana, m0, 'bei grünem Marker kostenlos');
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);   // rot: 1 Mana
  assert.equal(me.stats.mana, m0 - 1);
  assert.equal(op.stats.freeDraws || 0, 0, 'kein Nachziehtoken für den Gegner');
  assert.equal(s.players[0].drawRed, true, 'Marker bleibt rot');
});

test('Nachziehmarker Kampf: bei rotem Marker ohne Mana ist Nachziehen nicht möglich', () => {
  const { s, me } = combatSetup(11, ['F1']);
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  me.stats.mana = 0;
  const hand = JSON.stringify(me.deck.hand), r = M.apply(s, { pid: 0, type: 'draw' });
  assert.equal(r.ok, false, 'ohne Mana abgelehnt');
  assert.equal(JSON.stringify(me.deck.hand), hand, 'Hand unverändert');
  assert.equal(s.combat.sides[s.combat.turn].ctrl, 0, 'Zug nicht beendet');
  assert.ok(M.apply(s, { pid: 0, type: 'recover' }).ok, 'Erholen bleibt möglich');
});

test('KI-Läuterung entfernt zuerst das Schild, dann die Manamarker des Gegners', () => {
  const { s, c, me, op } = combatSetup(11, ['F3', 'E3']);
  me.deck.draw = Array.from({ length: 8 }, () => ({ id: 'E2' })); me.deck.discard = [];
  op.stats.rainbow = 1; op.stats.manaflow = 1;
  const acts = AI.plan(s, 0);
  const lf = acts.find(a => a.type === 'lfp');
  assert.ok(lf, 'KI wählt die Läuterung: ' + acts.map(a => a.type).join(','));
  assert.deepEqual(lf.pick, ['or', 'om']);
});

test('KI meidet Nachziehen bei rotem Nachziehmarker (Weltphase: Gold opfern statt dem Gegner Gold schenken; Kampf: kein Nachziehen)', () => {
  const s = M.newGame({ seed: 5, ai: [true, true], first: 0 }), p = s.players[0];
  p.stats.pending = 0; p.stats.gold = 1; p.stats.mana = 0; p.drawRed = true;
  const acts = AI.plan(s, 0).map(a => a.type);
  assert.ok(!acts.includes('draw'), 'Weltphase bei Rot: ' + acts.join(','));
  for (let k = 0; k < 6; k++) {
    const { s: t } = combatSetup(11 + k, ['F1', 'F1', 'F1']);
    t.players[0].drawRed = true;
    const ca = AI.plan(t, 0).map(a => a.type);
    assert.ok(!ca.includes('draw'), 'Kampf bei Rot: ' + ca.join(','));
  }
});

test('KI zieht im Kampf bei rotem Marker ohne Mana nicht nach (leere Hand eingeschlossen)', () => {
  for (let k = 0; k < 4; k++) {
    const { s, me } = combatSetup(11 + k, ['F1']);
    s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
    s.players[0].drawRed = true; me.stats.mana = 0; me.deck.hand.fill(null);
    const ca = AI.plan(s, 0).map(a => a.type);
    assert.ok(!ca.includes('draw'), 'Kampf bei Rot ohne Mana: ' + ca.join(','));
  }
});

test('Nachziehlimit: Kauf kostet Gold (1, dann 2, keine Upgrade-Punkte), ist keine Aktion mehr (0.9.3), höchstens Stufe 3', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), me = s.players[0].stats;
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  assert.equal(me.drawLimit, 1);
  me.gold = 0; me.pending = 5; assert.equal(M.apply(s, { pid: 0, type: 'drawlimit' }).ok, false, 'ohne Gold nicht möglich, auch mit Upgrade-Punkten');
  me.gold = 5;
  assert.ok(M.apply(s, { pid: 0, type: 'drawlimit' }).ok);
  assert.equal(me.drawLimit, 2); assert.equal(me.gold, 4); assert.equal(me.pending, 5, 'Upgrade-Punkte bleiben'); assert.equal(s.turn, 0, 'der Spieler bleibt am Zug');
  assert.ok(M.apply(s, { pid: 0, type: 'drawlimit' }).ok, 'mehrere Käufe im selben Zug');
  assert.equal(me.drawLimit, 3); assert.equal(me.gold, 2, 'zweiter Kauf 2 Gold (Preis steigt um den Grundpreis)');
  assert.equal(M.apply(s, { pid: 0, type: 'drawlimit' }).ok, false, 'Maximum 3'); assert.equal(me.gold, 2); assert.equal(s.turn, 0);
});

test('Nachziehlimit Weltphase: so viele Nachziehvorgänge hintereinander sind frei, danach wird der Marker rot und das nächste Nachziehen kostet Gold', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p0 = s.players[0], g1 = () => s.players[1].stats.gold;
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  p0.stats.drawLimit = 3;
  const base = g1(), other = () => assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  for (let i = 1; i <= 3; i++) {
    assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); other();
    assert.equal(p0.drawN, i); assert.equal(p0.drawRed, i === 3, 'rot erst nach dem dritten Nachziehen');
  }
  assert.equal(g1(), base, 'bisher keine Strafe');
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);   // viertes Mal: Strafe
  assert.equal(g1(), base + 1); assert.equal(p0.drawN, 3);
  other();
  p0.stats.gold += 5; assert.ok(M.apply(s, { pid: 0, type: 'spend', what: 'hp' }).ok);   // Upgrade ist keine Aktion: Marker und Zähler bleiben
  assert.equal(p0.drawRed, true); assert.equal(p0.drawN, 3); assert.equal(s.turn, 0);
  assert.ok(vendF2(s, 0).ok);   // andere Aktion: zurück auf Grün, Zähler 0
  assert.equal(p0.drawRed, false); assert.equal(p0.drawN, 0);
});

test('Nachziehlimit Kampf: erst das Nachziehen über dem Limit kostet Mana', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  s.players[0].stats.drawLimit = 2;
  const m0 = me.stats.mana;
  for (let i = 0; i < 2; i++) { assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok); }
  assert.equal(me.stats.mana, m0, 'innerhalb des Limits kostenlos'); assert.equal(s.players[0].drawRed, true);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(me.stats.mana, m0 - 1); assert.equal(op.stats.freeDraws || 0, 0);
});

test('KI: Stellschraube dlMax kauft das Nachziehlimit mit Gold bis zur gewählten Stufe, nicht weiter', () => {
  const s = M.newGame({ seed: 5, ai: [true, true], first: 0 }), p = s.players[0];
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  p.stats.gold = 1; p.stats.pending = 0;
  AI.setParams(0, { dlMax: 0, dlPos: 0 });
  try { assert.notEqual(AI.ecoStep(s, 0).type, 'drawlimit', 'dlMax 0: kauft nicht'); } finally { AI.setParams(0, null); }
  AI.setParams(0, { dlMax: 2, dlPos: 0 });
  try {
    assert.equal(AI.ecoStep(s, 0).type, 'drawlimit');
    p.stats.drawLimit = 2;
    assert.notEqual(AI.ecoStep(s, 0).type, 'drawlimit');
  } finally { AI.setParams(0, null); }
});

test('KI: Passt der Gegner im Showdown immer, greift sie sofort an und gewinnt, statt endlos nachzuziehen und zu erholen', () => {
  const s = M.newGame({ seed: 301, ai: [false, true], first: 0 });
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  s.monsters.E.stats.hp = 0; s.monsters.W.stats.hp = 0;
  M.apply(s, { pid: 0, type: 'combat', elem: 'F' });
  const me = s.combat.sides.a, op = s.combat.sides.b; me.stats.limit = 2; me.stats.mag = { F: 3, E: 3, W: 3 }; op.stats.hp = 1; op.deck.hand = op.deck.hand.map(() => null);   // ohne Handkarten kann das Monster nicht blocken (seit 0.3.1 hat es Limit 2)
  me.deck.hand[0] = Object.assign({}, me.deck.hand[0], { id: 'F3' });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'attack' });
  for (let q = 0; q < 6 && s.combat.mode === 'monster' && M.actor(s) === 1; q++) AI.runTurn(s, 1);
  assert.equal(s.combat.mode, 'showdown', 'letztes Monster besiegt: Showdown');
  let pcMoves = 0, firstAttack = 0;
  for (let i = 0; i < 400 && s.phase === 'combat'; i++) {
    if (M.actor(s) === 0) { assert.ok(M.apply(s, { pid: 0, type: 'pass' }).ok); continue; }
    const r = AI.runTurn(s, 1); pcMoves++;
    if (!firstAttack && r.acts[r.acts.length - 1].type === 'attack') firstAttack = pcMoves;
  }
  assert.ok(firstAttack > 0 && firstAttack <= 3, 'erster Angriff nach höchstens 3 Zügen, war ' + firstAttack);
  assert.ok(s.log.some(e => /^Gegner gewinnt den Showdown/.test(e.txt)), 'der Computer gewinnt gegen den Dauerpasser');
});

test('Kosten getauscht (swapCosts): Magie kostet Upgrade-Punkte, alle anderen Verbesserungen kosten Gold; ohne die Regel wie früher', () => {
  const mk = rules => { const s = M.newGame({ seed: 5, ai: [false, false], first: 0, rules }), st = s.players[0].stats; st.gold = 4; st.pending = 4; return { s, st }; };
  const go = (g, a) => M.apply(g.s, Object.assign({ pid: 0 }, a)), nxt = g => { g.s.turn = 0; };
  let g = mk({});   // Standard seit 0.3: getauscht
  assert.equal(M.DEFAULT_RULES.swapCosts, 1);
  assert.ok(go(g, { type: 'magic', elem: 'F' }).ok); assert.deepEqual([g.st.gold, g.st.pending, g.st.mag.F], [4, 3, 2], 'Magie Stufe 2: 1 Upgrade-Punkt');
  nxt(g); assert.ok(go(g, { type: 'magic', elem: 'F' }).ok); assert.deepEqual([g.st.gold, g.st.pending, g.st.mag.F], [4, 1, 3], 'zweiter Magie-Kauf: 2 Upgrade-Punkte (unabhängig von der Stufe)');
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'hp' }).ok); assert.deepEqual([g.st.gold, g.st.pending, g.st.maxHp], [3, 1, 6], 'HP: 1 Gold (+2, Start 4)');
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'limit' }).ok); assert.deepEqual([g.st.gold, g.st.limit], [2, 2], 'Limit 1 → 2: 1 Gold (seit 0.5.1)');
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'limit' }).ok); assert.deepEqual([g.st.gold, g.st.limit], [0, 3], 'Limit 2 → 3: 2 Gold');
  nxt(g); g.st.gold = 3; assert.equal(go(g, { type: 'spend', what: 'limit' }).ok, false, 'Limit 4 gibt es nicht (höchstens Stufe 3)'); assert.equal(g.st.limit, 3); g.st.gold = 1;
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'slot' }).ok); assert.deepEqual([g.st.gold, g.s.players[0].slots], [0, 4], 'Handplatz: 1 Gold');
  nxt(g); assert.equal(go(g, { type: 'spend', what: 'mana' }).ok, false, 'ohne Gold kein Upgrade, auch wenn Upgrade-Punkte da wären');
  g = mk({ swapCosts: 0 });   // alte Zuordnung
  assert.ok(go(g, { type: 'magic', elem: 'F' }).ok); assert.deepEqual([g.st.gold, g.st.pending], [3, 4], 'Magie kostet Gold');
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'hp' }).ok); assert.deepEqual([g.st.gold, g.st.pending], [3, 3], 'HP kostet einen Upgrade-Punkt');
});

test('Startsiegpunkte: jeder Spieler beginnt mit 3 Siegpunkten (startSp, seit 0.7.2.24; vorher 2), eine frühe Niederlage kostet einen', () => {
  assert.equal(M.DEFAULT_RULES.startSp, 3);
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 });
  assert.deepEqual(s.players.map(p => p.sp), [3, 3]);
  assert.deepEqual(M.newGame({ seed: 5, rules: { startSp: 0 } }).players.map(p => p.sp), [0, 0]);
});

test('Überschusspunkte: Sind alle Magien auf Stufe 3, werden Upgrade-Punkte (nicht Gold) sofort zu Siegpunkten', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0], me = p.stats;
  me.mag = { F: 3, E: 3, W: 2 }; me.pending = 4; me.gold = 5;
  assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'W' }).ok);   // erster Magie-Kauf kostet 1 Punkt, 3 bleiben übrig, nun ist alles auf Stufe 3
  assert.deepEqual([me.pending, p.sp, me.gold], [0, 6, 5], '3 Überschusspunkte = 3 Siegpunkte (3 Start), Gold bleibt');
  s.turn = 1; s.players[1].stats.gold = 3; assert.ok(M.apply(s, { pid: 1, type: 'temple', amount: 2 }).ok);   // Gegner ohne volle Magie behält seine Punkte
  assert.equal(s.players[1].stats.pending, 2, 'kein Bonuspunkt (seit 0.4 nur Gold) + 2 aus dem Tempel'); assert.equal(s.players[1].sp, 3);
  const t = M.newGame({ seed: 5, ai: [false, false], first: 0, rules: { surplusSp: 0 } }); t.players[0].stats.mag = { F: 3, E: 3, W: 3 }; t.players[0].stats.pending = 2; t.players[0].stats.gold = 0;
  assert.ok(M.apply(t, { pid: 0, type: 'draw' }).ok); assert.deepEqual([t.players[0].stats.pending, t.players[0].sp], [2, 3], 'ohne Regel bleibt es');
});

test('Ausspiellimit startet bei 1 (startLimit, seit 0.5.1), mit startLimit 2 wie in 0.3 bis 0.4.1', () => {
  assert.equal(M.DEFAULT_RULES.startLimit, 1);
  assert.deepEqual(M.newGame({ seed: 5 }).players.map(p => p.stats.limit), [1, 1]);
  assert.deepEqual(M.newGame({ seed: 5, rules: { startLimit: 2 } }).players.map(p => p.stats.limit), [2, 2]);
});

test('Start-HP der Spieler 4 (startHp), Monster beginnen weiter mit eigenen Werten', () => {
  assert.equal(M.DEFAULT_RULES.startHp, 4);
  const s = M.newGame({ seed: 5 });
  assert.deepEqual(s.players.map(p => [p.stats.hp, p.stats.maxHp]), [[4, 4], [4, 4]]);
  assert.deepEqual(M.newGame({ seed: 5, rules: { startHp: 0 } }).players.map(p => p.stats.maxHp), [3, 3]);
  assert.equal(M.spawnMonsters(1, s.rng).F.stats.maxHp >= 1, true);
});

test('Steigende Preise (priceRise): jeder Kauf einer Kategorie verteuert die nächste Stufe um den Grundpreis; Einnahmen je Abschnitt 3/6/9 Gold (seit 0.4)', () => {
  assert.deepEqual(M.DEFAULT_RULES.stageGold, [0, 3, 6, 9]); assert.deepEqual(M.DEFAULT_RULES.stagePoints, [0, 0, 0, 0]); assert.deepEqual(M.DEFAULT_RULES.lossGold, [0, 1, 2, 3]); assert.equal(M.DEFAULT_RULES.priceRise, 1);
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0], st = p.stats;
  assert.deepEqual([st.gold, st.pending], [3, 0], 'Start: 3 Gold (3 Monster × 1 Gold), keine Upgrade-Punkte (Abschnitt 1)');
  const prices = fn => [0, 1, 2].map(() => { const c = fn(); st.buys = st.buys || {}; return c; });
  const seq = (cat, fn) => { const out = []; for (let i = 0; i < 3; i++) { out.push(fn()); st.buys = st.buys || {}; st.buys[cat] = (st.buys[cat] || 0) + 1; } st.buys[cat] = 0; return out; };
  assert.deepEqual(seq('hp', () => M.hpStepCost(s, st)), [1, 2, 3], 'HP: 1, 2, 3');
  assert.deepEqual(seq('mana', () => M.manaStepCost(s, st)), [1, 2, 3], 'Mana: 1, 2, 3');
  assert.deepEqual(seq('slot', () => M.slotStepCost(s, st)), [1, 2, 3], 'Handplätze: 1, 2, 3');
  assert.deepEqual(seq('limit', () => M.limitStepCost(s, st)), [1, 2, 3], 'Ausspiellimit: 1, 2, 3 (seit 0.5.1)');
  assert.deepEqual(seq('mag', () => M.magicCost(s, 1, st)), [1, 2, 3], 'Magie: 1, 2, 3');
  assert.deepEqual(seq('mag', () => M.magicCost(s, 2, st)), [1, 2, 3], 'Magie: unabhängig von der Stufe');
  // tatsächliche Käufe zählen
  st.gold = 20; st.pending = 20;
  for (const [need, what] of [[1, 'hp'], [2, 'hp']]) { const g = st.gold; s.turn = 0; assert.ok(M.apply(s, { pid: 0, type: 'spend', what }).ok); assert.equal(g - st.gold, need, what + ' kostet ' + need); }
  s.turn = 0; assert.equal(M.apply(s, { pid: 0, type: 'spend', what: 'hp' }).ok, false, 'ein dritter HP-Ausbau ist nicht möglich (höchstens Stufe 3)');
  const pn = st.pending; s.turn = 0; assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'F' }).ok); assert.equal(pn - st.pending, 1);
  s.turn = 0; const pn2 = st.pending; assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'E' }).ok); assert.equal(pn2 - st.pending, 2, 'zweiter Magie-Kauf kostet 2');
  s.turn = 0; const pn3 = st.pending; assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'F' }).ok); assert.equal(pn3 - st.pending, 3, 'dritter Magie-Kauf kostet 3, auch wenn es nur Stufe 3 ist');
  // ohne priceRise bleibt alles beim Grundpreis
  const t = M.newGame({ seed: 5, rules: { priceRise: 0 } }), ts = t.players[0].stats; ts.gold = 9; t.turn = 0;
  for (let i = 0; i < 2; i++) { t.turn = 0; assert.ok(M.apply(t, { pid: 0, type: 'spend', what: 'hp' }).ok); } assert.equal(ts.gold, 7);
});

test('Kombo mit mehreren Karten der zweiten Farbe: F2, W1, W1 ergibt Hellsicht 2 (Kartenstufen derselben Farbe zählen zusammen)', () => {
  const st = { mag: { F: 3, E: 3, W: 3 }, mana: 9 }, ev = ids => M.evalAttack(st, ids.map(id => Object.assign({ id }, M.parseCard(id))));
  assert.deepEqual([ev(['F2', 'W1', 'W1']).ord.key, ev(['F2', 'W1', 'W1']).ord.lvl], ['hs', 2]);
  assert.equal(ev(['F2', 'W1']).ord.lvl, 1); assert.equal(ev(['F2', 'W1']).ord.key, 'hs', 'Rot + Blau ist die Hellsicht');
  assert.deepEqual([ev(['W1', 'F2', 'F1']).ord.key, ev(['W1', 'F2', 'F1']).ord.lvl], ['wt', 1]);   // andere erste Farbe: Falle (Blau + Rot), Stufe = Minimum der Farbsummen
  assert.deepEqual([ev(['W2', 'F1', 'F1']).ord.key, ev(['W2', 'F1', 'F1']).ord.lvl], ['wt', 2]);
  assert.deepEqual([ev(['W1', 'E1', 'E1']).ord.key, ev(['W1', 'E1', 'E1']).ord.lvl], ['gh', 1]);   // Blau + Grün: Heilung (seit 0.9.9.12)
  assert.equal(ev(['F1', 'F1', 'E2']).ord.lvl, 2); assert.equal(ev(['F1', 'F1', 'E1']).ord.lvl, 1);
});

test('Zuordnung (0.9.9): Die Sekundärfarbe bestimmt den Charakter, die Primärfarbe wählt unter zwei Kombos', () => {
  const st = { mag: { F: 3, E: 3, W: 3 }, mana: 9 }, key = ids => M.evalAttack(st, ids.map(id => Object.assign({ id }, M.parseCard(id)))).ord.key;
  assert.deepEqual([key(['W1', 'F1']), key(['E1', 'F1'])], ['wt', 'ra'], 'Sekundär Rot: Falle, Lähmung');
  assert.deepEqual([key(['F1', 'W1']), key(['E1', 'W1'])], ['hs', 'ws'], 'Sekundär Blau: Hellsicht, Schild');
  assert.deepEqual([key(['F1', 'E1']), key(['W1', 'E1'])], ['gr', 'gh'], 'Sekundär Grün: Läuterung (Rot + Grün), Heilung (Blau + Grün)');
});

test('Ultimate (0.11.0.9): Die Sekundärfarbe (zweite Farbe) bestimmt sie (Rot Todesfluch, Blau Erleuchtung, Grün Meditation), die dritte Farbe löst nur aus', () => {
  const st = { mag: { F: 3, E: 3, W: 3 }, mana: 9 }, el = ids => M.evalAttack(st, ids.map(id => Object.assign({ id }, M.parseCard(id)))).ultiEl;
  assert.equal(el(['W1', 'F1', 'E1']), 'F'); assert.equal(el(['E1', 'F1', 'W1']), 'F');
  assert.equal(el(['F1', 'W1', 'E1']), 'W'); assert.equal(el(['E1', 'W1', 'F1']), 'W');
  assert.equal(el(['F1', 'E1', 'W1']), 'E'); assert.equal(el(['W1', 'E1', 'F1']), 'E');
  assert.equal(el(['F1', 'F1', 'W1', 'E1']), 'W', 'weitere Karten der Primärfarbe ändern die Sekundärfarbe nicht');
});

test('Ultimate: mehrere Karten einer Farbe ergeben zusammen die Stufe (E2, F2, W1, W1 = Ultimate 2)', () => {
  const lv = M.comboLevels({ F: [2], E: [2], W: [1, 1] }, { F: 3, E: 3, W: 3 }, 'E');
  assert.equal(lv.ulti, 2);
  assert.equal(M.comboLevels({ F: [2], E: [2], W: [1] }, { F: 3, E: 3, W: 3 }, 'E').ulti, 1);
});

test('Läuterung kann auch eigene Nachziehtokens zerstören (ohne Gutschrift)', () => {
  const { s, me } = combatSetup(11, ['F1', 'E1']);
  me.stats.freeDraws = 2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['st'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.freeDraws, 1, 'ein eigener Token zerstört, kein neuer gutgeschrieben');
});

test('Todesfluch aus der Verteidigung wirkt nicht sofort, sondern erst in der nächsten Angriffsphase des Verfluchten', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  op.stats.limit = 3; op.stats.mana = 9;
  op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: ['F3', 'W2', 'E2'][i] || x.id }); });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const hp0 = me.stats.hp;
  [1, 0, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));   // zweite Karte F3: Feuer-Ultimate
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
  assert.ok(me.stats.death >= 1);
  assert.ok(me.stats.hp >= hp0 - 5 && !s.log.slice(-6).some(e => /Todesfluch: /.test(e.txt)), 'kein Fluchschaden am Ende dieser Phase');
});

test('Pluswürfel „Magie“: eine Magiestufe mehr auf der Folgemagie des Monsters (das überlegene Element: Feuer → Wasser, Erde → Feuer, Wasser → Erde), mit passender Karte', () => {
  const D = M.MONSTER.variants.dice, st = M.newGame({ seed: 9, ai: [true, true] });
  const save = D.plus.slice(), saveMinus = D.minus.slice(), mag = D.plus.find(f => f.k === 'mag'), none = D.minus.find(f => f.k === 'none');
  D.plus.fill(mag); D.minus.fill(none);
  try {
    for (const stage of [1, 2]) {
      const r = M.spawnMonsters(stage, st.rng);
      for (const k of Object.keys(r)) {
        const m = r[k], S = M.MONSTER.profile[m.el].secondary, b = M.spawnMonsters(stage)[m.el];   // b: feste Grundform ohne Würfel desselben Elements
        assert.equal(m.stats.mag[S], Math.min(3, b.stats.mag[S] + 1), 'Stufe ' + stage + ' ' + m.el + ': Folgemagie ' + S + ' +1');
        assert.ok(m.deckIds.some(id => id === S + m.stats.mag[S]), 'eine Karte der neuen Stufe ist ohnehin im Deck');
        assert.equal(m.stats.limit, b.stats.limit, 'das Limit bleibt unberührt');
      }
    }
  } finally { D.plus.splice(0, D.plus.length, ...save); D.minus.splice(0, D.minus.length, ...saveMinus); }
});

test('Monster-Hand ist höchstens so groß wie die der Spieler (Stufe III: Limit 4, Hand 5, 7 HP)', () => {
  const r = M.spawnMonsters(3);
  for (const k of Object.keys(r)) { assert.equal(M.monsterHand(r[k]), M.MAX_SLOTS); assert.equal(r[k].stats.maxHp, 7); assert.equal(r[k].stats.limit, 4); }
});

test('Monsterkarte (Weltphase): die Standardwerte base enthalten auch die Magie ohne Würfelbonus', () => {
  const D = M.MONSTER.variants.dice, st = M.newGame({ seed: 9, ai: [true, true] });
  const save = D.plus.slice(), saveMinus = D.minus.slice(), mag = D.plus.find(f => f.k === 'mag'), none = D.minus.find(f => f.k === 'none');
  D.plus.fill(mag); D.minus.fill(none);
  try {
    const r = M.spawnMonsters(2, st.rng);
    for (const k of Object.keys(r)) { const m = r[k], S = M.MONSTER.profile[m.el].secondary; assert.equal(m.stats.mag[S], m.base.mag[S] + 1, 'mit Würfel +1'); assert.deepEqual(m.base.mag, { F: m.el === 'F' ? 3 : m.el === 'E' ? 2 : 1, E: m.el === 'E' ? 3 : m.el === 'W' ? 2 : 1, W: m.el === 'W' ? 3 : m.el === 'F' ? 2 : 1 }); }   // Haupt 3, Nebenelement (überlegen) 2, drittes 1
  } finally { D.plus.splice(0, D.plus.length, ...save); D.minus.splice(0, D.minus.length, ...saveMinus); }
});

test('Vorschau Verteidigung (Verteidigen/Passen) stimmt mit der tatsächlichen Ausführung überein, auch mit Spiegel und Rückwurf', () => {
  for (const [mode, mirror, hand, mark] of [['defend', 0, ['W2'], 0], ['pass', 0, ['W2'], 0], ['pass', 2, ['W2'], 0], ['defend', 2, ['W3'], 0], ['defend', 0, [], -1]]) {
    const { s, c, me, op } = combatSetup(11, hand);
    me.stats.hp = 6; op.stats.hp = 6; c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'F'; c.pending = mode === 'defend' && mirror ? 1 : 3;
    if (mirror) me.stats.mirrorEl = { F: mirror }, me.stats.mirror = mirror;
    if (mark >= 0) M.apply(s, { pid: 0, type: 'mark', slot: 0 });
    const pv = M.previewDefense(s, mode === 'pass'), mana0 = me.stats.mana;
    assert.ok(pv, mode + ': Vorschau vorhanden'); assert.equal(pv.who, 0);
    assert.ok(M.apply(s, { pid: 0, type: mode }).ok);
    assert.equal(me.stats.hp, pv.hpAfter, mode + ' (Spiegel ' + mirror + '): HP des Verteidigers');
    assert.equal(op.stats.hp, pv.attHpAfter, mode + ' (Spiegel ' + mirror + '): HP des Angreifers (Rückwurf)');
    assert.equal(mana0 - me.stats.mana, pv.cost, mode + ': Mana-Kosten');
  }
});

test('Vorschau Verteidigung: nur im Verteidigungszug, nicht bei zu wenig Mana', () => {
  const { s, c, me } = combatSetup(11, ['W2', 'F1']);
  assert.equal(M.previewDefense(s, false), null, 'Angriffszug: keine Verteidigungsvorschau');
  c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'F'; c.pending = 2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });   // Wasser + Feuer: Kombokarte kostet 1 Mana
  me.stats.mana = 0;
  assert.equal(M.previewDefense(s, false), null, 'ohne Mana nicht ausführbar');
  assert.ok(M.previewDefense(s, true), 'Passen geht immer');
});

test('Vorschau Nachziehen: Strafe nur bei rotem Marker (Weltphase Gold für den Gegner, Kampf Mana für den Nachziehenden)', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 });
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  assert.equal(M.drawGoldPenalty(s, 0), 0, 'grüner Marker: keine Strafe');
  assert.equal(M.drawManaCost(s, 0), 0, 'Weltphase: keine Manakosten');
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(M.drawGoldPenalty(s, 0), 1, 'roter Marker: der Gegner bekäme 1 Gold');
  const { s: k, me } = combatSetup(11, ['F1']); k.rules.drawMarker = 1;
  assert.equal(M.drawGoldPenalty(k, 0), 0, 'im Kampf nie Gold');
  assert.ok(M.apply(k, { pid: 0, type: 'draw' }).ok); assert.ok(M.apply(k, { pid: 1, type: 'draw' }).ok);
  assert.equal(M.drawManaCost(k, 0), 1, 'roter Marker im Kampf: 1 Mana');
  assert.ok(me);
});

// ---- Version 0.4 ----
test('Monster: Das Nebenelement (Folgemagie) ist das überlegene Element (Feuer → Wasser, Erde → Feuer, Wasser → Erde)', () => {
  for (const el of M.ELEMENTS) {
    const S = M.MONSTER.profile[el].secondary;
    assert.equal(S, M.SUPERIOR[el], el + ': Nebenelement ist das überlegene Element');
    for (const stage of [1, 2, 3]) {
      const m = M.spawnMonsters(stage)[el], mag = m.stats.mag;
      assert.equal(mag[el], stage === 1 ? 2 : 3, 'Hauptmagie');
      if (stage > 1) { assert.equal(mag[S], 2, 'Nebenmagie 2'); assert.equal(mag[M.ELEMENTS.find(e => e !== el && e !== S)], 1, 'drittes Element 1'); }
      assert.ok(m.deckIds.some(id => id[0] === S), stage + ' ' + el + ': Karten der Nebenfarbe im Deck');
    }
  }
});

test('Heilung der Verteidigung wirkt nach dem Schaden (seit 0.5.4, nur bis zum Maximum)', () => {
  const { s, c, me } = combatSetup(11, ['W3', 'E3']);   // gegen Feuer verteidigt Wasser (überlegen, gratis), Erde ist Kombokarte: Heilung 3 (Blau + Grün)
  me.stats.hp = 8; me.stats.maxHp = 9; c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'F'; c.pending = 6;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  const pv = M.previewDefense(s, false);
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.hp, 8, '8 − 3 Restschaden = 5, danach Heilung 3 (seit 0.4 bis 0.5.3 wären es 6)');
  assert.equal(pv.hpAfter, 8, 'Vorschau stimmt');
  const txt = s.log.map(l => l.txt), iD = txt.findIndex(t => /verteidigt/.test(t)), iH = txt.findIndex(t => /heilt nach der Verteidigung/.test(t));
  assert.ok(iD >= 0 && iH > iD, 'Protokoll: erst die Verteidigung, dann die Heilung');
  assert.equal(s.log.find(l => /verteidigt/.test(l.txt)).fx.hpPre[0], 8, 'HP vor dem Schaden, ohne Heilung');
  assert.ok(s.log[iH].fx.every(f => f.late && f.kind === 'lifeflow'), 'Heilungseffekt läuft nach der Verteidigung');
});

test('Heilung nach dem Schaden verfällt, wenn der Verteidiger durch den Schaden auf 0 HP fällt (seit 0.7.6.2)', () => {
  const { s, c, me } = combatSetup(11, ['F3', 'E3']);
  me.stats.hp = 1; me.stats.maxHp = 9; c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'E'; c.pending = 4;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.equal(M.previewDefense(s, false).hpAfter, 0, 'Vorschau: tot, keine Heilung');
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.hp, 0, '1 − 1 Restschaden = 0 HP: besiegt, die Heilung verfällt');
  assert.ok(!s.log.some(l => /heilt nach der Verteidigung/.test(l.txt)), 'keine Heilung im Protokoll');
});

test('Heilung nach dem Schaden greift, wenn der Verteidiger den Schaden überlebt (seit 0.7.6.2)', () => {
  const { s, c, me } = combatSetup(11, ['W3', 'E3']);
  me.stats.hp = 2; me.stats.maxHp = 9; c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'F'; c.pending = 4;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.ok(s.combat, 'der Kampf geht weiter');
  assert.equal(me.stats.hp, 4, '2 − 1 Restschaden + 3 Heilung');
});

test('Läuterung in der Verteidigung: Wahl per lfp (eigener Spiegelmarker, eigenes Nachziehtoken), danach wieder frei', () => {
  const { s, c, me, op } = combatSetup(11, ['F1', 'E1']);   // Feuer + Erde: Läuterung 1
  c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'F'; c.pending = 1;
  me.stats.mirrorEl = { F: 1, E: 0, W: 0 }; me.stats.mirror = 1; me.stats.freeDraws = 1; op.stats.mirrorEl = { F: 0, E: 1, W: 0 }; op.stats.mirror = 1;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['st'] }).ok, 'Wahl ist in der Verteidigung erlaubt');
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.freeDraws, 0, 'eigenes Nachziehtoken zerstört, nicht gutgeschrieben');
  assert.equal(op.stats.mirror, 1, 'gegnerischer Spiegel bleibt');
  assert.equal(s.combat.lfp, null, 'die Wahl gilt nur für diese Verteidigung');
});

test('Schild der Verteidigung wirkt erst nach ihr (wie die Heilung, seit 0.7.2.23; Schild seit 0.8)', () => {
  const { s, c, me } = combatSetup(11, ['E3', 'W3']);   // Erde verteidigt gegen Wasser (überlegen), Blau als Kombokarte: Schild 3
  me.stats.hp = 9; c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'W'; c.pending = 5;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  const pv = M.previewDefense(s, false);
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.hp, 7, 'Block 3, das neue Schild mindert die fehlenden 2 noch nicht');
  assert.equal(me.stats.rainbow, 3, 'das Schild steht danach mit voller Ladung');
  assert.equal(pv.hpAfter, 7, 'Vorschau stimmt');
});

test('Ausgleich nach einer Monsterniederlage: nur der Verlierer, nur Gold (1/2/3 je Abschnitt)', () => {
  assert.deepEqual([M.DEFAULT_RULES.lossGold, M.DEFAULT_RULES.lossPoints, M.DEFAULT_RULES.lossBoth], [[0, 1, 2, 3], [0, 0, 0, 0], 0]);
  for (const [rules, stage, to] of [[{}, 1, [1, 0]], [{}, 2, [2, 0]], [{}, 3, [3, 0]], [{ lossBoth: 1 }, 2, [2, 2]]]) {
    const { s, c, me, op } = combatSetup(11, [], { limit: 2 });
    s.stage = stage; Object.assign(s.rules, rules);
    me.stats.hp = 1; const g0 = s.players.map(p => p.stats.gold), up0 = s.players.map(p => p.stats.pending), sp0 = s.players[0].sp;
    op.deck.hand[0] = Object.assign({}, op.deck.hand[0], { id: 'F3' }); op.stats.mana = 5; op.stats.mag.F = 3;
    assert.ok(M.apply(s, { pid: 0, type: 'pass' }).ok);   // der Angreifer lässt aus, das Monster greift an
    assert.ok(M.apply(s, { pid: 1, type: 'mark', slot: 0 }).ok); assert.ok(M.apply(s, { pid: 1, type: 'attack' }).ok);
    const r = M.apply(s, { pid: 0, type: 'pass' });
    assert.ok(r.ok && r.combatEnd && r.combatEnd.winner === 'b', 'das Monster gewinnt');
    assert.deepEqual(s.players.map((p, i) => p.stats.gold - g0[i]), to, 'Gold: Verlierer ' + to[0] + (to[1] ? ', Gegner ' + to[1] : ', Gegner nichts') + ' (Abschnitt ' + stage + ')');
    assert.deepEqual(s.players.map((p, i) => p.stats.pending - up0[i]), [0, 0], 'keine Upgrade-Punkte');
    assert.equal(s.players[0].sp, Math.max(0, sp0 - 1), 'der Angreifer verliert 1 Siegpunkt');
  }
});

test('Abschnittsbonus: 3 Gold (Abschnitt 1), 6 (2), 9 (3) und keine Upgrade-Punkte', () => {
  const s = M.newGame({ seed: 5, ai: [false, false] });
  assert.deepEqual(s.players.map(p => [p.stats.gold, p.stats.pending]), [[3, 0], [3, 0]]);
  assert.deepEqual(M.DEFAULT_RULES.stageGold, [0, 3, 6, 9]); assert.deepEqual(M.DEFAULT_RULES.stagePoints, [0, 0, 0, 0]);
});

test('Jede Entwicklung der Spieler ist auf Stufe 3 begrenzt (zwei Ausbauten), Kosten 1 und 2 Gold (0.5.1)', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0], st = p.stats;
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  assert.deepEqual([M.MAX_LIMIT, M.MAX_SLOTS, M.MAX_DRAW_LIMIT, M.MAX_UPGRADES, M.MAX_MAGIC], [3, 5, 3, 2, 3]);
  st.gold = 40;
  const run = what => { const out = []; for (let i = 0; i < 3; i++) { s.turn = 0; const g = st.gold, r = M.apply(s, { pid: 0, type: what === 'drawlimit' ? 'drawlimit' : 'spend', what }); out.push(r.ok ? g - st.gold : null); } return out; };
  assert.deepEqual(run('limit'), [1, 2, null], 'Ausspiellimit 1 → 3');
  assert.equal(st.limit, 3);
  assert.deepEqual(run('slot'), [1, 2, null], 'Handplätze 3 → 5');
  assert.equal(p.slots, 5);
  assert.deepEqual(run('hp'), [1, 2, null], 'max. HP 4 → 8');
  assert.equal(st.maxHp, 8);
  assert.deepEqual(run('mana'), [1, 2, null], 'max. Mana 4 → 6');
  assert.equal(st.maxMana, 6);
  assert.deepEqual(run('drawlimit'), [1, 2, null], 'Nachziehlimit 1 → 3');
  assert.equal(st.drawLimit, 3);
});

test('Karten lassen sich unabhängig von der entwickelten Magie kaufen (0.7): F3 mit Magie 1', () => {
  const s = M.newGame({ seed: 9, ai: [false, false], first: 0 }), me = s.players[0], d = me.deck;
  me.stats.limit = 2; me.stats.mag = { F: 1, E: 1, W: 1 }; s.supply.F3 = 4;
  d.hand[0] = Object.assign({}, d.hand[0], { id: 'F2' }); d.hand[1] = Object.assign({}, d.hand[1], { id: 'F2' }); d.marks = [];
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.vendorOffers(s, 0).some(o => o.result === 'F3' && o.available), 'F3 wird angeboten');
  assert.ok(M.apply(s, { pid: 0, type: 'vendor', result: 'F3', cost: ['F2', 'F2'] }).ok);
});

test('Gold opfern ohne Obergrenze (0.7): auch 9 Gold auf einmal', () => {
  const s = M.newGame({ seed: 9, ai: [false, false], first: 0 }), me = s.players[0];
  me.stats.gold = 9;
  assert.ok(M.apply(s, { pid: 0, type: 'temple', amount: 9 }).ok);
  assert.equal(me.stats.gold, 0); assert.ok(me.temple.level >= 4, 'Tempelstufe wächst mit der großen Spende');
});

test('Ultimate im Angriff nach Sekundärfarbe: Erde legt Heilmarker, der am Ende der eigenen Angriffsphase heilt', () => {
  const { s, me, op } = combatSetup(11, ['F2', 'E2', 'W2']);
  me.stats.maxHp = 9; me.stats.hp = 2;
  [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: 0, type: 'mark', slot: i }).ok));
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.heal, 2, 'Heilmarker Stufe 2 bei mir'); assert.equal(op.stats.death || 0, 0, 'kein Todesfluch für den Gegner');
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(me.stats.hp, 2, 'Meditation wirkt wie der Todesfluch nicht in der Phase, in der er gelegt wurde (seit 0.7.2.8)');
  assert.equal(me.stats.healPhase, undefined, 'Phasenmerker gelöscht');
  const hp0 = me.stats.hp; s.combat.sides[s.combat.turn === 'a' ? 'a' : 'b'];
  // nächste eigene Angriffsphase: Gegner ist am Zug, danach wieder ich; am Ende meiner Phase heilt der Marker
  assert.equal(s.combat.sides[s.combat.turn].ctrl, op.ctrl, 'Gegner am Zug'); assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(s.combat.sides[s.combat.turn].ctrl, me.ctrl, 'ich am Zug'); assert.ok(M.apply(s, { pid: 0, type: 'pass' }).ok);
  assert.equal(me.stats.hp, hp0 + 2, 'Meditation: +2 HP am Ende der nächsten eigenen Angriffsphase');
});

test('Ultimate im Angriff: Wasser legt Manamarker der Stufe S bei mir', () => {
  const { s, me, op } = combatSetup(11, ['F2', 'W2', 'E2']);
  [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: 0, type: 'mark', slot: i }).ok));
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.manaflow, 2); assert.equal(op.stats.death || 0, 0);
});

test('Erleuchtung: am Ende der eigenen Angriffsphase +S Mana (höchstens bis zum Maximum), nur Marker, die zu Beginn der Phase lagen', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  me.stats.manaflow = 2; me.stats.mana = 4; me.stats.maxMana = 9; op.stats.hp = op.stats.maxHp = 9;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(me.stats.mana, 4 - 1 + 2, 'Angriff kostet 1, die Erleuchtung bringt 2');
  const t = combatSetup(11, ['F1']); t.me.stats.manaflow = 3; t.me.stats.mana = 9; t.me.stats.maxMana = 9;
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.ok(M.apply(t.s, { pid: t.op.ctrl, type: 'pass' }).ok);
  assert.equal(t.me.stats.mana, 9, 'nicht über das Maximum');
});

test('Ultimate in der Verteidigung: Erde legt Heilmarker, Wasser Manamarker (jeweils beim Verteidiger)', () => {
  for (const [att, def, key] of [['E1', ['F3', 'E2', 'W2'], 'heal'], ['F1', ['F3', 'W2', 'E2'], 'manaflow']]) {
    const { s, me, op } = combatSetup(11, [att]);
    op.stats.limit = 3; op.stats.mana = 9;
    op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: def[i] || x.id }); });
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));
    assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
    assert.ok(op.stats[key] >= 1, key + ' beim Verteidiger'); assert.equal(me.stats.death || 0, 0, 'kein Todesfluch');
  }
});

test('Schild wirkt gegen jede Farbe und verliert dabei Ladungen (seit 0.7.2.2, Ladungen seit 0.8)', () => {
  for (const att of ['F2', 'E2', 'W2']) {
    const { s, op } = combatSetup(11, [att]);
    op.stats.rainbow = 2; op.stats.hp = op.stats.maxHp = 9;
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
    assert.equal(op.stats.hp, 9, att + ': der Schild gleicht den Schaden aus'); assert.ok((op.stats.rainbow || 0) < 2, att + ': er verliert Stufen');
  }
});


test('Läuterung entfernt Heilmarker und Prismen des Gegners', () => {
  const { s, me, op } = combatSetup(11, ['F3', 'E3']);
  op.stats.heal = 2; op.stats.rainbow = 1; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['oh', 'oh', 'or'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(op.stats.heal || 0, 0); assert.equal(op.stats.rainbow || 0, 0); assert.equal(me.stats.freeDraws, 3);
});

test('Strafe des Nachziehmarkers wächst mit der Spielstufe (0.7): Grundwert mal Abschnitt, für Gold und Mana', () => {
  const s = M.newGame({ seed: 9, ai: [false, false], first: 0 });
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  s.players[0].drawRed = true;
  for (const st of [1, 2, 3]) {
    s.stage = st;
    assert.equal(M.drawGoldPenalty(s, 0), st * (s.rules.drawPenaltyGold || 0), 'Gold in Abschnitt ' + st);
    assert.equal(M.drawPenaltyAmount(s, 'Mana'), st * (s.rules.drawPenaltyMana ?? 1), 'Mana in Abschnitt ' + st);
  }
  s.stage = 3; const q = s.players[1].stats, g0 = q.gold; s.turn = 0;
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(q.gold - g0, 3 * (s.rules.drawPenaltyGold || 0), 'der Gegner erhält die Strafe von Abschnitt 3');
});

test('Fallenwahl (zuvor Abwerfen nach Zerrüttung) ist kein Zug: Zugzähler, Passen-Zähler, Nachziehmarker und Seite am Zug bleiben unverändert (0.7.6.3)', () => {
  const { s, c, me, op } = combatSetup(11, ['W1', 'F1']);
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(c.forced && c.forced.kind === 'trap', 'Falle: der Spieler wählt eine der gezogenen Karten');
  const snap = () => JSON.stringify({ turn: c.turn, action: c.action, turns: c.turns, tot: s.combatTurnsTotal, passed: [me.passed, op.passed], marker: s.players.map(p => [p.drawN, p.drawRed]), mons: [c.sides.b.monster && c.sides.b.monster.drawN, c.sides.b.monster && c.sides.b.monster.drawRed] });
  const before = snap(), pid = c.forced.pid, side = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b;
  const slots = [0];
  assert.ok(M.apply(s, { pid, type: 'fd', slots }).ok);
  assert.equal(c.forced, null);
  assert.equal(snap(), before, 'die Fallenwahl ändert nichts am Zugablauf');
});

test('Magie kaufen und Upgrades sind keine Aktion mehr: der Spieler bleibt am Zug, der Marker ändert sich nicht (0.9.3)', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0], st = p.stats;
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  st.gold = 12; st.pending = 6; st.mag.F = 1;
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);   // Marker von Spieler 0 rot
  assert.equal(s.turn, 0); assert.equal(p.drawRed, true);
  const t0 = s.worldTurns, idle0 = s.idleTurns;
  const mg = M.apply(s, { pid: 0, type: 'magic', elem: 'F' }); assert.ok(mg.ok, 'Magie kaufen');
  assert.ok(M.apply(s, { pid: 0, type: 'spend', what: 'hp' }).ok, 'HP-Upgrade');
  assert.ok(M.apply(s, { pid: 0, type: 'spend', what: 'mana' }).ok, 'Mana-Upgrade');
  assert.ok(M.apply(s, { pid: 0, type: 'temple', amount: 1 }).ok, 'Opfern');
  assert.equal(s.turn, 0, 'weiter am Zug'); assert.equal(p.drawRed, true, 'Marker unverändert');
  assert.equal(s.worldTurns, t0, 'kein Zug gezählt'); assert.equal(s.idleTurns, idle0, 'Stillstandszähler unverändert');
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); assert.equal(s.turn, 1, 'Nachziehen beendet den Zug');
});

test('Opfern im Tempel ist kein Zug: der Spieler bleibt am Zug, der Nachziehmarker ändert sich nicht (0.7.6.4)', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0];
  s.rules.drawMarker = 1;   // 0.12: der Nachziehmarker ist standardmäßig aus; dieser Test prüft die Regel
  p.stats.gold = 6; assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);   // Spieler 0 zieht nach (Marker rot), dann Spieler 1
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.equal(s.turn, 0); assert.equal(p.drawRed, true);
  assert.ok(M.apply(s, { pid: 0, type: 'temple', amount: 2 }).ok);
  assert.equal(s.turn, 0, 'weiter am Zug'); assert.equal(p.drawRed, true, 'Marker unverändert'); assert.equal(p.stats.gold, 4);
  assert.ok(M.apply(s, { pid: 0, type: 'temple', amount: 1 }).ok, 'mehrfaches Opfern im selben Zug');
  assert.equal(s.turn, 0);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); assert.equal(s.turn, 1, 'eine andere Aktion beendet den Zug');
});

test('Kampfrunden: nach 20 Runden (je ein Angriffszug jeder Seite) endet der Kampf unentschieden (0.7.6.5)', () => {
  const { s, c } = combatSetup(11, ['F1']); s.rules.maxRounds = 20; s.rules.exhaustRounds = 0;   // Rundenlimit optional (Standard seit 0.7.7.2: aus)
  const ctrl = k => c.sides[k].ctrl;
  for (let i = 1; i <= 39; i++) {
    const r = M.apply(s, { pid: ctrl(c.turn), type: 'pass' });
    assert.ok(r.ok, 'Passen ' + i); assert.ok(s.combat, 'Kampf läuft nach Angriffszug ' + i);
  }
  assert.equal(c.atkTurns, 39);
  const hp = [c.sides.a.stats.hp, c.sides.b.stats.hp];
  assert.ok(M.apply(s, { pid: ctrl(c.turn), type: 'pass' }).ok);
  assert.equal(s.combat, null, 'nach dem 40. Angriffszug (20 Runden) ist der Kampf beendet');
  assert.equal(s.lastCombat.reason, 'rounds'); assert.equal(s.lastCombat.winner, null);
  assert.ok(s.log.some(l => /Nach 20 Kampfrunden endet der Kampf unentschieden/.test(l.txt)));
  assert.ok(hp[0] > 0 && hp[1] > 0);
});

test('Kampfrunden: ein Angriff im letzten Angriffszug wird erst verteidigt, dann endet der Kampf; fällt jemand auf 0 HP, entscheidet das (0.7.6.5)', () => {
  const { s, c, me, op } = combatSetup(11, ['F1', 'F1']); s.rules.maxRounds = 20; s.rules.exhaustRounds = 0;
  c.atkTurns = 39; c.turn = 'a'; c.action = 'attack';
  M.apply(s, { pid: 0, type: 'mark', slot: 0 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(s.combat, 'Verteidigung steht noch aus'); assert.equal(c.action, 'defense');
  assert.ok(M.apply(s, { pid: c.sides[c.turn].ctrl, type: 'pass' }).ok);
  assert.equal(s.combat, null); assert.equal(s.lastCombat.reason, 'rounds');
  // Variante: der letzte Angriff tötet
  const t = combatSetup(11, ['F3', 'F3']); t.s.rules.maxRounds = 20; t.s.rules.exhaustRounds = 0;
  t.c.atkTurns = 39; t.op.stats.hp = 1; M.apply(t.s, { pid: 0, type: 'mark', slot: 0 });
  assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok); assert.ok(M.apply(t.s, { pid: t.c.sides[t.c.turn].ctrl, type: 'pass' }).ok);
  assert.equal(t.s.lastCombat.reason, 'hp'); assert.equal(t.s.lastCombat.winner, 'a');
});

test('Kampfrunden: maxRounds 0 (Standard seit 0.7.7.2) schaltet die Begrenzung ab (0.7.6.5)', () => {
  const s = M.newGame({ seed: 11, ai: [false, false], first: 0, rules: { maxRounds: 0, exhaustRounds: 0 } });
  M.apply(s, { pid: 0, type: 'combat', elem: 'F' }); const c = s.combat;
  for (let i = 0; i < 30; i++) assert.ok(M.apply(s, { pid: c.sides[c.turn].ctrl, type: 'pass' }).ok);
  assert.ok(s.combat, 'Kampf läuft weiter');
});

test('Erschöpfung: nach je 10 Kampfrunden steigt sie um 1, beide Seiten verlieren am Ende ihres Angriffszugs entsprechend HP (0.7.7.2)', () => {
  const { s, c } = combatSetup(11, ['F1']);
  assert.equal(s.rules.maxRounds, 0, 'kein Rundenlimit mehr'); assert.equal(s.rules.exhaustRounds, 10, 'Standard 10 (0.9.7.1)');
  c.sides.a.stats.hp = c.sides.a.stats.maxHp = 100; c.sides.b.stats.hp = c.sides.b.stats.maxHp = 100;
  const pass = () => assert.ok(M.apply(s, { pid: c.sides[c.turn].ctrl, type: 'pass' }).ok && true);
  for (let i = 0; i < 20; i++) pass();   // Runde 1–10
  assert.equal(c.sides.a.stats.hp, 100); assert.equal(c.sides.b.stats.hp, 100, 'bis Runde 10 keine Erschöpfung');
  pass(); assert.equal(c.sides.a.stats.hp, 99, 'Runde 11: Seite a verliert 1 HP'); assert.equal(c.sides.b.stats.hp, 100);
  pass(); assert.equal(c.sides.b.stats.hp, 99, 'Runde 11: Seite b verliert 1 HP');
  assert.ok(s.log.some(l => /Erschöpfung 1: .* verliert 1 HP/.test(l.txt)));
  for (let i = 0; i < 18; i++) pass();   // bis einschließlich Runde 20
  assert.equal(c.sides.a.stats.hp, 90); assert.equal(c.sides.b.stats.hp, 90);
  pass(); assert.equal(c.sides.a.stats.hp, 88, 'Runde 21: Erschöpfung 2');
  pass(); assert.equal(c.sides.b.stats.hp, 88);
});

test('Erschöpfung: sie beendet einen festgefahrenen Kampf; fällt eine Seite auf 0 HP, verliert sie (0.7.7.2)', () => {
  const { s, c } = combatSetup(11, ['F1']);
  c.sides.a.stats.hp = 3; c.sides.a.stats.maxHp = 3; c.sides.b.stats.hp = 100; c.sides.b.stats.maxHp = 100;
  let n = 0;
  while (s.combat && n < 400) { assert.ok(M.apply(s, { pid: s.combat.sides[s.combat.turn].ctrl, type: 'pass' }).ok); n++; }
  assert.equal(s.combat, null, 'Kampf endet'); assert.equal(s.lastCombat.reason, 'hp'); assert.equal(s.lastCombat.winner, 'b');
  assert.ok(n < 200, 'in endlich vielen Zügen');
});

test('Vorzeitiges Ende: wer nach einem Showdown mindestens 4 Siegpunkte Vorsprung hat, gewinnt sofort; 4 : 1 genügt nicht (0.7.7.3)', () => {
  assert.equal(M.DEFAULT_RULES ? M.DEFAULT_RULES.winLead : 4, 4);
  let early = 0, cont = 0;
  for (let seed = 8000; seed < 8030; seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1 });
    let steps = 0, shown = 0;
    while (!s.over && steps++ < 20000) {
      if (!AI.runTurn(s, M.actor(s)).ok) break;
      if (s.showdown > shown) {   // ein Showdown wurde gerade beendet
        shown = s.showdown;
        const [a, b] = s.players.map(p => p.sp);
        if (Math.abs(a - b) >= 4) { assert.ok(s.over, 'Vorsprung ab 4 Siegpunkten beendet das Spiel sofort (Showdown ' + shown + ', ' + a + ':' + b + ')'); early++; assert.equal(s.winner, a > b ? 0 : 1); }
        else if (shown < 3) { assert.ok(!s.over, 'ohne Vorsprung von 4 geht es weiter (' + a + ':' + b + ')'); cont++; }
      }
    }
    assert.ok(s.over);
  }
  assert.ok(early > 0 && cont > 0, 'beide Fälle kamen vor: ' + early + '/' + cont);
});

test('Vorzeitiges Ende: bei 4 : 1 (Vorsprung 3) geht es weiter, bei 5 : 1 und 4 : 0 endet das Spiel (0.7.7.3)', () => {
  // Showdown 1 erreichen, Siegpunkte vorgeben, Seite a verliert den Showdown (b gewinnt: +1, a: −1)
  const play = (before, after) => {
    const s = M.newGame({ seed: 4, ai: [true, true], first: 0 });
    let steps = 0; while (!s.over && !(s.phase === 'combat' && s.combat.mode === 'showdown') && steps++ < 20000) if (!AI.runTurn(s, M.actor(s)).ok) break;
    const c = s.combat, w = c.sides.b.ctrl, l = c.sides.a.ctrl;
    s.players[w].sp = before[0]; s.players[l].sp = before[1];
    c.sides.a.stats.hp = 1; c.turn = 'a'; c.action = 'defense'; c.afterAtk = true; c.color = 'F'; c.pending = 99; c.sides.a.stats.mirror = 0;
    c.sides.a.stats.mirrorEl = undefined; c.sides.a.stats.rainbow = 0;
    assert.ok(M.apply(s, { pid: l, type: 'pass' }).ok);
    assert.equal(s.lastCombat.winner, 'b');
    assert.deepEqual([s.players[w].sp, s.players[l].sp], after);
    return { s, w };
  };
  const r41 = play([3, 2], [4, 1]); assert.ok(!r41.s.over, '4 : 1 (Vorsprung 3): das Spiel geht weiter');
  const r51 = play([4, 2], [5, 1]); assert.ok(r51.s.over && r51.s.winner === r51.w, '5 : 1 (Vorsprung 4): Spielende');
  const r40 = play([3, 1], [4, 0]); assert.ok(r40.s.over && r40.s.winner === r40.w, '4 : 0 (Vorsprung 4): Spielende');
});


test('Echo digital: kein Marker mehr, die Schlange der Echo-Farbe bekommt Wellen (EchoWave, 0.9.4)', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', '12a-echo-welle.js'), 'utf8');
  const kit = src.slice(src.indexOf('/* ECHOWAVE BEGIN */'), src.indexOf('/* ECHOWAVE END */'));
  const EW = new Function(kit + '; return EchoWave;')();   // ohne document: inject() ist dann ein Nullbefehl
  assert.equal(EW.html(null, 120), '', 'ohne Echo keine Ebene');
  for (const e of ['F', 'E', 'W']) {
    const h = EW.html(e, 120, {}, 0);
    assert.ok(h.includes('class="echow" data-el="' + e + '"'), 'Ebene für ' + e);
    assert.equal((h.match(/class="ewv"/g) || []).length, EW.DEFAULTS.waves * 2, 'Wellen mit hellem Kern');
  }
  assert.equal(EW.html('F', 120, { on: false }), '', 'abschaltbar');
  assert.equal((EW.html('E', 120, { waves: 0 }, 0).match(/class="ewv"/g) || []).length, 0, '0 Wellen: nur Leuchten');
  assert.notEqual(EW.html('F', 120, {}, 0), EW.html('E', 120, {}, 0), 'Ausschnitt und Farbe je Schlange');
  const ui = ['12-hilfen.js', '16-seitenleisten.js', '18-kampf.js', '26a-darstellung.js', '26c-startseite.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', f), 'utf8')).join('\n');
  assert.ok(!/echoToken|placeEchoTokens|echotok/.test(ui), 'der Echo-Marker ist digital entfernt');
  assert.ok(/EchoWave\.html\(echo, size\)/.test(ui), 'boardHTML ruft die Echo-Ebene auf');
});

test('Versionsnummer: eine Konstante (MAGUS_VERSION) speist Menü-Link und Über-Seite, das Regelwerk hat einen Eintrag dazu (0.7.7.4)', () => {
  const fs = require('fs'), path = require('path');
  const src = ['01-versionen.js', '26c-startseite.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', f), 'utf8')).join('\n');   // seit 0.13.1 stehen Nummer und Versionstexte in 01-versionen.js, die Startseite in 26c-startseite.js
  const v = (src.match(/const MAGUS_VERSION = '([0-9.]+)'/) || [])[1];
  assert.ok(v, 'Konstante vorhanden');
  assert.ok(!/Neu in Version [0-9]/.test(src), 'keine fest eingetragene Versionsnummer in „Neu in Version“');
  assert.equal((src.match(/Neu in Version ' \+ MAGUS_VERSION/g) || []).length, 2, 'Menü-Link und Über-Seite');
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'regelwerk.md'), 'utf8');
  assert.ok(doc.includes('## Änderung ' + v + ' '), 'Regelwerk-Eintrag für ' + v);
});

test('KI: Überschussgold fließt in Magie, es sammelt sich nicht über 100 Gold an (0.7.7.5)', () => {
  let maxGold = 0, mag = 0, n = 0;
  for (let seed = 21; seed < 41; seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1 });
    let steps = 0; while (!s.over && steps++ < 30000) if (!AI.runTurn(s, M.actor(s)).ok) break;
    assert.ok(s.over);
    s.players.forEach(p => { maxGold = Math.max(maxGold, p.stats.gold); mag += M.magicProgress(p); n++; });
  }
  assert.ok(maxGold < 60, 'Endgold bleibt klein, höchstens ' + maxGold);
  assert.ok(mag / n > 1, 'die KI kauft Magie, im Mittel Fortschritt ' + (mag / n).toFixed(2));
});

test('KI: Tempelopfer nur mit Ergebnis, jedes Opfer wird im selben Zug von einem Magiekauf gefolgt (0.7.7.8)', () => {
  let n = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1 });
    let steps = 0;
    while (!s.over && steps++ < 30000) {
      const r = AI.runTurn(s, M.actor(s)); if (!r.ok) break;
      const acts = r.acts || [];
      acts.forEach((a, i) => { if (a.type === 'temple') { n++; assert.equal(acts[i + 1] && acts[i + 1].type, 'magic', 'Opfer von ' + a.amount + ' Gold ohne Magiekauf (Seed ' + seed + ')'); } });
    }
  }
  assert.ok(n > 20, 'es wird geopfert (' + n + ')');
});

test('Spieleinstellungen: exhaustRounds und winLead aus den Regeln gelten (0.8.1)', () => {
  assert.equal(M.DEFAULT_RULES.exhaustRounds, 10); assert.equal(M.DEFAULT_RULES.winLead, 4);
  // Erschöpfung nach 3 statt 10 Runden: nach 6 Angriffszügen verlieren beide Seiten 1 HP
  const { s, c } = combatSetup(11, ['F1']);
  s.rules.exhaustRounds = 3; c.sides.a.stats.hp = c.sides.a.stats.maxHp = 100; c.sides.b.stats.hp = c.sides.b.stats.maxHp = 100;
  const pass = () => assert.ok(M.apply(s, { pid: c.sides[c.turn].ctrl, type: 'pass' }).ok);
  for (let i = 0; i < 6; i++) pass();
  assert.equal(c.sides.a.stats.hp, 100, 'in den ersten 3 Runden keine Erschöpfung');
  for (let i = 0; i < 2; i++) pass();
  assert.ok(c.sides.a.stats.hp < 100 && c.sides.b.stats.hp < 100, 'ab Runde 4 verlieren beide HP');
  // Erschöpfung aus
  const t = combatSetup(11, ['F1']); t.s.rules.exhaustRounds = 0; t.c.sides.a.stats.hp = t.c.sides.a.stats.maxHp = 100; t.c.sides.b.stats.hp = t.c.sides.b.stats.maxHp = 100;
  for (let i = 0; i < 60; i++) assert.ok(M.apply(t.s, { pid: t.c.sides[t.c.turn].ctrl, type: 'pass' }).ok);
  assert.equal(t.c.sides.a.stats.hp, 100, 'exhaustRounds 0: keine Erschöpfung');
});


// Reihenfolge der Niederlagenprüfung (0.8.3.1): 1) reflektierter Schaden, 2) Schaden nach der Verteidigung, 3) Dauereffekte
test('Niederlagenprüfung 1: Der Rückwurf der Falle entscheidet vor der Verteidigung (Verteidiger gewinnt, bleibt unverletzt, Flüsse wirken nicht)', () => {
  const { s, me, op } = combatSetup(11, ['F3']);
  me.stats.hp = 1; me.stats.maxHp = 9; op.stats.hp = op.stats.maxHp = 9;
  me.stats.heal = 5; me.stats.healPhase = 5;   // eine Meditation darf den Angreifer nicht mehr retten
  op.stats.traps = [{ card: { id: 'F1', uid: 9001 }, el: 'F', tier: 1, lvl: 1 }];
  s.keepSnap = true; M.apply(s, { pid: 0, type: 'mark', slot: 0 });
  const r = M.apply(s, { pid: 0, type: 'attack' });
  assert.ok(r.ok && r.combatEnd, 'der Kampf endet sofort');
  assert.equal(r.combatEnd.reason, 'hp'); assert.equal(r.combatEnd.winner, 'b', 'der Angreifer fällt durch den Rückwurf');
  assert.equal(r.combatEnd.snap.sides.b.stats.hp, 9, 'der Verteidiger hat keinen Schaden genommen');
});
test('Niederlagenprüfung 2: Fällt der Verteidiger durch den Schaden nach der Verteidigung auf 0 HP, wirkt kein Dauereffekt mehr (auch kein tödlicher Todesfluch des Angreifers)', () => {
  const { s, me, op } = combatSetup(11, ['F3']);
  me.stats.hp = 2; me.stats.maxHp = 9; me.stats.death = 5; me.stats.deathPhase = 5;   // der Todesfluch würde den Angreifer am Phasenende töten
  op.stats.hp = 1; op.stats.maxHp = 9; op.stats.mana = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const r = M.apply(s, { pid: op.ctrl, type: 'pass' });
  assert.ok(r.ok && r.combatEnd);
  assert.equal(r.combatEnd.winner, 'a', 'Stufe 2 entscheidet vor Stufe 3: kein Unentschieden');
  assert.equal(me.stats.hp, 2, 'der Todesfluch hat nicht mehr getickt');
});
test('Niederlagenprüfung 3: Der Todesfluch am Phasenende besiegt den Angreifer; die Meditation kommt danach und belebt nicht wieder', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  me.stats.hp = 2; me.stats.maxHp = 9; me.stats.death = 2; me.stats.deathPhase = 2; me.stats.heal = 3; me.stats.healPhase = 3;
  op.stats.hp = op.stats.maxHp = 9;
  op.stats.rainbow = 3;   // das Schild schluckt den ganzen Schaden: der Verteidiger bleibt unversehrt
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const r = M.apply(s, { pid: op.ctrl, type: 'pass' });
  assert.ok(r.ok && r.combatEnd);
  assert.equal(r.combatEnd.winner, 'b', 'der Angreifer fällt durch den Todesfluch');
  assert.equal(me.stats.hp, 0, 'die Meditation hat ihn nicht wieder aufgerichtet');
});

// Schild vor jeder Schadensquelle (0.8.3.2)
test('Schild mindert den Rückwurf der Falle (und verliert je geminderten Schaden eine Ladung); der eingehende Schaden sinkt trotzdem um den vollen Rückwurf', () => {
  const { s, me, op } = combatSetup(11, ['F3']);
  me.stats.hp = me.stats.maxHp = 9; op.stats.hp = op.stats.maxHp = 9; me.stats.rainbow = 3;
  op.stats.traps = [{ card: { id: 'F1', uid: 9001 }, el: 'F', tier: 1, lvl: 2 }];
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.hp, 9, 'der Rückwurf von 2 wurde vom Schild geschluckt');
  assert.equal(me.stats.rainbow, 1, 'zwei Ladungen verbraucht');
  assert.equal(s.combat.pending, 1, 'Schaden 3 minus Rückwurf 2');
});
test('Schild mindert nur so viel des Rückwurfs, wie es Ladungen hat; der Rest geht auf die HP', () => {
  const { s, me, op } = combatSetup(11, ['F3']);
  me.stats.hp = me.stats.maxHp = 9; op.stats.hp = op.stats.maxHp = 9; me.stats.rainbow = 1;
  op.stats.traps = [{ card: { id: 'F1', uid: 9001 }, el: 'F', tier: 1, lvl: 3 }];
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.hp, 7); assert.equal(me.stats.rainbow, undefined);
});
test('Schild mindert auch den Todesfluch am Ende der Angriffsphase', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  me.stats.hp = me.stats.maxHp = 9; me.stats.death = 2; me.stats.deathPhase = 2; me.stats.rainbow = 2;
  op.stats.hp = op.stats.maxHp = 9; op.stats.rainbow = 3;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(me.stats.hp, 9, 'der Todesfluch von 2 wurde geschluckt'); assert.equal(me.stats.rainbow, undefined);
});

test('Falle: Wird der gesamte Schaden zurückgeworfen, entfällt die Verteidigung; der Verteidiger greift direkt an (0.8.7.3)', () => {
  const full = trapFall('F', 3, 'F1');   // Schaden 1, Rückwurf 1: nichts bleibt übrig
  assert.equal(full.s.combat.action, 'attack', 'keine Verteidigungsphase');
  assert.equal(full.s.combat.pending, 0);
  assert.equal(full.s.combat.sides[full.s.combat.turn].ctrl, 1, 'der Verteidiger ist jetzt im Angriffszug');
  const part = trapFall('F', 1, 'F3');   // Schaden 3, Rückwurf 1: Rest 2
  assert.equal(part.s.combat.action, 'defense', 'bei Restschaden bleibt die Verteidigung');
  assert.equal(part.s.combat.pending, 2);
});

/* ---------- Echo der Kombos (0.9) ---------- */
test('Echo: Eine Sekundärkarte in der Farbe des Echos erhöht die Kombostufe um 1, höchstens auf 3 (0.9)', () => {
  const lv = (echo, ids, mag) => M.evalAttack(STATS({ echo, mag: mag || { F: 3, E: 3, W: 3 } }), cards(ids));
  assert.equal(lv(undefined, ['F1', 'W1']).ord.lvl, 1, 'ohne Echo Stufe 1');
  const e = lv('W', ['F1', 'W1']);
  assert.equal(e.ord.lvl, 2, 'Echo Wasser, Sekundärkarte Wasser: Stufe 2');
  assert.equal(e.levels.echo, true);
  assert.equal(lv('E', ['F1', 'W1']).ord.lvl, 1, 'Echo in einer anderen Farbe: keine Wirkung');
  assert.equal(lv('F', ['F1', 'W1']).ord.lvl, 1, 'Das Echo der Primärfarbe zählt nicht (die Karte ist keine Sekundärkarte)');
  const cap = lv('W', ['F3', 'W3']);
  assert.equal(cap.ord.lvl, 3, 'höchstens Stufe 3');
  assert.ok(!cap.levels.echo, 'bei Stufe 3 steigt nichts, also kein Echo-Hinweis');
});

test('Echo: Die Ultimate wird durch ein Echo der Sekundärfarbe um 1 Stufe erhöht, das Echo der übrigen Farben wirkt nicht (0.11.0.9)', () => {
  const u = (echo) => M.evalAttack(STATS({ echo }), cards(['F1', 'W1', 'E1'])).levels;   // zweite Karte Blau: Erleuchtung
  assert.equal(u(undefined).ulti, 1);
  assert.equal(u('W').ulti, 2, 'Blau ist die Sekundärfarbe (zweite Karte)');
  assert.equal(u('E').ulti, 1, 'Grün ist nur die dritte Farbe (löst aus)');
  assert.equal(u('F').ulti, 1, 'Rot ist die Primärfarbe');
});

test('Echo: Auch in der Verteidigung verstärkt das Echo einen Kombo (0.9)', () => {
  const d = (echo) => M.evalDefense(STATS({ echo }), cards(['F1', 'W1']), 'F');
  assert.equal(d(undefined).ord.lvl, 1);
  assert.equal(d('W').ord.lvl, 2);
  assert.equal(d('E').ord.lvl, 1);
});

test('Echo: Ein Kombo hinterlässt das Echo seiner ersten Farbe, der nächste Kombo erneuert es und nutzt das alte (0.9)', () => {
  const { s, c, me, op } = combatSetup(11, ['F1', 'E1', 'E1', 'F1']);
  const curses = () => op.deck.discard.filter(cd => M.parseCard(cd.id).curse).length;
  assert.equal(me.stats.echo, undefined, 'zu Kampfbeginn kein Echo');
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });   // Feuer + Erde: Heilung
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.echo, 'F', 'Echo in der Farbe der ersten Karte');
  assert.ok(M.apply(s, { pid: 1, type: 'pass' }).ok);
  c.turn = 'a'; c.action = 'attack';
  const before = curses();
  M.apply(s, { pid: 0, type: 'mark', slot: 2 }); M.apply(s, { pid: 0, type: 'mark', slot: 3 });   // Erde + Feuer: Lähmung, Sekundärfarbe Feuer = Echo
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(curses() - before, 4, 'Lähmung Stufe 2 (4 Fluchkarten) statt Stufe 1');
  assert.equal(me.stats.echo, 'E', 'das Echo wurde erneuert');
  assert.ok(s.log.some(e => /Echo \(Feuer\)/.test(e.txt)), 'Protokoll nennt das Echo');
});

test('Echo: Ein Kombo ohne passende Sekundärfarbe verstärkt nicht, erneuert das Echo aber trotzdem; am Kampfende verschwindet es (0.9)', () => {
  const { s, c, me, op } = combatSetup(11, ['E1', 'F1']);
  me.stats.echo = 'W';
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  const before = op.deck.discard.filter(cd => M.parseCard(cd.id).curse).length;
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(op.deck.discard.filter(cd => M.parseCard(cd.id).curse).length - before, 2, 'Stufe 1: 2 Fluchkarten');
  assert.equal(me.stats.echo, 'E');
  assert.ok(M.apply(s, { pid: 1, type: 'pass' }).ok);
  s.rules.fleeAllowed = 1;
  c.turn = 'a'; c.action = 'attack'; op.stats.mana = 0;
  const r = M.apply(s, { pid: 0, type: 'flee' });
  assert.ok(r.ok, 'Kampf endet');
  assert.equal(s.players[0].stats.echo, undefined, 'Echo verschwindet mit dem Kampf');
});

test('Echo: Die Läuterung erreicht das Echo nicht (0.9)', () => {
  const { s, me } = combatSetup(11, ['W1', 'E1']);
  me.stats.echo = 'E';
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  M.apply(s, { pid: 0, type: 'lfp', pick: ['se', 'echo', 'e', 'E'] });
  assert.deepEqual(s.combat.lfp, [], 'Echo ist keine wählbare Markerart');
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);   // Wasser + Erde: Läuterung (Sekundärfarbe Erde = Echo, Stufe 2)
  assert.equal(me.stats.echo, 'W', 'nur der neue Kombo erneuert das Echo');
});

test('Echo: Auch Angriff und Verteidigung ohne Kombo hinterlassen ein Echo der Primärmagie; Kombos wirken weiter über die Sekundärkarte (0.9.6)', () => {
  const { s, c, me, op } = combatSetup(11, ['W1', 'F1', 'W1']);
  assert.equal(me.stats.echo, undefined, 'zu Kampfbeginn kein Echo');
  M.apply(s, { pid: 0, type: 'mark', slot: 0 });   // einfacher Wasserangriff, kein Kombo
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.echo, 'W', 'Angriff ohne Kombo hinterlässt ein Echo in der Farbe der ersten Karte');
  assert.ok(M.apply(s, { pid: 1, type: 'pass' }).ok);
  c.turn = 'a'; c.action = 'attack';
  const before = op.deck.discard.filter(cd => M.parseCard(cd.id).curse).length;
  M.apply(s, { pid: 0, type: 'mark', slot: 1 }); M.apply(s, { pid: 0, type: 'mark', slot: 2 });   // Feuer + Wasser: Sekundärfarbe Wasser = Echo
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(s.log.some(e => /Echo \(Wasser\)/.test(e.txt)), 'das Echo aus dem einfachen Angriff verstärkt den Kombo über die Sekundärkarte');
  assert.equal(me.stats.echo, 'F', 'der Kombo erneuert das Echo');
});

test('Echo: Eine Verteidigung ohne Kombo hinterlässt ein Echo, Passen lässt es stehen (0.9.6)', () => {
  const { s, c, op } = combatSetup(11, ['W1'], { rules: { allowDef: Object.assign({}, M.DEFAULT_RULES.allowDef, { echo: 1 }) } });   // Echo in der Verteidigung ausdrücklich an (Standard seit 0.12.1.2: aus)
  op.deck.hand[0] = Object.assign({}, op.deck.hand[0], { id: 'W1' });
  op.stats.echo = 'E'; op.stats.mana = 9;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(c.action, 'defense');
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: 0 }).ok);
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
  assert.equal(op.stats.echo, 'W', 'Verteidigung mit einer Wasserkarte hinterlässt ein Wasser-Echo');
});

test('Zermürbung: Rundenzähler der Weltphase, ab Runde exhaustRounds + 1 schenkt jeder Zug ohne Monsterangriff dem Gegner Gold in Höhe der Spielstufe (0.9.7)', () => {
  const s = M.newGame({ seed: 11, ai: [false, false], first: 0, rules: { exhaustRounds: 2 } });
  assert.equal(M.worldRound(s), 1); assert.equal(M.worldWear(s), false);
  const gold = () => [s.players[0].stats.gold, s.players[1].stats.gold];
  const draw = () => { const pid = s.turn; s.players[pid].drawRed = false; s.players[pid].drawN = 0; assert.ok(M.apply(s, { pid, type: 'draw' }).ok); };
  const g0 = gold();
  for (let i = 0; i < 4; i++) draw();   // Runde 1 und 2: keine Zermürbung
  assert.deepEqual(gold(), g0, 'bis Runde 2 kein Gold'); assert.equal(M.worldRound(s), 3); assert.equal(M.worldWear(s), true);
  s.stage = 2; const mover = s.turn; draw();
  assert.equal(s.players[1 - mover].stats.gold, g0[1 - mover] + 2, 'Gegner erhält Gold in Höhe der Spielstufe (2)'); assert.equal(s.players[mover].stats.gold, g0[mover]);
  assert.ok(s.log.some(l => /^Zermürbung \(Runde 3\)/.test(l.txt)));
  // ein Monsterangriff beendet den Zug ohne Gold und setzt den Zähler nach dem Kampf zurück
  const before = gold(); const att = s.turn;
  assert.ok(M.apply(s, { pid: att, type: 'combat', elem: 'F' }).ok); assert.deepEqual(gold(), before, 'Angriff: kein Gold');
  let n = 0; while (s.combat && n < 400) { assert.ok(M.apply(s, { pid: s.combat.sides[s.combat.turn].ctrl, type: 'pass' }).ok); n++; }
  assert.equal(s.worldTurns, 0, 'worldTurns (Monstererholung, KI) wird weiter zurückgesetzt');
  assert.equal(M.worldRound(s), 3, 'Zähler der Weltphase läuft nach dem Monsterkampf weiter (0.9.7.1)'); assert.equal(M.worldWear(s), true);
  // aus: exhaustRounds 0
  const t = M.newGame({ seed: 11, ai: [false, false], first: 0, rules: { exhaustRounds: 0 } });
  for (let i = 0; i < 30; i++) { const pid = t.turn; t.players[pid].drawRed = false; t.players[pid].drawN = 0; assert.ok(M.apply(t, { pid, type: 'draw' }).ok); }
  assert.equal(M.worldWear(t), false); assert.ok(!t.log.some(l => /Zermürbung/.test(l.txt)));
});

test('Erlaubte Aktionen je Phase (0.9.9.5, Standard seit 0.12.1.2): Erholen, Nachziehen und Echo setzen nur in der Angriffsphase, alles andere erlaubt', () => {
  const { s, c } = combatSetup(11, ['F3']); s.rules.allowDef = Object.assign({}, M.DEFAULT_RULES.allowDef);
  assert.deepEqual(M.DEFAULT_RULES.allowDef, { defend: 2, recover: 0, draw: 0, pass: 1, echo: 0, combo: 1 }, 'Standard der Verteidigung'); c.pending = 3; c.afterAtk = true;
  for (const k of ['attack', 'recover', 'draw', 'pass', 'echo', 'combo']) assert.equal(M.allowed(s, 'attack', k), true, 'Angriff ' + k);
  for (const k of ['defend', 'pass', 'combo']) assert.equal(M.allowed(s, 'defense', k), true, 'Verteidigung ' + k);
  for (const k of ['recover', 'draw', 'echo']) assert.equal(M.allowed(s, 'defense', k), false, 'Verteidigung ' + k);
  s.rules.allowAtk = { pass: 0, recover: 0 }; assert.equal(M.allowed(s, 'attack', 'pass'), true, 'sind Erholen und Passen aus, gilt Passen');
});

test('Erlaubte Aktionen: Verteidigungsphase – Erholen und Nachziehen statt Verteidigen, wenn erlaubt; sonst abgelehnt', () => {
  for (const type of ['recover', 'draw']) {
    const { s, c, me, op } = combatSetup(11, ['F3']);
    op.stats.mana = 2; op.stats.hp = 9; op.stats.maxHp = 9;
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.equal(c.action, 'defense');
    assert.equal(M.apply(s, { pid: op.ctrl, type }).ok, false, type + ' ist in der Verteidigung standardmäßig aus');
    s.rules.allowDef = Object.assign({}, M.DEFAULT_RULES.allowDef, { [type]: 1 });
    const hp0 = op.stats.hp, r = M.apply(s, { pid: op.ctrl, type });
    assert.ok(r.ok, r.error);
    assert.ok(op.stats.hp < hp0, 'der Schaden wird ohne Block hingenommen');
    if (type === 'recover') assert.equal(op.stats.mana, 2 + M.recoverGain(s));
    assert.equal(c.action, 'attack', 'danach folgt der eigene Angriff'); assert.equal(c.sides[c.turn].ctrl, op.ctrl);
    assert.ok(s.log.some(l => /nimmt den Schaden hin/.test(l.txt)));
  }
});

test('Erlaubte Aktionen: Angreifen oder Verteidigen abgeschaltet; Echo und Kombo je Phase', () => {
  let t = combatSetup(11, ['F3', 'W1']);
  t.s.rules.allowAtk = Object.assign({}, M.DEFAULT_RULES.allowAtk, { attack: 0 });
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 });
  assert.equal(M.apply(t.s, { pid: 0, type: 'attack' }).ok, false, 'Angreifen aus');
  assert.ok(M.apply(t.s, { pid: 0, type: 'recover' }).ok || M.apply(t.s, { pid: 0, type: 'pass' }).ok);
  t = combatSetup(11, ['F3', 'W1']);
  t.s.rules.allowAtk = Object.assign({}, M.DEFAULT_RULES.allowAtk, { echo: 0 });
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.equal(t.me.stats.echo, undefined, 'ohne Echo-Einstellung hinterlässt der Angriff kein Echo');
  t = combatSetup(11, ['F3', 'W1']);
  t.s.rules.allowAtk = Object.assign({}, M.DEFAULT_RULES.allowAtk, { combo: 0 });
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 }); M.apply(t.s, { pid: 0, type: 'mark', slot: 1 });
  const r = M.apply(t.s, { pid: 0, type: 'attack' });
  assert.equal(r.ok, false); assert.match(r.error, /Kombos sind in dieser Phase abgeschaltet/);
  t = combatSetup(11, ['F3']);
  t.s.rules.allowDef = Object.assign({}, M.DEFAULT_RULES.allowDef, { defend: 0 });
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.equal(M.apply(t.s, { pid: t.op.ctrl, type: 'defend' }).ok, false, 'Verteidigen aus');
  assert.ok(M.apply(t.s, { pid: t.op.ctrl, type: 'pass' }).ok);
});

test('Erlaubte Aktionen: Verteidigung „nach Angriff“ (2) und „ohne Angriff“ (3)', () => {
  const t = combatSetup(11, ['F3']);
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.equal(t.c.action, 'defense'); assert.ok(t.c.pending > 0);
  t.s.rules.allowDef = Object.assign({}, M.DEFAULT_RULES.allowDef, { recover: 2, draw: 3, defend: 3 });
  assert.equal(M.allowed(t.s, 'defense', 'recover'), true, 'nach Angriff: ein Angriff ging voraus');
  assert.equal(M.allowed(t.s, 'defense', 'draw'), false, 'ohne Angriff: nicht nach einem Angriff');
  assert.equal(M.apply(t.s, { pid: t.op.ctrl, type: 'defend' }).ok, false, 'Verteidigen nur ohne Angriff');
  t.c.pending = 0; t.c.afterAtk = false;
  assert.equal(M.allowed(t.s, 'defense', 'recover'), false); assert.equal(M.allowed(t.s, 'defense', 'draw'), true);
  t.s.rules.allowDef = Object.assign({}, M.DEFAULT_RULES.allowDef, { pass: 3, recover: 2 });
  assert.equal(M.allowed(t.s, 'defense', 'pass'), true, 'ohne Angriff und Passen erlaubt');
  t.c.pending = 3; t.c.afterAtk = true; assert.equal(M.allowed(t.s, 'defense', 'pass'), false, 'Passen nur ohne Angriff, Erholen nur nach Angriff');
});

test('Reaktion ohne Angriff (0.9.9.13): Nach einer Aktion ohne Angriff reagiert die Gegenseite, wenn Erholen oder Nachziehen „ohne Angriff“ erlaubt sind', () => {
  const dflt = { allowDef: Object.assign({}, M.DEFAULT_RULES.allowDef, { recover: 3, draw: 3 }) };   // seit 0.12.1.2 sind Erholen und Nachziehen in der Verteidigungsphase standardmäßig aus: hier ausdrücklich „ohne Angriff“
  let { s, c, me, op } = combatSetup(11, ['F3'], { rules: dflt });
  me.stats.mana = 5; op.stats.mana = 2;
  assert.ok(M.apply(s, { pid: 0, type: 'recover' }).ok);   // Aktion ohne Angriff
  assert.equal(c.action, 'defense'); assert.equal(c.pending, 0); assert.equal(c.sides[c.turn].ctrl, op.ctrl, 'die Gegenseite reagiert');
  assert.equal(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok, false, 'ohne Angriff gibt es nichts zu verteidigen');
  assert.equal(M.apply(s, { pid: 0, type: 'recover' }).ok, false, 'nicht am Zug');
  const hp = op.stats.hp, r = M.apply(s, { pid: op.ctrl, type: 'recover' });
  assert.ok(r.ok, r.error); assert.equal(op.stats.mana, 2 + M.recoverGain(s)); assert.equal(op.stats.hp, hp);
  assert.equal(c.action, 'attack', 'danach folgt die eigene Aktion'); assert.equal(c.sides[c.turn].ctrl, op.ctrl);
  // Passen in der Reaktion: keine Wirkung, danach die eigene Aktion
  ({ s, c, me, op } = combatSetup(11, ['F3'], { rules: dflt })); me.stats.mana = 5; op.stats.mana = 2;
  M.apply(s, { pid: 0, type: 'pass' }); assert.equal(c.action, 'defense');
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok); assert.equal(c.action, 'attack'); assert.equal(op.stats.mana, 2);
  // Nachziehen in der Reaktion
  ({ s, c, me, op } = combatSetup(11, ['F3'], { rules: dflt })); op.stats.mana = 2;
  M.apply(s, { pid: 0, type: 'pass' }); assert.ok(M.apply(s, { pid: op.ctrl, type: 'draw' }).ok); assert.equal(c.action, 'attack');
  // „nach Angriff“: keine Reaktion ohne Angriff, die Gegenseite beginnt gleich mit ihrer Aktion
  ({ s, c, me, op } = combatSetup(11, ['F3'], { rules: { allowDef: Object.assign({}, M.DEFAULT_RULES.allowDef, { recover: 2, draw: 2 }) } })); op.stats.mana = 2;
  M.apply(s, { pid: 0, type: 'pass' }); assert.equal(c.action, 'attack'); assert.equal(c.sides[c.turn].ctrl, op.ctrl);
  // volles Mana und kein Nachziehen: Erholen ist sinnlos, keine Reaktion
  ({ s, c, me, op } = combatSetup(11, ['F3'], { rules: { allowDef: Object.assign({}, M.DEFAULT_RULES.allowDef, { draw: 0 }) } })); op.stats.mana = op.stats.maxMana;
  M.apply(s, { pid: 0, type: 'pass' }); assert.equal(c.action, 'attack');
});

test('Reaktion ohne Angriff (0.9.9.14): „ohne Angriff“ hängt am Angriff, nicht am Schaden (Todesfluch, Angriff ohne Schaden)', () => {
  const dflt = { allowDef: Object.assign({}, M.DEFAULT_RULES.allowDef, { recover: 3, draw: 2 }) };
  // Todesfluch: Der Fluch trifft den Passenden am Ende seiner Aktion, bleibt aber ein Zug ohne Angriff
  let { s, c, me, op } = combatSetup(11, ['F3'], { rules: dflt });
  me.stats.death = 1; me.stats.mana = 5; op.stats.mana = 2; const hp = me.stats.hp;
  assert.ok(M.apply(s, { pid: 0, type: 'pass' }).ok);
  assert.ok(me.stats.hp < hp, 'der Todesfluch wirkt');
  assert.equal(c.action, 'defense'); assert.equal(c.afterAtk, false); assert.equal(c.pending, 0);
  assert.equal(M.allowed(s, 'defense', 'recover'), true, 'ohne Angriff: Erholen erlaubt, obwohl Schaden eintrat');
  assert.equal(M.allowed(s, 'defense', 'draw'), false, 'nach Angriff: Nachziehen gilt hier nicht');
  // Angriff ohne Schaden: ein Angriff ging voraus
  ({ s, c, me, op } = combatSetup(11, ['F3'], { rules: dflt })); op.stats.mana = 2;
  c.afterAtk = true; c.action = 'defense'; c.pending = 0; c.turn = op.key;
  assert.equal(M.allowed(s, 'defense', 'recover'), false, 'nach einem Angriff gilt „ohne Angriff“ nicht'); assert.equal(M.allowed(s, 'defense', 'draw'), true);
});

test('KI in der Reaktion ohne Angriff: Nachziehen bei schwacher Hand und vorhandenem Mana, sonst Erholen oder Passen (0.9.9.14)', () => {
  const dflt = { allowDef: Object.assign({}, M.DEFAULT_RULES.allowDef, { recover: 3, draw: 3 }) };   // Erholen und Nachziehen ausdrücklich „ohne Angriff“ (Standard seit 0.12.1.2: aus)
  let { s, c, me, op } = combatSetup(11, ['F3', 'E3', 'W3'], { rules: dflt });
  me.stats.mana = 5; op.stats.mana = 3; me.stats.maxMana = op.stats.maxMana = 6;
  M.apply(s, { pid: 0, type: 'pass' }); assert.equal(c.action, 'defense');
  op.deck.hand.forEach((_, i) => { op.deck.hand[i] = null; });   // leere Hand, Mana 3 von 6
  assert.equal(AI.plan(s, op.ctrl)[0].type, 'draw', 'leere Hand, Mana vorhanden: nachziehen');
  op.stats.mana = 0;
  assert.equal(AI.plan(s, op.ctrl)[0].type, 'recover', 'kein Mana zum Spielen: erst erholen');
  op.stats.mana = 6; assert.equal(AI.plan(s, op.ctrl)[0].type, 'draw', 'leere Hand, Mana voll: nachziehen');
  ['F3', 'E3', 'W3'].forEach((id, i) => { op.deck.hand[i] = Object.assign({}, op.deck.hand[i], { id }); });
  assert.equal(AI.plan(s, op.ctrl)[0].type, 'pass', 'gute Hand, Mana voll: nichts zu tun');
  const r = M.apply(s, { pid: op.ctrl, type: 'pass' }); assert.ok(r.ok);
});
