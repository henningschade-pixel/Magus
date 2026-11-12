/* ---------- Kampfablauf 6: Aktionen des Kampfs annehmen und verteilen (applyCombat) ---------- */
function applyCombat(state, a) {
  const c = state.combat, pid = a.pid;
  if (c.forced) return applyForcedChoice(state, c, a, pid);
  const side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const mine = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b;     // (in Monsterkämpfen kontrolliert jeder genau eine Seite)
  if (a.type === 'lock') { const e = toggleLock(mine.deck, a.slot); return e ? fail(e) : { ok: true }; }
  if (side.ctrl !== pid) return fail('Die Gegenseite ist am Zug.');
  switch (a.type) {
    case 'mark': { const e = toggleMark(side.deck, a.slot, side.stats.limit); return e ? fail(e) : { ok: true }; }
    case 'lfp': { if (c.action !== 'attack' && c.action !== 'defense') return fail('Nur im Angriffs- oder Verteidigungszug.'); const ok = ['sm', 'om', 'sd', 'od', 'sh', 'oh', 'sr', 'or', 'st', 'ot']; c.lfp = a.pick === null ? null : (Array.isArray(a.pick) ? a.pick : []).filter(x => typeof x === 'string' && ok.includes(x.split(':')[0]) && (x.indexOf(':') < 0 || ELEMENTS.includes(x.split(':')[1]))).slice(0, 3); return { ok: true }; }
    case 'attack': if (c.action !== 'attack') return fail('Jetzt wird verteidigt.'); if (!allowed(state, 'attack', 'attack')) return fail('Angreifen ist in den Einstellungen für die Angriffsphase abgeschaltet.'); return execAttack(state);
    case 'defend': if (c.action !== 'defense') return fail('Jetzt wird angegriffen.'); if (!c.pending) return fail('Ohne Angriff gibt es nichts zu verteidigen.'); if (!allowed(state, 'defense', 'defend')) return fail('Verteidigen ist in den Einstellungen für die Verteidigungsphase abgeschaltet.'); return execDefense(state, false);
    case 'pass':
      if (!allowed(state, c.action, 'pass')) return fail('Passen ist in den Einstellungen für diese Phase abgeschaltet.');
      if (c.action === 'defense' && !c.pending) { log(state, side.name + ' reagiert nicht.', side.ctrl); return endReaction(state); }
      if (c.action === 'defense') return execDefense(state, true);
      side.deck.marks = []; side.passed = (side.passed || 0) + 1; log(state, side.name + ' passt.', side.ctrl);   // passed: Passen-Züge in Folge (die KI greift dann eher an)
      passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
    case 'flee': return combatFlee(state, c, side, opp);
    case 'recover': return combatRecover(state, c, side);
    case 'draw': return combatDraw(state, c, side);
    case 'freeDraw': {
      if (side.stats.freeDraws <= 0) return fail('Kein Gratis-Nachziehen übrig.');
      if (!drawPhase(state, side.deck)) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
      side.stats.freeDraws--; log(state, side.name + ' nutzt ein Gratis-Nachziehen.', side.ctrl);
      return { ok: true };
    }
  }
  return fail('Unbekannte Aktion.');
}
// Falle oder Hellsicht: Der Betroffene entscheidet zuerst; vorher ist keine andere Aktion möglich
function applyForcedChoice(state, c, a, pid) {
  const trapPick = c.forced.kind === 'trap';
  if (a.type !== 'fd') return fail(c.forced.pid === pid ? (trapPick ? 'Falle: Wähle zuerst die Karte, die du verdeckt vor dich legst.' : 'Zerrüttung: Wähle zuerst ' + c.forced.n + ' Handkarte' + (c.forced.n === 1 ? '' : 'n') + ' zum Abwerfen.') : (trapPick ? 'Der Gegner wählt gerade seine Falle.' : 'Der Gegner wählt gerade seine Abwurfkarten.'));
  if (c.forced.pid !== pid) return fail(trapPick ? 'Der Gegner wählt gerade seine Falle.' : 'Der Gegner wählt gerade seine Abwurfkarten.');
  if (trapPick) {   // Falle: eine der gezogenen Karten verdeckt vor sich legen, die übrigen auf den Ablagestapel
    const v = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b, sl = Array.isArray(a.slots) ? a.slots.map(Number) : [], cards = c.forced.cards;
    if (sl.length !== 1 || !cards[sl[0]] || parseCard(cards[sl[0]].id).curse) return fail('Wähle genau eine der gezogenen Karten als Falle.');
    trapSet(state, v, cards[sl[0]], c.forced.lvl);
    cards.forEach((cd, i) => { if (i !== sl[0]) v.deck.discard.push(cd); });
    c.forced = null;
    log(state, v.name + ' legt eine Karte verdeckt als Falle vor sich, ' + (cards.length - 1) + ' auf den Ablagestapel.', pid);
    return { ok: true };
  }
  const v = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b, pick = Array.isArray(a.pick) ? a.pick : [], cards = c.forced.cards;   // Hellsicht: je Karte offen vor mich legen (k) oder ablegen (a)
  if (pick.length !== cards.length || pick.some(k => k !== 'k' && k !== 'a')) return fail('Hellsicht: Entscheide für jede gezogene Karte (offen vor dich legen oder ablegen).');
  if (pick.filter(k => k === 'k').length !== c.forced.n) return fail('Hellsicht: Wähle genau ' + c.forced.n + ' Karte' + (c.forced.n === 1 ? '' : 'n') + ' aus.');
  if (pick.some((k, i) => k === 'k' && parseCard(cards[i].id).curse)) return fail('Hellsicht: Fluchkarten lassen sich nicht auswählen.');
  const r = sightResolve(state, v, cards, pick);
  c.forced = null;
  log(state, v.name + ' legt ' + r.k + ' Karte' + (r.k === 1 ? '' : 'n') + ' der Hellsicht offen vor sich (ohne Manakosten), ' + r.a + ' auf den Ablagestapel.', pid);
  return { ok: true };
}
// Fliehen (nur mit Regelschalter fleeAllowed): im eigenen Angriffszug, wenn der Gegner kein Mana mehr hat.
function combatFlee(state, c, side, opp) {
  if (!state.rules.fleeAllowed) return fail('Fliehen ist abgeschaltet.');
  if (c.action !== 'attack') return fail('Fliehen geht nur im eigenen Angriffszug, nicht unter Angriff.');
  if (opp.stats.mana > 0) return fail('Fliehen geht nur, wenn der Gegner kein Mana mehr hat.');
  if (side.stats.death > 0) return fail('Unter einem Todesfluch kann man nicht fliehen.');
  side.deck.marks = [];
  log(state, side.name + ' flieht vor ' + opp.name + '.', side.ctrl);
  c.turns++; traceStep(state, { t: c.turns });
  return { ok: true, combatEnd: endCombat(state, { reason: 'flee', winner: null, monsterDefeated: false, fled: side.key }) };
}
// Erholen: Mana zurückgewinnen; in der Verteidigungsphase wird der Schaden hingenommen.
function combatRecover(state, c, side) {
  if (!allowed(state, c.action, 'recover')) return fail('Erholen ist in den Einstellungen für diese Phase abgeschaltet.');
  const gain = recoverGain(state);
  side.stats.mana = Math.min(side.stats.maxMana, side.stats.mana + gain);
  side.deck.marks = [];
  if (c.action === 'defense' && !c.pending) { log(state, side.name + ' erholt sich in der Reaktion: +' + gain + ' Mana.', side.ctrl, { kind: 'recover', who: side.ctrl }); return endReaction(state); }
  if (c.action === 'defense') return execDefense(state, true, 'recover');   // Verteidigungsphase: der Schaden wird hingenommen (das Protokoll steht in execDefense)
  log(state, side.name + ' erholt sich: +' + gain + ' Mana.', side.ctrl, { kind: 'recover', who: side.ctrl });   // Verteidigungsphase: der Schaden wird hingenommen
  passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
}
// Nachziehen: ersetzt den Angriff; in der Verteidigungsphase wird der Schaden hingenommen.
function combatDraw(state, c, side) {
  if (!allowed(state, c.action, 'draw')) return fail('Nachziehen ist in den Einstellungen für diese Phase abgeschaltet.');
  const dmc = drawManaCost(state, side.ctrl);   // roter Nachziehmarker: Nachziehen kostet Mana
  if (side.stats.mana < dmc) return fail('Bei rotem Nachziehmarker kostet Nachziehen ' + dmc + ' Mana. Es ist nicht genug Mana da.');
  if (!drawPhase(state, side.deck)) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
  side.stats.mana -= dmc;
  if (c.action === 'defense' && !c.pending) { log(state, side.name + ' zieht in der Reaktion Karten nach' + (dmc ? ' und zahlt bei rotem Marker ' + dmc + ' Mana' : '') + '.', side.ctrl); return endReaction(state); }
  if (c.action === 'defense') return execDefense(state, true, 'draw');
  log(state, side.name + ' zieht Karten nach (ersetzt den Angriff)' + (dmc ? ' und zahlt bei rotem Marker ' + dmc + ' Mana' : '') + '.', side.ctrl);
  passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
}

