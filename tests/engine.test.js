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
  for (const [hand, expect] of [[['F1', 'E1'], 2], [['F2', 'E2'], 4], [['F3', 'E3'], 6]]) {
    const { s, c, me, op } = combatSetup(11, hand);
    hand.forEach((_, i) => assert.ok(M.apply(s, { pid: 0, type: 'mark', slot: i }).ok));
    const curses = () => op.deck.discard.filter(x => x.id[0] === 'C').length, n0 = curses();
    assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.equal(curses() - n0, expect, hand.join('+'));
  }
});

test('Läuterung zerstört gegnerische Nachziehtokens, ohne sie gutzuschreiben', () => {
  const { s, me, op } = combatSetup(11, ['E1', 'F1']);
  op.stats.freeDraws = 3; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['ot'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(op.stats.freeDraws, 2);
  assert.equal(me.stats.freeDraws, 0);
});

test('Läuterung entfernt auch eigene Spiegelmarker und gibt dafür ein Nachziehtoken', () => {
  const { s, me } = combatSetup(11, ['E1', 'F1']);
  me.stats.mirrorEl = { F: 2, E: 1, W: 0 }; me.stats.mirror = 3; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['sm:F'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.mirror, 2);
  assert.equal(me.stats.freeDraws, 1);
});

test('Ultimate in der Verteidigung: alle drei Farben erlaubt, mit Feuer als erster Karte Todesfluss für den Angreifer', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  op.stats.limit = 3; op.stats.mana = 9;
  op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: ['F3', 'W2', 'E2'][i] || x.id }); });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));   // erste Karte F3: Feuer-Ultimate
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
  assert.ok(me.stats.death >= 1, 'Angreifer trägt einen Todesmarker');
  assert.equal(me.stats.deathPhase, undefined, 'Der frisch gesprochene Fluch hat in dieser Phase nicht getickt (Marker verbraucht)');
});

// Spiegel: Verteidiger op mit Feuer-Spiegel der Stufe lvl, Angreifer me schlägt mit F2 zu; def = Verteidigungskarte (oder null = Erholen)
function spiegelFall(lvl, def, att) {
  const { s, me, op } = combatSetup(11, [att || 'F2']);
  op.stats.mag = { F: 3, E: 3, W: 3 }; op.stats.limit = 3; op.stats.mana = 9; op.stats.hp = op.stats.maxHp = 9; me.stats.hp = me.stats.maxHp = 9;
  op.stats.mirrorEl = { F: lvl, E: 0, W: 0 }; op.stats.mirror = lvl;
  if (def) op.deck.hand[0] = Object.assign({}, op.deck.hand[0], { id: def });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  if (def) { assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: 0 }).ok); assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok); }
  else assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  return { me, op };
}
test('Spiegel reflektiert nichts, wenn genau so viel verteidigt wurde wie nötig', () => {
  const { me, op } = spiegelFall(2, 'W2');                              // Block 2 = Schaden 2
  assert.equal(me.stats.hp, 9); assert.equal(op.stats.hp, 9); assert.equal(op.stats.mirror, 2);
});
test('Spiegel gleicht fehlende Verteidigung aus und verliert dafür je eine Stufe', () => {
  const { me, op } = spiegelFall(2, 'W1');                              // Block 1 von 2: Spiegel gleicht 1 aus
  assert.equal(me.stats.hp, 9); assert.equal(op.stats.hp, 9); assert.equal(op.stats.mirror, 1);
});
test('Spiegel gleicht höchstens seine Stufe aus, der Rest geht auf die HP (auch beim Passen)', () => {
  let r = spiegelFall(3, null);                                         // Schaden 2, Stufe 3: alles ausgeglichen
  assert.equal(r.op.stats.hp, 9); assert.equal(r.op.stats.mirror, 1); assert.equal(r.op.stats.mana, 9, 'Passen in der Verteidigung gibt kein Mana');
  r = spiegelFall(1, null);                                             // Stufe 1: 1 ausgeglichen, 1 geht durch
  assert.equal(r.op.stats.hp, 8); assert.equal(r.op.stats.mirror, undefined);
});
test('Spiegel wirft nur den Überschuss einer zu starken Verteidigung zurück und verliert dafür Stufen', () => {
  const { me, op } = spiegelFall(3, 'W3');                              // Block 3, Schaden 2: Überschuss 1
  assert.equal(me.stats.hp, 8); assert.equal(op.stats.hp, 9); assert.equal(op.stats.mirror, 2);
});

test('Rückwurf ist durch den eingehenden Schaden gedeckelt', () => {
  const { me, op } = spiegelFall(3, 'W3', 'F1');                        // Schaden 1, Block 3 (Überschuss 2), Stufe 3: nur 1 wird zurückgeworfen
  assert.equal(me.stats.hp, 8); assert.equal(op.stats.mirror, 2);
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

test('Fliehen: nur im Monsterkampf, im eigenen Angriffszug, bei Monster ohne Mana und ohne Todesfluss', () => {
  const fresh = () => combatSetup(11, ['F1']);
  let { s, c, me, op } = fresh();
  assert.equal(M.canFlee(s, 0), false, 'Monster hat noch Mana');
  assert.equal(M.apply(s, { pid: 0, type: 'flee' }).ok, false);
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, 0), true);
  assert.equal(M.canFlee(s, 1), false, 'nur der Angreifer');
  me.stats.death = 1;
  assert.equal(M.canFlee(s, 0), false, 'Todesfluss');
  assert.equal(M.apply(s, { pid: 0, type: 'flee' }).ok, false);
  delete me.stats.death;
  const hp = c.sides.b.stats.hp, gold = me.stats.gold, sp0 = s.players.map(p => p.sp), g1 = s.players[1].stats.gold;
  const r = M.apply(s, { pid: 0, type: 'flee' });
  assert.deepEqual(s.players.map(p => p.sp), sp0, 'Flucht bringt keine Siegpunkte'); assert.equal(s.players[1].stats.gold, g1, 'kein Gold für den Mitspieler');
  assert.ok(r.ok && r.combatEnd && r.combatEnd.reason === 'flee' && r.combatEnd.winner === null);
  assert.equal(s.phase, 'world'); assert.equal(me.stats.gold, gold, 'keine Beute'); assert.equal(s.lastCombat.monsterDefeated, false);
  assert.equal(s.turn, 1, 'der Gegenspieler ist als Nächster dran');
});
test('Fliehen geht nicht, während ein Angriff aussteht', () => {
  const { s, c, me, op } = combatSetup(11, ['F1']);
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
    const { s, me, op } = combatSetup(11, ['E1', 'F1']);
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
  const c = s.combat, att = c.sides.a.ctrl, sp = s.players.map(p => p.sp);
  assert.equal(M.canFlee(s, att), false, 'Gegner hat noch Mana');
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, att), true);
  const r = M.apply(s, { pid: att, type: 'flee' });
  assert.ok(r.ok && r.combatEnd.reason === 'flee' && r.combatEnd.winner === null);
  assert.deepEqual(s.players.map(p => p.sp), sp, 'Flucht bringt keine Siegpunkte');
  assert.equal(s.showdown, 1);
});

test('Läuterung Stufe 3 entfernt beliebig gemischt eigene und gegnerische Spiegel- und Todesmarker', () => {
  const { s, me, op } = combatSetup(11, ['E3', 'F3']);
  me.stats.mirrorEl = { F: 2, E: 0, W: 0 }; me.stats.mirror = 2; me.stats.death = 1;
  op.stats.mirrorEl = { F: 0, E: 1, W: 0 }; op.stats.mirror = 1; op.stats.death = 2; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['sm:F', 'om:E', 'od'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.mirrorEl && me.stats.mirrorEl.F, 1, 'eigener Spiegel −1'); assert.equal(op.stats.mirror || 0, 0, 'gegnerischer Spiegel weg');
  assert.equal(op.stats.death, 1, 'gegnerischer Todesmarker −1'); assert.equal(me.stats.death, 1, 'eigener Todesmarker unberührt');
  assert.equal(me.stats.freeDraws, 3, 'je entferntem Marker ein Gratis-Nachziehen');
});

test('Spiegel-Kombo: Die Farben zählen getrennt, bis zu 3 Marker je Farbe (Erde 3 und Feuer 3 liegen zusammen)', () => {
  const { s, me } = combatSetup(11, ['W2', 'F3']);
  me.stats.mirrorEl = { F: 0, E: 3, W: 0 }; me.stats.mirror = 3;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const f = M.mirrorOf(me.stats, 'F');
  assert.ok(f > 0, 'Feuer-Spiegel kommt trotz Erde 3 dazu'); assert.ok(f <= 3, 'höchstens 3 je Farbe'); assert.equal(M.mirrorOf(me.stats, 'E'), 3, 'Erde bleibt');
  assert.equal(me.stats.mirror, 3 + f, 'Summe beider Farben');
  assert.ok(s.log.some(l => l.txt.includes('Spiegel ' + f + ' (Feuer, ' + (3 + f) + ' Marker)')), 'Protokoll nennt die Gesamtzahl');
});

test('Spiegel-Kombo: Mehr als 3 Marker je Farbe gibt es nicht', () => {
  const { s, me } = combatSetup(11, ['W3', 'F3']);
  me.stats.mirrorEl = { F: 2, E: 0, W: 0 }; me.stats.mirror = 2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(M.mirrorOf(me.stats, 'F'), 3, 'auf Stufe 3 begrenzt, nicht addiert');
});

test('Spiegel-Kombo auf leerem Brett: Marker der Farbe kommen dazu, Protokoll wie bisher', () => {
  const { s, me } = combatSetup(11, ['W2', 'F3']);
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const f = M.mirrorOf(me.stats, 'F'); assert.ok(f > 0, 'Feuer-Spiegel liegt');
  assert.ok(s.log.some(l => l.txt.includes('Spiegel ' + f + ' (Feuer, ' + f + ' Marker)')), 'bekannter Protokolltext');
});

test('Nachziehmarker Weltphase: Nachziehen bei rotem Marker gibt dem Gegner 1 Gold, jede andere Aktion stellt auf grün zurück', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), g1 = () => s.players[1].stats.gold;
  const base = g1();
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // grün -> rot, keine Strafe
  assert.equal(s.players[0].drawRed, true); assert.equal(g1(), base);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // rot: Strafe
  assert.equal(g1(), base + 1);
  s.players[1].stats.gold += 5; assert.ok(M.apply(s, { pid: 1, type: 'spend', what: 'hp' }).ok);   // andere Aktion: Marker von Spieler 1 wieder grün (das Opfern im Tempel ist seit 0.7.6.4 keine Aktion mehr)
  assert.equal(s.players[1].drawRed, false);
  const g0 = s.players[0].stats.gold; s.players[0].stats.gold += 5;
  assert.ok(M.apply(s, { pid: 0, type: 'spend', what: 'hp' }).ok);
  assert.equal(s.players[0].drawRed, false);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // wieder grün -> rot ohne Strafe
  assert.equal(s.players[1].drawRed, true);
  assert.equal(s.players[0].stats.gold <= g0 + 5, true);
});

test('Nachziehmarker Kampf: Nachziehen bei rotem Marker kostet 1 Mana, der Gegner bekommt kein Token', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
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
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  me.stats.mana = 0;
  const hand = JSON.stringify(me.deck.hand), r = M.apply(s, { pid: 0, type: 'draw' });
  assert.equal(r.ok, false, 'ohne Mana abgelehnt');
  assert.equal(JSON.stringify(me.deck.hand), hand, 'Hand unverändert');
  assert.equal(s.combat.sides[s.combat.turn].ctrl, 0, 'Zug nicht beendet');
  assert.ok(M.apply(s, { pid: 0, type: 'recover' }).ok, 'Erholen bleibt möglich');
});

test('KI-Läuterung entfernt Spiegel des Gegners nach Farbe: zuerst die Farbe, mit der sie selbst am stärksten angreift (Standard lfColor 1)', () => {
  for (const [params, want] of [[null, ['om:E', 'om:F']], [{ lfColor: 0 }, ['om', 'om']]]) {
    const { s, c, me, op } = combatSetup(11, ['E3', 'F3']);
    me.deck.draw = Array.from({ length: 8 }, () => ({ id: 'E2' })); me.deck.discard = [];
    op.stats.mirrorEl = { F: 1, E: 1, W: 0 }; op.stats.mirror = 2;
    if (params) AI.setParams(0, Object.assign({}, params));
    const acts = AI.plan(s, 0); AI.setParams(0, null);
    const lf = acts.find(a => a.type === 'lfp');
    assert.ok(lf, 'KI wählt die Läuterung: ' + acts.map(a => a.type).join(','));
    assert.deepEqual(lf.pick, want, JSON.stringify(params));
  }
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
    s.players[0].drawRed = true; me.stats.mana = 0; me.deck.hand.fill(null);
    const ca = AI.plan(s, 0).map(a => a.type);
    assert.ok(!ca.includes('draw'), 'Kampf bei Rot ohne Mana: ' + ca.join(','));
  }
});

test('Nachziehlimit: Kauf kostet Gold (1, dann 2, keine Upgrade-Punkte), beendet den Zug, höchstens Stufe 3', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), me = s.players[0].stats;
  assert.equal(me.drawLimit, 1);
  me.gold = 0; me.pending = 5; assert.equal(M.apply(s, { pid: 0, type: 'drawlimit' }).ok, false, 'ohne Gold nicht möglich, auch mit Upgrade-Punkten');
  me.gold = 5;
  assert.ok(M.apply(s, { pid: 0, type: 'drawlimit' }).ok);
  assert.equal(me.drawLimit, 2); assert.equal(me.gold, 4); assert.equal(me.pending, 5, 'Upgrade-Punkte bleiben'); assert.equal(s.turn, 1, 'Zug beendet');
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'drawlimit' }).ok);
  assert.equal(me.drawLimit, 3); assert.equal(me.gold, 2, 'zweiter Kauf 2 Gold (Preis steigt um den Grundpreis)');
  s.players[1].stats.gold = 5; assert.ok(M.apply(s, { pid: 1, type: 'spend', what: 'hp' }).ok);   // (zweimal hintereinander nachziehen würde dem Spieler 0 Gold schenken)
  assert.equal(M.apply(s, { pid: 0, type: 'drawlimit' }).ok, false, 'Maximum 3'); assert.equal(me.gold, 2);
});

test('Nachziehlimit Weltphase: so viele Nachziehvorgänge hintereinander sind frei, danach wird der Marker rot und das nächste Nachziehen kostet Gold', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p0 = s.players[0], g1 = () => s.players[1].stats.gold;
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
  p0.stats.gold += 5; assert.ok(M.apply(s, { pid: 0, type: 'spend', what: 'hp' }).ok);   // andere Aktion: zurück auf Grün, Zähler 0
  assert.equal(p0.drawRed, false); assert.equal(p0.drawN, 0);
});

test('Nachziehlimit Kampf: erst das Nachziehen über dem Limit kostet Mana', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  s.players[0].stats.drawLimit = 2;
  const m0 = me.stats.mana;
  for (let i = 0; i < 2; i++) { assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok); }
  assert.equal(me.stats.mana, m0, 'innerhalb des Limits kostenlos'); assert.equal(s.players[0].drawRed, true);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(me.stats.mana, m0 - 1); assert.equal(op.stats.freeDraws || 0, 0);
});

test('KI: Stellschraube dlMax kauft das Nachziehlimit mit Gold bis zur gewählten Stufe, nicht weiter', () => {
  const s = M.newGame({ seed: 5, ai: [true, true], first: 0 }), p = s.players[0];
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

test('Kombo mit mehreren Karten der zweiten Farbe: F2, W1, W1 ergibt Zerrüttung 2 (Kartenstufen derselben Farbe zählen zusammen)', () => {
  const st = { mag: { F: 3, E: 3, W: 3 }, mana: 9 }, ev = ids => M.evalAttack(st, ids.map(id => Object.assign({ id }, M.parseCard(id))));
  assert.deepEqual([ev(['F2', 'W1', 'W1']).ord.key, ev(['F2', 'W1', 'W1']).ord.lvl], ['rm', 2]);
  assert.equal(ev(['F2', 'W1']).ord.lvl, 1);
  assert.deepEqual([ev(['W1', 'F2', 'W1']).ord.key, ev(['W1', 'F2', 'W1']).ord.lvl], ['bm', 2]);   // andere erste Farbe: Spiegel, ebenfalls Stufe 2
  assert.equal(ev(['F1', 'F1', 'E2']).ord.lvl, 2); assert.equal(ev(['F1', 'F1', 'E1']).ord.lvl, 1);
});

test('Ultimate: mehrere Karten einer Farbe ergeben zusammen die Stufe (E2, F2, W1, W1 = Ultimate 2)', () => {
  const lv = M.comboLevels({ F: [2], E: [2], W: [1, 1] }, { F: 3, E: 3, W: 3 }, 'E');
  assert.equal(lv.ulti, 2);
  assert.equal(M.comboLevels({ F: [2], E: [2], W: [1] }, { F: 3, E: 3, W: 3 }, 'E').ulti, 1);
});

test('Läuterung kann auch eigene Nachziehtokens zerstören (ohne Gutschrift)', () => {
  const { s, me } = combatSetup(11, ['E1', 'F1']);
  me.stats.freeDraws = 2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['st'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.freeDraws, 1, 'ein eigener Token zerstört, kein neuer gutgeschrieben');
});

test('Todesfluss aus der Verteidigung wirkt nicht sofort, sondern erst in der nächsten Angriffsphase des Verfluchten', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  op.stats.limit = 3; op.stats.mana = 9;
  op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: ['F3', 'W2', 'E2'][i] || x.id }); });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const hp0 = me.stats.hp;
  [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));   // erste Karte F3: Feuer-Ultimate
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
  assert.ok(me.stats.death >= 1);
  assert.ok(me.stats.hp >= hp0 - 5 && !s.log.slice(-6).some(e => /Todesfluss: /.test(e.txt)), 'kein Fluchschaden am Ende dieser Phase');
});

test('Pluswürfel „Magie“: eine Magiestufe mehr auf der Folgemagie des Monsters (das überlegene Element: Feuer → Wasser, Erde → Feuer, Wasser → Erde), mit passender Karte', () => {
  const D = M.MONSTER.variants.dice, st = M.newGame({ seed: 9, ai: [true, true] });
  const save = D.plus.slice(), mag = D.plus.find(f => f.k === 'mag'), none = D.minus.find(f => f.k === 'none');
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
  } finally { D.plus.splice(0, 6, ...save); }
});

test('Monster-Hand ist höchstens so groß wie die der Spieler (Stufe III: Limit 4, Hand 5, 7 HP)', () => {
  const r = M.spawnMonsters(3);
  for (const k of Object.keys(r)) { assert.equal(M.monsterHand(r[k]), M.MAX_SLOTS); assert.equal(r[k].stats.maxHp, 7); assert.equal(r[k].stats.limit, 4); }
});

test('Monsterkarte (Weltphase): die Standardwerte base enthalten auch die Magie ohne Würfelbonus', () => {
  const D = M.MONSTER.variants.dice, st = M.newGame({ seed: 9, ai: [true, true] });
  const save = D.plus.slice(), mag = D.plus.find(f => f.k === 'mag'), none = D.minus.find(f => f.k === 'none');
  D.plus.fill(mag); D.minus.fill(none);
  try {
    const r = M.spawnMonsters(2, st.rng);
    for (const k of Object.keys(r)) { const m = r[k], S = M.MONSTER.profile[m.el].secondary; assert.equal(m.stats.mag[S], m.base.mag[S] + 1, 'mit Würfel +1'); assert.deepEqual(m.base.mag, { F: m.el === 'F' ? 3 : m.el === 'E' ? 2 : 1, E: m.el === 'E' ? 3 : m.el === 'W' ? 2 : 1, W: m.el === 'W' ? 3 : m.el === 'F' ? 2 : 1 }); }   // Haupt 3, Nebenelement (überlegen) 2, drittes 1
  } finally { D.plus.splice(0, 6, ...save); }
});

test('Vorschau Verteidigung (Verteidigen/Passen) stimmt mit der tatsächlichen Ausführung überein, auch mit Spiegel und Rückwurf', () => {
  for (const [mode, mirror, hand, mark] of [['defend', 0, ['W2'], 0], ['pass', 0, ['W2'], 0], ['pass', 2, ['W2'], 0], ['defend', 2, ['W3'], 0], ['defend', 0, [], -1]]) {
    const { s, c, me, op } = combatSetup(11, hand);
    me.stats.hp = 6; op.stats.hp = 6; c.turn = 'a'; c.action = 'defense'; c.color = 'F'; c.pending = mode === 'defend' && mirror ? 1 : 3;
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
  c.turn = 'a'; c.action = 'defense'; c.color = 'F'; c.pending = 2;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });   // Wasser + Feuer: Kombokarte kostet 1 Mana
  me.stats.mana = 0;
  assert.equal(M.previewDefense(s, false), null, 'ohne Mana nicht ausführbar');
  assert.ok(M.previewDefense(s, true), 'Passen geht immer');
});

test('Vorschau Nachziehen: Strafe nur bei rotem Marker (Weltphase Gold für den Gegner, Kampf Mana für den Nachziehenden)', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 });
  assert.equal(M.drawGoldPenalty(s, 0), 0, 'grüner Marker: keine Strafe');
  assert.equal(M.drawManaCost(s, 0), 0, 'Weltphase: keine Manakosten');
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(M.drawGoldPenalty(s, 0), 1, 'roter Marker: der Gegner bekäme 1 Gold');
  const { s: k, me } = combatSetup(11, ['F1']);
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
  const { s, c, me } = combatSetup(11, ['E3', 'W3']);   // gegen Wasser verteidigt Erde (überlegen, gratis), Wasser ist Kombokarte: Heilung 3
  me.stats.hp = 8; me.stats.maxHp = 9; c.turn = 'a'; c.action = 'defense'; c.color = 'W'; c.pending = 6;
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
  const { s, c, me } = combatSetup(11, ['E3', 'W3']);
  me.stats.hp = 1; me.stats.maxHp = 9; c.turn = 'a'; c.action = 'defense'; c.color = 'W'; c.pending = 4;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.equal(M.previewDefense(s, false).hpAfter, 0, 'Vorschau: tot, keine Heilung');
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.hp, 0, '1 − 1 Restschaden = 0 HP: besiegt, die Heilung verfällt');
  assert.ok(!s.log.some(l => /heilt nach der Verteidigung/.test(l.txt)), 'keine Heilung im Protokoll');
});

test('Heilung nach dem Schaden greift, wenn der Verteidiger den Schaden überlebt (seit 0.7.6.2)', () => {
  const { s, c, me } = combatSetup(11, ['E3', 'W3']);
  me.stats.hp = 2; me.stats.maxHp = 9; c.turn = 'a'; c.action = 'defense'; c.color = 'W'; c.pending = 4;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.ok(s.combat, 'der Kampf geht weiter');
  assert.equal(me.stats.hp, 4, '2 − 1 Restschaden + 3 Heilung');
});

test('Läuterung in der Verteidigung: Wahl per lfp (eigener Spiegelmarker, eigenes Nachziehtoken), danach wieder frei', () => {
  const { s, c, me, op } = combatSetup(11, ['E1', 'F1']);   // gegen Erde verteidigt Erde, Feuer als Kombokarte: Läuterung 1
  c.turn = 'a'; c.action = 'defense'; c.color = 'E'; c.pending = 1;
  me.stats.mirrorEl = { F: 1, E: 0, W: 0 }; me.stats.mirror = 1; me.stats.freeDraws = 1; op.stats.mirrorEl = { F: 0, E: 1, W: 0 }; op.stats.mirror = 1;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['st'] }).ok, 'Wahl ist in der Verteidigung erlaubt');
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.freeDraws, 0, 'eigenes Nachziehtoken zerstört, nicht gutgeschrieben');
  assert.equal(op.stats.mirror, 1, 'gegnerischer Spiegel bleibt');
  assert.equal(s.combat.lfp, null, 'die Wahl gilt nur für diese Verteidigung');
});

test('Schilde der Verteidigung wirken erst nach ihr (wie die Heilung, seit 0.7.2.23)', () => {
  const { s, c, me } = combatSetup(11, ['W3', 'F3']);   // Wasser verteidigt gegen Feuer, Feuer als Kombokarte: roter Spiegel 3
  me.stats.hp = 9; c.turn = 'a'; c.action = 'defense'; c.color = 'F'; c.pending = 5;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  const pv = M.previewDefense(s, false);
  assert.ok(M.apply(s, { pid: 0, type: 'defend' }).ok);
  assert.equal(me.stats.hp, 7, 'Block 3, der neue Spiegel gleicht die fehlenden 2 noch nicht aus');
  assert.equal(M.mirrorOf(me.stats, 'F'), 3, 'der Spiegel steht danach mit voller Stufe');
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

test('Ultimate im Angriff nach Farbe der ersten Karte: Erde legt Heilmarker, der am Ende der eigenen Angriffsphase heilt', () => {
  const { s, me, op } = combatSetup(11, ['E2', 'F2', 'W2']);
  me.stats.maxHp = 9; me.stats.hp = 2;
  [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: 0, type: 'mark', slot: i }).ok));
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.heal, 2, 'Heilmarker Stufe 2 bei mir'); assert.equal(op.stats.death || 0, 0, 'kein Todesfluss für den Gegner');
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(me.stats.hp, 2, 'Heilfluss wirkt wie der Todesfluss nicht in der Phase, in der er gelegt wurde (seit 0.7.2.8)');
  assert.equal(me.stats.healPhase, undefined, 'Phasenmerker gelöscht');
  const hp0 = me.stats.hp; s.combat.sides[s.combat.turn === 'a' ? 'a' : 'b'];
  // nächste eigene Angriffsphase: Gegner ist am Zug, danach wieder ich; am Ende meiner Phase heilt der Marker
  assert.equal(s.combat.sides[s.combat.turn].ctrl, op.ctrl, 'Gegner am Zug'); assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(s.combat.sides[s.combat.turn].ctrl, me.ctrl, 'ich am Zug'); assert.ok(M.apply(s, { pid: 0, type: 'pass' }).ok);
  assert.equal(me.stats.hp, hp0 + 2, 'Heilfluss: +2 HP am Ende der nächsten eigenen Angriffsphase');
});

test('Ultimate im Angriff: Wasser legt ein Multispiegel der Stufe S bei mir', () => {
  const { s, me, op } = combatSetup(11, ['W2', 'F2', 'E2']);
  [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: 0, type: 'mark', slot: i }).ok));
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(me.stats.rainbow, 2); assert.equal(op.stats.death || 0, 0);
});

test('Ultimate in der Verteidigung: Erde legt Heilmarker, Wasser ein Multispiegel (jeweils beim Verteidiger)', () => {
  for (const [att, def, key] of [['E1', ['E3', 'W2', 'F2'], 'heal'], ['F1', ['W2', 'F3', 'E2'], 'rainbow']]) {
    const { s, me, op } = combatSetup(11, [att]);
    op.stats.limit = 3; op.stats.mana = 9;
    op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: def[i] || x.id }); });
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    [0, 1, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));
    assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
    assert.ok(op.stats[key] >= 1, key + ' beim Verteidiger'); assert.equal(me.stats.death || 0, 0, 'kein Todesfluss');
  }
});

test('Multispiegel wirkt gegen jede Farbe und verliert dabei Stufen wie ein Spiegel (seit 0.7.2.2)', () => {
  for (const att of ['F2', 'E2', 'W2']) {
    const { s, op } = combatSetup(11, [att]);
    op.stats.rainbow = 2; op.stats.hp = op.stats.maxHp = 9;
    M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
    assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
    assert.equal(op.stats.hp, 9, att + ': der Schild gleicht den Schaden aus'); assert.ok((op.stats.rainbow || 0) < 2, att + ': er verliert Stufen');
  }
});

test('Standardschilde werden vor dem Multispiegel verbraucht (0.7.2.2)', () => {
  // Feuerangriff F2 ohne Verteidigung: Der Schild gleicht bis zu seiner Stufe (hier 2, der höhere von Feuerspiegel 1 und Multispiegel 2) aus; der Feuerspiegel gibt seine eine Stufe zuerst her, der Rest kommt vom Multispiegel
  const { s, op } = combatSetup(11, ['F2']);
  op.stats.mirrorEl = { F: 1, E: 0, W: 0 }; op.stats.mirror = 1; op.stats.rainbow = 2; op.stats.hp = op.stats.maxHp = 9;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const pv = M.previewDefense(s, true);
  assert.equal(pv.lostStd, 1, 'Vorschau: erst der Farbspiegel'); assert.equal(pv.lostRb, pv.used - 1, 'Vorschau: der Rest vom Multispiegel');
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'pass' }).ok);
  assert.equal(op.stats.mirror || 0, 0, 'Farbspiegel aufgebraucht'); assert.equal(op.stats.rainbow, 2 - pv.lostRb, 'Multispiegel verliert nur den Rest');
  assert.equal(op.stats.hp, 9 - pv.leftover);
  // ein höherer Farbspiegel deckt alles allein: das Multispiegel bleibt unberührt
  const t = combatSetup(11, ['F2']);
  t.op.stats.mirrorEl = { F: 3, E: 0, W: 0 }; t.op.stats.mirror = 3; t.op.stats.rainbow = 1; t.op.stats.hp = t.op.stats.maxHp = 9;
  M.apply(t.s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(t.s, { pid: 0, type: 'attack' }).ok);
  assert.ok(M.apply(t.s, { pid: t.op.ctrl, type: 'pass' }).ok);
  assert.equal(t.op.stats.rainbow, 1, 'Multispiegel unberührt'); assert.ok((t.op.stats.mirror || 0) < 3, 'der Farbspiegel hat Stufen verloren');
});

test('Läuterung entfernt Heilmarker und Prismen des Gegners', () => {
  const { s, me, op } = combatSetup(11, ['E3', 'F3']);
  op.stats.heal = 2; op.stats.rainbow = 1; me.stats.freeDraws = 0;
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'lfp', pick: ['oh', 'oh', 'or'] }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.equal(op.stats.heal || 0, 0); assert.equal(op.stats.rainbow || 0, 0); assert.equal(me.stats.freeDraws, 3);
});

test('Strafe des Nachziehmarkers wächst mit der Spielstufe (0.7): Grundwert mal Abschnitt, für Gold und Mana', () => {
  const s = M.newGame({ seed: 9, ai: [false, false], first: 0 });
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

test('Abwerfen nach Zerrüttung ist kein Zug: Zugzähler, Passen-Zähler, Nachziehmarker und Seite am Zug bleiben unverändert (0.7.6.3)', () => {
  const { s, c, me, op } = combatSetup(11, ['F1', 'W1']);
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); M.apply(s, { pid: 0, type: 'mark', slot: 1 });
  assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  assert.ok(c.forced, 'Zerrüttung: der Gegner muss abwerfen');
  const snap = () => JSON.stringify({ turn: c.turn, action: c.action, turns: c.turns, tot: s.combatTurnsTotal, passed: [me.passed, op.passed], marker: s.players.map(p => [p.drawN, p.drawRed]), mons: [c.sides.b.monster && c.sides.b.monster.drawN, c.sides.b.monster && c.sides.b.monster.drawRed] });
  const before = snap(), pid = c.forced.pid, side = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b;
  const slots = side.deck.hand.map((x, i) => x ? i : -1).filter(i => i >= 0).slice(0, c.forced.n);
  assert.ok(M.apply(s, { pid, type: 'fd', slots }).ok);
  assert.equal(c.forced, null);
  assert.equal(snap(), before, 'das Abwerfen ändert nichts am Zugablauf');
});

test('Opfern im Tempel ist kein Zug: der Spieler bleibt am Zug, der Nachziehmarker ändert sich nicht (0.7.6.4)', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0];
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
  assert.equal(s.rules.maxRounds, 0, 'kein Rundenlimit mehr'); assert.equal(s.rules.exhaustRounds, 10);
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
    c.sides.a.stats.hp = 1; c.turn = 'a'; c.action = 'defense'; c.color = 'F'; c.pending = 99; c.sides.a.stats.mirror = 0;
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

test('Zwei Schilde lösen aus: Farbspiegel und Multispiegel liefern beide einen Schild-Effekt (mirror, mirror2), Aufteilung stimmt (0.7.6.7)', () => {
  const { s, c, me } = combatSetup(11, ['W1']);
  me.stats.mirrorEl = { F: 1, E: 0, W: 0 }; me.stats.mirror = 1; me.stats.rainbow = 3;
  c.turn = 'a'; c.action = 'defense'; c.color = 'F'; c.pending = 3;   // keine Verteidigung: 3 fehlen, der Schild der Stufe 3 gleicht aus: 1 vom Farbspiegel, 2 vom Multispiegel
  assert.ok(M.apply(s, { pid: 0, type: 'pass' }).ok);
  const fx = s.log.find(l => /verliert 0 HP|verliert \d+ HP/.test(l.txt) && l.fx && l.fx.mirror).fx;
  assert.ok(fx.mirror && fx.mirror2, 'beide Effekte');
  assert.equal(fx.mirror.elem, 'F'); assert.equal(fx.mirror.broken, 1); assert.equal(fx.mirror2.elem, 'R'); assert.equal(fx.mirror2.broken, 2);
  assert.equal(fx.mirror.abs + fx.mirror2.abs, 3, 'ausgeglichene Geschosse verteilen sich auf beide');
  assert.equal(me.stats.rainbow, 1, 'Multispiegel Stufe 3 − 2'); assert.equal(me.stats.mirror || 0, 0);
});

test('Versionsnummer: eine Konstante (MAGUS_VERSION) speist Menü-Link und Über-Seite, das Regelwerk hat einen Eintrag dazu (0.7.7.4)', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', '26a-darstellung.js'), 'utf8');
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
