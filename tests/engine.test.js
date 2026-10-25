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

test('Ultimate in der Verteidigung: alle drei Farben erlaubt, Todes-Fluch für den Angreifer', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  op.stats.limit = 3; op.stats.mana = 9;
  op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: ['F3', 'W2', 'E2'][i] || x.id }); });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  [1, 0, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));
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
  const hp = [3, 4, 6], limit = [2, 2, 3], gold = [1, 2, 3], D = M.MONSTER.variants.dice, maxN = (k, st) => Math.max(...D.plus.concat(D.minus).filter(f => f.k === k).map(f => f.n[st - 1]));
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
  const D = M.MONSTER.variants.dice, base = { 1: { F: [3, 5], E: [3, 6], W: [3, 5] }, 2: { F: [4, 5], E: [4, 5], W: [4, 5] }, 3: { F: [6, 6], E: [6, 6], W: [6, 6] } }, limit = [0, 2, 2, 3];
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
      assert.equal(m.stats.limit, Math.min(M.MAX_LIMIT, Math.max(1, limit[st] + d('limit'))), 'Limit ' + m.label);
      assert.equal(m.stats.handExtra || 0, d('hand')); assert.equal(m.stats.drawLimit, Math.min(M.MAX_DRAW_LIMIT, Math.max(1, 2 + d('draws'))));
      seenForm[v.d] = 1; seenPlus.add(v.pl); seenMinus.add(v.mi);
    }
  }
  assert.equal(Object.keys(seenForm).length, 2); assert.equal(seenPlus.size, 6); assert.equal(seenMinus.size, 6);
});

test('Monster-Würfel: sechs Seiten (HP 1, Mana 1, Limit 1, Ziehen 1, Hand 1, leer), gleich groß auf beiden Würfeln, in allen Stufen gleich', () => {
  const D = M.MONSTER.variants.dice;
  assert.equal(D.plus.length, 6); assert.equal(D.minus.length, 6);
  assert.deepEqual(D.plus.map(f => [f.k, f.n[0]]), [['hp', 1], ['mana', 1], ['limit', 1], ['draws', 1], ['hand', 1], ['none', 0]]);
  assert.deepEqual(D.minus, D.plus);
  for (const f of D.plus) assert.ok(f.n[0] === f.n[1] && f.n[1] === f.n[2], 'stufenunabhängig: ' + f.k);
});

test('Monster-Hand folgt den Würfeln', () => {
  const D = M.MONSTER.variants.dice, st = M.newGame({ seed: 9, ai: [true, true] });
  const mk = (kPlus, kMinus) => { const save = [D.plus.slice(), D.minus.slice()]; D.plus.fill(D.plus.find(f => f.k === kPlus)); D.minus.fill(D.minus.find(f => f.k === kMinus)); const r = M.spawnMonsters(2, st.rng); D.plus.splice(0, 6, ...save[0]); D.minus.splice(0, 6, ...save[1]); return r.F; };
  assert.equal(mk('hand', 'hp').stats.handExtra, 1); assert.equal(mk('hp', 'hand').stats.handExtra, -1);
  assert.equal(M.monsterHand(mk('hand', 'hp')), 5); assert.equal(M.monsterHand(mk('hp', 'hand')), 3);   // Stufe II: Limit 2 + 2 Handplätze, plus oder minus 1
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
    if (s.over && s.showdown < 3) { assert.equal(s.showdown, 2, 'vorzeitiges Ende nur nach Showdown 2'); assert.ok(Math.max(s.players[0].sp, s.players[1].sp) >= 4, 'vorzeitiges Ende nur ab 4 Siegpunkten'); }
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
        assert.ok(!tiers.some(t => t > mag), 'Abschnitt ' + st + ' ' + el + ': Karte über Magie ' + e + mag);
        if (mag >= 2) assert.ok(tiers.includes(mag), 'Abschnitt ' + st + ' ' + el + ': keine ' + e + mag + '-Karte');
      }
    }
  }
});

test('Fliehen: nur im Monsterkampf, im eigenen Angriffszug, bei Monster ohne Mana und ohne Todes-Fluch', () => {
  const fresh = () => combatSetup(11, ['F1']);
  let { s, c, me, op } = fresh();
  assert.equal(M.canFlee(s, 0), false, 'Monster hat noch Mana');
  assert.equal(M.apply(s, { pid: 0, type: 'flee' }).ok, false);
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, 0), true);
  assert.equal(M.canFlee(s, 1), false, 'nur der Angreifer');
  me.stats.death = 1;
  assert.equal(M.canFlee(s, 0), false, 'Todes-Fluch');
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

test('Kartenvorrat: Startdecks aus gemischten Stufe-1-Karten, getauschte Karten gehen zurück in den Händler, vergriffene Karten sind nicht kaufbar', () => {
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
  assert.equal(M.apply(s, { pid: 0, type: 'vendor', result: 'F2', cost: ['F1', 'F1'] }).ok, false, 'F2 braucht die Magie Feuer auf Stufe 2');
  assert.equal(M.vendorPlans(s, 0).some(o => o.result === 'F2'), false, 'die KI sieht gesperrte Karten nicht');
  me.stats.mag.F = 2; d.marks = [];
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

test('Nachziehmarker Weltphase: Nachziehen bei rotem Marker gibt dem Gegner 1 Gold, jede andere Aktion stellt auf grün zurück', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), g1 = () => s.players[1].stats.gold;
  const base = g1();
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // grün -> rot, keine Strafe
  assert.equal(s.players[0].drawRed, true); assert.equal(g1(), base);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // rot: Strafe
  assert.equal(g1(), base + 1);
  assert.ok(M.apply(s, { pid: 1, type: 'temple', amount: 1 }).ok);   // andere Aktion: Marker von Spieler 1 wieder grün
  assert.equal(s.players[1].drawRed, false);
  const g0 = s.players[0].stats.gold;
  assert.ok(M.apply(s, { pid: 0, type: 'temple', amount: 1 }).ok);
  assert.equal(s.players[0].drawRed, false);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);          // wieder grün -> rot ohne Strafe
  assert.equal(s.players[1].drawRed, true);
  assert.equal(s.players[0].stats.gold <= g0, true);
});

test('Nachziehmarker Kampf: Nachziehen bei rotem Marker gibt dem Gegner ein Nachziehtoken', () => {
  const { s, op } = combatSetup(11, ['F1']);
  assert.equal(op.stats.freeDraws || 0, 0);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok);
  assert.equal(op.stats.freeDraws || 0, 0);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(op.stats.freeDraws, 1);
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
  s.players[1].stats.gold = 5; assert.ok(M.apply(s, { pid: 1, type: 'temple', amount: 1 }).ok);   // (zweimal hintereinander nachziehen würde dem Spieler 0 Gold schenken)
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
  assert.ok(M.apply(s, { pid: 0, type: 'temple', amount: 1 }).ok);   // andere Aktion: zurück auf Grün, Zähler 0
  assert.equal(p0.drawRed, false); assert.equal(p0.drawN, 0);
});

test('Nachziehlimit Kampf: erst das Nachziehen über dem Limit gibt dem Gegner ein Nachziehtoken', () => {
  const { s, op } = combatSetup(11, ['F1']);
  s.players[0].stats.drawLimit = 2;
  for (let i = 0; i < 2; i++) { assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok); assert.ok(M.apply(s, { pid: 1, type: 'draw' }).ok); }
  assert.equal(op.stats.freeDraws || 0, 0); assert.equal(s.players[0].drawRed, true);
  assert.ok(M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.equal(op.stats.freeDraws, 1);
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
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'limit' }).ok); assert.deepEqual([g.st.gold, g.st.limit], [1, 3], 'Limit 2 → 3: 2 Gold');
  nxt(g); assert.equal(go(g, { type: 'spend', what: 'limit' }).ok, false, 'Limit 4 braucht 2 Gold, es ist nur noch 1 da'); assert.equal(g.st.limit, 3);
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'slot' }).ok); assert.deepEqual([g.st.gold, g.s.players[0].slots], [0, 4], 'Handplatz: 1 Gold');
  nxt(g); assert.equal(go(g, { type: 'spend', what: 'mana' }).ok, false, 'ohne Gold kein Upgrade, auch wenn Upgrade-Punkte da wären');
  g = mk({ swapCosts: 0 });   // alte Zuordnung
  assert.ok(go(g, { type: 'magic', elem: 'F' }).ok); assert.deepEqual([g.st.gold, g.st.pending], [3, 4], 'Magie kostet Gold');
  nxt(g); assert.ok(go(g, { type: 'spend', what: 'hp' }).ok); assert.deepEqual([g.st.gold, g.st.pending], [3, 3], 'HP kostet einen Upgrade-Punkt');
});

test('Startsiegpunkte: jeder Spieler beginnt mit 2 Siegpunkten (startSp), eine frühe Niederlage kostet einen', () => {
  assert.equal(M.DEFAULT_RULES.startSp, 2);
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 });
  assert.deepEqual(s.players.map(p => p.sp), [2, 2]);
  assert.deepEqual(M.newGame({ seed: 5, rules: { startSp: 0 } }).players.map(p => p.sp), [0, 0]);
});

test('Überschusspunkte: Sind alle Magien auf Stufe 3, werden Upgrade-Punkte (nicht Gold) sofort zu Siegpunkten', () => {
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0], me = p.stats;
  me.mag = { F: 3, E: 3, W: 2 }; me.pending = 4; me.gold = 5;
  assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'W' }).ok);   // erster Magie-Kauf kostet 1 Punkt, 3 bleiben übrig, nun ist alles auf Stufe 3
  assert.deepEqual([me.pending, p.sp, me.gold], [0, 5, 5], '1 Überschusspunkt = 1 Siegpunkt (2 Start), Gold bleibt');
  s.turn = 1; s.players[1].stats.gold = 3; assert.ok(M.apply(s, { pid: 1, type: 'temple', amount: 2 }).ok);   // Gegner ohne volle Magie behält seine Punkte
  assert.equal(s.players[1].stats.pending, 3, '1 Bonuspunkt + 2 aus dem Tempel'); assert.equal(s.players[1].sp, 2);
  const t = M.newGame({ seed: 5, ai: [false, false], first: 0, rules: { surplusSp: 0 } }); t.players[0].stats.mag = { F: 3, E: 3, W: 3 }; t.players[0].stats.pending = 2; t.players[0].stats.gold = 0;
  assert.ok(M.apply(t, { pid: 0, type: 'draw' }).ok); assert.deepEqual([t.players[0].stats.pending, t.players[0].sp], [2, 2], 'ohne Regel bleibt es');
});

test('Ausspiellimit startet bei 2 (startLimit), mit startLimit 0 wie früher bei 1', () => {
  assert.equal(M.DEFAULT_RULES.startLimit, 2);
  assert.deepEqual(M.newGame({ seed: 5 }).players.map(p => p.stats.limit), [2, 2]);
  assert.deepEqual(M.newGame({ seed: 5, rules: { startLimit: 0 } }).players.map(p => p.stats.limit), [1, 1]);
});

test('Start-HP der Spieler 4 (startHp), Monster beginnen weiter mit eigenen Werten', () => {
  assert.equal(M.DEFAULT_RULES.startHp, 4);
  const s = M.newGame({ seed: 5 });
  assert.deepEqual(s.players.map(p => [p.stats.hp, p.stats.maxHp]), [[4, 4], [4, 4]]);
  assert.deepEqual(M.newGame({ seed: 5, rules: { startHp: 0 } }).players.map(p => p.stats.maxHp), [3, 3]);
  assert.equal(M.spawnMonsters(1, s.rng).F.stats.maxHp >= 1, true);
});

test('Steigende Preise (priceRise): jeder Kauf einer Kategorie verteuert die nächste Stufe um den Grundpreis; Einnahmen je Abschnitt 2/3/4', () => {
  assert.deepEqual(M.DEFAULT_RULES.stageGold, [0, 1, 2, 3]); assert.deepEqual(M.DEFAULT_RULES.stagePoints, [0, 1, 2, 3]); assert.equal(M.DEFAULT_RULES.priceRise, 1);
  const s = M.newGame({ seed: 5, ai: [false, false], first: 0 }), p = s.players[0], st = p.stats;
  assert.deepEqual([st.gold, st.pending], [1, 1], 'Start: 1 Gold und 1 Upgrade-Punkt (Stufe I)');
  const prices = fn => [0, 1, 2].map(() => { const c = fn(); st.buys = st.buys || {}; return c; });
  const seq = (cat, fn) => { const out = []; for (let i = 0; i < 3; i++) { out.push(fn()); st.buys = st.buys || {}; st.buys[cat] = (st.buys[cat] || 0) + 1; } st.buys[cat] = 0; return out; };
  assert.deepEqual(seq('hp', () => M.hpStepCost(s, st)), [1, 2, 3], 'HP: 1, 2, 3');
  assert.deepEqual(seq('mana', () => M.manaStepCost(s, st)), [1, 2, 3], 'Mana: 1, 2, 3');
  assert.deepEqual(seq('slot', () => M.slotStepCost(s, st)), [1, 2, 3], 'Handplätze: 1, 2, 3');
  assert.deepEqual(seq('limit', () => M.limitStepCost(s, st)), [2, 4, 6], 'Ausspiellimit: 2, 4, 6');
  assert.deepEqual(seq('mag', () => M.magicCost(s, 1, st)), [1, 2, 3], 'Magie: 1, 2, 3');
  assert.deepEqual(seq('mag', () => M.magicCost(s, 2, st)), [1, 2, 3], 'Magie: unabhängig von der Stufe');
  // tatsächliche Käufe zählen
  st.gold = 20; st.pending = 20;
  for (const [need, what] of [[1, 'hp'], [2, 'hp'], [3, 'hp']]) { const g = st.gold; s.turn = 0; assert.ok(M.apply(s, { pid: 0, type: 'spend', what }).ok); assert.equal(g - st.gold, need, what + ' kostet ' + need); }
  const pn = st.pending; s.turn = 0; assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'F' }).ok); assert.equal(pn - st.pending, 1);
  s.turn = 0; const pn2 = st.pending; assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'E' }).ok); assert.equal(pn2 - st.pending, 2, 'zweiter Magie-Kauf kostet 2');
  s.turn = 0; const pn3 = st.pending; assert.ok(M.apply(s, { pid: 0, type: 'magic', elem: 'F' }).ok); assert.equal(pn3 - st.pending, 3, 'dritter Magie-Kauf kostet 3, auch wenn es nur Stufe 3 ist');
  // ohne priceRise bleibt alles beim Grundpreis
  const t = M.newGame({ seed: 5, rules: { priceRise: 0 } }), ts = t.players[0].stats; ts.gold = 9; t.turn = 0;
  for (let i = 0; i < 3; i++) { t.turn = 0; assert.ok(M.apply(t, { pid: 0, type: 'spend', what: 'hp' }).ok); } assert.equal(ts.gold, 6);
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

test('Todes-Fluch aus der Verteidigung wirkt nicht sofort, sondern erst in der nächsten Angriffsphase des Verfluchten', () => {
  const { s, me, op } = combatSetup(11, ['F1']);
  op.stats.limit = 3; op.stats.mana = 9;
  op.deck.hand.forEach((x, i) => { if (x) op.deck.hand[i] = Object.assign({}, x, { id: ['F3', 'W2', 'E2'][i] || x.id }); });
  M.apply(s, { pid: 0, type: 'mark', slot: 0 }); assert.ok(M.apply(s, { pid: 0, type: 'attack' }).ok);
  const hp0 = me.stats.hp;
  [1, 0, 2].forEach(i => assert.ok(M.apply(s, { pid: op.ctrl, type: 'mark', slot: i }).ok));
  assert.ok(M.apply(s, { pid: op.ctrl, type: 'defend' }).ok);
  assert.ok(me.stats.death >= 1);
  assert.ok(me.stats.hp >= hp0 - 5 && !s.log.slice(-6).some(e => /Todes-Fluch: /.test(e.txt)), 'kein Fluchschaden am Ende dieser Phase');
});
