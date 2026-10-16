/* Magus – Regelkern (Teil 7): Weltphase (Züge außerhalb des Kampfes) und Erholungsphase.
   Aktionen, die den Zug beenden: Nachziehen, Händler, Kampf, (Erholungsphase:) Erholen und Passen; in der Erholungsphase ist kein Nachziehen möglich (der Showdown beginnt ohnehin mit neu gemischter, voller Hand).
   Bonusaktionen im eigenen Zug, beliebig oft und ohne den Zug zu beenden: Gold opfern, Magie kaufen, Upgrade-Punkte ausgeben.
   Upgrade-Punkte dürfen aufgespart werden. Im Kampf sind keine Bonusaktionen möglich. */

function campAllowed(state, pid, kind) {
  const cp = state.camp; if (!cp) return true;
  if (!['temple', 'vendor', 'recover', 'pass'].includes(kind)) return false;
  if (cp.remaining[pid] <= 0) return false;
  if (kind === 'temple') return true;                          // Bonusaktion: nicht begrenzt, zählt nicht als Aktion
  if (['vendor', 'recover'].includes(kind)) return !(cp.used[pid][kind] > 0);
  return true;
}
function endTurn(state, pid, kind) {
  const cp = state.camp;
  if (cp) {
    cp.remaining[pid]--; cp.used[pid][kind] = (cp.used[pid][kind] || 0) + 1;
    if (cp.remaining[0] <= 0 && cp.remaining[1] <= 0) { startShowdown(state); return; }
    const nx = other(pid);
    state.turn = cp.remaining[nx] > 0 ? nx : pid;
    return;
  }
  const nx = other(pid);
  regen(state.players[nx].stats, regenGain(state));
  state.turn = nx; state.worldTurns++;
  if (state.worldTurns % 2 === 0) regenMonsters(state);   // Monster erholen sich am Ende jeder Runde (nach den Zügen beider Spieler)
  curses(state).turnStart(state, nx, state.players[nx].stats, false, state.players[nx].name);
}

function execSpend(state, pid, what) {
  const p = state.players[pid], s = p.stats, d = p.deck;
  if (s.pending <= 0) return fail('Keine offenen Upgrade-Punkte.');
  let cost = 1;
  if (what === 'hp') { const n = state.rules.hpPerPoint || 1; s.maxHp += n; }   // Upgrade erhöht nur das Maximum, die aktuellen HP bleiben
  else if (what === 'mana') {
    cost = manaStepCost();
    if (s.pending < cost) return fail('Der nächste Mana-Schritt kostet ' + cost + ' Upgrade-Punkte.');
    s.maxMana++;   // nur das Maximum steigt, das aktuelle Mana bleibt
  } else if (what === 'limit') {
    if (s.limit >= MAX_LIMIT) return fail('Das Ausspiellimit ist am Maximum (' + MAX_LIMIT + ').');
    cost = limitStepCost(state, s);
    if (s.pending < cost) return fail('Das nächste Limit kostet ' + cost + ' Upgrade-Punkte.');
    s.limit++;
  } else if (what === 'slot') {
    if (p.slots >= MAX_SLOTS) return fail('Du hast schon ' + MAX_SLOTS + ' Handplätze.');
    p.slots++; d.hand.push(null);
  } else return fail('Unbekanntes Upgrade.');
  s.pending -= cost;
  log(state, p.name + ' verbessert ' + { hp: 'max. HP', mana: 'max. Mana', limit: 'das Ausspiellimit', slot: 'die Handplätze' }[what] + '.', pid);
  return { ok: true };
}
function execTemple(state, pid, amount) {
  const p = state.players[pid], s = p.stats;
  if (!campAllowed(state, pid, 'temple')) return fail('In der Erholungsphase nicht mehr erlaubt.');
  const n = amount | 0;
  if (n <= 0 || n > s.gold) return fail('So viel Gold hast du nicht.');
  const pv = previewTemple(p, n);
  s.gold -= n; p.temple.points = pv.pool; p.temple.level = pv.level; s.pending += pv.gained;
  log(state, p.name + ' opfert ' + n + ' Gold im Tempel (+' + pv.points + ' Punkte, +' + pv.gained + ' Upgrade-Punkt' + (pv.gained === 1 ? '' : 'e') + ').', pid);
  return { ok: true };
}
function execMagic(state, pid, e) {
  const p = state.players[pid], s = p.stats;
  if (!campAllowed(state, pid, 'temple')) return fail('In der Erholungsphase nicht mehr erlaubt.');
  if (!ELEMENTS.includes(e)) return fail('Unbekanntes Element.');
  if (s.mag[e] >= MAX_MAGIC) return fail(NAMES[e] + ' ist schon auf Stufe ' + MAX_MAGIC + '.');
  const cost = magicCost(state, s.mag[e]);
  if (s.gold < cost) return fail('Du brauchst ' + cost + ' Gold.');
  s.gold -= cost; s.mag[e]++;
  log(state, p.name + ' steigert ' + NAMES[e] + ' auf Stufe ' + s.mag[e] + ' (' + cost + ' Gold).', pid);
  return { ok: true };
}

function applyWorld(state, a) {
  const pid = a.pid, p = state.players[pid], d = p.deck, s = p.stats;
  // Markieren und Sperren sind auch außerhalb des eigenen Zuges möglich.
  if (a.type === 'mark') { const e = toggleMark(d, a.slot, s.limit, curses(state).curseCards); return e ? fail(e) : { ok: true }; }
  if (a.type === 'lock') { const e = toggleLock(d, a.slot); return e ? fail(e) : { ok: true }; }
  if (state.turn !== pid) return fail('Du bist nicht am Zug.');
  const viaCurses = curses(state).worldAction(state, a, { p, pid, d });
  if (viaCurses) return viaCurses;
  switch (a.type) {
    case 'draw': {
      if (!campAllowed(state, pid, 'draw')) return fail('In der Erholungsphase nicht mehr erlaubt.');
      if (!drawPhase(state, d)) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
      log(state, p.name + ' zieht Karten nach.', pid);
      endTurn(state, pid, 'draw'); return { ok: true };
    }
    case 'vendor': return execVendor(state, pid, a);
    case 'temple': return execTemple(state, pid, a.amount);
    case 'magic': return execMagic(state, pid, a.elem);
    case 'spend': return execSpend(state, pid, a.what);
    case 'combat': {
      if (state.camp) return fail('In der Erholungsphase gibt es keine Kämpfe.');
      const m = state.monsters[a.elem]; if (!m || !monsterAlive(m)) return fail('Dieses Monster ist besiegt.');
      d.marks = [];
      startCombat(state, pid, a.elem); return { ok: true };
    }
    case 'recover': {
      if (!state.camp) return fail('Erholen gibt es nur in der Erholungsphase.');
      if (!campAllowed(state, pid, 'recover')) return fail('Erholen schon genutzt.');
      const rg = regenGain(state); regen(s, rg); log(state, p.name + ' erholt sich (+' + rg + ' HP, +' + rg + ' Mana).', pid);
      endTurn(state, pid, 'recover'); return { ok: true };
    }
    case 'pass': {
      if (!state.camp) return fail('Passen gibt es nur in der Erholungsphase.');
      log(state, p.name + ' passt.', pid);
      endTurn(state, pid, 'pass'); return { ok: true };
    }
  }
  return fail('Unbekannte Aktion.');
}
