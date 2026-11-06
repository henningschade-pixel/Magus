/* ---------- Kampf ---------- */
// Bedrohung je Farbe: Wie wahrscheinlich und wie stark greift der Gegner mit diesem Element an (Karten im Deck, begrenzt durch seine Magie).
// useOwn: bestehende eigene Spiegel dieser Farbe senken den Wert (so war es, als sich alle Farben 3 Marker teilten).
function mirrorScores(side, opp, useOwn) {
  const d = opp.deck, all = [].concat(d.draw, d.discard, d.hand.filter(Boolean)), mag = opp.stats.mag, own = side.stats.mirrorEl || {}, out = {};
  for (const e of M.ELEMENTS) {
    let v = 0; for (const c of all) { const p = M.parseCard(c.id); if (!p.curse && p.el === e) v += Math.min(p.tier, mag[e]); }
    out[e] = v * (1 + 0.15 * mag[e]) / (useOwn ? 1 + 0.5 * (own[e] || 0) : 1);
  }
  return out;
}
// Farbe neuer Spiegelmarker: das Element, mit dem der Gegner am wahrscheinlichsten (und am stärksten) angreift.
function pickMirrorEl(side, opp) {
  const sc = mirrorScores(side, opp, true); let best = null, bv = -1;
  for (const e of M.ELEMENTS) if (sc[e] > bv) { bv = sc[e]; best = e; }
  return best;
}
// Wert eines Spiegel-Kombos der Stufe lvl in Farbe el. Seit 0.16.1 zählt das Limit von 3 Markern je Farbe (nicht mehr insgesamt) und die Stufen werden
// nicht addiert: mirMarg 1 wertet nur den Zugewinn gegenüber dem Spiegel, der in dieser Farbe schon liegt. mirGrade 1 gewichtet die Farbe nach ihrem
// Bedrohungsanteil (mindestens mirMin) statt pauschal mit 0,5 für jede Farbe außer der wahrscheinlichsten.
function mirrorWorth(side, opp, Q, el, lvl) {
  if (!(lvl > 0) || !el) return 0;
  const own = M.mirrorOf(side.stats, el), gain = Q.mirMarg ? Math.max(0, lvl - own) : lvl;
  let f;
  if (Q.mirGrade) { const sc = mirrorScores(side, opp, false), top = Math.max(sc.F, sc.E, sc.W); f = top > 0 ? Math.max(Q.mirMin, Math.min(1, sc[el] / top)) : 1; }
  else f = pickMirrorEl(side, opp) === el ? 1 : 0.5;
  return gain * Q.wFW * f;
}
// Zerrüttung: Der Gegner wirft S Handkarten seiner Wahl ab, zuerst Fluchkarten. Wert hat nur, was darüber hinaus echte Karten kostet.
function ruinWorth(opp, n) {
  if (!(n > 0)) return 0;
  const hand = opp.deck.hand.filter(Boolean), curses = hand.filter(h => M.parseCard(h.id).curse).length;
  return Math.max(0, Math.min(n, hand.length) - curses) * 0.9;
}
// Wert eines geordneten Kombos (ohne Ultimate) für die KI; gleiche Gewichte wie im Angriff
function ordComboWorth(side, opp, Q, rules, lvs, ev) {
  const st = side.stats, hurt = st.maxHp - st.hp, oMir = opp.stats.mirror || 0;
  const wEw = oMir > 0 ? 1.2 + oMir * Math.max(0.3, Q.lfOppW || 0) : 0.1;
  return mirrorWorth(side, opp, Q, ev.ord && ev.ord.el, lvs.fw) + lvs.fe * Q.wFE + lvs.ew * wEw + ruinWorth(opp, lvs.rm) + Math.min(lvs.gh * (rules.lifeflowHeal || 1), hurt) * Q.wEW + (lvs.gh > 0 && hurt === 0 ? 0.1 : 0);
}
// Wert einer Ultimate der Stufe lvl nach der Farbe der ersten Karte (seit 0.7): Feuer Todesfluss beim Gegner, Erde Heilfluss und Wasser Multispiegel bei mir selbst. Liegt schon ein Marker gleicher oder höherer Stufe, bringt sie kaum etwas.
function ultiWorth(side, opp, Q, el, lvl) {
  if (!(lvl > 0)) return 0;
  if (el === 'E') return lvl * Q.wEW * 0.8 * ((side.stats.heal || 0) >= lvl ? 0.1 : 1) * (side.stats.maxHp > side.stats.hp ? 1 : 0.6);
  if (el === 'W') return lvl * Q.wFW * 2 * ((side.stats.rainbow || 0) >= lvl ? 0.1 : 1);
  return lvl * Q.wDeath * (opp.stats.death >= lvl ? 0.1 : 1) * (Q.smart ? Math.max(0.4, Math.min(1.4, opp.stats.hp / 4)) : 1);
}
function bestAttack(side, opp, hand, Q, state0, reserve) {
  const stats = side.stats, lim = Math.max(1, stats.limit);
  hand = hand.filter(h => !h.curse);   // Fluchkarten lassen sich nicht ausspielen
  let best = null;
  for (const sub of subsets(hand, lim)) {
    const firsts = sub.filter(h => !h.curse);
    const orders = firsts.length ? firsts.map(f => [f, ...sub.filter(x => x !== f)]) : [sub];
    for (const ord of orders) {
      const ev = M.evalAttack(stats, ord);
      if (!ev.valid || !ev.affordable) continue;
      const hurt = stats.maxHp - stats.hp, oMir = (opp.stats.mirror || 0) + (opp.stats.rainbow || 0);
      const w = { fe: Q.wFE, ew: oMir > 0 ? 1.2 + oMir * Math.max(0.3, Q.lfOppW || 0) : 0.1 };   // Läuterung lohnt, wenn der Gegner Spiegelmarker trägt
      const lvs = M.levelsFor(ev);
      let combo = 0;
      if (ev.levels.ulti > 0) combo = ultiWorth(side, opp, Q, ev.ultiEl || ev.prim, ev.levels.ulti);
      else combo = mirrorWorth(side, opp, Q, ev.ord && ev.ord.el, lvs.fw) + lvs.fe * w.fe + lvs.ew * w.ew + ruinWorth(opp, lvs.rm) + Math.min(lvs.gh * 1, hurt) * Q.wEW + (lvs.gh > 0 && hurt === 0 ? 0.1 : 0);
      const dmg = ev.prim ? ev.damage : 0;
      let value = dmg * Q.aDmg + combo - ev.cost * Q.aCost + ev.curses * Q.aCurse;
      // Mana-Reserve: ohne Mana darf der unterlegene Gegner fliehen. Übersteht er den Angriff nach dem erwarteten Block, zählt der Angriff nicht als sicher tödlich.
      const resHit = reserve && stats.mana - ev.cost <= 0 && (() => { const left = opp.stats.hp - Math.max(0, dmg - reserve.blk); return left > 0 && left <= reserve.hp; })();
      if (dmg >= opp.stats.hp && dmg > 0 && !resHit) value += 100;
      if (resHit) value -= reserve.v;
      if (dmg > 0 && ev.prim && M.shieldOf(opp.stats, ev.prim) > 0) value -= Math.min(M.shieldOf(opp.stats, ev.prim), dmg) * Q.mirAvoid;   // Spiegel des Gegners: gleicht bis zu seiner Stufe von meinem Schaden aus (zurückgeworfen wird nur Überverteidigung)
      if (ord.length > 1 && dmg === 0 && combo === 0 && ev.curses === 0) value -= 5;
      if (!best || value > best.value) best = { value, ord, ev, dmg };
    }
  }
  return best;
}
// Beim Nachziehen im Kampf: Karten sperren, die zusammen mit einer neuen Karte den besten Angriff (auch Kombo) versprechen.
function keepLocks(state, side, opp, hand, Q) {
  const d = side.deck, lim = Math.max(1, side.stats.limit);
  const all = [].concat(d.draw, d.discard, d.hand.filter(Boolean)).map(c => M.parseCard(c.id));
  const share = {}, tier = {}; let n = all.length || 1;
  for (const e of M.ELEMENTS) { const cs = all.filter(p => !p.curse && p.el === e); share[e] = cs.length / n; tier[e] = cs.length ? Math.max(1, Math.min(3, Math.round(cs.reduce((a, p) => a + p.tier, 0) / cs.length))) : 1; }
  const normals = hand.filter(h => !h.curse), maxK = Math.min(lim, normals.length, Math.max(1, hand.length - 1), 3);
  const val = hh => { const b = bestAttack(side, opp, hh, Q, state); return b ? Math.max(0, b.value) : 0; };
  let bestS = [], bestE = Q.keepB;
  for (const S of subsets(normals, maxK)) {
    let E = (1 - M.ELEMENTS.reduce((a, e) => a + share[e], 0)) * val(S);
    for (const e of M.ELEMENTS) if (share[e] > 0) E += share[e] * val(S.concat([Object.assign({ slot: 99, card: null }, M.parseCard(e + tier[e]))]));
    if (E > bestE) { bestE = E; bestS = S; }
  }
  return bestS.map(h => h.slot);
}
// Zerrüttung: Die KI wirft zuerst Flüche, dann die schwächsten Karten ab (gesperrte Karten möglichst nicht)
function forcedPick(state, pid) {
  const c = state.combat, v = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b, d = v.deck, mag = v.stats.mag;
  const cards = d.hand.map((h, slot) => h ? { slot, v: (M.parseCard(h.id).curse ? -5 : M.parseCard(h.id).tier + 0.15 * (mag[M.parseCard(h.id).el] || 0)) + (h.locked ? 4 : 0) } : null).filter(Boolean).sort((x, y) => x.v - y.v || x.slot - y.slot);
  return cards.slice(0, Math.min(c.forced.n, cards.length)).map(x => x.slot);
}
function combatPlan(state, pid) {
  if (state.combat.forced && state.combat.forced.pid === pid) return [{ pid, type: 'fd', slots: forcedPick(state, pid) }];
  const c = state.combat, side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const d = side.deck, hand = handList(d), A = a => Object.assign({ pid }, a);
  const s = side.stats, Q = P(pid);
  const canFlee = M.canFlee(state, pid) && (state.idleTurns || 0) < Q.fleeIdle;   // lange kein Kampf entschieden: nicht mehr fliehen, damit der Kampf einen Sieger bekommt (sonst Patt-Schleife Angreifen–Fliehen)
  if (c.action === 'attack') {
    if (Q.fleeHits > 0 && side.kind === 'monster' && canFlee) {   // Ich führe das Monster, der Angreifer hat kein Mana mehr: Fliehe ich, bleibt das angeschlagene Monster stehen, und ich bin als Nächster dran, es selbst zu besiegen (die Beute geht an mich)
      const me = state.players[pid].stats, net = outlook(state, pid, c.slot);
      if (net > 0 && side.stats.hp / net <= Q.fleeHits && me.hp >= Q.minHp && me.mana >= Q.minMana) return [A({ type: 'flee' })];
    }
    if (Q.fleeSafe > 0 && side.kind === 'monster' && canFlee && state.players[pid].sp > 0) {   // Als Monsterführer: Besiegt der Angreifer das Monster bald, kostet mich das 1 Siegpunkt; die Flucht lässt das angeschlagene Monster stehen, und ich bin als Nächster dran
      const net = outlook(state, opp.ctrl, c.slot);
      if (net > 0 && side.stats.hp / net <= Q.fleeSafe) return [A({ type: 'flee' })];
    }
    if (Q.fleeHp > 0 && side.kind !== 'monster' && c.mode === 'monster' && canFlee && state.players[pid].sp > 0 && s.hp <= Q.fleeHp) return [A({ type: 'flee' })];   // Als Angreifer mit wenig HP: lieber fliehen als 1 Siegpunkt verlieren
    // Wer das Rennen anführt, behält 1 Mana: Fliehen darf nur, wessen Gegner kein Mana hat (der unterlegene Angreifer rettet so seinen Siegpunkt, der Monsterführer stiehlt die Beute)
    // Nur wo die Flucht dem Gegner etwas bringt: Als Angreifer, wenn das Monster nach meinem Angriff höchstens mResHp HP hat (der Führer flieht und besiegt es selbst); als Monster, wenn der Angreifer einen Siegpunkt zu retten hat.
    let reserve = null;
    const resV = side.kind === 'monster' ? (state.players[opp.ctrl].sp > 0 ? Q.mResL : 0) : Q.mRes;
    if (resV > 0 && c.mode === 'monster' && raceTurns(state, side, opp) < raceTurns(state, opp, side)) reserve = { v: resV, hp: side.kind === 'monster' ? 99 : Q.mResHp, blk: Q.mResBlk };
    const best = bestAttack(side, opp, hand, Q, state, reserve), gain = M.recoverGain ? M.recoverGain(state) : 1;
    if (c.mode === 'monster' && canFlee && !(best && best.dmg >= opp.stats.hp)) {   // Kampfprognose: Wer braucht weniger Züge, um den anderen zu besiegen? (ein sofort tödlicher Angriff geht vor)
      const tMe = raceTurns(state, side, opp), tOpp = raceTurns(state, opp, side);
      // Angreifer: Liegt das Monster in der Prognose mindestens fleeA (ohne Siegpunkte fleeA0) Züge vorn, droht eine Niederlage (−1 Siegpunkt, alle HP). Die Flucht behält beides; der bis dahin angerichtete Schaden bleibt am Monster.
      // Erst fliehen, wenn sich im Kampf schon etwas getan hat: Sonst greift dieselbe Lage gleich wieder an, und die Partie tritt auf der Stelle.
      const hp0 = c.trace && c.trace.steps[0] ? c.trace.steps[0].hp : null, moved = !hp0 || hp0[0] !== c.sides.a.stats.hp || hp0[1] !== c.sides.b.stats.hp;
      const thr = state.players[pid].sp > 0 ? Q.fleeA : Q.fleeA0;   // ohne Siegpunkte kostet die Niederlage nur HP: dann nur bei klarer Lage fliehen (die Siegchance ist zwei Punkte wert)
      if (thr > 0 && side.kind !== 'monster' && moved && tMe - tOpp >= thr) return [A({ type: 'flee' })];
      // Monsterführer: Gewinnt der Angreifer das Rennen oder ist das Monster fast besiegt, bekommt er bald +1 und ich verliere 1. Die Flucht lässt das angeschlagene Monster stehen, und ich bin als Nächster am Zug, um es selbst zu besiegen.
      if (side.kind === 'monster' && ((Q.fleeL > 0 && tOpp < tMe * Q.fleeL) || s.hp <= Q.fleeLHp)) {
        const me = state.players[pid].stats;
        if (me.hp >= Q.minHp && me.mana >= Q.fleeLMana) return [A({ type: 'flee' })];
      }
      // Bewertung der Ausgänge (Sieg > Flucht > Niederlage), in Siegpunkten gerechnet: Weiterkämpfen bringt P(Sieg) × Wert des Siegs + P(Niederlage) × Wert der Niederlage.
      if (Q.fleeEV) {
        const odds = fightOdds(tOpp - tMe, side.kind === 'monster'), mySp = state.players[pid].sp, oppSp = state.players[1 - pid].sp;
        if (side.kind !== 'monster') {
          if (!(Q.fleeEV & 1)) {} else {
          // Gegner des Monsters: Sieg +1 für mich (und −1 für den Monsterführer, wenn er Siegpunkte hat) plus Beute; Niederlage −1 (wenn ich Siegpunkte habe) und alle HP. Die Flucht wendet nur die Niederlage ab.
          const vWin = 1 + (oppSp > 0 ? 1 : 0) + Q.evLoot, vLose = -(mySp > 0 ? 1 : 0) - Q.evHp * s.hp / Math.max(1, s.maxHp);
          if (moved && Q.fleeVA > odds.win * vWin + odds.lose * vLose) return [A({ type: 'flee' })];
          }
        } else if (Q.fleeEV & 2) {
          // Monsterführer: Gewinnt der Angreifer, bekommt er +1 und ich verliere 1; gewinnt das Monster, verliert der Angreifer 1. Die Flucht ist lukrativer („Monster sind feige“):
          // Das angeschlagene Monster bleibt stehen, ich bin als Nächster am Zug und kann es selbst besiegen (Prognose aus meiner Sicht als Angreifer).
          const me = state.players[pid], mf = monsterFighter(state.monsters[c.slot]), pf = playerFighter(me);
          mf.stats = side.stats;
          const ready = me.stats.hp >= Q.minHp && me.stats.mana >= 1;
          const kill = ready ? fightOdds(raceTurns(state, mf, pf) - raceTurns(state, pf, mf), false) : { win: 0, lose: 0 };
          const vFlee = Q.fleeVL * (kill.win * (1 + (oppSp > 0 ? 1 : 0) + Q.evLoot) - kill.lose * (mySp > 0 ? 1 : 0));
          const vStay = odds.win * (oppSp > 0 ? 1 : 0) - odds.lose * ((mySp > 0 ? 1 : 0) + 1 + Q.evLoot);
          if (vFlee > vStay) return [A({ type: 'flee' })];
        }
      }
    }
    if (reserve && s.mana < s.maxMana && Q.mResRec) {   // Hält die Reserve einen brauchbaren Angriff zurück, erst Mana sammeln (Erholen), statt nachzuziehen und später doch mit dem letzten Mana anzugreifen
      const raw = bestAttack(side, opp, hand, Q, state);
      if (raw && raw.value > Q.aThr && (!best || best.value <= Q.aThr)) return [A({ type: 'recover' })];
    }
    const red = !!M.markerOf(state, pid).h.drawRed, payOk = s.mana >= M.drawManaCost(state, pid);   // roter Nachziehmarker: Nachziehen kostet Mana (ohne Mana nicht möglich)
    const lowMana = Q.rW * gain * Math.max(0, Q.rRef - s.mana) - (red ? Q.cRedA : 0);   // wenig Mana: nur noch starke Angriffe, sonst lieber erholen; roter Marker: auch schwächere Angriffe statt nachzuziehen
    if (best && best.value > Q.aThr + lowMana - Q.pasDec * (opp.passed || 0) - Q.stallDec * Math.max(0, Math.floor(((c.turns || 0) - Q.stallFrom) / 2))) {   // Passt der Gegner im Angriffszug, bleibt er ohne Druck: dann lohnt auch ein knapper Angriff (sonst wartet die KI, bis die Anti-Stillstands-Schwelle sinkt)   // lange ohne Angriff: Schwelle sinkt, damit die KI nicht endlos nachzieht
      const acts = best.ord.map(h => A({ type: 'mark', slot: h.slot }));
      const lvB = M.levelsFor(best.ev);
      if (best.ev.levels.ulti <= 0 && lvB.ew > 0) {   // Läuterung: eigene Todesmarker, dann Spiegel des Gegners, zuletzt dessen Nachziehtokens
        const lvl = lvB.ew, pick = [];
        for (let i = 0; pick.length < lvl && i < (s.death || 0); i++) pick.push('sd');
        if (Q.lfColor) {   // Spiegel des Gegners nach Farbe: zuerst die Farbe, mit der ich selbst am stärksten angreife (dort würde der Spiegel am meisten ausgleichen)
          const th = mirrorScores(opp, side, false);
          for (const e of M.ELEMENTS.slice().sort((x, y) => th[y] - th[x])) for (let i = 0; pick.length < lvl && i < M.mirrorOf(opp.stats, e); i++) pick.push('om:' + e);
        } else for (let i = 0; pick.length < lvl && i < (opp.stats.mirror || 0); i++) pick.push('om');
        for (let i = 0; pick.length < lvl && i < (opp.stats.rainbow || 0); i++) pick.push('or');
        for (let i = 0; pick.length < lvl && i < (opp.stats.heal || 0); i++) pick.push('oh');
        for (let i = 0; pick.length < lvl && i < (opp.stats.freeDraws || 0); i++) pick.push('ot');
        acts.push(A({ type: 'lfp', pick }));
      }
      acts.push(A({ type: 'attack' }));
      return acts;
    }
    if (canFlee && (c.turns || 0) >= Q.fleeT && (!best || best.value <= Q.aThr)) return [A({ type: 'flee' })];   // lange ohne brauchbaren Angriff gegen ein Monster ohne Mana: abbrechen statt endlos nachzuziehen
    if (s.freeDraws > 0 && canDraw(d) && hand.length < d.hand.length) return [A({ type: 'freeDraw' })];
    if (s.freeDraws > 0 && canDraw(d) && (!best || best.value <= Q.aThr)) return [A({ type: 'freeDraw' })];
    if (s.mana <= 0 || !hand.length) { if (hand.length === 0 && canDraw(d) && payOk && !(Q.cRedE && red)) return [A({ type: 'draw' })]; return [A({ type: 'recover' })]; }
    if (Q.rW > 0 && s.mana < Q.rRef && s.mana < s.maxMana) return [A({ type: 'recover' })];
    if (canDraw(d) && payOk) {
      if (Q.cRed && red) return [A({ type: 'recover' })];
      const acts = [];
      if (Q.keepOn) {   // (bei schwachem Angriff) Kombo-Bausteine behalten
        const keep = keepLocks(state, side, opp, hand, Q);
        d.hand.forEach((c, slot) => { if (c && !!c.locked !== keep.includes(slot)) acts.push(A({ type: 'lock', slot })); });
      }
      acts.push(A({ type: 'draw' }));
      return acts;
    }
    return [A({ type: 'recover' })];
  }
  // Verteidigung
  const color = c.color, pend = c.pending, lethal = pend - Math.min(M.shieldOf(s, c.color), pend) >= s.hp;
  const cand = hand.filter(h => !h.curse);
  const abs0 = Math.min(M.shieldOf(s, color), pend);   // ohne Verteidigung gleicht ein Spiegel bis zu seiner Stufe aus
  let best = { score: (pend - abs0) * (lethal ? Q.dLeth : Q.dPend) + abs0 * Q.mirKeep, ord: [] };   // Verzicht auf Verteidigung bringt Mana
  const variants = [];
  for (const sub0 of subsets(cand, Math.max(1, s.limit))) {
    const firsts = [...new Set(sub0.filter(h => !h.curse).map(h => h.el))];
    if (firsts.length <= 1) variants.push(sub0); else firsts.forEach(f => variants.push(sub0.filter(h => h.el === f).concat(sub0.filter(h => h.el !== f))));   // die erste Karte bestimmt die Verteidigungsfarbe
  }
  for (const sub of variants) {
    const ev = M.evalDefense(s, sub, color);
    if (!ev.valid || ev.affordable === false) continue;
    const left0 = Math.max(0, pend - (ev.block || 0)), lvM = M.defenseComboPre(s, ev, color).mir, absorbed = Math.min(lvM, left0), left = left0 - absorbed;   // Spiegel gleicht fehlende Verteidigung bis zu seiner Stufe aus; seit 0.4 wirkt ein Spiegel-Kombo der Verteidigung schon gegen diesen Angriff
    const nCurse = sub.filter(h => h.curse).length;
    let score = left * (lethal ? Q.dLeth : Q.dPend) + (ev.cost || 0) * Q.dCost + (sub.length - nCurse) * Q.dKeep - nCurse * 0.6;
    if (lvM > 0) {   // Spiegel: Überschuss der Verteidigung wird bis zur Stufe zurückgeworfen; jeder ausgeglichene oder zurückgeworfene Schaden kostet eine Stufe
      const opp = c.sides[c.turn === 'a' ? 'b' : 'a'], rel = Math.min(lvM, pend, Math.max(0, (ev.block || 0) - pend));
      score -= rel * Q.mirW + (rel >= opp.stats.hp ? 60 : 0) - (rel + absorbed) * Q.mirKeep;
    }
    if (ev.ord) { const o = c.sides[c.turn === 'a' ? 'b' : 'a']; score -= ordComboWorth(side, o, Q, state.rules, M.levelsFor(ev), ev); }
    if (Q.dU > 0 && ev.levels && ev.levels.ulti > 0) { const o = c.sides[c.turn === 'a' ? 'b' : 'a']; score -= Q.dU * (ev.ultiEl === 'F' ? ev.levels.ulti * Q.wDeath * (o.stats.death >= ev.levels.ulti ? 0.1 : 1) * Math.max(0.4, Math.min(1.4, o.stats.hp / 4)) : ultiWorth(side, o, Q, ev.ultiEl, ev.levels.ulti)); }   // Ultimate in der Verteidigung: Feuer Todesfluss für den Angreifer, Erde Heilfluss, Wasser Multispiegel
    if (score < best.score) best = { score, ord: sub };
  }
  if (!best.ord.length) return [A({ type: 'pass' })];
  const acts = best.ord.map(h => A({ type: 'mark', slot: h.slot }));
  acts.push(A({ type: 'defend' }));
  return acts;
}

function plan(state, pid) {
  if (state.phase === 'world') { const st = ecoStep(state, pid); if (st) return [st]; }   // Wirtschaftsaktion (Punkte ausgeben, Magie kaufen, Gold opfern) hat Vorrang und beendet den Zug; ohne das kaufte die KI in der Oberfläche nie Magie
  return state.phase === 'combat' ? combatPlan(state, pid) : worldPlan(state, pid);
}
// Führt einen vollständigen KI-Zug aus; bei Fehlern greift eine sichere Rückfalloption.
function fallback(state, pid) {
  const A = a => Object.assign({ pid }, a);
  if (state.phase === 'combat') {
    const c = state.combat;
    if (c.forced) return [A({ type: 'fd', slots: forcedPick(state, pid) })];
    return c.action === 'defense' ? [A({ type: 'pass' })] : [A({ type: 'recover' }), A({ type: 'draw' }), A({ type: 'pass' })];
  }
  return [A({ type: 'draw' })];
}
function runTurn(state, pid) {
  if (state.phase === 'world') { const st = ecoStep(state, pid); if (st) { const r = M.apply(state, st); if (r.ok) return { ok: true, acts: [st] }; } }   // Wirtschaftsaktion beendet den Zug
  const tries = [plan(state, pid), ...fallback(state, pid).map(a => [a])];
  for (const acts of tries) {
    const marks0 = state.phase === 'combat' ? state.combat.sides[state.combat.turn].deck.marks.slice() : null;
    let okAll = true, last = null;
    for (const a of acts) { last = M.apply(state, a); if (!last.ok) { okAll = false; break; } }
    if (okAll) return { ok: true, acts };
    // fehlgeschlagene Markierungen zurücksetzen
    if (state.phase === 'combat') state.combat.sides[state.combat.turn].deck.marks = marks0 || [];
    else state.players[pid].deck.marks = [];
  }
  return { ok: false };
}

return { plan, runTurn, fallback, ecoStep, setParams, DEFAULTS, _race: raceTurns };
}));