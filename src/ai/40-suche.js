/* ---------- Vorausschau im Kampf (seit 0.13) ---------- */
// Die Kampf-KI bis 0.12 bewertete jeden Zug einzeln mit festen Gewichten (combatPlan, „Basis-KI“). Was ein Kombo später bringt (Falle, Schild, Dauereffekte der Ultimates, Hellsicht, Echo), steckte nur als Schätzwert in diesen Gewichten.
// Seit 0.13 plant die KI voraus: Sie stellt alle Züge zusammen, die ihr die Regeln gerade erlauben (jede Kartenfolge samt Kombos, Erholen, Nachziehen mit Sperren, jede Verteidigung), und spielt jeden davon in mehreren möglichen Welten bis zum Kampfende durch. Gewählt wird der Zug mit dem besten mittleren Ausgang, gemessen in Siegpunkten.
// Fair bleibt sie dabei: Verdecktes (Hand, Zugstapel und Fallen des Gegners, die Reihenfolge des eigenen Zugstapels) kennt sie nicht; für jede Welt werden diese Karten neu gemischt. Bekannt ist nur, was auch ein Mensch am Tisch weiß (welche Karten der Gegner besitzt, was offen liegt oder abgelegt wurde).
// Im Durchspielen ziehen beide Seiten nach der Basis-KI. Die Zahl der Durchläufe verteilt ein Ausscheidungsverfahren: Nach jeder Runde fliegt die schwächere Hälfte der Züge raus, die übrigen werden in weiteren Welten genauer geprüft (alle Züge sehen dieselben Welten, damit der Zufall sie gleich trifft).
// Stellschrauben (SEARCH, für alle Plätze; setSearch): sim = Durchläufe je Entscheidung (0 = aus, dann spielt die Basis-KI; 120 gewann 48 von 48 Partien gegen die Basis-KI, 240 war gegen 60 nicht messbar besser), ms = Zeitgrenze je Entscheidung in Millisekunden (0 = keine; mit Zeitgrenze sind Partien nicht mehr wiederholbar), steps = Schritte, nach denen ein Durchlauf abgebrochen und geschätzt wird, cands = höchstens so viele Angriffsfolgen.
// Weltphase: world = Probekämpfe je Monster vor der Entscheidung, ein Monster anzugreifen (0 = Schätzformel der Basis-KI); thr = Mindestwert des Kampfs in Siegpunkten, thrWt = um so viel sinkt die Schwelle je Zug seit dem letzten Kampf (damit die Partie nicht stehen bleibt).
const SEARCH = { sim: 120, ms: 0, steps: 90, cands: 14, world: 0, thr: 0, thrWt: 0.05 };
const SV = (pid, k) => { const q = PARAMS[pid]; return q && q[k] !== undefined ? q[k] : SEARCH[k]; };   // je Platz überschreibbar (setParams), damit Fassungen gegeneinander spielen können
function setSearch(o) { if (o === null || o === undefined) return Object.assign({}, SEARCH); if (typeof o === 'number') o = { sim: o }; Object.assign(SEARCH, o); return Object.assign({}, SEARCH); }
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

// Kopie des Spielzustands zum Durchspielen: Verweise bleiben erhalten (die Kampfseiten zeigen auf die Werte und Decks der Spieler bzw. des Monsters); Protokoll, Verlauf und Aufzeichnung bleiben weg, der Zufall läuft mit eigenem Seed.
const SKIP = { log: 1, hist: 1, rec: 1, rng: 1, trace: 1, snap: 1 };
function cloneState(state, seed) {
  const seen = new Map();
  const cp = o => {
    if (o === null || typeof o !== 'object') return o;
    const s = seen.get(o); if (s) return s;
    if (Array.isArray(o)) { const a = new Array(o.length); seen.set(o, a); for (let i = 0; i < o.length; i++) a[i] = cp(o[i]); return a; }
    const r = {}; seen.set(o, r);
    for (const k in o) { if (SKIP[k]) continue; const v = o[k]; if (typeof v !== 'function') r[k] = cp(v); }
    return r;
  };
  const t = cp(state);
  t.log = []; t.hist = []; t.rng = M.makeRng(seed); t.keepSnap = false; t.sim = true;
  return t;
}
// Verdecktes neu mischen: mein Zugstapel in unbekannter Reihenfolge; beim Gegner Handkarten, Zugstapel und verdeckte Fallen aus allen Karten, die er dort haben kann. Offen liegende Hellsichtkarten, Sperren und der Ablagestapel bleiben, wie sie sind.
function hideInfo(t, pid, rng) {
  const c = t.combat; if (!c) return;
  const mine = c.sides.a.ctrl === pid ? c.sides.a : c.sides.b, opp = mine === c.sides.a ? c.sides.b : c.sides.a;
  const byId = (x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);   // vor dem Mischen sortieren: Das Ergebnis hängt dann nur davon ab, welche Karten verdeckt sind, nicht davon, wo sie wirklich liegen
  mine.deck.draw.sort(byId); rng.shuffle(mine.deck.draw);
  const d = opp.deck, base = M.baseLen(d), pool = d.draw.slice(), traps = opp.stats.traps || [], flags = [];
  for (let i = 0; i < base; i++) if (d.hand[i]) { flags[i] = !!d.hand[i].locked; pool.push(d.hand[i]); }
  traps.forEach(tr => pool.push(tr.card));
  pool.forEach(cd => { cd.locked = false; });
  pool.sort(byId); rng.shuffle(pool);
  for (const tr of traps) {   // eine Falle ist nie eine Fluchkarte
    let i = pool.findIndex(cd => !M.parseCard(cd.id).curse); if (i < 0) i = 0;
    const cd = pool.splice(i, 1)[0], pc = M.parseCard(cd.id);
    tr.card = cd; tr.el = pc.el; tr.tier = pc.tier;
  }
  for (let i = 0; i < base; i++) if (d.hand[i]) { const cd = pool.pop(); cd.locked = flags[i]; d.hand[i] = cd; }
  d.draw = pool; d.marks = [];
}

// Führt die erste Aktionsfolge aus, die die Engine annimmt (wie runTurn im Kampf).
function applyFirst(t, tries) {
  for (const acts of tries) {
    const c = t.combat, dk = c.forced ? null : c.sides[c.turn].deck, marks0 = dk ? dk.marks.slice() : null;
    let ok = true;
    for (const a of acts) { if (!M.apply(t, a).ok) { ok = false; break; } if (t.combat !== c) break; }
    if (ok) return true;
    if (dk && t.combat === c) dk.marks = marks0;
  }
  return false;
}
function baseTurn(t, pid) { return applyFirst(t, [combatPlan(t, pid)].concat(fallback(t, pid).map(a => [a]))); }

// Was der Kampf für pid wert ist (in Siegpunkten Vorsprung): Sieg und Niederlage nach den Regeln (Monster: Angreifer +1 bzw. −1, solange er Siegpunkte hat; Showdown ±1).
function stakes(state, pid) {
  const c = state.combat, opp = 1 - pid, has = q => (state.players[q].sp > 0 ? 1 : 0);
  if (c.mode === 'monster') return c.att === pid ? { win: 1, lose: -has(pid) } : { win: has(opp), lose: -1 };
  const s = state.rules.showdownSp || 0;
  return { win: s + Math.min(s, state.players[opp].sp), lose: -s - Math.min(s, state.players[pid].sp) };
}
function rollout(t, pid, ctx, c0) {
  let n = 0;
  while (t.combat === c0 && !t.over && n++ < SEARCH.steps) if (!baseTurn(t, M.actor(t))) break;
  const opp = 1 - pid;
  if (t.combat !== c0) {   // Kampf entschieden: Verschiebung der Siegpunkte, dazu ein kleiner Wert für das, was vom Spieler übrig ist (im Monsterkampf bleiben HP und Mana erhalten)
    let v = (t.players[pid].sp - t.players[opp].sp) - ctx.sp0;
    if (t.over) v += t.winner === pid ? 2 : t.winner === opp ? -2 : 0;
    if (ctx.mode === 'monster') { const a = t.players[ctx.att].stats, keep = 0.06 * a.hp / Math.max(1, a.maxHp) + 0.02 * a.mana / Math.max(1, a.maxMana); v += ctx.att === pid ? keep : -keep; }
    const lc = t.lastCombat;
    if (lc && !lc.winner && ctx.mode === 'monster') v += (ctx.att === pid ? 1 : -1) * 0.05 * ctx.monDmg(t);   // kein Sieger: Das Monster behält seine Verletzungen
    return v;
  }
  // abgebrochen: aus den verbliebenen HP schätzen
  const me = c0.sides.a.ctrl === pid ? c0.sides.a : c0.sides.b, op = me === c0.sides.a ? c0.sides.b : c0.sides.a;
  const p = Math.max(0, Math.min(1, 0.5 + 0.5 * (me.stats.hp / Math.max(1, me.stats.maxHp) - op.stats.hp / Math.max(1, op.stats.maxHp))));
  return p * ctx.st.win + (1 - p) * ctx.st.lose;
}

/* ---------- Zugkandidaten ---------- */
const cardKey = h => h.el + h.tier + (h.free ? 'f' : '');
// Läuterung: eigene Todesmarker, dann Schild, Mana- und Heilmarker des Gegners, zuletzt dessen Nachziehtokens (wie die Basis-KI)
function purgePicks(s, o, lvl) {
  const pick = [];
  for (let i = 0; pick.length < lvl && i < (s.death || 0); i++) pick.push('sd');
  for (let i = 0; pick.length < lvl && i < (o.rainbow || 0); i++) pick.push('or');
  for (let i = 0; pick.length < lvl && i < (o.manaflow || 0); i++) pick.push('om');
  for (let i = 0; pick.length < lvl && i < (o.heal || 0); i++) pick.push('oh');
  for (let i = 0; pick.length < lvl && i < (o.freeDraws || 0); i++) pick.push('ot');
  return pick;
}
// Alle unterscheidbaren Angriffe: jede Kartenauswahl bis zum Ausspiellimit, jede Primärfarbe und (bei drei Farben) jede Sekundärfarbe. Gleiche Karten auf verschiedenen Plätzen zählen einmal.
function attackOptions(state, side, opp, hand, A) {
  const stats = side.stats, lim = Math.max(1, stats.limit), opt = { combo: M.allowed(state, 'attack', 'combo') }, seen = new Set(), out = [];
  const normals = hand.filter(h => !h.curse);
  for (const sub of subsets(normals, lim)) {
    const els = [...new Set(sub.map(h => h.el))];
    for (const f of els) {
      const secs = els.length < 3 ? [null] : els.filter(e => e !== f);
      for (const sc of secs) {
        const ord = sub.filter(h => h.el === f).concat(sc ? sub.filter(h => h.el === sc) : [], sub.filter(h => h.el !== f && h.el !== sc));
        const key = f + (sc || '') + '|' + sub.map(cardKey).sort().join('');
        if (seen.has(key)) continue; seen.add(key);
        const ev = M.evalAttack(stats, ord, opt);
        if (!ev.valid || !ev.affordable) continue;
        const lv = M.levelsFor(ev), lvSum = lv.hs + lv.tr + lv.sh + lv.fe + lv.ew + lv.gh, dmg = ev.prim ? ev.damage : 0;
        if (ord.length > 1 && els.length > 1 && lvSum === 0 && !(lv.ulti > 0)) continue;   // zweite Farbe ohne Kombo: verschenkte Karte
        const acts = ord.map(h => A({ type: 'mark', slot: h.slot }));
        if (!(lv.ulti > 0) && lv.ew > 0) acts.push(A({ type: 'lfp', pick: purgePicks(stats, opp.stats, lv.ew) }));
        acts.push(A({ type: 'attack' }));
        const sig = f + '>' + (lv.ulti > 0 ? 'U' + ev.ultiEl : ev.ord && lvSum ? ev.ord.key : '-');
        out.push({ acts, kind: 'attack', sig, prior: (dmg >= opp.stats.hp ? 50 : 0) + dmg * 1.2 + lvSum * 1.5 + (lv.ulti > 0 ? 2 + lv.ulti * 2 : 0) - ev.cost * 0.6 });
      }
    }
  }
  // zu viele: von jeder Art (Primärfarbe und Kombo) der beste Vertreter, dann nach Vorbewertung auffüllen
  out.sort((x, y) => y.prior - x.prior);
  if (out.length <= SEARCH.cands) return out;
  const keep = [], sigs = new Set();
  for (const o of out) if (!sigs.has(o.sig)) { sigs.add(o.sig); keep.push(o); }
  for (const o of out) { if (keep.length >= SEARCH.cands) break; if (!keep.includes(o)) keep.push(o); }
  return keep.slice(0, Math.max(SEARCH.cands, sigs.size));
}
// Nachziehen mit Sperren: nichts behalten, eine Karte behalten, zwei Karten behalten (Kombo-Bausteine)
function drawOptions(d, hand, lim, type, A) {
  const out = [], seen = new Set(), normals = hand.filter(h => !h.curse && !h.free && h.slot < M.baseLen(d));
  const sets = [[]];
  normals.forEach(h => sets.push([h]));
  if (lim >= 2) for (let i = 0; i < normals.length; i++) for (let j = i + 1; j < normals.length; j++) sets.push([normals[i], normals[j]]);
  const filled = d.hand.slice(0, M.baseLen(d)).filter(Boolean).length;
  for (const S of sets) {
    if (S.length && S.length >= filled && filled >= M.baseLen(d)) continue;   // alles gesperrt und kein Platz frei: nichts zu tauschen
    const key = S.map(cardKey).sort().join('');
    if (seen.has(key)) continue; seen.add(key);
    const acts = [], slots = S.map(h => h.slot);
    d.hand.forEach((cd, slot) => { if (cd && slot < M.baseLen(d) && !!cd.locked !== slots.includes(slot)) acts.push(A({ type: 'lock', slot })); });
    acts.push(A({ type }));
    out.push({ acts, kind: type, prior: -S.length });
  }
  return out;
}
function defenseOptions(state, side, hand, A) {
  const c = state.combat, s = side.stats, opt = { combo: M.allowed(state, 'defense', 'combo') }, seen = new Set(), out = [];
  const cand = hand.filter(h => !h.curse);
  for (const sub of subsets(cand, Math.max(1, s.limit))) {
    const els = [...new Set(sub.map(h => h.el))];
    for (const f of els) {
      if (f !== c.color && f !== M.SUPERIOR[c.color]) continue;
      const secs = els.length < 3 ? [null] : els.filter(e => e !== f);
      for (const sc of secs) {
        const ord = sub.filter(h => h.el === f).concat(sc ? sub.filter(h => h.el === sc) : [], sub.filter(h => h.el !== f && h.el !== sc));
        const key = f + (sc || '') + '|' + sub.map(cardKey).sort().join('');
        if (seen.has(key)) continue; seen.add(key);
        const ev = M.evalDefense(s, ord, c.color, opt);
        if (!ev.valid || ev.affordable === false) continue;
        const combo = (ev.ord && ev.ord.lvl > 0) || (ev.levels && ev.levels.ulti > 0);
        if (els.length > 1 && !combo) continue;
        const acts = ord.map(h => A({ type: 'mark', slot: h.slot }));
        if (ev.ord && ev.ord.key === 'gr' && ev.ord.lvl > 0) acts.push(A({ type: 'lfp', pick: purgePicks(s, c.sides[c.turn === 'a' ? 'b' : 'a'].stats, ev.ord.lvl) }));
        acts.push(A({ type: 'defend' }));
        out.push({ acts, kind: 'defend', prior: Math.min(ev.block || 0, c.pending) * 1.5 + (combo ? 1.5 : 0) - (ev.cost || 0) * 0.6 });
      }
    }
  }
  out.sort((x, y) => y.prior - x.prior);
  return out.slice(0, SEARCH.cands + 4);
}
function combosOf(n, k) { const res = []; const rec = (i, cur) => { if (cur.length === k) { res.push(cur.slice()); return; } for (let j = i; j < n; j++) { cur.push(j); rec(j + 1, cur); cur.pop(); } }; rec(0, []); return res; }
function candidates(state, pid) {
  const c = state.combat, A = a => Object.assign({ pid }, a);
  if (c.forced) {
    if (c.forced.pid !== pid) return [];
    const cs = c.forced.cards, ok = cs.map((cd, i) => M.parseCard(cd.id).curse ? -1 : i).filter(i => i >= 0), seen = new Set(), out = [];
    if (c.forced.kind === 'trap') { for (const i of ok) { if (seen.has(cs[i].id)) continue; seen.add(cs[i].id); out.push({ acts: [A({ type: 'fd', slots: [i] })], kind: 'fd', prior: 0 }); } return out; }
    if (c.forced.kind !== 'sight') return [];
    for (const pick of combosOf(ok.length, c.forced.n)) {
      const idx = pick.map(j => ok[j]), key = idx.map(i => cs[i].id).sort().join('');
      if (seen.has(key)) continue; seen.add(key);
      out.push({ acts: [A({ type: 'fd', pick: cs.map((cd, i) => idx.includes(i) ? 'k' : 'a') })], kind: 'fd', prior: 0 });
    }
    return out;
  }
  const side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  if (side.ctrl !== pid) return [];
  const d = side.deck, s = side.stats, hand = handList(d), out = [];
  const payOk = s.mana >= M.drawManaCost(state, pid), drawable = canDraw(d) && payOk;
  // Leere Hand (seit 0.13.4): Mana lässt sich ohne Karten nicht einsetzen, Karten ohne Mana aber schon (Verteidigung in der überlegenen Farbe ist gratis). Kann die Seite nachziehen, stehen deshalb nur die Nachzieh-Züge zur Wahl, Erholen und Passen entfallen.
  const emptyDraw = phase => { if (hand.length) return null; const o = []; if (M.allowed(state, phase, 'draw') && drawable) o.push({ acts: [A({ type: 'draw' })], kind: 'draw', prior: 0 }); if (phase === 'attack' && s.freeDraws > 0 && canDraw(d)) return [{ acts: [A({ type: 'freeDraw' })], kind: 'freeDraw', prior: 1 }]; return o.length ? o : null; };   // ein Gratis-Nachziehen kostet keine Aktion und geht deshalb vor
  const onlyDraw = emptyDraw(c.action === 'attack' ? 'attack' : 'defense');
  if (onlyDraw) return onlyDraw;
  if (c.action === 'attack') {
    if (M.allowed(state, 'attack', 'attack')) out.push(...attackOptions(state, side, opp, hand, A));
    if (M.allowed(state, 'attack', 'recover') && s.mana < s.maxMana) out.push({ acts: [A({ type: 'recover' })], kind: 'recover', prior: 0 });
    else if (M.allowed(state, 'attack', 'pass')) out.push({ acts: [A({ type: 'pass' })], kind: 'pass', prior: 0 });
    else if (M.allowed(state, 'attack', 'recover')) out.push({ acts: [A({ type: 'recover' })], kind: 'recover', prior: 0 });
    if (M.allowed(state, 'attack', 'draw') && drawable) out.push(...drawOptions(d, hand, s.limit, 'draw', A));
    if (s.freeDraws > 0 && canDraw(d)) out.push(...drawOptions(d, hand, s.limit, 'freeDraw', A));
    return out;
  }
  if (c.pending > 0) {
    if (M.allowed(state, 'defense', 'defend')) out.push(...defenseOptions(state, side, hand, A));
    if (M.allowed(state, 'defense', 'pass')) out.push({ acts: [A({ type: 'pass' })], kind: 'pass', prior: 0 });
    if (M.allowed(state, 'defense', 'recover') && s.mana < s.maxMana) out.push({ acts: [A({ type: 'recover' })], kind: 'recover', prior: 0 });
    if (M.allowed(state, 'defense', 'draw') && drawable) out.push({ acts: [A({ type: 'draw' })], kind: 'draw', prior: 0 });
    return out;
  }
  // Reaktion ohne Angriff
  if (M.allowed(state, 'defense', 'draw') && drawable) out.push(...drawOptions(d, hand, s.limit, 'draw', A));
  if (M.allowed(state, 'defense', 'recover') && s.mana < s.maxMana) out.push({ acts: [A({ type: 'recover' })], kind: 'recover', prior: 0 });
  out.push({ acts: [A({ type: 'pass' })], kind: 'pass', prior: 0 });
  return out;
}

/* ---------- Auswahl ---------- */
function seedOf(state, pid) { const c = state.combat; return ((state.seed >>> 0) ^ Math.imul((state.logN | 0) + 1, 0x9E3779B1) ^ Math.imul((c ? c.turns : 0) + 7 + pid * 131, 0x85EBCA6B)) >>> 0; }
function searchPlan(state, pid) {
  const base = combatPlan(state, pid), sim = SV(pid, 'sim');
  if (!(sim > 0)) return base;
  if (base.length && base[0].type === 'flee') return base;   // Fliehen (abschaltbare Regel) entscheidet weiter die Basis-KI
  let cands;
  try { cands = candidates(state, pid); } catch (e) { return base; }
  if (cands.length < 2) return cands.length ? cands[0].acts : base;
  // der Zug der Basis-KI ist immer dabei (als Rückhalt, falls die Aufzählung ihn nicht enthält)
  const sigA = acts => acts.map(a => a.type + (a.slot !== undefined ? a.slot : '') + (a.pick ? a.pick.join('') : '') + (a.slots ? a.slots.join('') : '')).join(',');
  const have = new Set(cands.map(k => sigA(k.acts)));
  if (!have.has(sigA(base))) cands.push({ acts: base, kind: 'base', prior: 99 });
  const c = state.combat, seed0 = seedOf(state, pid), t0 = now();
  const ctx = { sp0: state.players[pid].sp - state.players[1 - pid].sp, mode: c.mode, att: c.att, st: stakes(state, pid), monHp0: c.mode === 'monster' ? c.sides.b.stats.hp : 0 };
  ctx.monDmg = t => { const m = t.monsters && t.monsters[c.slot]; return m && m.stats.hp > 0 ? Math.max(0, ctx.monHp0 - m.stats.hp) / Math.max(1, m.stats.maxHp || ctx.monHp0 || 1) : 0; };
  const worlds = [];
  const world = w => { if (!worlds[w]) { const sd = (seed0 + Math.imul(w + 1, 0x27D4EB2F)) >>> 0, t = cloneState(state, sd); hideInfo(t, pid, M.makeRng(sd ^ 0x5bd1e995)); worlds[w] = { t, sd }; } return worlds[w]; };
  cands.forEach(k => { k.sum = 0; k.n = 0; k.bad = false; });
  const run = (k, w) => {
    const W = world(w), t = cloneState(W.t, (W.sd + 1) >>> 0), cc = t.combat;
    if (!cc.forced) cc.sides[cc.turn].deck.marks = [];
    let ok = true;
    for (const a of k.acts) { if (!M.apply(t, a).ok) { ok = false; break; } if (t.combat !== cc) break; }
    if (!ok) { k.bad = true; k.sum -= 99; k.n++; return; }
    k.sum += rollout(t, pid, ctx, cc); k.n++;
  };
  let alive = cands.slice(), done = 0, left = sim, out = false;
  const rounds = Math.max(1, Math.ceil(Math.log2(alive.length)));
  for (let r = 0; r < rounds && alive.length > 1 && !out; r++) {
    const per = Math.max(2, Math.floor(left / ((rounds - r) * alive.length)) || 0);
    for (let w = done; w < done + per && !out; w++) {
      for (const k of alive) if (!k.bad) run(k, w);
      if (SEARCH.ms > 0 && now() - t0 > SEARCH.ms) out = true;
    }
    left -= per * alive.length; done += per;
    alive = alive.filter(k => !k.bad);
    alive.sort((x, y) => y.sum / y.n - x.sum / x.n || y.prior - x.prior);
    if (!out) alive = alive.slice(0, Math.max(1, Math.ceil(alive.length / 2)));
    else alive = alive.slice(0, 1);
  }
  const best = alive[0];
  if (SEARCH.debug) SEARCH.last = { ms: now() - t0, cands: cands.map(k => ({ kind: k.kind, acts: sigA(k.acts), n: k.n, v: k.n ? +(k.sum / k.n).toFixed(3) : null })), pick: best ? sigA(best.acts) : null };
  return best && !best.bad ? best.acts : base;
}

/* ---------- Weltphase: Probekämpfe ---------- */
// Wert eines Angriffs auf das Monster el für pid (in Siegpunkten, wie in der Kampfsuche): Der Kampf wird n-mal mit frisch gemischten Decks durchgespielt (beide Seiten nach der Basis-KI). { v: Mittelwert, win: Anteil der Siege, lose: Anteil der Niederlagen }
function combatOdds(state, pid, el, n) {
  const seed0 = (seedOf(state, pid) ^ (el.charCodeAt(0) * 2654435761)) >>> 0;
  let sum = 0, win = 0, lose = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    const t = cloneState(state, (seed0 + Math.imul(i + 1, 0x27D4EB2F)) >>> 0);
    t.players[pid].deck.marks = [];
    if (!M.apply(t, { pid, type: 'combat', elem: el }).ok) break;
    const cc = t.combat, ctx = { sp0: state.players[pid].sp - state.players[1 - pid].sp, mode: 'monster', att: pid, st: stakes(t, pid), monHp0: cc.sides.b.stats.hp };
    ctx.monDmg = u => { const m = u.monsters && u.monsters[el]; return m && m.stats.hp > 0 ? Math.max(0, ctx.monHp0 - m.stats.hp) / Math.max(1, m.stats.maxHp || ctx.monHp0 || 1) : 0; };
    sum += rollout(t, pid, ctx, cc); cnt++;
    const lc = t.lastCombat; if (t.combat !== cc && lc) { if (lc.winner === 'a') win++; else if (lc.winner === 'b') lose++; }
  }
  return cnt ? { v: sum / cnt, win: win / cnt, lose: lose / cnt, n: cnt } : null;
}
