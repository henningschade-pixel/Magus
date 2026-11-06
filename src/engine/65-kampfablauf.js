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
  return Object.assign({ logFrom: state.logN, turn: 'a', action: 'attack', color: null, pending: 0, turns: 0 }, fields);
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
function evaluateEnd(state) {
  const c = state.combat, a = c.sides.a.stats, b = c.sides.b.stats;
  const ah = Math.max(0, a.hp), bh = Math.max(0, b.hp);
  if (ah <= 0 || bh <= 0) {
    let winner = null;
    if (ah <= 0 && bh > 0) winner = 'b'; else if (bh <= 0 && ah > 0) winner = 'a';
    return { reason: 'hp', winner, monsterDefeated: bh <= 0 };
  }
  // Kein automatisches Unentschieden mehr bei 0 Mana beider Seiten: Der Kampf geht weiter (Erholen bringt Mana, der Todesfluss zehrt am Ende der Angriffsphasen). Beenden lässt er sich durch Fliehen (siehe canFlee); als Sicherung gegen Endlosschleifen gilt MAX_COMBAT_TURNS.
  if (c.turns >= MAX_COMBAT_TURNS) return { reason: 'exhaustion', winner: null, monsterDefeated: false, forced: true };
  return null;
}
function endCombat(state, end) {
  const c = state.combat, res = { mode: c.mode, reason: end.reason, winner: end.winner, monsterDefeated: false, elem: c.elem, stage: state.stage, turns: c.turns, fled: end.fled || null };   // elem/stage/turns: für die Balance-Auswertung
  if (state.keepSnap) res.snap = JSON.parse(JSON.stringify(c));   // Oberfläche: Endstand des Kampfes (vor Zurücksetzen und Rückkehr in die Weltphase)
  state.players.forEach(p => { p.stats.freeDraws = 0; p.deck.marks = []; delete p.stats.mirror; delete p.stats.mirrorEl; delete p.stats.mirrorFree; delete p.stats.death; delete p.stats.deathPhase; delete p.stats.heal; delete p.stats.rainbow; });
  state.players.forEach(p => stripCurseCards(state, p.deck));
  delete c.sides.b.stats.death; delete c.sides.b.stats.deathPhase; delete c.sides.b.stats.heal; delete c.sides.b.stats.rainbow;
  if (c.sides.b.monster) { delete c.sides.b.monster.stats.mirror; delete c.sides.b.monster.stats.mirrorEl; delete c.sides.b.monster.stats.mirrorFree; }
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
      res.monsterDefeated = true; res.loot = loot;
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
    else log(state, end.reason === 'flee' ? 'Die Flucht ist geglückt. Kein Sieger; das Monster behält seine Verletzungen.' : end.reason === 'exhaustion' ? 'Beide Seiten sind erschöpft. Kein Sieger.' : 'Beide Seiten fallen. Kein Sieger.');
  } else {
    if (end.winner) { const w = end.winner === 'a' ? A : B, wl = w === A ? B : A, ssp = state.rules.showdownSp || 0, lost = Math.min(ssp, wl.sp); w.sp += ssp; wl.sp -= lost; res.sp = { winner: ssp, loser: -lost }; log(state, w.name + ' gewinnt den Showdown (+' + ssp + ' Siegpunkt' + (ssp > 1 ? 'e' : '') + (lost ? ', ' + wl.name + ' verliert ' + lost : '') + ').', end.winner === 'a' ? c.att : c.def);
      const L = w === A ? B : A; const lu = state.showdown === 1 && state.rules.loserUp2 !== undefined ? state.rules.loserUp2 : state.rules.loserUp; if (lu > 0 && state.showdown < 2) { L.stats.pending += lu; L.stats.upGot += lu; log(state, L.name + ' erhält als Trostpreis ' + lu + ' Upgrade-Punkt' + (lu > 1 ? 'e' : '') + '.', w === A ? c.def : c.att); } }
    else log(state, end.reason === 'flee' ? 'Die Flucht ist geglückt. Der Showdown endet ohne Sieger, ohne Siegpunkte.' : 'Showdown ohne Sieger: keine Siegpunkte.');   // Flucht und Unentschieden zählen nie als Sieg oder Niederlage
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
    state.showdown++;
    const goal = state.rules.winSp > 0 && state.showdown >= (state.rules.winSpFromShowdown || 1) && Math.max(state.players[0].sp, state.players[1].sp) >= state.rules.winSp;   // Siegbedingung: wer nach einem Showdown (ab winSpFromShowdown) winSp Siegpunkte hat, gewinnt sofort; die Partie endet dann vor dem nächsten Abschnitt
    if (state.showdown >= 3 || goal) {
      state.over = true; state.phase = 'over';
      const s0 = state.players[0].sp, s1 = state.players[1].sp;
      state.winner = s0 > s1 ? 0 : s1 > s0 ? 1 : null;
      if (state.winner === null) {   // Gleichstand bei den Siegpunkten: zuerst das Gold, dann die Tempelstufe (Upgrades durch Opfer)
        const g0 = state.players[0].stats.gold, g1 = state.players[1].stats.gold, l0 = state.players[0].temple.level, l1 = state.players[1].temple.level;
        if (g0 !== g1) { state.winner = g0 > g1 ? 0 : 1; state.goldWin = true; log(state, 'Gleichstand bei den Siegpunkten: Das Gold entscheidet (' + g0 + ' : ' + g1 + ').'); }
        else if (l0 !== l1) { state.winner = l0 > l1 ? 0 : 1; state.templeWin = true; log(state, 'Gleichstand bei Siegpunkten und Gold: Die Tempelstufe entscheidet (' + l0 + ' : ' + l1 + ').'); }
      }
      log(state, state.winner === null ? 'Spielende: Gleichstand, kein Sieger.' : 'Spielende: ' + state.players[state.winner].name + (goal && state.showdown < 3 ? ' erreicht ' + state.rules.winSp + ' Siegpunkte und' : '') + ' gewinnt.');
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
// Spiegelmarker: Der Spiegel (Wasser+Feuer bzw. Wasser+Erde) legt Marker vor den Verteidiger; sie werfen Angriffsschaden zurück.
const MAX_MIRROR = 3;
// Spiegelmarker sind an ein Element (Magierichtung) gebunden: stats.mirrorEl = {F,E,W}, stats.mirror = Summe.
function mirrorOf(stats, el) { return (stats.mirrorEl && stats.mirrorEl[el]) || 0; }
function mirrorSync(stats) {
  const m = stats.mirrorEl; const t = m ? (m.F || 0) + (m.E || 0) + (m.W || 0) : 0;
  if (t > 0) stats.mirror = t; else { delete stats.mirror; delete stats.mirrorEl; delete stats.mirrorFree; }
}
// Ein Control der Stufe n bringt den Spiegel dieser Farbe auf n Marker (nicht obendrauf addiert); höchstens 3 Marker je Farbe, die Farben zählen getrennt.
function mirrorAdd(stats, el, n) {
  stats.mirrorEl = stats.mirrorEl || { F: 0, E: 0, W: 0 };
  const cur = stats.mirrorEl[el] || 0;
  stats.mirrorEl[el] = Math.max(cur, Math.min(n, MAX_MIRROR)); mirrorSync(stats);
}
function mirrorTake(stats, el, n) { if (stats.mirrorEl) { stats.mirrorEl[el] = Math.max(0, stats.mirrorEl[el] - n); mirrorSync(stats); } }
function mirrorTakeAny(stats, n) { for (const el of ELEMENTS) { while (n > 0 && mirrorOf(stats, el) > 0) { mirrorTake(stats, el, 1); n--; } } }
// Ultimates (seit 0.7 nach der Farbe der ersten Karte): Feuer = Todesfluss (stats.death, Marker beim Gegner), Erde = Heilfluss (stats.heal, grüner Marker mit Plus bei sich selbst: +1 HP je Marker am Ende der eigenen Angriffsphase), Wasser = Regenbogenschild (stats.rainbow, bei sich selbst: wie ein Spiegel, aber gegen jede Farbe und er verbraucht sich nicht). Alle drei Marker entfernt nur die Läuterung.
// Wirksamer Schild gegen einen Angriff der Farbe el: der höhere von Farbspiegel und Regenbogenschild.
function shieldOf(stats, el) { return Math.max(mirrorOf(stats, el), stats.rainbow || 0); }
// Läuterung: gewählte Marker (sm/om/sd/od/sh/oh/sr/or/st/ot), höchstens S; ohne Wahl automatisch eigene Todesmarker, dann Spiegel, Regenbogenschild und Heilmarker des Gegners.
function lifeflowPicks(state, side, opp, lvl) {
  if (Array.isArray(state.combat.lfp)) return state.combat.lfp.slice(0, lvl);
  const out = []; let om = opp.stats.mirror || 0, sd = side.stats.death || 0, orb = opp.stats.rainbow || 0, oh = opp.stats.heal || 0;
  while (out.length < lvl && sd > 0) { out.push('sd'); sd--; }
  while (out.length < lvl && om > 0) { out.push('om'); om--; }
  while (out.length < lvl && orb > 0) { out.push('or'); orb--; }
  while (out.length < lvl && oh > 0) { out.push('oh'); oh--; }
  return out;
}
// Todesfluss: Am Ende der eigenen Angriffsphase (nach Angriff und Verteidigung der Gegenseite) verliert die Seite so viele HP, wie sie Todesmarker trägt.
// Ist der Kampf schon entschieden (eine Seite auf 0 HP), wirkt er nicht mehr.
function deathTick(state, side) {
  const c = state.combat;
  // Ein Fluch, der erst in dieser Angriffsphase (durch die Ultimate der Verteidigung) gesprochen wurde, wirkt noch nicht: deathPhase merkt die Stufe zu Beginn der Phase.
  const dmg = Math.min(side.stats.death || 0, side.stats.deathPhase === undefined ? Infinity : side.stats.deathPhase); delete side.stats.deathPhase;
  if (c.sides.a.stats.hp <= 0 || c.sides.b.stats.hp <= 0) return;
  if (dmg > 0) {
    side.stats.hp = Math.max(0, side.stats.hp - dmg);
    log(state, 'Todesfluss: ' + side.name + ' verliert ' + dmg + ' HP am Ende der Angriffsphase.', side.ctrl);
  }
  // Heilfluss (Erd-Ultimate): am Ende der eigenen Angriffsphase +1 HP je Heilmarker, höchstens bis zu den maximalen HP; nur wer noch steht
  const hl = side.stats.heal || 0;
  if (hl > 0 && side.stats.hp > 0) {
    const before = side.stats.hp; side.stats.hp = Math.min(side.stats.maxHp, side.stats.hp + hl);
    if (side.stats.hp > before) log(state, 'Heilfluss: ' + side.name + ' heilt ' + (side.stats.hp - before) + ' HP am Ende der Angriffsphase.', side.ctrl, { kind: 'healtick', who: side.ctrl, n: side.stats.hp - before });
  }
}
// Ultimate wirken lassen: die Farbe der ersten Karte (el) bestimmt die Marker. who legt sie bei sich (Erde, Wasser) oder beim Gegner (Feuer).
function castUltimate(side, opp, el, lvl) {
  lvl = Math.max(1, Math.min(MAX_MIRROR, lvl));
  if (el === 'E') { side.stats.heal = Math.max(side.stats.heal || 0, lvl); return { text: 'Ultimate ' + lvl + ' (Erde): Heilfluss, ' + side.stats.heal + ' HP am Ende jeder eigenen Angriffsphase bis Kampfende', fx: { kind: 'ultimate', who: side.ctrl, to: side.ctrl, el: 'E', n: lvl } }; }
  if (el === 'W') { side.stats.rainbow = Math.max(side.stats.rainbow || 0, lvl); return { text: 'Ultimate ' + lvl + ' (Wasser): Regenbogenschild Stufe ' + side.stats.rainbow + ' (gegen jede Farbe, verbraucht sich nicht)', fx: { kind: 'ultimate', who: side.ctrl, to: side.ctrl, el: 'W', n: lvl } }; }
  opp.stats.death = Math.max(opp.stats.death || 0, lvl);
  return { text: 'Ultimate ' + lvl + ' (Feuer): Todesfluss für ' + opp.name + ' (' + opp.stats.death + ' HP am Ende jeder seiner Angriffsphasen bis Kampfende)', fx: { kind: 'ultimate', who: side.ctrl, to: opp.ctrl, el: 'F', n: lvl } };
}
function passAttackTurn(state) {
  const c = state.combat;
  deathTick(state, c.sides[c.turn]);
  c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'attack'; c.color = null; c.pending = 0;
}

// HP nach einer Heilung um lvl: höchstens bis zu den maximalen HP, nie weniger als vorher
function healedHp(stats, hp, lvl) { return lvl > 0 ? Math.max(hp, Math.min(stats.maxHp, hp + lvl)) : hp; }
// Wirkung der Kombos (Angriff und nach der Verteidigung): plan = [[Schlüssel, Stufe], ...]
function applyComboPlan(state, side, opp, plan, ev, texts, fxs) {
  const c = state.combat;
  for (const [k, lvl] of plan) {
    if (k === 'fw') { const mel = ev.ord.el; mirrorAdd(side.stats, mel, lvl); fxs.push({ kind: 'mirrorcast', who: side.ctrl, to: opp.ctrl, elem: mel, n: lvl }); texts.push('Spiegel ' + lvl + ' (' + NAMES[mel] + ', ' + (side.stats.mirror || 0) + ' Marker)'); }
    if (k === 'fe') { texts.push('Lähmung ' + lvl + ': ' + inflictCurses(state, opp, lvl)); fxs.push({ kind: 'aggro', who: side.ctrl, to: opp.ctrl, n: lvl }); }
    if (k === 'rm') {   // Zerrüttung: Der Gegner muss S Handkarten seiner Wahl abwerfen
      const n = Math.min(lvl, opp.deck.hand.filter(Boolean).length);
      if (n > 0) { c.forced = { pid: opp.ctrl, n }; fxs.push({ kind: 'ruin', who: side.ctrl, to: opp.ctrl, n }); }
      texts.push('Zerrüttung ' + lvl + ': ' + opp.name + ' muss ' + n + ' Handkarte' + (n === 1 ? '' : 'n') + ' seiner Wahl abwerfen');
    }
    else if (k === 'gh') {
      const before = side.stats.hp; side.stats.hp = healedHp(side.stats, before, lvl);
      texts.push('Heilung ' + lvl + ': +' + (side.stats.hp - before) + ' HP'); fxs.push({ kind: 'lifeflow', who: side.ctrl, to: opp.ctrl, got: {}, removed: 0, heal: side.stats.hp - before, draws: 0 });
    }
    else if (k === 'ew') {   // Läuterung: S Marker beliebig vom Brett nehmen, je entferntem Marker 1 Gratis-Nachziehen
      const before = side.stats.hp, picks = lifeflowPicks(state, side, opp, lvl), names = { sd: 'eigene Todesmarker', od: 'Todesmarker des Gegners', sm: 'eigene Spiegelmarker', om: 'Spiegelmarker des Gegners', sh: 'eigene Heilmarker', oh: 'Heilmarker des Gegners', sr: 'eigene Regenbogenmarker', or: 'Regenbogenmarker des Gegners', st: 'eigene Nachziehtokens', ot: 'Nachziehtoken des Gegners' };
      const got = {}; let removed = 0;
      for (const pk of picks) {
        const [kk, mel] = pk.split(':');   // Spiegelmarker können mit Farbe gewählt werden, z. B. 'om:F'
        const tgt = kk[0] === 's' ? side : opp, key = kk[1] === 'd' ? 'death' : kk[1] === 't' ? 'freeDraws' : kk[1] === 'h' ? 'heal' : kk[1] === 'r' ? 'rainbow' : 'mirror';
        if ((tgt.stats[key] || 0) <= 0) continue;
        if (key === 'mirror') { if (mel && mirrorOf(tgt.stats, mel) > 0) mirrorTake(tgt.stats, mel, 1); else mirrorTakeAny(tgt.stats, 1); } else { tgt.stats[key]--; if ((key === 'death' || key === 'heal' || key === 'rainbow') && tgt.stats[key] <= 0) delete tgt.stats[key]; }
        removed++; got[kk] = (got[kk] || 0) + 1;
      }
      const dr = removed - (got.ot || 0) - (got.st || 0);   // Gratis-Nachziehen je entferntem Marker (zerstörte Nachziehtokens, eigene wie gegnerische, zählen nicht)
      if (dr) side.stats.freeDraws += dr;
      texts.push('Läuterung ' + lvl + (!removed ? ': nichts zu entfernen' : '') + (removed ? ', ' + Object.keys(got).map(kk => got[kk] + ' ' + names[kk]).join(', ') + ' weg' : '') + (dr ? ', ' + dr + ' Gratis-Nachziehen' : ''));
      fxs.push({ kind: 'lifeflow', who: side.ctrl, to: opp.ctrl, got, removed, heal: side.stats.hp - before, draws: dr });
    }
  }
}
function execAttack(state) {
  const c = state.combat, side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const d = side.deck, sel = selection(d);
  const ev = evalAttack(side.stats, sel);
  if (!ev.valid) return fail(ev.reason);
  if (!ev.affordable) return fail('Zu wenig Mana (' + ev.cost + ' nötig).');
  side.passed = 0;   // ein Angriff beendet die Serie der Passen-Züge
  const lvs = levelsFor(ev), death = ev.levels.ulti > 0, plan = [];
  if (!death) for (const k of ['fw', 'fe', 'ew', 'rm', 'gh']) if (lvs[k] > 0) plan.push([k, lvs[k]]);
  side.stats.mana -= ev.cost;
  consumeSelection(d, sel);
  const texts = [], fxs = [];
  applyComboPlan(state, side, opp, plan, ev, texts, fxs);
  if (death) { const u = castUltimate(side, opp, ev.ultiEl || ev.prim, ev.levels.ulti); fxs.push(u.fx); texts.push(u.text); }
  c.lfp = null;
  const dmg = ev.prim ? ev.damage : 0;
  if (dmg > 0) fxs.push({ kind: 'attack', who: side.ctrl, to: opp.ctrl, elem: ev.prim, n: dmg });
  log(state, side.name + ' greift an' + (ev.prim ? ' (' + NAMES[ev.prim] + ', Schaden ' + dmg + ')' : ' (nur Flüche)') + (texts.length ? ' – ' + texts.join(', ') : '') + '.', side.ctrl, fxs.length ? fxs : undefined);
  if (dmg > 0) { c.color = ev.prim; c.pending = dmg; c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'defense'; }
  else passAttackTurn(state);
  const res = finishStep(state, { k: 'A', who: side.key === 'a' ? 0 : 1, v: dmg });
  return { ok: true, combatEnd: res };
}
// Fliehen: Im Monsterkampf und im Showdown darf jede Seite (im Monsterkampf der Angreifer ebenso wie der Spieler, der das Monster führt) den Kampf abbrechen, wenn der Gegner kein Mana mehr hat, ihr gerade kein Angriff entgegengebracht wird (eigener Angriffszug) und sie nicht unter einem Todesfluss steht. Kein Sieger, keine Beute; das Monster behält seine HP und sein Mana, und danach ist der Spieler am Zug, der das Monster geführt hat (er kann das angeschlagene Monster jetzt selbst angreifen).
function canFlee(state, pid) {
  const c = state.combat;
  if (!c || c.forced || c.action !== 'attack') return false;
  const me = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  return me.ctrl === pid && opp.stats.mana <= 0 && !(me.stats.death > 0);
}
function recoverGain(state) { const r = state.rules.recoverByStage; return r ? (r[Math.min(r.length, Math.max(1, state.stage)) - 1] || 1) : 1; }
// Ergebnis einer Verteidigung (Spiegel, Rückwurf, Restschaden): gemeinsam für die Ausführung (execDefense) und die Vorschau der Oberfläche (previewDefense). mir: Spiegelstufe der Angriffsfarbe nach dem Kombo (seit 0.4 wirkt der Kombo vor der Verteidigung); ohne Angabe zählt der Spiegel, der jetzt liegt.
// Seit 0.7 zählt auch der Regenbogenschild (stats.rainbow, gegen jede Farbe): Es wirkt der höhere von Farbspiegel und Regenbogenschild; liegt der Regenbogenschild gleich hoch oder höher, ist er der wirksame (perm) und verliert keine Stufen. used: ausgeglichener plus zurückgeworfener Schaden, lost: dabei verbrauchte Spiegelstufen (0 beim Regenbogenschild).
function defenseOutcome(stats, color, pending, block, mir) {
  const mLvl = mir === undefined ? shieldOf(stats, color) : mir, missing = Math.max(0, pending - block), excess = Math.max(0, block - pending);
  const perm = mLvl > 0 && (stats.rainbow || 0) >= mLvl;
  const absorb = Math.min(mLvl, missing), refl = Math.min(mLvl, excess, pending);
  return { mLvl, perm, absorb, refl, used: absorb + refl, lost: perm ? 0 : absorb + refl, leftover: missing - absorb };
}
// Was ein Kombo der Verteidigung für den laufenden Angriff ändert: der Spiegel der Angriffsfarbe wirkt seit 0.4 schon gegen diesen Angriff. Die Heilung wirkt seit 0.5.4 wieder nach dem Schaden (heal: Stufe, hp: HP vor dem Schaden).
function defenseComboPre(stats, ev, color) {
  const lvs = ev && ev.ord && !(ev.levels && ev.levels.ulti > 0) ? levelsFor(ev) : null, own = shieldOf(stats, color);
  if (!lvs) return { heal: 0, hp: stats.hp, mir: ev && ev.ultiEl === 'W' && ev.levels.ulti > 0 ? Math.max(own, Math.min(ev.levels.ulti, MAX_MIRROR)) : own };   // Ultimate Wasser in der Verteidigung: der Regenbogenschild wirkt schon gegen diesen Angriff
  return { heal: lvs.gh || 0, hp: stats.hp, mir: lvs.fw > 0 && ev.ord.el === color ? Math.max(own, Math.min(lvs.fw, MAX_MIRROR)) : own };
}
// Vorschau für die Knöpfe „Verteidigen“ und „Passen“, ohne etwas zu ändern: Mana-Kosten, Block, Restschaden und die HP danach (beim Verteidiger und, durch den Spiegelrückwurf, beim Angreifer). null, wenn gerade keine Verteidigung ansteht oder die Auswahl nicht geht.
function previewDefense(state, passOnly) {
  const c = state.combat;
  if (!c || c.forced || c.action !== 'defense') return null;
  const side = c.sides[c.turn], att = c.sides[c.turn === 'a' ? 'b' : 'a'];
  let block = 0, cost = 0, pre = { heal: 0, hp: side.stats.hp, mir: shieldOf(side.stats, c.color) };   // Heilung (heal) wirkt nach dem Schaden
  if (!passOnly) {
    const sel = selection(side.deck);
    if (sel.length) { const ev = evalDefense(side.stats, sel, c.color); if (!ev.valid || ev.affordable === false) return null; block = ev.block || 0; cost = ev.cost || 0; pre = defenseComboPre(side.stats, ev, c.color); }
  }
  const o = defenseOutcome(side.stats, c.color, c.pending, block, pre.mir);
  return Object.assign({ who: side.ctrl, att: att.ctrl, cost, block, heal: pre.heal, hpAfter: Math.max(0, healedHp(side.stats, pre.hp - o.leftover, pre.heal)), attHpAfter: Math.max(0, att.stats.hp - o.refl) }, o);
}
function execDefense(state, passOnly) {
  const c = state.combat, side = c.sides[c.turn], c0pending = c.pending;
  const d = side.deck;
  let block = 0, cost = 0, sel = [], defEv = null;
  if (!passOnly) {
    sel = selection(d);
    const ev = evalDefense(side.stats, sel, c.color);
    if (!ev.valid) return fail(ev.reason);
    if (ev.affordable === false) return fail('Zu wenig Mana (' + ev.cost + ' nötig).');
    block = ev.block || 0; cost = ev.cost || 0; defEv = ev;
  }
  side.stats.mana -= cost;
  // Passen in der Verteidigung bringt kein Mana (nur im Angriffszug gibt es Erholen)
  if (sel.length) consumeSelection(d, sel); else d.marks = [];
  const attacker = c.sides[c.turn === 'a' ? 'b' : 'a'];
  // Seit 0.4 wirkt der Kombo zuerst, danach die Verteidigung: Ein Spiegel dieser Farbe wirkt schon gegen den Angriff, auf den verteidigt wird. Seit 0.5.4 gilt das nicht mehr für die Heilung: Sie wirkt wieder nach Angriff und Verteidigung (Zerrüttung und die übrigen Kombos bleiben davor).
  if (defEv && defEv.levels && defEv.levels.ulti > 0) {   // Ultimate in der Verteidigung: je nach Farbe der ersten Karte Todesfluss für den Angreifer (Feuer), Heilfluss (Erde) oder Regenbogenschild (Wasser) für den Verteidiger
    const uel = defEv.ultiEl || defEv.el;
    if (uel !== 'E' && uel !== 'W' && attacker.stats.deathPhase === undefined) attacker.stats.deathPhase = attacker.stats.death || 0;
    const u = castUltimate(side, attacker, uel, defEv.levels.ulti);
    log(state, side.name + ' wirkt eine Ultimate: ' + u.text + '.', side.ctrl, uel === 'E' || uel === 'W' ? Object.assign(u.fx, { first: true }) : { kind: 'aggro', who: side.ctrl, to: attacker.ctrl, n: defEv.levels.ulti, first: true, ult: true });
  }
  let healLvl = 0;
  if (defEv && defEv.ord) {
    const lvs = levelsFor(defEv), plan = [], texts = [], fxs = [];
    for (const k of ['fw', 'fe', 'ew', 'rm']) if (lvs[k] > 0) plan.push([k, lvs[k]]);   // Heilung (gh) wirkt seit 0.5.4 wieder erst nach dem Schaden, Zerrüttung und die übrigen Kombos davor
    healLvl = lvs.gh || 0;
    applyComboPlan(state, side, attacker, plan, defEv, texts, fxs);
    fxs.forEach(f => { f.first = true; });   // Oberfläche: Kombo-Animation läuft vor der Verteidigungsanimation
    if (texts.length) log(state, side.name + ' wirkt einen Kombo: ' + texts.join(', ') + '.', side.ctrl, fxs.length ? fxs : undefined);
  }
  // Spiegel (dauerhaft, je Farbe eine Stufe von höchstens 3, die Farben zählen getrennt). Gegen einen Angriff in seiner Farbe gleicht er zuerst fehlende Verteidigung aus
  // (höchstens seine Stufe) und verliert dafür je ausgeglichenen Schaden eine Stufe. Nur wenn der Verteidiger mehr verteidigt als nötig, wirft er den
  // Überschuss zurück (ebenfalls höchstens seine Stufe und höchstens der eingehende Schaden) und verliert dafür je zurückgeworfenen Schaden eine Stufe. Das gilt auch beim Passen.
  const { mLvl, perm, absorb, refl, used, lost, leftover } = defenseOutcome(side.stats, c.color, c.pending, block);
  const hpPre = { [side.ctrl]: side.stats.hp, [attacker.ctrl]: attacker.stats.hp };   // HP vor dem Schaden, aber nach dem Kombo (Oberfläche zeigt sie, bis die Geschosse einschlagen)
  side.stats.hp = side.stats.hp - leftover;   // vorläufig, die Heilung (seit 0.5.4 nach dem Schaden) gleicht ihn noch aus; danach nie unter 0
  const defEl = sel.length && sel[0].el && !sel[0].curse ? sel[0].el : c.color;
  const defFx = { kind: 'defense', rec: !!passOnly, who: side.ctrl, to: attacker.ctrl, attElem: c.color, defElem: defEl, pending: c.pending, block, hpPre, afterCombo: !!(defEv && (defEv.ord || (defEv.levels && defEv.levels.ulti > 0))) };   // hpPre: HP vor dem Schaden, die Oberfläche zeigt sie, bis die Geschosse einschlagen
  log(state, side.name + (passOnly ? ' passt und nimmt den Schaden hin' : ' verteidigt' + (block ? ' (Block ' + block + ')' : ' ohne Block')) + ' und verliert ' + leftover + ' HP' + '.', side.ctrl, defFx);
  if (used > 0) {
    if (refl > 0) attacker.stats.hp = Math.max(0, attacker.stats.hp - refl);
    if (lost > 0) mirrorTake(side.stats, c.color, lost);
    const stufen = lost + ' Stufe' + (lost === 1 ? '' : 'n');
    log(state, (perm ? 'Regenbogenschild: ' : 'Spiegel: ') + side.name + (refl > 0 ? ' wirft ' + refl + ' Schaden auf ' + attacker.name + ' zurück' : ' gleicht ' + absorb + ' Schaden aus') + (perm ? ' (der Schild bleibt bestehen).' : ' und verliert ' + stufen + '.'), side.ctrl, undefined);
    if (!perm) defFx.mirror = { hpPre, elem: c.color, markers: mLvl, broken: lost, who: side.ctrl, att: attacker.ctrl, r: refl, abs: absorb, d: c.pending, blk: block };   // der Schild-Effekt gilt dem Farbspiegel; der Regenbogenschild (perm) verliert nichts und hat keinen Bruch-Effekt   // der Schild-Effekt läuft in der Verteidigungsanimation, vor dem Schaden auf den HP
  }
  if (healLvl > 0) {   // Heilung nach Angriff und Verteidigung (seit 0.5.4): gleicht den Schaden nachträglich aus, höchstens bis zum Maximum
    const hTexts = [], hFxs = [];
    applyComboPlan(state, side, attacker, [['gh', healLvl]], defEv, hTexts, hFxs);
    hFxs.forEach(f => { f.late = true; });   // Oberfläche: Heilungsanimation nach der Verteidigungsanimation
    log(state, side.name + ' heilt nach der Verteidigung: ' + hTexts.join(', ') + '.', side.ctrl, hFxs);
  }
  side.stats.hp = Math.max(0, side.stats.hp);
  const attSide = attacker;   // wer gerade angegriffen hat: seine Angriffsphase endet mit dieser Verteidigung
  c.action = 'attack'; c.color = null; c.pending = 0;
  deathTick(state, attSide);
  const res = finishStep(state, { k: 'V', who: side.key === 'a' ? 0 : 1, v: block, b: c0pending, left: leftover });
  return { ok: true, combatEnd: res };
}

function applyCombat(state, a) {
  const c = state.combat, pid = a.pid;
  if (c.forced) {   // Zerrüttung: Der Betroffene wählt die Karten, die er abwerfen muss; vorher ist keine andere Aktion möglich
    if (a.type !== 'fd') return fail(c.forced.pid === pid ? 'Zerrüttung: Wähle zuerst ' + c.forced.n + ' Handkarte' + (c.forced.n === 1 ? '' : 'n') + ' zum Abwerfen.' : 'Der Gegner wählt gerade seine Abwurfkarten.');
    if (c.forced.pid !== pid) return fail('Der Gegner wählt gerade seine Abwurfkarten.');
    const v = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b, dd = v.deck, slots = [...new Set((Array.isArray(a.slots) ? a.slots : []).map(Number))].filter(i => Number.isInteger(i) && dd.hand[i]);
    const need = Math.min(c.forced.n, dd.hand.filter(Boolean).length);
    if (slots.length !== need) return fail('Wähle genau ' + need + ' Handkarte' + (need === 1 ? '' : 'n') + ' zum Abwerfen.');
    slots.forEach(i => { const cd = dd.hand[i]; cd.locked = false; dd.discard.push(cd); dd.hand[i] = null; });
    dd.marks = [];
    c.forced = null;
    log(state, v.name + ' wirft ' + slots.length + ' Handkarte' + (slots.length === 1 ? '' : 'n') + ' ab (Zerrüttung).', pid);
    return { ok: true };
  }
  const side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const mine = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b;     // (in Monsterkämpfen kontrolliert jeder genau eine Seite)
  if (a.type === 'lock') { const e = toggleLock(mine.deck, a.slot); return e ? fail(e) : { ok: true }; }
  if (side.ctrl !== pid) return fail('Die Gegenseite ist am Zug.');
  switch (a.type) {
    case 'mark': { const e = toggleMark(side.deck, a.slot, side.stats.limit); return e ? fail(e) : { ok: true }; }
    case 'lfp': { if (c.action !== 'attack') return fail('Nur im Angriffszug.'); const ok = ['sm', 'om', 'sd', 'od', 'sh', 'oh', 'sr', 'or', 'st', 'ot']; c.lfp = a.pick === null ? null : (Array.isArray(a.pick) ? a.pick : []).filter(x => typeof x === 'string' && ok.includes(x.split(':')[0]) && (x.indexOf(':') < 0 || ELEMENTS.includes(x.split(':')[1]))).slice(0, 3); return { ok: true }; }
    case 'attack': if (c.action !== 'attack') return fail('Jetzt wird verteidigt.'); return execAttack(state);
    case 'defend': if (c.action !== 'defense') return fail('Jetzt wird angegriffen.'); return execDefense(state, false);
    case 'pass':
      if (c.action === 'defense') return execDefense(state, true);
      side.deck.marks = []; side.passed = (side.passed || 0) + 1; log(state, side.name + ' passt.', side.ctrl);   // passed: Passen-Züge in Folge (die KI greift dann eher an)
      passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
    case 'flee': {
      if (c.action !== 'attack') return fail('Fliehen geht nur im eigenen Angriffszug, nicht unter Angriff.');
      if (opp.stats.mana > 0) return fail('Fliehen geht nur, wenn der Gegner kein Mana mehr hat.');
      if (side.stats.death > 0) return fail('Unter einem Todesfluss kann man nicht fliehen.');
      side.deck.marks = [];
      log(state, side.name + ' flieht vor ' + opp.name + '.', side.ctrl);
      c.turns++; traceStep(state, { t: c.turns });
      return { ok: true, combatEnd: endCombat(state, { reason: 'flee', winner: null, monsterDefeated: false, fled: side.key }) };
    }
    case 'recover': {
      if (c.action !== 'attack') return fail('Erholen geht nur im Angriffszug.');
      const gain = recoverGain(state);
      side.stats.mana = Math.min(side.stats.maxMana, side.stats.mana + gain);
      side.deck.marks = [];
      log(state, side.name + ' erholt sich: +' + gain + ' Mana.', side.ctrl, { kind: 'recover', who: side.ctrl });
      passAttackTurn(state); return { ok: true, combatEnd: finishStep(state) };
    }
    case 'draw': {
      if (c.action !== 'attack') return fail('Nachziehen geht nur im Angriffszug.');
      const dmc = drawManaCost(state, side.ctrl);   // roter Nachziehmarker: Nachziehen kostet Mana
      if (side.stats.mana < dmc) return fail('Bei rotem Nachziehmarker kostet Nachziehen ' + dmc + ' Mana. Es ist nicht genug Mana da.');
      if (!drawPhase(state, side.deck)) return fail('Alle Karten sind gesperrt, es gibt nichts zu tauschen.');
      side.stats.mana -= dmc;
      log(state, side.name + ' zieht Karten nach (ersetzt den Angriff)' + (dmc ? ' und zahlt bei rotem Marker ' + dmc + ' Mana' : '') + '.', side.ctrl);
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

