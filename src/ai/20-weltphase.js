/* ---------- Weltphase ---------- */
// Ziel-Farbe: Gegen ein Monster der Farbe X wirkt die überlegene Farbe SUPERIOR[X] am besten (es kann sie kaum blocken). Gewählt wird unter den lebenden Monstern die Farbe, in der ich schon am weitesten bin (Magie und Karten), damit sich der Ausbau auf eine Richtung konzentriert.
function planElement(state, pid) {
  const p = state.players[pid], s = p.stats, alive = M.ELEMENTS.filter(e => M.monsterAlive(state.monsters[e]));
  if (!alive.length) return null;
  const ids = [...p.deck.draw, ...p.deck.discard, ...p.deck.hand.filter(Boolean)].map(c => c.id);
  let best = null;
  for (const x of alive) { const e = M.SUPERIOR[x], v = 2 * s.mag[e] + ids.filter(id => id[0] === e).length * 0.5; if (!best || v > best.v) best = { v, e }; }
  return best.e;
}
// ---- Eröffnungsstrategien (aus Spielerbeobachtung): 1 Limit zuerst, 2 Fokus auf eine Farbe, 3 zwei Richtungen ----
const stageBonusGold = (state) => { let g = 0; for (let i = 1; i <= state.stage; i++) g += state.rules.stageGold[i] || 0; return g; };
const looted = (state, s) => s.goldGot > stageBonusGold(state);   // schon Beute aus einem eigenen Sieg erhalten
// Farbe, in die ein Spieler zuerst investiert: viele Karten der Farbe auf der Hand, oder die dem geschwächtesten Monster überlegene Farbe
function focusScore(state, pid, e) {
  const p = state.players[pid], Q = P(pid), hand = p.deck.hand.filter(Boolean);
  let sc = Q.fHand * hand.filter(c => c.id[0] === e).length;
  for (const x of M.ELEMENTS) { const m = state.monsters[x]; if (M.monsterAlive(m) && M.SUPERIOR[x] === e) sc += Q.fWeak * (1 - m.stats.hp / m.stats.maxHp); }
  return sc + 0.01 * (e === planElement(state, pid));
}
function stratPlan(state, pid) {
  const all = state.aiPlan = state.aiPlan || {};
  let pl = all[pid]; if (pl) return pl;
  const Q = P(pid); let st = Q.strat;
  if (st === 4) { const hand = state.players[pid].deck.hand.filter(Boolean), mx = Math.max(...M.ELEMENTS.map(e => hand.filter(c => c.id[0] === e).length)); st = mx >= 2 ? 2 : 3; }
  pl = all[pid] = { st, els: [] };
  return pl;
}
const stratSlotLock = (state, p, pid) => { const Q = P(pid), pl = stratPlan(state, pid); return Q.sLock && ((pl.st === 2 && !looted(state, p.stats) && state.showdown === 0) || (pl.st === 3 && state.showdown === 0)); };
// Welche Verbesserung kauft die KI mit offenen Upgrade-Punkten? Liefert null, wenn sie auf den Limit-Schritt spart.
function pickSpend(p, state, pid) {
  const s = p.stats, Q = P(pid);
  const lc = M.limitStepCost(state, s);
  const canL = lc <= s.pending;
  const canM = M.manaStepCost(state, s) <= s.pending;
  const pl = stratPlan(state, pid);
  if (pl.st === 1 && s.limit < 2) return canL ? 'limit' : null;   // auf Ausspiellimit 2 sparen
  const noSlot = stratSlotLock(state, p, pid);
  const order = [
    ['limit', s.limit < Q.limitA && canL], ['slot', p.slots < Q.slotA], ['mana', s.maxMana < Q.manaA && canM], ['hp', s.maxHp < Q.hpA],
    ['limit', s.limit < Q.limitB && canL], ['slot', p.slots < Q.slotB], ['hp', true], ['mana', canM], ['limit', s.limit < M.MAX_LIMIT && canL],
  ];
  if (s.limit < Q.limitA && !canL && s.pending < lc) return null;   // auf den Limit-Schritt sparen
  for (const [w, ok] of order) if (ok && !(w === 'slot' && noSlot)) return w;
  return 'hp';
}
// Wirtschaftsaktion (Punkte ausgeben, Magie kaufen, Gold opfern); sie zählt als Aktion und beendet den Zug.
function ecoStep(state, pid) {
  const p = state.players[pid], s = p.stats, A = a => Object.assign({ pid }, a), Q = P(pid);
  if (s.pending > 0) { const w = pickSpend(p, state, pid); if (w) return A({ type: 'spend', what: w }); }
  const pl = stratPlan(state, pid);
  if (pl.st === 1 && s.limit < 2 && s.pending < M.limitStepCost(state, s)) {   // Tempel-Gold opfern, damit das Ausspiellimit sofort auf 2 geht
    const need = M.limitStepCost(state, s) - s.pending;
    for (let n = 1; n <= s.gold; n++) if (M.previewTemple(p, n).gained >= need) return A({ type: 'temple', amount: n });
  }
  const allIds = [...p.deck.draw, ...p.deck.discard, ...p.deck.hand.filter(Boolean)].map(c => c.id);
  const countEl = e => allIds.filter(id => id[0] === e).length;
  if ((pl.st === 2 || pl.st === 3) && state.showdown === 0) {   // Eröffnung: nur die gewählte(n) Farbe(n) auf Stufe 2
    const want = pl.st === 2 ? 1 : 2;
    if (pl.els.length < want && s.gold >= 1) {
      const ranked = M.ELEMENTS.filter(e => !pl.els.includes(e) && s.mag[e] < 2).sort((x, y) => focusScore(state, pid, y) - focusScore(state, pid, x));
      if (ranked.length && s.gold >= M.magicCost(state, s.mag[ranked[0]])) { pl.els.push(ranked[0]); return A({ type: 'magic', elem: ranked[0] }); }
    }
    const foc = pl.st === 2 ? pl.els[0] : null;   // Fokus: danach weiter in dieselbe Farbe (Stufe 3)
    if (foc && s.mag[foc] < M.MAX_MAGIC && s.gold >= M.magicCost(state, s.mag[foc])) return A({ type: 'magic', elem: foc });
    if (s.gold >= 2) return A({ type: 'temple', amount: Math.min(s.gold, 3) });
    return null;
  }
  const opp = state.players[1 - pid].stats, oppTop = M.ELEMENTS.slice().sort((x, y) => opp.mag[y] - opp.mag[x])[0];   // Aufbau des Gegners: seine stärkste Magie, und welche Farbe ihr überlegen ist
  const planEl = planElement(state, pid);
  let best = null;
  for (const e of M.ELEMENTS) { const cost = M.magicCost(state, s.mag[e]); if (s.mag[e] < M.MAX_MAGIC && s.gold >= cost) { const sc = Q.mBase - cost * Q.mCost + countEl(e) * Q.mCnt + (s.mag[e] === Math.max(s.mag.F, s.mag.E, s.mag.W) ? Q.mTop : 0) + (e === M.SUPERIOR[oppTop] ? Q.mCounter * opp.mag[oppTop] : 0) + (e === planEl ? Q.mPlan : 0) + Q.mCatch * Math.max(0, opp.mag[e] - s.mag[e]); if (!best || sc > best.sc) best = { sc, a: A({ type: 'magic', elem: e }) }; } }
  if (best) return best.a;
  if (s.gold >= 2) return A({ type: 'temple', amount: Math.min(s.gold, 3) });
  return null;
}

// Erwarteter Nettoschaden je Angriff gegen ein Monster (Schaden minus erwarteter Block); beste Angriffsfarbe zählt.
function outlook(state, pid, el) {
  const p = state.players[pid], s = p.stats, m = state.monsters[el], ms = m.stats;
  const mine = [...p.deck.draw, ...p.deck.discard, ...p.deck.hand.filter(Boolean)].map(c => M.parseCard(c.id)).filter(c => !c.curse);
  const mon = (m.deckIds || []).map(id => M.parseCard(id)).filter(c => !c.curse);
  const mlim = Math.max(1, ms.limit), handN = Math.min(mon.length, Math.max(3, mlim + 2)), r = mon.length ? handN / mon.length : 0;
  let best = 0;
  for (const e of M.ELEMENTS) {
    const mv = mine.filter(c => c.el === e).map(c => Math.min(c.tier, s.mag[e])).sort((a, b) => b - a).slice(0, Math.max(1, s.limit));
    const dmg = mv.reduce((a, b) => a + b, 0);
    let blk = 0;
    for (const col of [e, M.SUPERIOR[e]]) {
      const bv = mon.filter(c => c.el === col).map(c => Math.min(c.tier, ms.mag[col])).sort((a, b) => b - a);
      let eb = 0;
      for (let i = 0; i < Math.min(mlim, bv.length); i++) eb += bv[i] * Math.min(1, (bv.length - i) * r);
      blk = Math.max(blk, eb);
    }
    best = Math.max(best, dmg - blk);
  }
  return Math.max(0, best);
}
// Kampfprognose im Monsterkampf: Wie viele eigene Angriffszüge braucht jede Seite noch, bis die andere fällt? Nettoschaden je Angriff aus dem ganzen Kampfdeck
// (beste Farbe, abzüglich des erwarteten Blocks aus der Hand des Gegners); fehlendes Mana kostet zusätzliche Züge zum Erholen.
function netHit(as, ad, ds, dd) {
  const parse = d => [].concat(d.draw, d.discard, d.hand.filter(Boolean)).map(c => M.parseCard(c.id)).filter(c => !c.curse);
  const mine = parse(ad), theirs = parse(dd), dlim = Math.max(1, ds.limit), r = theirs.length ? Math.min(1, dd.hand.length / theirs.length) : 0;
  let best = 0;
  for (const e of M.ELEMENTS) {
    const dmg = mine.filter(c => c.el === e).map(c => Math.min(c.tier, as.mag[e])).sort((a, b) => b - a).slice(0, Math.max(1, as.limit)).reduce((a, b) => a + b, 0);
    let blk = 0;
    for (const col of [e, M.SUPERIOR[e]]) {
      const bv = theirs.filter(c => c.el === col).map(c => Math.min(c.tier, ds.mag[col])).sort((a, b) => b - a);
      let eb = 0; for (let i = 0; i < Math.min(dlim, bv.length); i++) eb += bv[i] * Math.min(1, (bv.length - i) * r);
      blk = Math.max(blk, eb);
    }
    best = Math.max(best, dmg - blk);
  }
  return Math.max(0, best);
}
function raceTurns(state, att, def) {
  const net = netHit(att.stats, att.deck, def.stats, def.deck);
  if (net <= 0) return 99;
  const hits = Math.ceil(def.stats.hp / net), cpa = Math.max(1, att.stats.limit), gain = M.recoverGain(state);
  return hits + Math.ceil(Math.max(0, hits * cpa - att.stats.mana) / gain);
}
// Kampfausgang aus der Prognose (logistisch angepasst an KI-Partien, d = Vorsprung in Zügen, positiv = ich bin schneller; ±6 gekappt).
// Angreifer am Zug gegen ein Monster ohne Mana bzw. Monster am Zug gegen einen Angreifer ohne Mana: { win, lose } aus meiner Sicht.
const sig = v => 1 / (1 + Math.exp(-v));
function fightOdds(d, asMonster) {
  d = Math.max(-6, Math.min(6, d));
  return asMonster ? { win: sig(0.92 + 0.22 * d), lose: sig(-1.51 - 0.29 * d) } : { win: sig(-0.78 + 0.23 * d), lose: sig(0.56 - 0.20 * d) };
}
// Pseudo-Kampfseiten für die Prognose außerhalb des Kampfes
const playerFighter = p => ({ stats: p.stats, deck: p.deck });
const monsterFighter = m => ({ stats: m.stats, deck: { draw: (m.deckIds || []).map(id => ({ id })), discard: [], hand: new Array(Math.max(3, m.stats.limit + 2)).fill(null) } });
function worldPlan(state, pid) {
  const p = state.players[pid], s = p.stats, d = p.deck, Q = P(pid);
  const A = a => Object.assign({ pid }, a);
  if (s.pending > 0) {
    const w = pickSpend(p, state, pid);
    if (w) return [A({ type: 'spend', what: w })];
  }
  const hand = handList(d), normals = hand.filter(h => !h.curse), curses = hand.filter(h => h.curse);
  const R = () => state.rng.random() * 0.6;
  const cands = [];
  const emptySlots = d.hand.filter(c => !c).length;
  const allIds = [...d.draw, ...d.discard, ...d.hand.filter(Boolean)].map(c => c.id);
  const countEl = e => allIds.filter(id => id[0] === e).length;

  if (canDraw(d)) cands.push({ score: Q.dBase + Q.dCurse * curses.length + (normals.length === 0 ? Q.dEmpty : 0) + emptySlots * Q.dSlot - (normals.length >= 3 ? Q.dNorm : 0) - (p.drawRed ? Q.dRed : 0) + R(), acts: [A({ type: 'draw' })] });
  if (p.drawRed && Q.dTmp && s.gold >= 1) cands.push({ score: Q.dTmp + R(), acts: [A({ type: 'temple', amount: 1 })] });   // roter Marker: 1 Gold im Tempel stellt ihn auf grün, statt dem Gegner beim Nachziehen Gold zu schenken
  if (p.drawRed && Q.dVen && s.gold < 1) {   // roter Marker ohne Gold: ein Gratis-Tausch beim Händler stellt ihn ebenfalls auf grün (sonst schenkt das Warten dem Gegner jede zweite Runde 1 Gold)
    const best = M.ELEMENTS.slice().sort((a, b) => s.mag[b] - s.mag[a]), free = M.vendorPlans(state, pid).filter(o => o.free).sort((a, b) => best.indexOf(a.result[0]) - best.indexOf(b.result[0]))[0];
    if (free) cands.push({ score: Q.dVen + R(), acts: [A({ type: 'vendor', result: free.result, cost: [] })] });
  }
  {
    const plans = M.vendorPlans(state, pid), mk = o => o.slots.map(sl => A({ type: 'mark', slot: sl }));
    // Wirksamer Wert einer Aufwertung: Eine Karte zählt höchstens mit dem Magielevel ihrer Farbe. Darüber (ohne bald erschwingliche Magie) kostet die Aufwertung nur Zeit.
    const planEl = planElement(state, pid);
    const worth = o => { const e = o.result[0], t = +o.result[1], soon = Q.vFut > 0 && s.gold >= M.magicCost(state, s.mag[e]) && s.mag[e] < M.MAX_MAGIC; return t * (t <= s.mag[e] || soon ? 1 : Q.vOver) * (e === planEl || !planEl ? 1 : Q.vOff); };
    const ups = plans.filter(o => !o.free).sort((a, b) => worth(b) - worth(a));
    if (ups.length) cands.push({ score: Q.vUp + worth(ups[0]) * Q.vUpW + R(), acts: [...mk(ups[0]), A({ type: 'vendor', result: ups[0].result, cost: ups[0].cost })] });
    else if (normals.length >= 1 && normals.length < 2 && allIds.length < 12) {
      const best = M.ELEMENTS.slice().sort((a, b) => s.mag[b] - s.mag[a])[0], free = plans.find(o => o.free && o.result === best + '1');
      if (free) cands.push({ score: 5 + R(), acts: [A({ type: 'vendor', result: best + '1', cost: [] })] });
    }
  }
  {
    const alive = M.ELEMENTS.filter(e => M.monsterAlive(state.monsters[e]));
    if (alive.length && s.hp >= Q.minHp && s.mana >= Q.minMana && normals.length >= 1) {
      let bestC = null;
      for (const target of alive) {
        const m = state.monsters[target], net = outlook(state, pid, target), hits = net > 0 ? m.stats.hp / net : 99;
        // Zeitdruck: Monster sind gemeinsam und die Beute geht an den Sieger. Kann der Gegner dieses Monster bald besiegen, lohnt es sich, ihm zuvorzukommen; wenige Monster übrig und hohe Beute erhöhen die Eile.
        const o = state.players[1 - pid].stats, oNet = o.hp >= Q.minHp && o.mana >= Q.minMana ? outlook(state, 1 - pid, target) : 0, oHits = oNet > 0 ? m.stats.hp / oNet : 99;
        const press = Q.tRace * Math.max(0, Q.tHorizon - oHits) + Q.tAlive * (3 - alive.length) + Q.tLoot * m.stats.gold;
        // Erschöpfung: Reicht mein Mana und meine Lebenskraft nicht für das ganze Monster, bleibt es angeschlagen zurück und der Gegner, der danach am Zug ist, kann es leicht besiegen (die Beute ginge an ihn).
        const atk = Math.max(0, Math.min(s.mana / Q.xCost, (s.hp - 1) / Q.xHp)), left = Math.max(0, m.stats.hp - net * atk), oFin = oNet > 0 ? left / oNet : 99;
        const steal = Q.xPen > 0 && left > 0 ? Q.xPen * Math.max(0, Math.min(1, (Q.xHor - oFin) / Q.xHor)) * Math.max(1, m.stats.gold) : 0;
        const risk = p.sp > 0 ? Q.sRisk * Math.min(1, left / Math.max(1, m.stats.hp)) : -Q.sZero;   // Siegpunkt-Risiko: reicht es nicht, verliere ich 1 Siegpunkt (bei 0 nichts)
        // Kampfprognose wie im Kampf: Gewinnt das Monster das Rennen, verliere ich (oder muss fliehen); Abschlag je Zug Rückstand
        let doom = 0;
        if (Q.fleeW > 0) { const me = { stats: s, deck: d }, mo = { stats: m.stats, deck: { draw: (m.deckIds || []).map(id => ({ id })), discard: [], hand: new Array(Math.max(3, m.stats.limit + 2)).fill(null) } }; doom = Math.max(0, raceTurns(state, me, mo) - raceTurns(state, mo, me)) * Q.fleeW; }
        const broke = p.drawRed && s.gold < 1 && !cands.some(c => c.acts.some(a => a.type !== 'draw')) ? Q.rAtk : 0;   // roter Marker, kein Gold, keine andere Aktion: lieber angreifen als dem Gegner mit dem Nachziehen Gold zu schenken
        const score = broke - doom - risk - steal - Q.oHits * Math.max(0, hits - Q.oFree) + Q.cBase + Q.cHp * (s.hp - 1) + Q.cMana * (s.mana - 2) + state.worldTurns * Q.cWt - m.stats.hp * Q.cMon + press + R();
        if (!bestC || score > bestC.score) bestC = { score, acts: [A({ type: 'combat', elem: target })] };
      }
      cands.push(bestC);
    }
  }
  if (!cands.length) return [A({ type: 'draw' })];
  cands.sort((a, b) => b.score - a.score);
  return cands[0].acts;
}

