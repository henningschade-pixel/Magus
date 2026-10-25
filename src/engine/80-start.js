/* Magus – Regelkern (Teil 8): Spielstart und Schnittstelle nach außen. */

// Regelwerte (Abstimmungs- und Variantenschalter). ‚curses‘: Fluchsystem, siehe 30-curses.js.
const DEFAULT_RULES = { priceRise: 1, startHp: 4, startLimit: 2, startSp: 2, surplusSp: 1, swapCosts: 1, limitCost: 2, limitFirstStepCost: 2, hpPerPoint: 2, stagePoints: [0, 1, 2, 3], stageGold: [0, 1, 2, 3], loserUp: 0, loserUp2: 0, winSp: 0, winSpFromShowdown: 2, monsterSp: 1, monsterLoot: 0, idleLimit: 0, drawMarker: 1, drawPenaltyGold: 1, drawLimitCost: [1, 1], lossHelp: 1, showdownSp: 1, lootBoth: true, recoverByStage: [1, 2, 3], regenByStage: [1, 2, 3], supply: 8, supply2: 6, supply3: 4, startCards: 0 };   // Jede gespielte Karte (auch Kombokarten) kostet 1 Mana, nur Verteidigung in der überlegenen Farbe ist gratis. recoverByStage: Mana-Gewinn von „Erholen“ im Kampf je Abschnitt

function newPlayer(state, name, ai, startIds) {
  const p = { name, ai: !!ai, stats: newStats(), temple: { points: 0, level: 0 }, sp: state.rules.startSp || 0, slots: MIN_SLOTS, drawRed: false, drawN: 0 };   // drawN: Nachziehvorgänge seit der letzten anderen Aktion (höchstens Nachziehlimit), drawRed: Marker rot
  p.stats.gold = 0;   // Das Spiel beginnt ohne Gold; Abschnittsboni kommen in newGame
  p.stats.maxHp = p.stats.hp = state.rules.startHp || 3;   // Start-HP der Spieler (Monster beginnen mit 3 und werden eigens abgestimmt)
  p.stats.limit = state.rules.startLimit || 1;   // Ausspiellimit zu Beginn (0.3: 2)
  p.deck = newDeck(state, startIds || START_DECK, MIN_SLOTS);
  return p;
}
// opts: seed, names, ai [bool, bool], first (Startspieler), rules (überschreibt DEFAULT_RULES)
function newGame(opts) {
  opts = opts || {};
  const seed = (opts.seed === undefined ? (Date.now() & 0x7fffffff) : opts.seed) >>> 0;
  const state = { rules: Object.assign({}, DEFAULT_RULES, opts.rules || {}), seed, rng: makeRng(seed), uid: 1, log: [], logN: 0, stage: 1, showdown: 0, phase: 'world', turn: 0, hist: [], combat: null, over: false, winner: null, worldTurns: 0, idleTurns: 0, combatTurnsTotal: 0 };
  const names = opts.names || ['Du', 'Gegner'];
  // Begrenzter Kartenvorrat (wie ein Brettspiel): von jeder der neun Karten gibt es ‚supply‘ Stück. Die Stufe-1-Karten werden gemischt, jeder Spieler erhält ‚startCards‘ davon (0 = alle, gleich viele je Spieler; daher ungleiche Startdecks), ein etwaiger Rest bleibt im Vorrat des Händlers.
  let deal = [null, null];
  if (state.rules.supply > 0) {
    const pool = []; ELEMENTS.forEach(e => { for (let i = 0; i < state.rules.supply; i++) pool.push(e + '1'); });
    state.rng.shuffle(pool);
    const half = Math.floor(pool.length / 2), n = state.rules.startCards > 0 ? Math.min(state.rules.startCards, half) : half;
    deal = [pool.slice(0, n), pool.slice(n, 2 * n)];
    state.supply = {}; ELEMENTS.forEach(e => [1, 2, 3].forEach(t => { state.supply[e + t] = [state.rules.supply, state.rules.supply2, state.rules.supply3][t - 1]; }));
    pool.slice(0, 2 * n).forEach(id => { state.supply[id]--; });
  }
  state.players = [newPlayer(state, names[0], opts.ai ? opts.ai[0] : false, deal[0]), newPlayer(state, names[1], opts.ai ? opts.ai[1] : true, deal[1])];
  state.monsters = spawnForGame(state, 1);
  state.turn = opts.first === undefined ? 0 : opts.first;
  const gp1 = (state.rules.stagePoints || [])[1] || 0, gg1 = (state.rules.stageGold || [])[1] || 0;
  state.players.forEach(p => { p.stats.pending += gp1; p.stats.gold += gg1; p.stats.upGot += gp1; p.stats.goldGot += gg1; });
  log(state, 'Abschnitt 1: Die Monster der Stufe I erscheinen.' + variantLog(state) + (gp1 || gg1 ? ' Jeder Spieler erhält ' + [gp1 ? gp1 + ' Upgrade-Punkt' + (gp1 > 1 ? 'e' : '') : '', gg1 ? gg1 + ' Gold' : ''].filter(Boolean).join(' und ') + '.' : ''));
  sample(state);
  return state;
}
// Führt eine Aktion aus: { pid, type, ... }. Antwort { ok } oder { ok:false, error }.
// Aufzeichnung für den Export: nur der eine Zustand, der mit record() angemeldet wurde (Klone der KI bleiben unberührt).
let RECSTATE = null;
function record(state) { RECSTATE = state; if (state) state.rec = []; }
function prim(o) { const r = {}; if (o) Object.keys(o).forEach(k => { const v = o[k]; if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') r[k] = v; }); return r; }
function snapshot(state) {
  const hand = d => d && d.hand ? d.hand.map(x => x ? x.id : null) : null;
  const s = { phase: state.phase, stage: state.stage, showdown: state.showdown, turn: state.turn, worldTurns: state.worldTurns,
    players: state.players.map(p => ({ name: p.name, sp: p.sp, stats: prim(p.stats), hand: hand(p.deck) })),
    monsters: state.monsters ? Object.keys(state.monsters).map(e => ({ elem: state.monsters[e].el, stats: prim(state.monsters[e].stats) })) : null };
  if (state.combat) { const c = state.combat; s.combat = { mode: c.mode, turn: c.turn, turns: c.turns, action: c.action, att: c.att, sides: ['a', 'b'].map(k => ({ ctrl: c.sides[k].ctrl, stats: prim(c.sides[k].stats), hand: hand(c.sides[k].deck) })) }; }
  return s;
}
function apply(state, a) {
  if (state !== RECSTATE) return applyInner(state, a);
  const pre = snapshot(state), n0 = state.logN, who = actor(state);
  const r = applyInner(state, a);
  if (r.ok) state.rec.push({ i: state.rec.length, actor: who, action: JSON.parse(JSON.stringify(a)), before: pre, logFrom: n0 + 1, logTo: state.logN, after: { phase: state.phase, over: state.over, winner: state.winner, sp: state.players.map(p => p.sp) } });
  return r;
}
function applyInner(state, a) {
  const r = applyCore(state, a);
  if (r.ok && !state.over) convertSurplus(state);
  return r;
}
function applyCore(state, a) {
  if (state.over) return fail('Das Spiel ist beendet.');
  if (!state.rules.drawMarker) return dispatch(state, a);
  const kind = markerKind(state, a), pid = a.pid !== undefined ? a.pid : actor(state), wasRed = kind === 'draw' && !!markerOf(state, pid).h.drawRed;
  const r = dispatch(state, a);
  if (r.ok && kind) drawMarkerAfter(state, pid, kind, wasRed);
  return r;
}
function dispatch(state, a) {
  if (state.phase === 'world') return applyWorld(state, a);
  if (state.phase === 'combat') return applyCombat(state, a);
  return fail('Keine Aktion möglich.');
}
// Nachziehmarker (je Spieler, grün/rot): Nachziehen dreht ihn auf rot, jede andere Zugaktion zurück auf grün; wer bei rotem Marker nachzieht, gibt dem Gegner eine Strafe (Weltphase: drawPenaltyGold Gold, Kampf: ein Nachziehtoken). Markieren, Sperren, Läuterungswahl und das Gratis-Nachziehen (Token) zählen nicht als Aktion.
function markerKind(state, a) {
  if (state.phase === 'world') return a.type === 'draw' ? 'draw' : ['vendor', 'temple', 'magic', 'spend', 'drawlimit', 'combat'].includes(a.type) ? 'other' : null;
  if (state.phase === 'combat') return a.type === 'draw' ? 'draw' : ['attack', 'defend', 'pass', 'recover', 'flee'].includes(a.type) ? 'other' : null;
  return null;
}
// Wem gehört der Nachziehmarker, wenn pid handelt? Dem Spieler, im Monsterkampf aber für die Seite des Monsters dem Monster (Limit: seine Stufe ‚Ziehen‘ = stats.drawLimit). { h: Halter von drawN/drawRed, lim: Limit }
function markerOf(state, pid) {
  const c = state.phase === 'combat' ? state.combat : null;
  if (c && c.mode === 'monster' && c.sides.b.ctrl === pid) { const m = c.sides.b.monster; return { h: m, lim: m.stats.drawLimit || 1 }; }
  const p = state.players[pid];
  return { h: p, lim: p.stats.drawLimit || 1 };
}
function drawMarkerAfter(state, pid, kind, wasRed) {
  const p = state.players[pid], mk = markerOf(state, pid), h = mk.h;
  if (kind === 'other') { h.drawRed = false; h.drawN = 0; return; }
  h.drawN = Math.min((h.drawN || 0) + 1, mk.lim); h.drawRed = h.drawN >= mk.lim;   // Nachziehlimit: so viele Nachziehvorgänge hintereinander sind frei, danach springt der Marker auf Rot
  if (!wasRed) return;
  const q = state.players[other(pid)];
  if (state.phase === 'combat' && state.combat) {
    const c = state.combat, opp = c.sides.a.ctrl === pid ? c.sides.b : c.sides.a;
    opp.stats.freeDraws = (opp.stats.freeDraws || 0) + 1;
    log(state, p.name + ' zog bei rotem Nachziehmarker nach: ' + opp.name + ' erhält ein Nachziehtoken.', pid);
  } else {
    const g = state.rules.drawPenaltyGold || 0;
    q.stats.gold += g; q.stats.goldGot += g;
    log(state, p.name + ' zog bei rotem Nachziehmarker nach: ' + q.name + ' erhält ' + g + ' Gold.', pid);
  }
}
// Wer ist gerade am Zug (Spieler-Index) oder null, wenn das Spiel vorbei ist.
function actor(state) {
  if (state.over) return null;
  if (state.phase === 'combat') return state.combat.forced ? state.combat.forced.pid : state.combat.sides[state.combat.turn].ctrl;   // Zerrüttung: erst wählt der Betroffene seine Abwurfkarten
  return state.turn;
}
function handCounts(d) { const c = {}; d.hand.forEach(x => { if (x) c[x.id] = (c[x.id] || 0) + 1; }); return c; }

return { ELEMENTS, SUPERIOR, NAMES, START_DECK, MAX_MAGIC, MAX_SLOTS, MIN_SLOTS, MAX_LIMIT, MAX_DRAW_LIMIT, DEFAULT_RULES, MONSTER,
  makeRng, parseCard, selection, newGame, apply, record, prim, actor, other, regen, handCounts,
  vendorOffers, vendorPlans, previewTemple, pointsForGold, nextLevelCost, limitStepCost, manaStepCost, hpStepCost, slotStepCost, magicCost, drawLimitCost, upField, magicField, payTxt,
  evalAttack, evalDefense, canFlee, stockOf, recoverGain, regenGain, comboLevels, levelsFor,
  mirrorOf, monsterAlive, monsterHand, markerOf, allMonstersDead, magicProgress, spawnMonsters, spawnForGame };
}));