/* Magus – Regelkern (Teil 7): Weltphase (Züge außerhalb des Kampfes).
   Jede Aktion beendet den Zug (Spielerwechsel): Nachziehen, Händler, Kampf, Gold opfern, Magie kaufen, jedes Upgrade (Punkte ausgeben).
   Upgrade-Punkte dürfen aufgespart werden. */

// Verlauf für die Statistik: ein Messpunkt zu Beginn, nach jedem Zug und nach jedem Kampf (ev = Kampfereignis)
// avg: durchschnittliche Kartenstufe je Farbe im ganzen Deck (Stapel, Ablage, Hand; ohne Fluchkarten)
function deckAvg(p) {
  const d = p.deck, all = [].concat(d.draw, d.discard, d.hand.filter(Boolean)), out = {};
  for (const e of ELEMENTS) { const cs = all.filter(c => c.id[0] === e); out['a' + e] = cs.length ? Math.round(cs.reduce((n, c) => n + +c.id.slice(1), 0) / cs.length * 100) / 100 : 0; }
  return out;
}
function sample(state, ev) {
  state.hist.push({ ev: ev || null, p: state.players.map(p => Object.assign(deckAvg(p), { sp: p.sp, up: p.stats.upGot, lvl: p.temple.level, F: p.stats.mag.F, E: p.stats.mag.E, W: p.stats.mag.W, slots: p.slots, limit: p.stats.limit, hp: p.stats.hp, mana: p.stats.mana })) });
}
function endTurn(state, pid, kind) {
  const nx = other(pid);
  regen(state.players[nx].stats, regenGain(state));
  state.turn = nx; state.worldTurns++;
  sample(state);
  if (state.worldTurns % 2 === 0) regenMonsters(state);   // Monster erholen sich am Ende jeder Runde (nach den Zügen beider Spieler)
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
  const n = amount | 0;
  if (n <= 0 || n > s.gold) return fail('So viel Gold hast du nicht.');
  const pv = previewTemple(p, n);
  s.gold -= n; p.temple.points = pv.pool; p.temple.level = pv.level; s.pending += pv.gained; s.upGot += pv.gained;
  log(state, p.name + ' opfert ' + n + ' Gold im Tempel (+' + pv.points + ' Punkte, +' + pv.gained + ' Upgrade-Punkt' + (pv.gained === 1 ? '' : 'e') + ').', pid);
  return { ok: true };
}
function execMagic(state, pid, e) {
  const p = state.players[pid], s = p.stats;
  if (!ELEMENTS.includes(e)) return fail('Unbekanntes Element.');
  if (s.mag[e] >= MAX_MAGIC) return fail(NAMES[e] + ' ist schon auf Stufe ' + MAX_MAGIC + '.');
  const cost = magicCost(state, s.mag[e]);
  if (s.gold < cost) return fail('Du brauchst ' + cost + ' Gold.');
  s.gold -= cost; s.mag[e]++;
  log(state, p.name + ' steigert ' + NAMES[e] + ' auf Stufe ' + s.mag[e] + ' (' + cost + ' Gold).', pid);
  return { ok: true };
}

// Erfolgreiche Tempel-, Magie- und Upgrade-Aktionen zählen als Zugaktion: danach wechselt der Spieler.
function endOnOk(state, pid, kind, r) { if (r.ok) endTurn(state, pid, kind); return r; }

function applyWorld(state, a) {
  const pid = a.pid, p = state.players[pid], d = p.deck, s = p.stats;
  // Markieren und Sperren sind auch außerhalb des eigenen Zuges möglich.
  if (a.type === 'mark') { const e = toggleMark(d, a.slot, s.limit); return e ? fail(e) : { ok: true }; }
  if (a.type === 'lock') { const e = toggleLock(d, a.slot); return e ? fail(e) : { ok: true }; }
  if (state.turn !== pid) return fail('Du bist nicht am Zug.');
  switch (a.type) {
    case 'draw': {
      if (!drawPhase(state, d)) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
      log(state, p.name + ' zieht Karten nach.', pid);
      endTurn(state, pid, 'draw'); return { ok: true };
    }
    case 'vendor': return execVendor(state, pid, a);
    case 'temple': return endOnOk(state, pid, 'temple', execTemple(state, pid, a.amount));
    case 'magic': return endOnOk(state, pid, 'magic', execMagic(state, pid, a.elem));
    case 'spend': return endOnOk(state, pid, 'spend', execSpend(state, pid, a.what));
    case 'combat': {
      const m = state.monsters[a.elem]; if (!m || !monsterAlive(m)) return fail('Dieses Monster ist besiegt.');
      d.marks = [];
      startCombat(state, pid, a.elem); return { ok: true };
    }
  }
  return fail('Unbekannte Aktion.');
}
