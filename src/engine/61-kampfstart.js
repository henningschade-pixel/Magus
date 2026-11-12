/* ---------- Kampfablauf 1: Kampfstart (Seiten, Kartenausgabe, Monsterkampf, Showdown) ---------- */
function playerSide(state, pid, key) {
  const p = state.players[pid];
  return { key, kind: 'player', ctrl: pid, name: p.name, stats: p.stats, deck: p.deck };
}
// Vor und nach jedem Kampf: frisch gemischtes Deck und volle Hand. In Monsterkämpfen bleiben HP und Mana erhalten (sie regenerieren in der Weltphase); vor und nach einem Showdown sind HP und Mana voll.
function resetPlayers(state, mode) {
  const full = mode !== 'monster';
  state.players.forEach(p => {
    if (full) { p.stats.hp = p.stats.maxHp; p.stats.mana = p.stats.maxMana; }
    p.stats.freeDraws = 0;
    dealFresh(state, p.deck, p.slots);
  });
}
// Gemeinsamer Anfangszustand eines Kampfs (Monsterkampf und Showdown unterscheiden sich nur in den übergebenen Feldern).
function newCombat(state, fields) {
  return Object.assign({ logFrom: state.logN, turn: 'a', action: 'attack', color: null, pending: 0, turns: 0, atkTurns: 0 }, fields);
}
function startCombat(state, attPid, slot) {   // slot: Platz des Monsters (F, E, W); sein Element steht in monster.el
  const A = state.players[attPid];
  resetPlayers(state, 'monster');
  dealFresh(state, A.deck, A.slots);
  const m = state.monsters[slot], el = m.el;
  const mdeck = newDeck(state, m.deckIds, monsterHand(m));
  state.players.forEach(p => { p.stats.freeDraws = 0; });
  m.stats.freeDraws = 0; m.drawN = 0; m.drawRed = false;   // eigener Nachziehmarker des Monsters (Limit: stats.drawLimit), frisch zu Kampfbeginn
  state.combat = newCombat(state, {
    mode: 'monster', elem: el, slot, att: attPid, def: other(attPid),
    sides: { a: playerSide(state, attPid, 'a'), b: { key: 'b', kind: 'monster', ctrl: other(attPid), name: m.name, stats: m.stats, deck: mdeck, monster: m } },
  });
  state.phase = 'combat'; traceStep(state);
  log(state, A.name + ' greift ' + m.name + ' an. ' + state.players[other(attPid)].name + ' führt das Monster.', attPid);
}
function pickShowdownAttacker(state) {
  // der Zurückliegende beginnt
  const key = p => [p.sp, p.temple.points, magicProgress(p), p.stats.gold];
  const k0 = key(state.players[0]), k1 = key(state.players[1]);
  for (let i = 0; i < k0.length; i++) { if (k0[i] > k1[i]) return 1; if (k1[i] > k0[i]) return 0; }
  return state.rng.random() < 0.5 ? 0 : 1;
}
function startShowdown(state) {
  const att = pickShowdownAttacker(state);
  resetPlayers(state, 'showdown');
  state.combat = newCombat(state, {
    mode: 'showdown', elem: null, att, def: other(att),
    sides: { a: playerSide(state, att, 'a'), b: playerSide(state, other(att), 'b') },
  });
  state.phase = 'combat'; traceStep(state);
  log(state, 'Showdown ' + (state.showdown + 1) + ': ' + state.players[att].name + ' greift zuerst an (liegt zurück oder Zufall).', att);
}
