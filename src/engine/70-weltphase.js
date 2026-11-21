/* Magus – Regelkern (Teil 7): Weltphase (Züge außerhalb des Kampfes).
   Nur drei Aktionen beenden den Zug (Spielerwechsel): Nachziehen, Bibliothek (Händler) und Kampf. Magie kaufen und jedes Upgrade (Gold ausgeben, auch das Nachziehlimit) sind keine Aktion (seit 0.9.3): der Spieler bleibt am Zug. Seit 0.14 gibt es keinen Tempel und keine Upgrade-Punkte mehr; alles kostet Gold. */

// Verlauf für die Statistik: ein Messpunkt zu Beginn, nach jedem Zug und nach jedem Kampf (ev = Kampfereignis)
// avg: durchschnittliche Kartenstufe je Farbe im ganzen Deck (Stapel, Ablage, Hand; ohne Fluchkarten)
function deckAvg(p) {
  const d = p.deck, all = [].concat(d.draw, d.discard, d.hand.filter(Boolean)), out = {};
  for (const e of ELEMENTS) { const cs = all.filter(c => c.id[0] === e); out['a' + e] = cs.length ? Math.round(cs.reduce((n, c) => n + +c.id.slice(1), 0) / cs.length * 100) / 100 : 0; }
  return out;
}
function sample(state, ev) {
  state.hist.push({ ev: ev || null, p: state.players.map(p => Object.assign(deckAvg(p), { sp: p.sp, up: Object.values(p.stats.buys || {}).reduce((a, b) => a + b, 0), F: p.stats.mag.F, E: p.stats.mag.E, W: p.stats.mag.W, slots: p.slots, limit: p.stats.limit, dl: p.stats.drawLimit, hp: p.stats.maxHp, mana: p.stats.maxMana })) });
}
// Zermürbung (seit 0.9.7): Die Weltphase hat denselben Rundenzähler wie der Kampf (eine Runde = ein Zug jedes Spielers). Seit 0.9.7.1 zählt ihn state.wearTurns: alle Züge der Weltphase, ein Monsterkampf setzt ihn NICHT zurück (nur ein Showdown, mit dem ein neuer Abschnitt beginnt); state.worldTurns (Züge seit dem letzten Kampf) dient nur noch der KI. Ist der kritische Wert (exhaustRounds, 0 = aus) erreicht, also ab Runde exhaustRounds + 1, bekommt der Gegner am Ende jedes Zuges, in dem kein Monster angegriffen wurde, Gold in Höhe der Spielstufe (Abschnitt 1/2/3).
function worldRound(state) { return Math.floor((state.wearTurns || 0) / 2) + 1; }
function worldWear(state) { const ex = state.rules.exhaustRounds || 0; return ex > 0 && state.phase === 'world' && worldRound(state) > ex; }
function worldWearGold(state) { return Math.max(1, Math.min(3, state.stage || 1)); }
function endTurn(state, pid, kind) {
  const nx = other(pid);
  if (worldWear(state)) {   // der Zug endet ohne Monsterangriff (ein Angriff führt nicht hierher, sondern in den Kampf)
    const g = worldWearGold(state), q = state.players[nx];
    q.stats.gold += g; q.stats.goldGot += g;
    log(state, 'Zermürbung (Runde ' + worldRound(state) + '): ' + state.players[pid].name + ' greift kein Monster an, ' + q.name + ' erhält ' + g + ' Gold.', nx);
  }
  regen(state.players[nx].stats, regenGain(state));
  state.wearTurns = (state.wearTurns || 0) + 1;
  state.turn = nx; state.worldTurns++; state.idleTurns++;
  sample(state);
  if (state.rules.idleLimit > 0 && state.idleTurns >= state.rules.idleLimit && state.phase === 'world') {   // Stillstand: Seit dem letzten entschiedenen Kampf sind idleLimit Züge vergangen, ohne dass ein Monster fiel (Fluchten zählen nicht): der Showdown beginnt sofort
    log(state, 'Stillstand: Seit ' + state.rules.idleLimit + ' Zügen fiel kein Monster. Der Showdown beginnt.');
    startShowdown(state);
  }
}

function execSpend(state, pid, what) {
  const p = state.players[pid], s = p.stats, d = p.deck;
  if (s.gold <= 0) return fail('Du hast kein Gold.');
  let cost = 1;
  if (what === 'hp') {
    if (maxed(s, 'hp', state.rules)) return fail('Die max. HP sind am Maximum (' + state.rules.maxUpgrades + ' Ausbauten).');
    cost = hpStepCost(state, s);
    if (s.gold < cost) return fail('Die nächsten HP kosten ' + goldTxt(cost) + '.');
    const n = state.rules.hpPerPoint || 1; s.maxHp += n; buyCount(s, 'hp');   // Upgrade erhöht nur das Maximum, die aktuellen HP bleiben
  }
  else if (what === 'mana') {
    if (maxed(s, 'mana', state.rules)) return fail('Das max. Mana ist am Maximum (' + state.rules.maxUpgrades + ' Ausbauten).');
    cost = manaStepCost(state, s);
    if (s.gold < cost) return fail('Der nächste Mana-Schritt kostet ' + goldTxt(cost) + '.');
    s.maxMana++; buyCount(s, 'mana');   // nur das Maximum steigt, das aktuelle Mana bleibt
  } else if (what === 'limit') {
    if (s.limit >= limitMax(state.rules)) return fail('Das Ausspiellimit ist am Maximum (' + MAX_LIMIT + ').');
    cost = limitStepCost(state, s);
    if (s.gold < cost) return fail('Das nächste Limit kostet ' + goldTxt(cost) + '.');
    s.limit++; buyCount(s, 'limit');
  } else if (what === 'slot') {
    if (p.slots >= slotMax(state.rules)) return fail('Du hast schon ' + MAX_SLOTS + ' Handplätze.');
    cost = slotStepCost(state, s);
    if (s.gold < cost) return fail('Der nächste Handplatz kostet ' + goldTxt(cost) + '.');
    p.slots++; d.hand.push(null); buyCount(s, 'slot');
  } else return fail('Unbekanntes Upgrade.');
  s.gold -= cost;
  log(state, p.name + ' verbessert ' + { hp: 'max. HP', mana: 'max. Mana', limit: 'das Ausspiellimit', slot: 'die Handplätze' }[what] + '.', pid);
  return { ok: true };
}
// Nachziehlimit steigern (kostet Gold; drawLimitCost je Schritt): so oft darf man hintereinander nachziehen, bevor der Nachziehmarker auf Rot springt.
function drawLimitCost(state, s) { const c = state.rules.drawLimitCost, base = Array.isArray(c) ? (c[s.drawLimit - 1] != null ? c[s.drawLimit - 1] : c[c.length - 1]) : (c == null ? 1 : c); return risen(state, base, s, 'draw'); }
function execDrawLimit(state, pid) {
  const p = state.players[pid], s = p.stats;
  if (!state.rules.drawMarker) return fail('Ohne Nachziehmarker gibt es kein Nachziehlimit.');
  if (s.drawLimit >= MAX_DRAW_LIMIT) return fail('Das Nachziehlimit ist am Maximum (' + MAX_DRAW_LIMIT + ').');
  const cost = drawLimitCost(state, s);
  if (s.gold < cost) return fail('Du brauchst ' + goldTxt(cost) + '.');
  s.gold -= cost; s.drawLimit++; buyCount(s, 'draw');
  log(state, p.name + ' steigert das Nachziehlimit auf ' + s.drawLimit + ' (' + goldTxt(cost) + ').', pid);
  return { ok: true };
}
function execMagic(state, pid, e) {
  const p = state.players[pid], s = p.stats;
  if (!ELEMENTS.includes(e)) return fail('Unbekanntes Element.');
  if (s.mag[e] >= MAX_MAGIC) return fail(NAMES[e] + ' ist schon auf Stufe ' + MAX_MAGIC + '.');
  const cost = magicCost(state, s.mag[e], s);
  if (s.gold < cost) return fail('Du brauchst ' + goldTxt(cost) + '.');
  s.gold -= cost; buyCount(s, 'mag'); s.mag[e]++;
  log(state, p.name + ' steigert ' + NAMES[e] + ' auf Stufe ' + s.mag[e] + ' (' + goldTxt(cost) + ').', pid);
  return { ok: true };
}

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
    case 'magic': return execMagic(state, pid, a.elem);   // seit 0.9.3 kein Zug mehr (wie die Upgrades)
    case 'drawlimit': return execDrawLimit(state, pid);   // seit 0.9.3 kein Zug mehr
    case 'spend': return execSpend(state, pid, a.what);   // seit 0.9.3 kein Zug mehr
    case 'combat': {
      const m = state.monsters[a.elem]; if (!m || !monsterAlive(m)) return fail(m && m.retreated ? 'Dieses Monster hat sich zurückgezogen.' : 'Dieses Monster ist besiegt.');
      d.marks = [];
      startCombat(state, pid, a.elem); return { ok: true };
    }
  }
  return fail('Unbekannte Aktion.');
}
