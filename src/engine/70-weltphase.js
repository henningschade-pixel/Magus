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
  state.hist.push({ ev: ev || null, p: state.players.map(p => Object.assign(deckAvg(p), { sp: p.sp, up: p.stats.upGot, lvl: p.temple.level, F: p.stats.mag.F, E: p.stats.mag.E, W: p.stats.mag.W, slots: p.slots, limit: p.stats.limit, dl: p.stats.drawLimit, hp: p.stats.maxHp, mana: p.stats.maxMana })) });
}
function endTurn(state, pid, kind) {
  const nx = other(pid);
  regen(state.players[nx].stats, regenGain(state));
  state.turn = nx; state.worldTurns++; state.idleTurns++;
  sample(state);
  if (state.worldTurns % 2 === 0) regenMonsters(state);   // Monster erholen sich am Ende jeder Runde (nach den Zügen beider Spieler)
  if (state.rules.idleLimit > 0 && state.idleTurns >= state.rules.idleLimit && state.phase === 'world') {   // Stillstand: Seit dem letzten entschiedenen Kampf sind idleLimit Züge vergangen, ohne dass ein Monster fiel (Fluchten zählen nicht): der Showdown beginnt sofort
    log(state, 'Stillstand: Seit ' + state.rules.idleLimit + ' Zügen fiel kein Monster. Der Showdown beginnt.');
    startShowdown(state);
  }
}

function execSpend(state, pid, what) {
  const p = state.players[pid], s = p.stats, d = p.deck;
  const f = upField(state);
  if (s[f] <= 0) return fail(f === 'gold' ? 'Du hast kein Gold.' : 'Keine offenen Upgrade-Punkte.');
  let cost = 1;
  if (what === 'hp') { const n = state.rules.hpPerPoint || 1; s.maxHp += n; }   // Upgrade erhöht nur das Maximum, die aktuellen HP bleiben
  else if (what === 'mana') {
    cost = manaStepCost();
    if (s[f] < cost) return fail('Der nächste Mana-Schritt kostet ' + payTxt(state, f, cost) + '.');
    s.maxMana++;   // nur das Maximum steigt, das aktuelle Mana bleibt
  } else if (what === 'limit') {
    if (s.limit >= MAX_LIMIT) return fail('Das Ausspiellimit ist am Maximum (' + MAX_LIMIT + ').');
    cost = limitStepCost(state, s);
    if (s[f] < cost) return fail('Das nächste Limit kostet ' + payTxt(state, f, cost) + '.');
    s.limit++;
  } else if (what === 'slot') {
    if (p.slots >= MAX_SLOTS) return fail('Du hast schon ' + MAX_SLOTS + ' Handplätze.');
    p.slots++; d.hand.push(null);
  } else return fail('Unbekanntes Upgrade.');
  s[f] -= cost;
  log(state, p.name + ' verbessert ' + { hp: 'max. HP', mana: 'max. Mana', limit: 'das Ausspiellimit', slot: 'die Handplätze' }[what] + '.', pid);
  return { ok: true };
}
// Nachziehlimit steigern (kostet Upgrade-Punkte aus dem Tempel, mit swapCosts Gold; drawLimitCost je Schritt): so oft darf man hintereinander nachziehen, bevor der Nachziehmarker auf Rot springt.
function drawLimitCost(state, s) { const c = state.rules.drawLimitCost; return Array.isArray(c) ? (c[s.drawLimit - 1] != null ? c[s.drawLimit - 1] : c[c.length - 1]) : (c == null ? 1 : c); }
function execDrawLimit(state, pid) {
  const p = state.players[pid], s = p.stats;
  if (!state.rules.drawMarker) return fail('Ohne Nachziehmarker gibt es kein Nachziehlimit.');
  if (s.drawLimit >= MAX_DRAW_LIMIT) return fail('Das Nachziehlimit ist am Maximum (' + MAX_DRAW_LIMIT + ').');
  const cost = drawLimitCost(state, s), f = upField(state);
  if (s[f] < cost) return fail('Du brauchst ' + payTxt(state, f, cost) + '.');
  s[f] -= cost; s.drawLimit++;
  log(state, p.name + ' steigert das Nachziehlimit auf ' + s.drawLimit + ' (' + payTxt(state, f, cost) + ').', pid);
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
  const cost = magicCost(state, s.mag[e]), f = magicField(state);
  if (s[f] < cost) return fail('Du brauchst ' + payTxt(state, f, cost) + '.');
  s[f] -= cost; s.mag[e]++;
  log(state, p.name + ' steigert ' + NAMES[e] + ' auf Stufe ' + s.mag[e] + ' (' + payTxt(state, f, cost) + ').', pid);
  return { ok: true };
}

// Überschusspunkte (Regel surplusSp, nur mit swapCosts): Mit swapCosts kaufen Upgrade-Punkte nur noch Magie. Stehen alle drei Magien auf der Höchststufe, wandeln sich offene und neu erhaltene Upgrade-Punkte sofort in Siegpunkte um (surplusSp je Punkt, 0 = aus). Überschüssiges Gold bleibt Gold.
function convertSurplus(state) {
  const k = state.rules.surplusSp;
  if (!k || !state.rules.swapCosts) return;
  state.players.forEach((p, pid) => {
    const s = p.stats;
    if (s.pending > 0 && ELEMENTS.every(e => s.mag[e] >= MAX_MAGIC)) {
      const n = s.pending, sp = n * k; s.pending = 0; p.sp += sp;
      log(state, p.name + ' wandelt ' + n + ' überschüssige Upgrade-Punkt' + (n > 1 ? 'e' : '') + ' in ' + sp + ' Siegpunkt' + (sp > 1 ? 'e' : '') + ' um.', pid);
    }
  });
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
    case 'drawlimit': return endOnOk(state, pid, 'drawlimit', execDrawLimit(state, pid));
    case 'spend': return endOnOk(state, pid, 'spend', execSpend(state, pid, a.what));
    case 'combat': {
      const m = state.monsters[a.elem]; if (!m || !monsterAlive(m)) return fail(m && m.retreated ? 'Dieses Monster hat sich zurückgezogen.' : 'Dieses Monster ist besiegt.');
      d.marks = [];
      startCombat(state, pid, a.elem); return { ok: true };
    }
  }
  return fail('Unbekannte Aktion.');
}
