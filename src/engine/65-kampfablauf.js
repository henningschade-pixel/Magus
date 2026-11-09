/* ---------- Kampfablauf ---------- */
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
// Reihenfolge der Niederlagenprüfung (0 HP, seit 0.8.3.1 ausdrücklich festgelegt): Jede Stufe wird vollständig abgehandelt und geprüft, bevor die nächste beginnt; die erste Stufe, in der eine Seite auf 0 HP fällt, entscheidet den Kampf (spätere Stufen wirken dann nicht mehr und können weder ein Unentschieden noch eine Wiederbelebung bringen):
//   1) reflektierter Schaden (Rückwurf der Falle, in execAttack, vor der Verteidigung),
//   2) Schaden nach der Verteidigung (Restschaden nach Block und Schild, danach Heilung, in execDefense),
//   3) Flusseffekte am Ende der Angriffsphase (Todesfluss, Erschöpfung, dann Heil- und Manafluss, in deathTick).
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
  // Kein automatisches Unentschieden mehr bei 0 Mana beider Seiten: Der Kampf geht weiter (Erholen bringt Mana, der Todesfluss zehrt am Ende der Angriffsphasen). Beenden lässt er sich durch Fliehen (siehe canFlee); als Sicherung gegen Endlosschleifen gilt MAX_COMBAT_TURNS.
  // Kampfrunden (seit 0.7.6.5): Eine Runde ist ein Angriffszug jeder Seite (die Verteidigung gehört zum Angriffszug des Gegners). Nach maxRounds Runden (Standard 10) endet der Kampf unentschieden, sobald der letzte Angriffszug samt Verteidigung abgeschlossen ist; der Kampf auf 0 HP geht vor.
  if (state.rules.maxRounds > 0 && c.action === 'attack' && (c.atkTurns || 0) >= 2 * state.rules.maxRounds) return { reason: 'rounds', winner: null, monsterDefeated: false };
  if (c.turns >= MAX_COMBAT_TURNS) return { reason: 'exhaustion', winner: null, monsterDefeated: false, forced: true };
  return null;
}
function endCombat(state, end) {
  const c = state.combat, res = { mode: c.mode, reason: end.reason, winner: end.winner, monsterDefeated: false, elem: c.elem, stage: state.stage, turns: c.turns, fled: end.fled || null };   // elem/stage/turns: für die Balance-Auswertung
  if (state.keepSnap) res.snap = JSON.parse(JSON.stringify(c));   // Oberfläche: Endstand des Kampfes (vor Zurücksetzen und Rückkehr in die Weltphase)
  if (c.forced && c.forced.cards) { const fs = c.sides.a.ctrl === c.forced.pid ? c.sides.a : c.sides.b; if (fs.kind === 'player') c.forced.cards.forEach(cd => fs.deck.discard.push(cd)); c.forced = null; }
  [c.sides.a, c.sides.b].forEach(sd => { if (sd.deck) dropSight(sd.deck); });   // übrige offene Hellsichtkarten auf den Ablagestapel
  state.players.forEach(p => { if (p.stats.trap) p.deck.discard.push(p.stats.trap.card); p.stats.freeDraws = 0; p.deck.marks = []; ['death', 'deathPhase', 'heal', 'healPhase', 'manaflow', 'manaPhase', 'rainbow', 'trap', 'echo'].forEach(k => { delete p.stats[k]; }); });   // die Fallenkarte kehrt in den Ablagestapel zurück (wird gleich mit gemischt)
  state.players.forEach(p => stripCurseCards(state, p.deck));
  ['healPhase', 'death', 'deathPhase', 'heal', 'manaflow', 'manaPhase', 'rainbow', 'trap', 'echo'].forEach(k => { delete c.sides.b.stats[k]; });
  const A = state.players[c.att], B = state.players[c.def];
  if (c.mode === 'monster') {
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
      if (msp) { const lost = Math.min(msp, A.sp); A.sp -= lost; res.sp = { winner: 0, loser: -lost }; if (lost) log(state, A.name + ' verliert ' + lost + ' Siegpunkt' + (lost > 1 ? 'e' : '') + '; das Monster bringt seinem Führer keine.', c.att); }   // Niederlage kostet den Angreifer, bringt dem Monsterführer aber nichts (sonst lässt sich ein unbesiegtes Monster endlos farmen)
    }
    else log(state, end.reason === 'flee' ? 'Die Flucht ist geglückt. Kein Sieger; das Monster behält seine Verletzungen.' : end.reason === 'exhaustion' ? 'Beide Seiten sind erschöpft. Kein Sieger.' : end.reason === 'rounds' ? 'Nach ' + state.rules.maxRounds + ' Kampfrunden endet der Kampf unentschieden. Kein Sieger; das Monster behält seine Verletzungen.' : 'Beide Seiten fallen. Kein Sieger.');
  } else {
    if (end.winner) { const w = end.winner === 'a' ? A : B, wl = w === A ? B : A, ssp = state.rules.showdownSp || 0, lost = Math.min(ssp, wl.sp); w.sp += ssp; wl.sp -= lost; res.sp = { winner: ssp, loser: -lost }; log(state, w.name + ' gewinnt den Showdown (+' + ssp + ' Siegpunkt' + (ssp > 1 ? 'e' : '') + (lost ? ', ' + wl.name + ' verliert ' + lost : '') + ').', end.winner === 'a' ? c.att : c.def);
      const L = w === A ? B : A; const lu = state.showdown === 1 && state.rules.loserUp2 !== undefined ? state.rules.loserUp2 : state.rules.loserUp; if (lu > 0 && state.showdown < 2) { L.stats.pending += lu; L.stats.upGot += lu; log(state, L.name + ' erhält als Trostpreis ' + lu + ' Upgrade-Punkt' + (lu > 1 ? 'e' : '') + '.', w === A ? c.def : c.att); } }
    else log(state, end.reason === 'flee' ? 'Die Flucht ist geglückt. Der Showdown endet ohne Sieger, ohne Siegpunkte.' : end.reason === 'rounds' ? 'Nach ' + state.rules.maxRounds + ' Kampfrunden endet der Showdown unentschieden: keine Siegpunkte.' : 'Showdown ohne Sieger: keine Siegpunkte.');   // Flucht und Unentschieden zählen nie als Sieg oder Niederlage
  }
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
    if (state.showdown >= 3 || goal) {
      state.over = true; state.phase = 'over';
      const s0 = state.players[0].sp, s1 = state.players[1].sp;
      state.winner = s0 > s1 ? 0 : s1 > s0 ? 1 : null;
      if (state.winner === null) {   // Gleichstand bei den Siegpunkten: zuerst die Tempelstufe (Upgrades durch Opfer), dann das Gold (seit 0.8.6.1: sp > tp > g)
        const g0 = state.players[0].stats.gold, g1 = state.players[1].stats.gold, l0 = state.players[0].temple.level, l1 = state.players[1].temple.level;
        if (l0 !== l1) { state.winner = l0 > l1 ? 0 : 1; state.templeWin = true; log(state, 'Gleichstand bei den Siegpunkten: Die Tempelstufe entscheidet (' + l0 + ' : ' + l1 + ').'); }
        else if (g0 !== g1) { state.winner = g0 > g1 ? 0 : 1; state.goldWin = true; log(state, 'Gleichstand bei Siegpunkten und Tempelstufe: Das Gold entscheidet (' + g0 + ' : ' + g1 + ').'); }
      }
      log(state, state.winner === null ? 'Spielende: Gleichstand, kein Sieger.' : 'Spielende: ' + state.players[state.winner].name + (goal && state.showdown < 3 ? ' führt mit ' + state.rules.winLead + ' oder mehr Siegpunkten Vorsprung und' : '') + ' gewinnt.');
    } else {
      state.stage = state.showdown + 1;
      if (end.winner) { state.turn = end.winner === 'a' ? c.def : c.att; log(state, state.players[state.turn].name + ' verlor den Showdown und beginnt die nächste Runde.'); }   // der Verlierer beginnt
      const gp = (state.rules.stagePoints || [])[state.stage] || 0;
      const gg = (state.rules.stageGold || [])[state.stage] || 0;
      if (gp > 0 || gg > 0) { state.players.forEach(p => { p.stats.pending += gp; p.stats.gold += gg; p.stats.upGot += gp; p.stats.goldGot += gg; }); log(state, 'Jeder Spieler erhält ' + [gp ? gp + ' kostenlose Upgrade-Punkte' : '', gg ? gg + ' Gold' : ''].filter(Boolean).join(' und ') + '.'); }
      state.monsters = spawnForGame(state, state.stage);
      log(state, 'Abschnitt ' + state.stage + ': Die Monster der Stufe ' + STAGE_NUMERAL[state.stage] + ' erscheinen.' + variantLog(state));
    }
  }
  return res;
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
// Angriffszug endet ohne Schaden: die Gegenseite greift an (Verteidigung entfällt).
const MAX_LVL = 3;   // höchste Kombostufe und Höchstzahl der Schildladungen
// Schild (Blau + Grün, seit 0.8; stats.rainbow, Grafik des früheren Multischilds): Ladungen 1/2/3. Er mindert eingehenden, nicht geblockten Schaden gegen jede Farbe und verliert je gemindertem Schaden eine Ladung. Ein neues Schild bringt die Ladungen auf die Stufe (nicht addiert, höchstens 3).
// Das Schild wirkt vor jeder Schadensquelle (seit 0.8.3.2): auch gegen den Rückwurf der Falle, den Todesfluss und die Erschöpfung. Es mindert den Schaden um höchstens seine Ladungen und verliert je gemindertem Schaden eine Ladung. Gibt den tatsächlich verlorenen Schaden zurück; absorbed (optional) meldet die Minderung.
function shieldHit(stats, dmg) {
  const ab = Math.min(stats.rainbow || 0, Math.max(0, dmg));
  if (ab > 0) { stats.rainbow -= ab; if (!stats.rainbow) delete stats.rainbow; }
  return { hit: dmg - ab, absorbed: ab };
}
function shieldAdd(stats, n) { stats.rainbow = Math.max(stats.rainbow || 0, Math.min(n, MAX_LVL)); }
// Ultimates (seit 0.9.9 nach der Farbe der zuletzt markierten Karte, vorher der ersten): Feuer = Todesfluss (stats.death, Marker beim Gegner), Erde = Heilfluss (stats.heal, +1 HP je Marker am Ende der eigenen Angriffsphase), Wasser = Manafluss (seit 0.8, stats.manaflow: +1 Mana je Marker am Ende der eigenen Angriffsphase). Alle drei Marker entfernt nur die Läuterung.
// Läuterung: gewählte Marker (sm/om Manamarker, sd/od Todesmarker, sh/oh Heilmarker, sr/or Schildmarker, st/ot Nachziehtokens), höchstens S; ohne Wahl automatisch eigene Todesmarker, dann Schild-, Mana- und Heilmarker des Gegners.
function lifeflowPicks(state, side, opp, lvl) {
  if (Array.isArray(state.combat.lfp)) return state.combat.lfp.slice(0, lvl);
  const out = []; let om = opp.stats.manaflow || 0, sd = side.stats.death || 0, orb = opp.stats.rainbow || 0, oh = opp.stats.heal || 0;
  while (out.length < lvl && sd > 0) { out.push('sd'); sd--; }
  while (out.length < lvl && orb > 0) { out.push('or'); orb--; }
  while (out.length < lvl && om > 0) { out.push('om'); om--; }
  while (out.length < lvl && oh > 0) { out.push('oh'); oh--; }
  return out;
}
// Stufe der Erschöpfung für den Angriffszug Nr. done (1-basiert): je 2 * exhaustRounds Angriffszüge eine Stufe mehr
function exhaustionLevel(state, done) {
  const n = state.rules.exhaustRounds || 0;
  return n > 0 && done > 0 ? Math.floor((done - 1) / (2 * n)) : 0;
}
// Todesfluss: Am Ende der eigenen Angriffsphase (nach Angriff und Verteidigung der Gegenseite) verliert die Seite so viele HP, wie sie Todesmarker trägt.
// Ist der Kampf schon entschieden (eine Seite auf 0 HP), wirkt er nicht mehr (Stufe 3 der Niederlagenprüfung, siehe hpDecided).
function deathTick(state, side, done) {   // done: Nummer des Angriffszugs (1, 2, 3 …), der gerade endet; für die Erschöpfung
  const c = state.combat;
  // Ein Fluch, der erst in dieser Angriffsphase (durch die Ultimate der Verteidigung) gesprochen wurde, wirkt noch nicht: deathPhase merkt die Stufe zu Beginn der Phase.
  const dmg = Math.min(side.stats.death || 0, side.stats.deathPhase === undefined ? Infinity : side.stats.deathPhase); delete side.stats.deathPhase;
  if (hpDecided(state)) return;   // Stufe 3 (Flusseffekte) kommt nach Stufe 1 (Rückwurf) und 2 (Schaden nach der Verteidigung): ist dort schon eine Seite auf 0 HP gefallen, wirkt kein Fluss mehr
  if (dmg > 0) {
    const sh = shieldHit(side.stats, dmg);   // das Schild mindert auch den Todesfluss
    side.stats.hp = Math.max(0, side.stats.hp - sh.hit);
    log(state, 'Todesfluss: ' + side.name + ' verliert ' + sh.hit + ' HP am Ende der Angriffsphase' + (sh.absorbed ? ' (Schild mindert um ' + sh.absorbed + ')' : '') + '.', side.ctrl);
  }
  // Erschöpfung (seit 0.7.7.2): Nach je exhaustRounds Kampfrunden (Standard 10, 0 = aus) steigt sie um 1; beide Seiten (auch das Monster) verlieren am Ende ihrer Angriffsphase so viele HP, wie die Erschöpfung hoch ist. Runde 1–10: 0, Runde 11–20: 1, Runde 21–30: 2 …
  const exLvl = exhaustionLevel(state, done);
  if (exLvl > 0 && side.stats.hp > 0) {
    const sh = shieldHit(side.stats, exLvl);   // das Schild mindert auch die Erschöpfung
    side.stats.hp = Math.max(0, side.stats.hp - sh.hit);
    log(state, 'Erschöpfung ' + exLvl + ': ' + side.name + ' verliert ' + sh.hit + ' HP am Ende der Angriffsphase' + (sh.absorbed ? ' (Schild mindert um ' + sh.absorbed + ')' : '') + '.', side.ctrl);
    if (side.stats.hp <= 0) return;
  }
  // Heilfluss (Erd-Ultimate): am Ende der eigenen Angriffsphase +1 HP je Heilmarker (nur Marker, die schon zu Beginn der Phase lagen: healPhase wie deathPhase), höchstens bis zu den maximalen HP; nur wer noch steht
  const hl = Math.min(side.stats.heal || 0, side.stats.healPhase === undefined ? Infinity : side.stats.healPhase); delete side.stats.healPhase;
  if (hl > 0 && side.stats.hp > 0) {
    const before = side.stats.hp; side.stats.hp = Math.min(side.stats.maxHp, side.stats.hp + hl);
    if (side.stats.hp > before) log(state, 'Heilfluss: ' + side.name + ' heilt ' + (side.stats.hp - before) + ' HP am Ende der Angriffsphase.', side.ctrl, { kind: 'healtick', who: side.ctrl, n: side.stats.hp - before, marks: hl });
  }
  // Manafluss (Wasser-Ultimate, seit 0.8): am Ende der eigenen Angriffsphase +1 Mana je Marker (nur Marker, die schon zu Beginn der Phase lagen: manaPhase), höchstens bis zum maximalen Mana; nur wer noch steht
  const mf = Math.min(side.stats.manaflow || 0, side.stats.manaPhase === undefined ? Infinity : side.stats.manaPhase); delete side.stats.manaPhase;
  if (mf > 0 && side.stats.hp > 0) {
    const before = side.stats.mana; side.stats.mana = Math.min(side.stats.maxMana, side.stats.mana + mf);
    if (side.stats.mana > before) log(state, 'Manafluss: ' + side.name + ' regeneriert ' + (side.stats.mana - before) + ' Mana am Ende der Angriffsphase.', side.ctrl, { kind: 'manatick', who: side.ctrl, n: side.stats.mana - before, marks: mf });
  }
}
// Ultimate wirken lassen: die Farbe der Schlusskarte (el, seit 0.9.9; vorher der ersten Karte) bestimmt die Marker. who legt sie bei sich (Erde, Wasser) oder beim Gegner (Feuer).
function castUltimate(side, opp, el, lvl) {
  lvl = Math.max(1, Math.min(MAX_LVL, lvl));
  if (el === 'E') { side.stats.heal = Math.max(side.stats.heal || 0, lvl); return { text: 'Ultimate ' + lvl + ' (Erde): Heilfluss, ' + side.stats.heal + ' HP am Ende jeder eigenen Angriffsphase bis Kampfende', fx: { kind: 'ultimate', who: side.ctrl, to: side.ctrl, el: 'E', n: lvl } }; }
  if (el === 'W') { side.stats.manaflow = Math.max(side.stats.manaflow || 0, lvl); return { text: 'Ultimate ' + lvl + ' (Wasser): Manafluss, ' + side.stats.manaflow + ' Mana am Ende jeder eigenen Angriffsphase bis Kampfende', fx: { kind: 'ultimate', who: side.ctrl, to: side.ctrl, el: 'W', n: lvl } }; }
  opp.stats.death = Math.max(opp.stats.death || 0, lvl);
  return { text: 'Ultimate ' + lvl + ' (Feuer): Todesfluss für ' + opp.name + ' (' + opp.stats.death + ' HP am Ende jeder seiner Angriffsphasen bis Kampfende)', fx: { kind: 'ultimate', who: side.ctrl, to: opp.ctrl, el: 'F', n: lvl } };
}
function passAttackTurn(state) {
  const c = state.combat;
  deathTick(state, c.sides[c.turn], (c.atkTurns || 0) + 1);
  c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'attack'; c.color = null; c.pending = 0; c.lfp = null;
  c.atkTurns = (c.atkTurns || 0) + 1;   // ein Angriffszug ist vorbei (Angriff ohne Schaden, Passen, Erholen, Nachziehen)
}

// HP nach einer Heilung um lvl: höchstens bis zu den maximalen HP, nie weniger als vorher
function healedHp(stats, hp, lvl) { return lvl > 0 ? Math.max(hp, Math.min(stats.maxHp, hp + lvl)) : hp; }
// Hellsicht (Blau + Rot, seit 0.8.0.9): Die Seite zieht drei Karten vom Zugstapel (der Ablagestapel wird bei Bedarf gemischt), wählt S davon aus und legt sie offen vor sich; die übrigen kommen auf den Ablagestapel. Die offenen Karten lassen sich wie Handkarten ausspielen, kosten aber kein Mana, und werden danach abgelegt (unbenutzte am Kampfende). Sie belegen keine Handplätze (hinten angehängt, siehe addSight). c.forced = { pid, kind: 'sight', cards, n, lvl }; die Entscheidung kommt als Aktion fd mit pick = ['k'|'a', ...] je Karte (k = offen vor mich legen, a = ablegen); genau n Karten mit k, keine Fluchkarten.
function sightDraw(state, side, lvl) {
  const d = side.deck, cards = [];
  for (let i = 0; i < 3; i++) {
    if (!d.draw.length && d.discard.length) { d.draw = d.discard.splice(0); state.rng.shuffle(d.draw); }
    if (!d.draw.length) break;
    cards.push(d.draw.pop());
  }
  const ok = cards.filter(cd => !parseCard(cd.id).curse).length, n = Math.min(lvl, ok);
  if (n > 0 && n < ok) state.combat.forced = { pid: side.ctrl, n, kind: 'sight', cards, lvl };
  else sightResolve(state, side, cards, cards.map(cd => (n > 0 && !parseCard(cd.id).curse ? 'k' : 'a')));   // keine Wahl: alle brauchbaren Karten bleiben liegen, der Rest geht auf den Ablagestapel
  return { drawn: cards.length, choose: n > 0 && n < ok, n };
}
function sightResolve(state, side, cards, pick) {
  const d = side.deck, keep = cards.filter((cd, i) => pick[i] === 'k');
  cards.forEach((cd, i) => { if (pick[i] !== 'k') d.discard.push(cd); });
  addSight(d, keep);
  return { k: keep.length, a: cards.length - keep.length };
}
// Falle (Blau + Rot seit 0.9.9; zuvor Rot + Blau seit 0.8.0.1, davor Blau + Rot seit 0.8): Die Seite zieht drei Karten vom Zugstapel (seit 0.8.0.5 nicht mehr in die Hand) und legt eine davon verdeckt vor sich; die übrigen kommen auf den Ablagestapel (stats.trap = { card, el, tier, lvl }; kein Marker, die Läuterung erreicht sie nicht). Welche, wählt der Spieler (c.forced mit kind 'trap'; ohne Wahlmöglichkeit gleich). Fluchkarten kommen nicht in Frage.
function trapDraw(state, side, lvl) {
  const d = side.deck, cards = [];
  for (let i = 0; i < 3; i++) {   // drei Karten direkt vom Zugstapel (der Ablagestapel wird bei Bedarf gemischt); sie ersetzen keine Handkarten
    if (!d.draw.length && d.discard.length) { d.draw = d.discard.splice(0); state.rng.shuffle(d.draw); }
    if (!d.draw.length) break;
    cards.push(d.draw.pop());
  }
  const ok = cards.map((cd, i) => parseCard(cd.id).curse ? -1 : i).filter(i => i >= 0);
  if (ok.length === 1) { trapSet(state, side, cards[ok[0]], lvl); cards.forEach((cd, i) => { if (i !== ok[0]) d.discard.push(cd); }); }
  else if (ok.length > 1) state.combat.forced = { pid: side.ctrl, n: 1, kind: 'trap', cards, lvl };
  else cards.forEach(cd => d.discard.push(cd));
  return { drawn: cards.length, choose: ok.length > 1, none: ok.length === 0 };
}
function trapSet(state, side, card, lvl) {
  const pc = parseCard(card.id);
  card.locked = false;
  if (side.stats.trap) side.deck.discard.push(side.stats.trap.card);   // eine liegende Falle wird durch eine neue ersetzt (die alte kommt in den Ablagestapel)
  side.stats.trap = { card, el: pc.el, tier: pc.tier, lvl };
}
// Die Falle wird aufgedeckt, sobald Schaden eingeht (vor der Verteidigung). Entspricht die Farbe des Schadens der Farbe der Karte, wirft sie 1/2/3 (Stufe 1/2/3) unblockbaren Schaden auf den Angreifer zurück (höchstens der eingehende Schaden, der entsprechend sinkt). Danach kommt die Karte auf den Ablagestapel, auch ohne Rückwurf.
function springTrap(state, owner, att, color, dmg, fxs, texts) {
  const t = owner.stats.trap; if (!t) return 0;
  delete owner.stats.trap; owner.deck.discard.push(t.card);
  const hit = t.el === color, refl = hit ? Math.min(t.lvl, dmg) : 0;
  const sh = refl > 0 ? shieldHit(att.stats, refl) : { hit: 0, absorbed: 0 };   // das Schild des Angreifers mindert auch den Rückwurf (er bleibt unblockbar, das Schild ist aber kein Block)
  if (sh.hit > 0) att.stats.hp = Math.max(0, att.stats.hp - sh.hit);
  texts.push('Falle von ' + owner.name + ' (' + NAMES[t.el] + (hit ? ') trifft: ' + refl + ' unblockbarer Schaden zurück' + (sh.absorbed ? ', Schild von ' + att.name + ' mindert um ' + sh.absorbed : '') : '), Angriff in ' + NAMES[color] + ': keine Wirkung'));
  fxs.push({ kind: 'trap', who: owner.ctrl, to: att.ctrl, el: t.el, card: t.card.id, attElem: color, hit, refl, abs: sh.absorbed, lvl: t.lvl, dmg0: dmg });
  return refl;
}
// Wirkung der Kombos (Angriff und nach der Verteidigung): plan = [[Schlüssel, Stufe], ...]
function applyComboPlan(state, side, opp, plan, ev, texts, fxs) {
  const c = state.combat;
  for (const [k, lvl] of plan) {
    if (k === 'sh') { shieldAdd(side.stats, lvl); fxs.push({ kind: 'shieldcast', who: side.ctrl, to: opp.ctrl, n: lvl }); texts.push('Schild ' + lvl + ' (' + side.stats.rainbow + ' Ladung' + (side.stats.rainbow === 1 ? '' : 'en') + ')'); }
    if (k === 'hs') {
      const r = sightDraw(state, side, lvl);
      fxs.push({ kind: 'sightcast', who: side.ctrl, to: opp.ctrl, n: lvl });
      texts.push('Hellsicht ' + lvl + ': ' + (r.drawn ? 'zieht ' + r.drawn + ' Karte' + (r.drawn === 1 ? '' : 'n') + (r.choose ? ' und wählt ' + r.n + ' davon' : r.n ? ', ' + r.n + ' bleibt offen liegen' : ', keine brauchbar') : 'keine Karte zum Ziehen'));
    }
    if (k === 'tr') {
      if (side.stats.trap) { side.deck.discard.push(side.stats.trap.card); delete side.stats.trap; }
      const r = trapDraw(state, side, lvl);
      fxs.push({ kind: 'trapcast', who: side.ctrl, to: opp.ctrl, n: lvl });
      texts.push('Falle ' + lvl + ': zieht ' + r.drawn + ' Karte' + (r.drawn === 1 ? '' : 'n') + (r.none ? ', keine eignet sich als Falle' : r.choose ? ' und legt eine davon verdeckt vor sich (Wahl)' : ' und legt eine davon verdeckt vor sich'));
      if (state.combat.forced && state.combat.forced.kind === 'trap') state.combat.forced.lvl = lvl;
    }
    if (k === 'fe') { texts.push('Lähmung ' + lvl + ': ' + inflictCurses(state, opp, lvl)); fxs.push({ kind: 'aggro', who: side.ctrl, to: opp.ctrl, n: lvl }); }
    if (k === 'gh') {
      const before = side.stats.hp; side.stats.hp = healedHp(side.stats, before, lvl);
      texts.push('Heilung ' + lvl + ': +' + (side.stats.hp - before) + ' HP'); fxs.push({ kind: 'lifeflow', who: side.ctrl, to: opp.ctrl, got: {}, removed: 0, heal: side.stats.hp - before, draws: 0 });
    }
    else if (k === 'ew') {   // Läuterung: S Marker beliebig vom Brett nehmen, je entferntem Marker 1 Gratis-Nachziehen
      const before = side.stats.hp, picks = lifeflowPicks(state, side, opp, lvl), names = { sd: 'eigene Todesmarker', od: 'Todesmarker des Gegners', sm: 'eigene Manamarker', om: 'Manamarker des Gegners', sh: 'eigene Heilmarker', oh: 'Heilmarker des Gegners', sr: 'eigene Schildladungen', or: 'Schildladungen des Gegners', st: 'eigene Nachziehtokens', ot: 'Nachziehtoken des Gegners' };
      const got = {}; let removed = 0;
      for (const pk of picks) {
        const kk = pk.split(':')[0];
        const tgt = kk[0] === 's' ? side : opp, key = kk[1] === 'd' ? 'death' : kk[1] === 't' ? 'freeDraws' : kk[1] === 'h' ? 'heal' : kk[1] === 'r' ? 'rainbow' : 'manaflow';
        if ((tgt.stats[key] || 0) <= 0) continue;
        tgt.stats[key]--; if (key !== 'freeDraws' && tgt.stats[key] <= 0) delete tgt.stats[key];
        removed++; got[kk] = (got[kk] || 0) + 1;
      }
      const dr = removed - (got.ot || 0) - (got.st || 0);   // Gratis-Nachziehen je entferntem Marker (zerstörte Nachziehtokens, eigene wie gegnerische, zählen nicht)
      if (dr) side.stats.freeDraws += dr;
      texts.push('Läuterung ' + lvl + (!removed ? ': nichts zu entfernen' : '') + (removed ? ', ' + Object.keys(got).map(kk => got[kk] + ' ' + names[kk]).join(', ') + ' weg' : '') + (dr ? ', ' + dr + ' Gratis-Nachziehen' : ''));
      fxs.push({ kind: 'lifeflow', who: side.ctrl, to: opp.ctrl, got, removed, heal: side.stats.hp - before, draws: dr });
    }
  }
}
// Zugmuster seit 0.10: Jeder Zug hat dieselben Aktionen (Magie wirken, Erholen, Nachziehen, Passen). Wer Magie wirkt, wehrt zuerst einen eingehenden Angriff ab (nur die Primärfarbe in der Angriffsfarbe oder der überlegenen Farbe blockt; die überlegene kostet kein Mana) und stellt mit denselben Karten den Folgeangriff: Die Primärkarte setzt das Echo, die Sekundärkarte löst eine Kombo aus (durch das alte Echo verstärkt).
function execCast(state) {
  const c = state.combat, side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const d = side.deck, sel = selection(d);
  const inc = c.action === 'defense' ? c.color : null, c0pending = c.pending;
  const ev = evalAttack(side.stats, sel, inc);
  if (!ev.valid) return fail(ev.reason);
  if (!ev.affordable) return fail('Zu wenig Mana (' + ev.cost + ' nötig).');
  side.passed = 0;   // Magie wirken beendet die Serie der Passen-Züge
  const lvs = levelsFor(ev), death = ev.levels.ulti > 0, plan = [];
  if (!death) for (const k of ['hs', 'tr', 'sh', 'fe', 'ew', 'gh']) if (lvs[k] > 0) plan.push([k, lvs[k]]);
  side.stats.mana -= ev.cost;
  consumeSelection(d, sel);
  if (inc) {   // Zuerst wird der eingehende Schaden gemindert und genommen (Block der Primärmagie, dann Schild); fällt der Wirkende dabei auf 0 HP, verfällt sein Zug
    const left = takeIncoming(state, side, ev.block, ev.prim, true);
    if (hpDecided(state)) return { ok: true, combatEnd: endDecided(state, { k: 'V', who: side.key === 'a' ? 0 : 1, v: ev.block, b: c0pending, left }) };
  }
  const texts = [], fxs = [];
  const echoOld = side.stats.echo, echoUsed = !!ev.levels.echo;   // Echo (seit 0.9): der Kombo wird durch das Echo der Seite verstärkt; jede Nutzung von Primärmagie (auch beim Blocken, seit 0.10) hinterlässt ein neues Echo
  if (ev.prim) side.stats.echo = ev.prim;   // Echo in der Farbe der ersten Karte
  if (echoUsed) texts.push('Echo (' + NAMES[echoOld] + '): Kombo +1 Stufe');
  applyComboPlan(state, side, opp, plan, ev, texts, fxs);
  if (death && (ev.ultiEl || ev.prim) === 'E' && side.stats.healPhase === undefined) side.stats.healPhase = side.stats.heal || 0;   // wie beim Todesfluss: ein in diesem Zug gelegter Heilmarker heilt erst am Ende des nächsten eigenen Zugs
  if (death && (ev.ultiEl || ev.prim) === 'W' && side.stats.manaPhase === undefined) side.stats.manaPhase = side.stats.manaflow || 0;   // ebenso der Manamarker
  if (death) { const u = castUltimate(side, opp, ev.ultiEl || ev.prim, ev.levels.ulti); fxs.push(u.fx); texts.push(u.text); }
  c.lfp = null;
  const dmg0 = ev.prim ? ev.damage : 0;
  let dmg = dmg0;
  if (dmg0 > 0 && opp.stats.trap) dmg = dmg0 - springTrap(state, opp, side, ev.prim, dmg0, fxs, texts);   // die Falle wird aufgedeckt, sobald Schaden eingeht
  if (dmg > 0) fxs.push({ kind: 'attack', who: side.ctrl, to: opp.ctrl, elem: ev.prim, n: dmg, stand: !!inc });   // stand: die Magie wurde schon als Block gezeigt und bleibt nun als Folgeangriff stehen
  log(state, side.name + (inc ? ' wirkt Magie' : ' greift an') + (ev.prim ? ' (' + NAMES[ev.prim] + ', Schaden ' + dmg0 + ')' : ' (nur Flüche)') + (texts.length ? ' – ' + texts.join(', ') : '') + '.', side.ctrl, fxs.length ? fxs : undefined);
  const info = { k: 'A', who: side.key === 'a' ? 0 : 1, v: dmg0 };
  if (hpDecided(state)) return { ok: true, combatEnd: endDecided(state, info) };   // Stufe 1: Der Rückwurf der Falle hat den Wirkenden auf 0 HP gebracht; kein Fluss wirkt mehr
  deathTick(state, side, (c.atkTurns || 0) + 1);   // Ende des eigenen Zugs: Flusseffekte und Erschöpfung (Stufe 3)
  c.turn = c.turn === 'a' ? 'b' : 'a'; c.atkTurns = (c.atkTurns || 0) + 1; c.lfp = null;
  if (dmg > 0 && !hpDecided(state)) { c.color = ev.prim; c.pending = dmg; c.action = 'defense'; }   // der Gegner reagiert im nächsten Zug
  else { c.action = 'attack'; c.color = null; c.pending = 0; }
  return { ok: true, combatEnd: finishStep(state, info) };
}
// Fliehen (seit 0.9.1 standardmäßig abgeschaltet, Schalter fleeAllowed: 0 = aus, 1 = an; die Erschöpfung beendet festgefahrene Kämpfe): Im Monsterkampf und im Showdown darf jede Seite (im Monsterkampf der Angreifer ebenso wie der Spieler, der das Monster führt) den Kampf abbrechen, wenn der Gegner kein Mana mehr hat, ihr gerade kein Angriff entgegengebracht wird (eigener Angriffszug) und sie nicht unter einem Todesfluss steht. Kein Sieger, keine Beute; das Monster behält seine HP und sein Mana, und danach ist der Spieler am Zug, der das Monster geführt hat (er kann das angeschlagene Monster jetzt selbst angreifen).
function canFlee(state, pid) {
  const c = state.combat;
  if (!state.rules.fleeAllowed) return false;
  if (!c || c.forced || c.action !== 'attack') return false;
  const me = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  return me.ctrl === pid && opp.stats.mana <= 0 && !(me.stats.death > 0);
}
function recoverGain(state) { const r = state.rules.recoverByStage; return r ? (r[Math.min(r.length, Math.max(1, state.stage)) - 1] || 1) : 1; }
// Ergebnis einer Verteidigung (Schild, Restschaden): gemeinsam für die Ausführung (execDefense) und die Vorschau der Oberfläche (previewDefense). Seit 0.8 gibt es nur noch das Schild (stats.rainbow): Es mindert den nicht geblockten Schaden gegen jede Farbe und verliert je gemindertem Schaden eine Ladung; einen Rückwurf gibt es nicht mehr (die Felder refl, lostStd, std und die Farbe bleiben der Form halber). rb: Ladungen nach dem Kombo; ohne Angabe zählen die Ladungen, die jetzt liegen.
function defenseOutcome(stats, color, pending, block, mir, std, rb) {
  const r0 = rb === undefined ? (stats.rainbow || 0) : rb, missing = Math.max(0, pending - block), absorb = Math.min(r0, missing);
  return { mLvl: r0, absorb, refl: 0, used: absorb, lostStd: 0, lostRb: absorb, lost: absorb, std: 0, rb: r0, leftover: missing - absorb };
}
// Eingehenden Schaden auflösen (seit 0.10 Teil jedes Zugs, auch beim Erholen, Nachziehen und Passen): Block, Schild, HP-Verlust, Protokoll samt Effekt. cast: die Karten des Zugs wehren ab (sonst wird der Schaden ohne Block hingenommen). Gibt den Restschaden zurück.
function takeIncoming(state, side, block, defEl, cast) {
  const c = state.combat, attacker = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const { absorb, used, lost, rb, leftover } = defenseOutcome(side.stats, c.color, c.pending, block);
  const hpPre = { [side.ctrl]: side.stats.hp, [attacker.ctrl]: attacker.stats.hp };   // HP vor dem Schaden (Oberfläche zeigt sie, bis die Geschosse einschlagen)
  side.stats.hp = Math.max(0, side.stats.hp - leftover);
  const defFx = { kind: 'defense', rec: !cast, who: side.ctrl, to: attacker.ctrl, attElem: c.color, defElem: cast && defEl ? defEl : c.color, pending: c.pending, block, hpPre };
  log(state, side.name + (cast ? ' verteidigt' + (block ? ' (Block ' + block + ')' : ' ohne Block') : ' nimmt den Schaden hin') + ' und verliert ' + leftover + ' HP' + '.', side.ctrl, defFx);
  if (used > 0) {
    side.stats.rainbow = Math.max(0, (side.stats.rainbow || 0) - lost); if (!side.stats.rainbow) delete side.stats.rainbow;
    log(state, 'Schild: ' + side.name + ' mindert den Schaden um ' + absorb + ' und verliert ' + lost + ' Ladung' + (lost === 1 ? '' : 'en') + '.', side.ctrl, undefined);
    defFx.mirror = { hpPre, elem: 'R', markers: rb, broken: lost, who: side.ctrl, att: attacker.ctrl, r: 0, abs: absorb, d: c.pending, blk: block };   // Schild-Effekt (Oberfläche, elem 'R'): läuft in der Verteidigungsanimation
  }
  return leftover;
}
// Der Zug endet, weil eine Seite auf 0 HP fiel: die Initiative wechselt, der Kampf wird ausgewertet.
function endDecided(state, info) {
  const c = state.combat;
  c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'attack'; c.color = null; c.pending = 0; c.lfp = null; c.atkTurns = (c.atkTurns || 0) + 1;
  return finishStep(state, info);
}
// Zug ohne Magie (Erholen, Nachziehen, Passen) bei eingehendem Angriff: Der Schaden wird ohne Block hingenommen (ein Schild mindert ihn). Gibt { res } zurück, wenn der Kampf dadurch entschieden ist, sonst null.
function takeHitFirst(state, side) {
  const c = state.combat;
  if (c.action !== 'defense') return null;
  const c0pending = c.pending, left = takeIncoming(state, side, 0, null, false);
  if (hpDecided(state)) { side.deck.marks = []; return { res: { ok: true, combatEnd: endDecided(state, { k: 'V', who: side.key === 'a' ? 0 : 1, v: 0, b: c0pending, left }) } }; }
  return null;
}
// Vorschau für die Knöpfe „Magie wirken“ (noCast falsch) und Erholen/Nachziehen/Passen (noCast wahr), ohne etwas zu ändern: Mana-Kosten, Block, Restschaden und die HP danach. null, wenn gerade kein Angriff eingeht oder die Auswahl nicht geht.
function previewDefense(state, noCast) {
  const c = state.combat;
  if (!c || c.forced || c.action !== 'defense') return null;
  const side = c.sides[c.turn], att = c.sides[c.turn === 'a' ? 'b' : 'a'];
  let block = 0, cost = 0, heal = 0;
  if (!noCast) {
    const sel = selection(side.deck);
    if (sel.length) { const ev = evalAttack(side.stats, sel, c.color); if (!ev.valid || ev.affordable === false) return null; block = ev.block || 0; cost = ev.cost || 0; heal = ev.levels.ulti > 0 ? 0 : levelsFor(ev).gh || 0; }
  }
  const o = defenseOutcome(side.stats, c.color, c.pending, block);
  return Object.assign({ who: side.ctrl, att: att.ctrl, cost, block, heal, hpAfter: side.stats.hp - o.leftover > 0 ? healedHp(side.stats, side.stats.hp - o.leftover, heal) : 0, attHpAfter: Math.max(0, att.stats.hp - o.refl) }, o);
}

function applyCombat(state, a) {
  const c = state.combat, pid = a.pid;
  if (c.forced) {   // Falle oder Hellsicht: Der Betroffene entscheidet zuerst; vorher ist keine andere Aktion möglich
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
  const side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const mine = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b;     // (in Monsterkämpfen kontrolliert jeder genau eine Seite)
  if (a.type === 'lock') { const e = toggleLock(mine.deck, a.slot); return e ? fail(e) : { ok: true }; }
  if (side.ctrl !== pid) return fail('Die Gegenseite ist am Zug.');
  switch (a.type) {
    case 'mark': { const e = toggleMark(side.deck, a.slot, side.stats.limit); return e ? fail(e) : { ok: true }; }
    case 'lfp': { if (c.action !== 'attack' && c.action !== 'defense') return fail('Nur im Angriffs- oder Verteidigungszug.'); const ok = ['sm', 'om', 'sd', 'od', 'sh', 'oh', 'sr', 'or', 'st', 'ot']; c.lfp = a.pick === null ? null : (Array.isArray(a.pick) ? a.pick : []).filter(x => typeof x === 'string' && ok.includes(x.split(':')[0]) && (x.indexOf(':') < 0 || ELEMENTS.includes(x.split(':')[1]))).slice(0, 3); return { ok: true }; }
    case 'attack': case 'defend': return execCast(state);   // seit 0.10 gibt es nur noch „Magie wirken“ (defend bleibt als Alias für alte Aufzeichnungen)
    case 'pass': {
      const hit = takeHitFirst(state, side); if (hit) return hit.res;
      side.deck.marks = []; side.passed = (side.passed || 0) + 1; log(state, side.name + ' passt.', side.ctrl);   // passed: Passen-Züge in Folge (die KI greift dann eher an)
      passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
    }
    case 'flee': {
      if (!state.rules.fleeAllowed) return fail('Fliehen ist abgeschaltet.');
      if (c.action !== 'attack') return fail('Fliehen geht nur im eigenen Angriffszug, nicht unter Angriff.');
      if (opp.stats.mana > 0) return fail('Fliehen geht nur, wenn der Gegner kein Mana mehr hat.');
      if (side.stats.death > 0) return fail('Unter einem Todesfluss kann man nicht fliehen.');
      side.deck.marks = [];
      log(state, side.name + ' flieht vor ' + opp.name + '.', side.ctrl);
      c.turns++; traceStep(state, { t: c.turns });
      return { ok: true, combatEnd: endCombat(state, { reason: 'flee', winner: null, monsterDefeated: false, fled: side.key }) };
    }
    case 'recover': {
      const hit = takeHitFirst(state, side); if (hit) return hit.res;
      const gain = recoverGain(state);
      side.stats.mana = Math.min(side.stats.maxMana, side.stats.mana + gain);
      side.deck.marks = [];
      log(state, side.name + ' erholt sich: +' + gain + ' Mana.', side.ctrl, { kind: 'recover', who: side.ctrl });
      passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
    }
    case 'draw': {
      const dmc = drawManaCost(state, side.ctrl);   // roter Nachziehmarker: Nachziehen kostet Mana
      if (side.stats.mana < dmc) return fail('Bei rotem Nachziehmarker kostet Nachziehen ' + dmc + ' Mana. Es ist nicht genug Mana da.');
      const dd = side.deck;
      if (!(dd.hand.some(x => !x || !x.locked) && (dd.draw.length + dd.discard.length > 0 || dd.hand.some(x => x && !x.locked)))) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
      side.stats.mana -= dmc;
      const hit = takeHitFirst(state, side); if (hit) return hit.res;   // ein eingehender Angriff wird zuerst ohne Block hingenommen
      drawPhase(state, side.deck);
      log(state, side.name + ' zieht Karten nach' + (dmc ? ' und zahlt bei rotem Marker ' + dmc + ' Mana' : '') + '.', side.ctrl);
      passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
    }
    case 'freeDraw': {
      if (side.stats.freeDraws <= 0) return fail('Kein Gratis-Nachziehen übrig.');
      if (!drawPhase(state, side.deck)) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
      side.stats.freeDraws--; log(state, side.name + ' nutzt ein Gratis-Nachziehen.', side.ctrl);
      return { ok: true };
    }
  }
  return fail('Unbekannte Aktion.');
}

