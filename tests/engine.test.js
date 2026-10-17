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
test('Spiegel gleicht höchstens seine Stufe aus, der Rest geht auf die HP (auch beim Erholen)', () => {
  let r = spiegelFall(3, null);                                         // Schaden 2, Stufe 3: alles ausgeglichen
  assert.equal(r.op.stats.hp, 9); assert.equal(r.op.stats.mirror, 1); assert.ok(r.op.stats.mana >= 3);   // Erholen gibt Mana
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

test('Trostpreis: nach Showdown 1 ein Upgrade-Punkt, nach Showdown 2 zwei', () => {
  const found = {};
  for (let seed = 7000; seed < 7040 && !(found[1] && found[2]); seed++) {
    const s = M.newGame({ seed, ai: [true, true], first: seed & 1 });
    let steps = 0; while (!s.over && steps++ < 20000) if (!AI.runTurn(s, M.actor(s)).ok) break;
    let sd = 0;
    for (const l of s.log) {
      const m = /^Showdown (\d):/.exec(l.txt); if (m) sd = +m[1];
      const t = /als Trostpreis (\d) Upgrade-Punkt/.exec(l.txt); if (t) found[sd] = +t[1];
    }
  }
  assert.equal(found[1], 1); assert.equal(found[2], 2);
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
