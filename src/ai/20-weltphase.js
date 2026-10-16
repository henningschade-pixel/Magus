/* ---------- Weltphase ---------- */
// Welche Verbesserung kauft die KI mit offenen Upgrade-Punkten? Liefert null, wenn sie auf den Limit-Schritt spart.
function pickSpend(p, state, pid) {
  const s = p.stats, Q = P(pid);
  const lc = M.limitStepCost(state, s);
  const canL = lc <= s.pending;
  const canM = M.manaStepCost(state, s) <= s.pending;
  const order = [
    ['limit', s.limit < Q.limitA && canL], ['slot', p.slots < Q.slotA], ['mana', s.maxMana < Q.manaA && canM], ['hp', s.maxHp < Q.hpA],
    ['limit', s.limit < Q.limitB && canL], ['slot', p.slots < Q.slotB], ['hp', true], ['mana', canM], ['limit', s.limit < M.MAX_LIMIT && canL],
  ];
  if (s.limit < Q.limitA && !canL && s.pending < lc) return null;   // auf den Limit-Schritt sparen
  for (const [w, ok] of order) if (ok) return w;
  return 'hp';
}
// Bonusaktionen: Punkte ausgeben, Magie kaufen, Gold opfern; danach folgt die eigentliche Aktion des Zuges.
function ecoStep(state, pid) {
  const p = state.players[pid], s = p.stats, A = a => Object.assign({ pid }, a), Q = P(pid);
  if (s.pending > 0) { const w = pickSpend(p, state, pid); if (w) return A({ type: 'spend', what: w }); }
  if (!M.campAllowed(state, pid, 'temple')) return null;
  const allIds = [...p.deck.draw, ...p.deck.discard, ...p.deck.hand.filter(Boolean)].map(c => c.id);
  const countEl = e => allIds.filter(id => id[0] === e).length;
  let best = null;
  for (const e of M.ELEMENTS) { const cost = M.magicCost(state, s.mag[e]); if (s.mag[e] < M.MAX_MAGIC && s.gold >= cost) { const sc = Q.mBase - cost * Q.mCost + countEl(e) * Q.mCnt + (s.mag[e] === Math.max(s.mag.F, s.mag.E, s.mag.W) ? Q.mTop : 0); if (!best || sc > best.sc) best = { sc, a: A({ type: 'magic', elem: e }) }; } }
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
function worldPlan(state, pid) {
  const p = state.players[pid], s = p.stats, d = p.deck, camp = state.camp, Q = P(pid);
  const A = a => Object.assign({ pid }, a);
  if (s.pending > 0) {
    const w = pickSpend(p, state, pid);
    if (w) return [A({ type: 'spend', what: w })];
  }
  const hand = handList(d), normals = hand.filter(h => !h.curse), curses = hand.filter(h => h.curse);
  const ok = k => M.campAllowed(state, pid, k);
  const R = () => state.rng.random() * 0.6;
  const cands = [];
  const emptySlots = d.hand.filter(c => !c).length;
  const allIds = [...d.draw, ...d.discard, ...d.hand.filter(Boolean)].map(c => c.id);
  const countEl = e => allIds.filter(id => id[0] === e).length;

  if (ok('draw') && canDraw(d)) cands.push({ score: Q.dBase + Q.dCurse * curses.length + (normals.length === 0 ? Q.dEmpty : 0) + emptySlots * Q.dSlot - (normals.length >= 3 ? Q.dNorm : 0) + R(), acts: [A({ type: 'draw' })] });
  if (ok('vendor')) {
    const plans = M.vendorPlans(state, pid), mk = o => o.slots.map(sl => A({ type: 'mark', slot: sl }));
    const ups = plans.filter(o => !o.free).sort((a, b) => b.result[1] - a.result[1]);
    if (ups.length) cands.push({ score: Q.vUp + ups[0].result[1] * Q.vUpW + R(), acts: [...mk(ups[0]), A({ type: 'vendor', result: ups[0].result, cost: ups[0].cost })] });
    else if (normals.length >= 1 && normals.length < 2 && allIds.length < 12) {
      const best = M.ELEMENTS.slice().sort((a, b) => s.mag[b] - s.mag[a])[0], free = plans.find(o => o.free && o.result === best + '1');
      if (free) cands.push({ score: 5 + R(), acts: [A({ type: 'vendor', result: best + '1', cost: [] })] });
    }
  }
  if (!camp && curses.length && M.curses(state).discardAction) {   // nur im Fluchsystem „cards“
    const acts = curses.slice(0, Math.max(1, s.limit)).map(h => A({ type: 'mark', slot: h.slot }));
    acts.push(A({ type: 'discardCurses' }));
    cands.push({ score: 6 + curses.length * 4 + R(), acts });
  }
  if (!camp) {
    const alive = M.ELEMENTS.filter(e => M.monsterAlive(state.monsters[e]));
    if (alive.length && s.hp >= Q.minHp && s.mana >= Q.minMana && normals.length >= 1) {
      let bestC = null;
      for (const target of alive) {
        const m = state.monsters[target], net = outlook(state, pid, target), hits = net > 0 ? m.stats.hp / net : 99;
        const score = -Q.oHits * Math.max(0, hits - Q.oFree) + Q.cBase + Q.cHp * (s.hp - 1) + Q.cMana * (s.mana - 2) + state.worldTurns * Q.cWt - m.stats.hp * Q.cMon + R();
        if (!bestC || score > bestC.score) bestC = { score, acts: [A({ type: 'combat', elem: target })] };
      }
      cands.push(bestC);
    }
  }
  if (camp) {
    if (ok('recover')) cands.push({ score: 4 + (s.maxHp - s.hp) * 4 + (s.maxMana - s.mana) * 3 + R(), acts: [A({ type: 'recover' })] });
    if (ok('pass') && s.pending <= 0) cands.push({ score: 1, acts: [A({ type: 'pass' })] });
  }
  if (!cands.length) {
    if (camp) return [A({ type: 'pass' })];
    return [A({ type: 'draw' })];
  }
  cands.sort((a, b) => b.score - a.score);
  return cands[0].acts;
}

