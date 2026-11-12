/* ---------- Kampfablauf 2: Kampfende (Niederlagenprüfung, Auswertung, Belohnung) und Schrittprotokoll ---------- */
// Reihenfolge der Niederlagenprüfung (0 HP, seit 0.8.3.1 ausdrücklich festgelegt): Jede Stufe wird vollständig abgehandelt und geprüft, bevor die nächste beginnt; die erste Stufe, in der eine Seite auf 0 HP fällt, entscheidet den Kampf (spätere Stufen wirken dann nicht mehr und können weder ein Unentschieden noch eine Wiederbelebung bringen):
//   1) reflektierter Schaden (Rückwurf der Falle, in execAttack, vor der Verteidigung),
//   2) Schaden nach der Verteidigung (Restschaden nach Block und Schild, danach Heilung, in execDefense),
//   3) Dauereffekte am Ende der Angriffsphase (Todesfluch, Erschöpfung, dann Meditation und Erleuchtung, in deathTick).
function hpDecided(state) {
  const c = state.combat;
  return c.sides.a.stats.hp <= 0 || c.sides.b.stats.hp <= 0;
}
function evaluateEnd(state) {
  const c = state.combat, a = c.sides.a.stats, b = c.sides.b.stats;
  const ah = Math.max(0, a.hp), bh = Math.max(0, b.hp);
  if (ah <= 0 || bh <= 0) {
    let winner = null;
    if (ah <= 0 && bh > 0) winner = 'b'; else if (bh <= 0 && ah > 0) winner = 'a';
    return { reason: 'hp', winner, monsterDefeated: bh <= 0 };
  }
  // Kein automatisches Unentschieden mehr bei 0 Mana beider Seiten: Der Kampf geht weiter (Erholen bringt Mana, der Todesfluch zehrt am Ende der Angriffsphasen). Beenden lässt er sich durch Fliehen (siehe canFlee); als Sicherung gegen Endlosschleifen gilt MAX_COMBAT_TURNS.
  // Kampfrunden (seit 0.7.6.5): Eine Runde ist ein Angriffszug jeder Seite (die Verteidigung gehört zum Angriffszug des Gegners). Nach maxRounds Runden (Standard 10) endet der Kampf unentschieden, sobald der letzte Angriffszug samt Verteidigung abgeschlossen ist; der Kampf auf 0 HP geht vor.
  if (state.rules.maxRounds > 0 && c.action === 'attack' && (c.atkTurns || 0) >= 2 * state.rules.maxRounds) return { reason: 'rounds', winner: null, monsterDefeated: false };
  if (c.turns >= MAX_COMBAT_TURNS) return { reason: 'exhaustion', winner: null, monsterDefeated: false, forced: true };
  return null;
}
// Kampfende in Teilschritten (seit 0.13.1 zerlegt, Reihenfolge unverändert): aufräumen, werten (Monsterkampf oder Showdown), zurück in die Weltphase, danach Showdown-Start bzw. nächster Abschnitt oder Spielende.
function endCombat(state, end) {
  const c = state.combat, res = { mode: c.mode, reason: end.reason, winner: end.winner, monsterDefeated: false, elem: c.elem, stage: state.stage, turns: c.turns, fled: end.fled || null };   // elem/stage/turns: für die Balance-Auswertung
  if (state.keepSnap) res.snap = JSON.parse(JSON.stringify(c));   // Oberfläche: Endstand des Kampfes (vor Zurücksetzen und Rückkehr in die Weltphase)
  clearCombatLeftovers(state, c);
  const A = state.players[c.att], B = state.players[c.def];
  if (c.mode === 'monster') settleMonsterCombat(state, c, end, res, A, B);
  else settleShowdown(state, c, end, res, A, B);
  state.combat = null; state.phase = 'world'; state.lastCombat = res;
  resetPlayers(state, c.mode);
  sample(state, { type: c.mode, elem: c.elem, stage: state.stage, n: state.showdown + 1, winner: end.winner === 'a' ? c.att : end.winner === 'b' ? c.def : null, trace: c.trace });
  state.turn = c.def;
  regen(state.players[c.def].stats, regenGain(state));
  state.worldTurns = 0;
  if (end.winner || c.mode !== 'monster') state.idleTurns = 0;   // Stillstandszähler: nur ein entschiedener Kampf (Sieg oder Niederlage) setzt ihn zurück, Flucht und Erschöpfung nicht
  if (c.mode === 'monster') {
    if (allMonstersDead(state)) {   // auch wenn das letzte Monster ohne Beute fiel (beide Seiten gleichzeitig auf 0 HP)
      log(state, 'Alle drei Monster sind besiegt.');
      startShowdown(state);
    }
  } else {
    state.showdown++; state.wearTurns = 0;   // neuer Abschnitt: Zähler der Zermürbung (Weltphase) beginnt neu; ein Monsterkampf setzt ihn nicht zurück (seit 0.9.7.1)
    const goal = state.rules.winLead > 0 && state.showdown >= (state.rules.winSpFromShowdown || 1) && Math.abs(state.players[0].sp - state.players[1].sp) >= state.rules.winLead;   // seit 0.7.7.3: Siegbedingung ist der Vorsprung, nicht der Punktestand: Wer nach einem Showdown (ab winSpFromShowdown) mindestens winLead Siegpunkte vor dem Gegner liegt (4 : 0, 5 : 1 – nicht 4 : 1), gewinnt sofort; die Partie endet dann vor dem nächsten Abschnitt
    if (state.showdown >= 3 || goal) finishGame(state, goal);
    else beginNextStage(state, c, end);
  }
  return res;
}
// Aufräumen nach dem Kampf: erzwungene Karten, offene Hellsichtkarten, Fallen, Marker, Fluchkarten.
function clearCombatLeftovers(state, c) {
  if (c.forced && c.forced.cards) { const fs = c.sides.a.ctrl === c.forced.pid ? c.sides.a : c.sides.b; if (fs.kind === 'player') c.forced.cards.forEach(cd => fs.deck.discard.push(cd)); c.forced = null; }
  [c.sides.a, c.sides.b].forEach(sd => { if (sd.deck) dropSight(sd.deck); });   // übrige offene Hellsichtkarten auf den Ablagestapel
  // die Fallenkarte kehrt in den Ablagestapel zurück (wird gleich mit gemischt)
  state.players.forEach(p => {
    (p.stats.traps || []).forEach(t => p.deck.discard.push(t.card));
    p.stats.freeDraws = 0;
    p.deck.marks = [];
    ['death', 'deathPhase', 'heal', 'healPhase', 'manaflow', 'manaPhase', 'rainbow', 'traps', 'echo'].forEach(k => { delete p.stats[k]; });
  });
  state.players.forEach(p => stripCurseCards(state, p.deck));
  ['healPhase', 'death', 'deathPhase', 'heal', 'manaflow', 'manaPhase', 'rainbow', 'traps', 'echo'].forEach(k => { delete c.sides.b.stats[k]; });
}
// Wertung eines Monsterkampfs: Beute und Siegpunkte bei Sieg, Rückzug des Monsters und Ausgleich bei Niederlage, sonst kein Sieger.
function settleMonsterCombat(state, c, end, res, A, B) {
  const m = c.sides.b.monster;
  const msp = state.rules.monsterSp || 0;   // Siegpunkte im Monsterkampf: Besiegt der Angreifer das Monster: +msp; verliert er: -msp (nie unter 0); der Monsterführer gewinnt und verliert nie Siegpunkte; Flucht und Unentschieden bleiben ohne Wertung
  const gain = (W, pw) => { if (!msp) return; W.sp += msp; res.sp = { winner: msp, loser: 0 }; log(state, W.name + ' erhält ' + msp + ' Siegpunkt' + (msp > 1 ? 'e' : '') + '.', pw); };
  if (end.winner === 'a') {
    // Beute: Regel monsterLoot legt sie für alle Monster fest (0 = keine Beute); ohne die Regel zählt das Gold des Monsters (Stufe I 1, II 2, III 3)
    const loot = state.rules.monsterLoot !== undefined ? state.rules.monsterLoot : Math.max(0, m.stats.gold); m.stats.gold = 0; A.stats.gold += loot; A.stats.goldGot += loot;
    log(state, A.name + ' besiegt ' + m.name + (loot > 0 ? ' und erhält ' + loot + ' Gold.' : '.'), c.att);
    if (state.rules.lootBoth && loot > 0) { B.stats.gold += loot; B.stats.goldGot += loot; log(state, B.name + ' erhält ebenfalls ' + loot + ' Gold.', c.def); }
    res.monsterDefeated = true; res.loot = loot; A.stats.kills = (A.stats.kills || 0) + 1;   // kills: besiegte Monster des Spielers (die KI-Eröffnung wartet damit auf den ersten Sieg; Beute gibt es nicht mehr)
    gain(A, c.att);
  } else if (end.winner === 'b') {   // Niederlage gegen das Monster: kein Gold, das Monster zieht sich zurück
    log(state, m.name + ' gewinnt den Kampf.', c.def);
    const hf = state.rules.lossHelp || 0;   // Ausgleich (früher „Hilfe“): Gewinnt das Monster, bekommt der Verlierer (der Angreifer) Gold je Abschnitt (lossGold: 1/2/3, seit 0.4 nur Gold, keine Upgrade-Punkte: lossPoints 0) – nur er, nicht mehr beide Spieler (lossBoth 1 stellt das alte Verhalten wieder her); das Monster verschwindet danach (sonst ließe sich der Ausgleich durch absichtliche Niederlagen farmen)
    m.stats.hp = 0; m.stats.gold = 0; m.retreated = true; res.monsterGone = true; log(state, m.name + ' zieht sich zurück.', c.def);
    if (hf > 0) {
      const hp = Math.round(((state.rules.lossPoints || [])[state.stage] || 0) * hf), hg = Math.round(((state.rules.lossGold || [])[state.stage] || 0) * hf), both = !!state.rules.lossBoth;
      if (hp > 0 || hg > 0) {
        (both ? state.players : [A]).forEach(p => { p.stats.pending += hp; p.stats.gold += hg; p.stats.upGot += hp; p.stats.goldGot += hg; });
        res.help = { points: hp, gold: hg, both, to: both ? null : c.att };
        log(state, 'Ausgleich: ' + (both ? 'Jeder Spieler erhält ' : A.name + ' erhält als Verlierer ') + [hp ? hp + ' Upgrade-Punkt' + (hp > 1 ? 'e' : '') : '', hg ? hg + ' Gold' : ''].filter(Boolean).join(' und ') + '.', both ? undefined : c.att);
      }
    }
    // Niederlage kostet den Angreifer, bringt dem Monsterführer aber nichts (sonst lässt sich ein unbesiegtes Monster endlos farmen)
    if (msp) {
      const lost = Math.min(msp, A.sp);
      A.sp -= lost;
      res.sp = { winner: 0, loser: -lost };
      if (lost) log(state, A.name + ' verliert ' + lost + ' Siegpunkt' + (lost > 1 ? 'e' : '') + '; das Monster bringt seinem Führer keine.', c.att);
    }
  }
  else log(state, end.reason === 'flee' ? 'Die Flucht ist geglückt. Kein Sieger; das Monster behält seine Verletzungen.' : end.reason === 'exhaustion' ? 'Beide Seiten sind erschöpft. Kein Sieger.' : end.reason === 'rounds' ? 'Nach ' + state.rules.maxRounds + ' Kampfrunden endet der Kampf unentschieden. Kein Sieger; das Monster behält seine Verletzungen.' : 'Beide Seiten fallen. Kein Sieger.');
}
// Wertung eines Showdowns: Siegpunkte, Trostpreis für den Verlierer; Flucht und Unentschieden bleiben ohne Wertung.
function settleShowdown(state, c, end, res, A, B) {
  if (end.winner) {
    const w = end.winner === 'a' ? A : B, wl = w === A ? B : A, ssp = state.rules.showdownSp || 0, lost = Math.min(ssp, wl.sp);
    w.sp += ssp;
    wl.sp -= lost;
    res.sp = { winner: ssp, loser: -lost };
    log(state, w.name + ' gewinnt den Showdown (+' + ssp + ' Siegpunkt' + (ssp > 1 ? 'e' : '') + (lost ? ', ' + wl.name + ' verliert ' + lost : '') + ').', end.winner === 'a' ? c.att : c.def);
    const L = w === A ? B : A;
    const lu = state.showdown === 1 && state.rules.loserUp2 !== undefined ? state.rules.loserUp2 : state.rules.loserUp;
    if (lu > 0 && state.showdown < 2) { L.stats.pending += lu; L.stats.upGot += lu; log(state, L.name + ' erhält als Trostpreis ' + lu + ' Upgrade-Punkt' + (lu > 1 ? 'e' : '') + '.', w === A ? c.def : c.att); }
  }
  else log(state, end.reason === 'flee' ? 'Die Flucht ist geglückt. Der Showdown endet ohne Sieger, ohne Siegpunkte.' : end.reason === 'rounds' ? 'Nach ' + state.rules.maxRounds + ' Kampfrunden endet der Showdown unentschieden: keine Siegpunkte.' : 'Showdown ohne Sieger: keine Siegpunkte.');   // Flucht und Unentschieden zählen nie als Sieg oder Niederlage
}
// Spielende nach dem dritten Showdown oder bei ausreichendem Vorsprung (goal): Sieger nach Siegpunkten, dann Tempelstufe, dann Gold.
function finishGame(state, goal) {
  state.over = true; state.phase = 'over';
  const s0 = state.players[0].sp, s1 = state.players[1].sp;
  state.winner = s0 > s1 ? 0 : s1 > s0 ? 1 : null;
  if (state.winner === null) {   // Gleichstand bei den Siegpunkten: zuerst die Tempelstufe (Upgrades durch Opfer), dann das Gold (seit 0.8.6.1: sp > tp > g)
    const g0 = state.players[0].stats.gold, g1 = state.players[1].stats.gold, l0 = state.players[0].temple.level, l1 = state.players[1].temple.level;
    if (l0 !== l1) { state.winner = l0 > l1 ? 0 : 1; state.templeWin = true; log(state, 'Gleichstand bei den Siegpunkten: Die Tempelstufe entscheidet (' + l0 + ' : ' + l1 + ').'); }
    else if (g0 !== g1) { state.winner = g0 > g1 ? 0 : 1; state.goldWin = true; log(state, 'Gleichstand bei Siegpunkten und Tempelstufe: Das Gold entscheidet (' + g0 + ' : ' + g1 + ').'); }
  }
  log(state, state.winner === null ? 'Spielende: Gleichstand, kein Sieger.' : 'Spielende: ' + state.players[state.winner].name + (goal && state.showdown < 3 ? ' führt mit ' + state.rules.winLead + ' oder mehr Siegpunkten Vorsprung und' : '') + ' gewinnt.');
}
// Nächster Abschnitt nach einem Showdown: Der Verlierer beginnt, Abschnittsgaben, neue Monster.
function beginNextStage(state, c, end) {
  state.stage = state.showdown + 1;
  if (end.winner) { state.turn = end.winner === 'a' ? c.def : c.att; log(state, state.players[state.turn].name + ' verlor den Showdown und beginnt die nächste Runde.'); }   // der Verlierer beginnt
  const gp = (state.rules.stagePoints || [])[state.stage] || 0;
  const gg = (state.rules.stageGold || [])[state.stage] || 0;
  if (gp > 0 || gg > 0) { state.players.forEach(p => { p.stats.pending += gp; p.stats.gold += gg; p.stats.upGot += gp; p.stats.goldGot += gg; }); log(state, 'Jeder Spieler erhält ' + [gp ? gp + ' kostenlose Upgrade-Punkte' : '', gg ? gg + ' Gold' : ''].filter(Boolean).join(' und ') + '.'); }
  state.monsters = spawnForGame(state, state.stage);
  log(state, 'Abschnitt ' + state.stage + ': Die Monster der Stufe ' + STAGE_NUMERAL[state.stage] + ' erscheinen.' + variantLog(state));
}
// Verlauf eines Kampfes für die Statistik: nach jedem Schritt HP und Mana beider Seiten (a = Angreifer, b = Verteidiger bzw. Monster)
function traceStep(state, info) {
  const c = state.combat, a = c.sides.a, b = c.sides.b;
  if (!c.trace) c.trace = { ids: [a.ctrl, b.ctrl], names: [a.name, b.name], monster: c.mode === 'monster', steps: [] };
  c.trace.steps.push(Object.assign({ t: c.turns, k: 'R', who: 0, v: 0, b: 0, left: 0, hp: [Math.max(0, a.stats.hp), Math.max(0, b.stats.hp)], mana: [Math.max(0, a.stats.mana), Math.max(0, b.stats.mana)] }, info || {}));
}
function finishStep(state, info) {
  const c = state.combat; c.turns++; state.combatTurnsTotal++;
  traceStep(state, Object.assign({}, info, { t: c.turns }));
  const end = evaluateEnd(state);
  if (end) return endCombat(state, end);
  return null;
}
