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

test('Monsterwerte je Stufe (Zäh, Limit, Beute)', () => {
  const s = M.newGame({ seed: 3, ai: [true, true], first: 0 });
  const hp = [3, 8, 11], limit = [1, 2, 3], gold = [1, 2, 3];
  [1, 2, 3].forEach((st, i) => {
    const r = M.spawnMonsters(st, s.rng);
    for (const el of Object.keys(r)) {
      const m = r[el].stats;
      assert.equal(m.maxHp, hp[i], 'HP Stufe ' + st); assert.equal(m.limit, limit[i]); assert.equal(m.gold, gold[i]);
      assert.ok(m.maxMana >= 4 && m.maxMana <= 9, 'Mana Stufe ' + st + ': ' + m.maxMana);
    }
  });
});

test('Siegpunkte: Monsterkampf +1 / -1 (nie unter 0), Beute für beide, kein Trostpreis, Ende ab 8 nach Showdown 2', () => {
  let decided = 0, floored = 0;
  for (let seed = 7000; seed < 7040; seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1 });
    let steps = 0, last = null;
    while (!s.over && steps++ < 20000) {
      const before = s.players.map(p => ({ sp: p.sp, gold: p.stats.gold }));
      if (!AI.runTurn(s, M.actor(s)).ok) break;
      s.players.forEach(p => assert.ok(p.sp >= 0, 'Siegpunkte nie unter 0'));
      const r = s.lastCombat; if (!r || r === last || r.mode !== 'monster') continue;
      last = r;
      const d = s.players.map((p, i) => p.sp - before[i].sp);
      if (r.winner === null) assert.deepEqual(d, [0, 0], 'Flucht oder Unentschieden ohne Siegpunkte');
      else {
        decided++;
        const w = d.indexOf(1), l = 1 - w; assert.ok(w >= 0, 'der Sieger erhält 1 Siegpunkt');
        assert.equal(d[l], before[l].sp > 0 ? -1 : 0, 'der Verlierer verliert 1 Siegpunkt, aber nie unter 0');
        if (before[l].sp === 0) floored++;
      }
      if (r.monsterDefeated) { const g = s.players.map((p, i) => p.stats.gold - before[i].gold); assert.ok(g[0] === g[1] && g[0] >= 0, 'Beute für beide Spieler'); }
    }
    assert.ok(!s.log.some(l => /Trostpreis/.test(l.txt)), 'kein Trostpreis');
    if (s.over && s.showdown < 3) { assert.equal(s.showdown, 2, 'vorzeitiges Ende nur nach Showdown 2'); assert.ok(Math.max(s.players[0].sp, s.players[1].sp) >= 8, 'vorzeitiges Ende nur ab 8 Siegpunkten'); }
  }
  assert.ok(decided > 0 && floored > 0, 'Monsterkämpfe mit Sieger und Untergrenze 0 kamen vor');
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
  const hp = c.sides.b.stats.hp, gold = me.stats.gold;
  const r = M.apply(s, { pid: 0, type: 'flee' });
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

test('Fliehen im Showdown: bei 0 Mana des Gegners möglich, Showdown endet ohne Sieger (je 1 Siegpunkt)', () => {
  const s = M.newGame({ seed: 4, ai: [true, true], first: 0 });
  let steps = 0; while (!s.over && !(s.phase === 'combat' && s.combat.mode === 'showdown') && steps++ < 20000) if (!AI.runTurn(s, M.actor(s)).ok) break;
  assert.ok(s.phase === 'combat' && s.combat.mode === 'showdown', 'Showdown erreicht');
  const c = s.combat, att = c.sides.a.ctrl, sp = s.players.map(p => p.sp);
  assert.equal(M.canFlee(s, att), false, 'Gegner hat noch Mana');
  c.sides.b.stats.mana = 0;
  assert.equal(M.canFlee(s, att), true);
  const r = M.apply(s, { pid: att, type: 'flee' });
  assert.ok(r.ok && r.combatEnd.reason === 'flee' && r.combatEnd.winner === null);
  assert.deepEqual(s.players.map(p => p.sp), sp.map(x => x + 1), 'je 1 Siegpunkt');
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
