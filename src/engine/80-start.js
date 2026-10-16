/* Magus – Regelkern (Teil 8): Spielstart und Schnittstelle nach außen. */

// Regelwerte (Abstimmungs- und Variantenschalter). ‚curses‘: Fluchsystem, siehe 30-curses.js.
// secondPlayerPending: Upgrade-Punkte, die der zweite Spieler als Ausgleich für den Startvorteil des ersten bekommt.
// controlMode: 'draw' (Control = S Gratis-Nachziehen) oder 'mirror' (Control = Spiegelmarker, siehe 50-combat.js).
// lifeflowMode 'any': S Marker beliebig vom Brett (eigene/gegnerische Fluch- und Spiegelmarker), je entferntem Marker 1 HP ('removed', Variante 'flat' = S HP).
// lifeflowMode: 'classic' (S HP heilen und S eigene Fluchmarker herunternehmen) oder 'choice' (S HP heilen und S Marker wegnehmen: eigene Fluchmarker oder die Spiegelmarker des Gegners).
// firstPlayerGold: zusätzliches Startgold für den Beginnenden (Ausgleich zum Vorteil des zweiten Spielers).
const DEFAULT_RULES = { magicCost: [0, 1, 3], limitCost: 2, ultiMode: 'death', limitFirstStepCost: 2, secondPlayerPending: 0, campActions: 0, showdownAttacker: 'behind', firstPlayerGold: 0, controlMode: 'mirror', comboMode: 'ordered', rmMode: 'discard', defenseCombos: true, mirrorDecay: 0, mirrorTrigger: 'any', mirrorFree: false, mirrorMult: 1, mirrorStep: 1, mirrorChoice: false, mirrorMana: 0, mirrorHeal: 0, hpPerPoint: 2, lifeflowMode: 'any', lifeflowDrawAll: true, lifeflowHealMode: 'flat', lifeflowHeal: 1, lifeflowMana: false, monsterVariants: true, monstersPerStage: 3, fightReset: true, fightCarry: true, stagePoints: [0, 1, 2, 3], stageGold: [0, 1, 2, 3], startGold: 0, secondPlayerGold: 0, loserStarts: true, loserUp: 1, loserUp2: 2, winSp: 4, freshHands: false, showdownRestore: false, lootShare: 0, lootPot: false, lifeflowDraw: 1, comboCardCost: 1, recoverByStage: [1, 2, 3], regenByStage: [1, 2, 3] };   // comboCardCost: jede gespielte Karte (auch Kombokarten) kostet 1 Mana, nur Verteidigung in der überlegenen Farbe ist gratis; recoverByStage: Mana-Gewinn von „Erholen“ im Kampf je Abschnitt

function newPlayer(state, name, ai) {
  const p = { name, ai: !!ai, stats: newStats(), temple: { points: 0, level: 0 }, sp: 0, slots: MIN_SLOTS };
  p.deck = newDeck(state, START_DECK, MIN_SLOTS);
  return p;
}
// opts: seed, names, ai [bool, bool], first (Startspieler), rules (überschreibt DEFAULT_RULES)
function newGame(opts) {
  opts = opts || {};
  const seed = (opts.seed === undefined ? (Date.now() & 0x7fffffff) : opts.seed) >>> 0;
  const state = { rules: Object.assign({}, DEFAULT_RULES, opts.rules || {}), seed, rng: makeRng(seed), uid: 1, log: [], logN: 0, stage: 1, showdown: 0, phase: 'world', turn: 0, camp: null, combat: null, over: false, winner: null, worldTurns: 0, combatTurnsTotal: 0 };
  COMBO_CARD_COST = state.rules.comboCardCost ? 1 : 0;
  const names = opts.names || ['Du', 'Gegner'];
  state.players = [newPlayer(state, names[0], opts.ai ? opts.ai[0] : false), newPlayer(state, names[1], opts.ai ? opts.ai[1] : true)];
  state.players.forEach(p => { p.stats.gold = state.rules.startGold; });
  state.monsters = spawnForGame(state, 1);
  state.turn = opts.first === undefined ? 0 : opts.first;
  state.players[other(state.turn)].stats.pending += state.rules.secondPlayerPending;
  state.players[state.turn].stats.gold += state.rules.firstPlayerGold;
  state.players[other(state.turn)].stats.gold += state.rules.secondPlayerGold;   // Ausgleich: der Beginnende startet mit mehr Gold
  const gp1 = (state.rules.stagePoints || [])[1] || 0, gg1 = (state.rules.stageGold || [])[1] || 0;
  state.players.forEach(p => { p.stats.pending += gp1; p.stats.gold += gg1; });
  log(state, 'Abschnitt 1: Die Monster der Stufe I erscheinen.' + variantLog(state) + (gp1 || gg1 ? ' Jeder Spieler erhält ' + [gp1 ? gp1 + ' Upgrade-Punkt' + (gp1 > 1 ? 'e' : '') : '', gg1 ? gg1 + ' Gold' : ''].filter(Boolean).join(' und ') + '.' : ''));
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
    monsters: state.monsters ? Object.keys(state.monsters).map(e => ({ elem: e, stats: prim(state.monsters[e].stats) })) : null };
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
  if (state.over) return fail('Das Spiel ist beendet.');
  if (state.phase === 'world') return applyWorld(state, a);
  if (state.phase === 'combat') return applyCombat(state, a);
  return fail('Keine Aktion möglich.');
}
// Wer ist gerade am Zug (Spieler-Index) oder null, wenn das Spiel vorbei ist.
function actor(state) {
  if (state.over) return null;
  if (state.phase === 'combat') return state.combat.forced ? state.combat.forced.pid : state.combat.sides[state.combat.turn].ctrl;   // Zerrüttung: erst wählt der Betroffene seine Abwurfkarten
  return state.turn;
}
function handCounts(d) { const c = {}; d.hand.forEach(x => { if (x) c[x.id] = (c[x.id] || 0) + 1; }); return c; }

return { ELEMENTS, SUPERIOR, NAMES, START_DECK, MAX_MAGIC, MAX_SLOTS, MIN_SLOTS, MAX_LIMIT, DEFAULT_RULES, MONSTER,
  makeRng, parseCard, selection, newGame, apply, record, prim, actor, other, regen, handCounts,
  vendorOffers, vendorPlans, previewTemple, pointsForGold, nextLevelCost, limitStepCost, manaStepCost, magicCost,
  evalAttack, evalDefense, recoverGain, regenGain, comboLevels, levelsFor, campAllowed,
  mirrorOf, mirrorCap, defaultMirrorEl, monsterAlive, allMonstersDead, magicProgress, spawnMonsters, spawnForGame };
}));