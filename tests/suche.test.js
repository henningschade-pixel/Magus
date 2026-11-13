// Vorausschau der Kampf-KI (seit 0.13, src/ai/40-suche.js): Sie spielt jeden möglichen Zug in mehreren Welten durch.
// Die übrigen Tests laufen mit der Basis-KI (tools/balance/load.js schaltet die Vorausschau ab); hier wird sie gezielt eingeschaltet.
const test = require('node:test'), assert = require('node:assert/strict');
const { M, AI, combatSetup } = require('./helpers.js');

function withSearch(o, fn) { const old = AI.setSearch(); AI.setSearch(Object.assign({ sim: 60, world: 0, ms: 0 }, o)); try { return fn(); } finally { AI.setSearch(old); } }
const shape = s => JSON.stringify(s, (k, v) => (k === 'rng' ? undefined : v));
// Partie mit der Basis-KI bis in einen Kampf spielen, in dem eine echte Entscheidung ansteht
function someCombat(seed, skip) {
  const s = M.newGame({ seed, ai: [true, true], first: 0 });
  let n = 0, seen = 0;
  while (!s.over && n++ < 5000) {
    if (s.phase === 'combat' && !s.combat.forced && s.combat.action === 'attack' && s.combat.turns >= 2 && seen++ >= (skip || 0)) return s;
    if (!AI.runTurn(s, M.actor(s)).ok) break;
  }
  return null;
}

test('Vorausschau: verändert den Spielzustand nicht und entscheidet wiederholbar', () => {
  withSearch({ sim: 60 }, () => {
    for (const seed of [21, 22, 23]) {
      const s = someCombat(seed, 3); assert.ok(s, 'Kampf gefunden');
      const before = shape(s), pid = M.actor(s);
      const a = AI.plan(s, pid);
      assert.equal(shape(s), before, 'Zustand unverändert (Seed ' + seed + ')');
      assert.deepEqual(AI.plan(s, pid), a, 'gleiche Lage, gleicher Zug');
      assert.ok(a.length >= 1 && a.every(x => x.pid === pid));
    }
  });
});

test('Vorausschau: der gewählte Zug ist immer ausführbar', () => {
  withSearch({ sim: 24 }, () => {
    const s = M.newGame({ seed: 77, ai: [true, true], first: 1 });
    let n = 0, combat = 0;
    while (!s.over && n++ < 3000 && combat < 40) {
      const pid = M.actor(s);
      if (s.phase === 'combat') {
        combat++;
        const acts = AI.plan(s, pid), c = s.combat;
        for (const a of acts) { const r = M.apply(s, a); assert.ok(r.ok, 'Aktion ' + JSON.stringify(a) + ': ' + r.error); if (s.combat !== c) break; }
      } else assert.ok(AI.runTurn(s, pid).ok);
    }
    assert.ok(combat >= 20, 'genug Kampfentscheidungen geprüft');
  });
});

test('Vorausschau: fair – verdeckte Karten des Gegners beeinflussen die Entscheidung nicht', () => {
  withSearch({ sim: 80 }, () => {
    let checked = 0;
    for (const seed of [31, 32, 33, 34]) {
      const s = someCombat(seed, 2); if (!s) continue;
      const pid = M.actor(s), c = s.combat, opp = c.sides.a.ctrl === pid ? c.sides.b : c.sides.a, d = opp.deck;
      const a = AI.plan(s, pid);
      // Handkarte des Gegners mit einer anderen Karte seines Zugstapels vertauschen und den Zugstapel umdrehen: Was er besitzt, bleibt gleich, nur die Verteilung ändert sich
      const hi = d.hand.findIndex(Boolean), di = hi >= 0 ? d.draw.findIndex(x => x.id !== d.hand[hi].id) : -1;
      if (di < 0) continue;
      const keep = d.hand[hi]; d.hand[hi] = d.draw[di]; d.draw[di] = keep; d.draw.reverse();
      assert.deepEqual(AI.plan(s, pid), a, 'Seed ' + seed + ': gleicher Zug trotz anderer verdeckter Karten');
      checked++;
    }
    assert.ok(checked >= 2);
  });
});

test('Vorausschau: nutzt einen sicheren Sieg und verteidigt gegen tödlichen Schaden', () => {
  withSearch({ sim: 60 }, () => {
    // Monster ohne Karten und mit 1 HP: Jeder Schaden gewinnt
    const A = combatSetup(11, ['F2', 'E1', 'W1']);
    A.op.stats.hp = 1; A.op.deck.hand = A.op.deck.hand.map(() => null); A.op.deck.draw = []; A.op.deck.discard = [];
    const acts = AI.plan(A.s, 0);
    assert.equal(acts[acts.length - 1].type, 'attack');
    for (const a of acts) assert.ok(M.apply(A.s, a).ok);
    assert.ok(AI.runTurn(A.s, 1).ok);   // das Monster hat keine Karte zum Blocken
    assert.equal(A.s.phase, 'world'); assert.ok(A.s.lastCombat.monsterDefeated, 'Monster besiegt');
    // Tödlicher Feuerangriff, in der Hand liegt Wasser (überlegen, gratis): Die KI blockt
    const B = combatSetup(11, ['W3', 'W2', 'E1']), c = B.c;
    B.me.stats.hp = 3; c.turn = 'a'; c.action = 'defense'; c.color = 'F'; c.pending = 5; c.afterAtk = true;
    const def = AI.plan(B.s, 0);
    assert.equal(def[def.length - 1].type, 'defend');
    for (const a of def) assert.ok(M.apply(B.s, a).ok);
    assert.ok(B.me.stats.hp > 0, 'überlebt');
  });
});

test('Vorausschau: spielt ganze Partien zu Ende und schlägt die Basis-KI', () => {
  // Platz 0 plant voraus, Platz 1 spielt die Basis-KI (je Platz über setParams); mit getauschtem Beginner
  let wins = 0;
  for (let g = 0; g < 4; g++) {
    const seat = g >> 1, s = M.newGame({ seed: 300 + g, ai: [true, true], first: g & 1 });
    AI.setParams(seat, { sim: 30 }); AI.setParams(1 - seat, { sim: 0 });
    try { let n = 0; while (!s.over && n++ < 20000) if (!AI.runTurn(s, M.actor(s)).ok) break; } finally { AI.setParams(0, null); AI.setParams(1, null); }
    assert.ok(s.over, 'Partie ' + g + ' endet');
    if (s.winner === seat) wins++;
  }
  assert.ok(wins >= 3, 'Vorausschau gewinnt mindestens 3 von 4 Partien (gewonnen: ' + wins + ')');
});

test('Probekämpfe der Weltphase: Partie endet, der Zustand bleibt beim Planen unverändert', () => {
  withSearch({ sim: 0, world: 8 }, () => {
    const s = M.newGame({ seed: 41, ai: [true, true], first: 0 });
    for (let g = 0; g < 12; g++) { const st = AI.ecoStep(s, 0); if (!st || !M.apply(s, st).ok) break; }   // Wirtschaftsschritte vorweg, damit die Zugentscheidung selbst ansteht
    const before = shape(s), acts = AI.plan(s, 0);
    assert.ok(['draw', 'vendor', 'combat', 'mark'].includes(acts[0].type));
    assert.equal(shape(s), before, 'Probekämpfe laufen auf Kopien');
    let n = 0; while (!s.over && n++ < 20000) if (!AI.runTurn(s, M.actor(s)).ok) break;
    assert.ok(s.over);
  });
});

test('Vorausschau: mit leerer Hand wird nachgezogen statt erholt oder gepasst (0.13.4)', () => {
  withSearch({ sim: 40 }, () => {
    for (const mana of [0, 2, 9]) {
      const { s, me } = combatSetup(41, []);
      me.stats.mana = mana;
      const acts = AI.plan(s, 0);
      assert.equal(acts[acts.length - 1].type, 'draw', 'Mana ' + mana + ': Nachziehen');
      assert.equal(AI.basePlan(s, 0).pop().type, 'draw', 'Mana ' + mana + ': Basis-KI zieht nach');
    }
    const { s, me } = combatSetup(41, []);   // Gratis-Nachziehen geht vor
    me.stats.mana = 1; me.stats.freeDraws = 1;
    assert.equal(AI.plan(s, 0).pop().type, 'freeDraw');
    const e = combatSetup(41, []);   // kein Deck mehr: nichts zum Nachziehen, dann bleibt Erholen
    e.me.deck.draw = []; e.me.deck.discard = []; e.me.stats.mana = 1;
    assert.equal(AI.plan(e.s, 0).pop().type, 'recover');
  });
});
