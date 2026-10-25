/* Magus – Regelkern (Teil 3): Monster. Jeder Abschnitt hat je Element ein Monster.
   Die Werte sind Abstimmungsdaten (abgestimmt mit tools/sim-monster-stufen.js gegen skriptierte Spielerbauten);
   die Monster werden im Kampf vom Gegenspieler gesteuert. */

// Startdeck jedes Monsters: das Startdeck mit Karten des Elements auf Stufe 2 (Anzahl: ‚upgrades‘).
// Tempel-Verbesserungen: Stufe I ‚stage1Temple‘ (nur dort), danach je Stufe die Liste ‚temple[stufe][element]‘.
// Grundwerte je Stufe (Version 0.3.1, neu abgestimmt auf Spieler mit Ausspiellimit 2 von Anfang an; Messung mit tools/balance/monster-tune.js); seit 0.4 kommen Deckform und zwei Würfel dazu (variants):
//   Stufe I   3 HP, Mana 5 (Erdmonster 6), Limit 2, Startdeck mit 3 Karten des eigenen Elements auf Stufe 2
//   Stufe II  4 HP, Mana 5, Limit 3
//   Stufe III 6 HP, Mana 6, Limit 4 (0.3.2: 8 HP waren mit den höheren Einnahmen zu hart, 48 % Niederlagen)
// Das Limit steigt nur dort, wo es gewollt ist: Ein Monster mit Limit 2 und vielen HP verwickelt den Angreifer in endlose Angriffe und Fluchten (bis 27 Angriffe je Partie), erst Limit 3 gibt ihm die nötige Gefahr.
const MONSTER = {
  profile: { F: { primary: 'F', secondary: 'E' }, E: { primary: 'E', secondary: 'W' }, W: { primary: 'W', secondary: 'F' } },
  stage1Temple: { F: ['mana'], E: ['mana', 'mana'], W: ['mana'] },   // Stufe I: Mana 5 (Erdmonster 6; sonst verlor es die Angreifer nur halb so oft)
  temple: { 2: { F: ['limit', 'hp', 'mana'], E: ['limit', 'hp', 'mana'], W: ['limit', 'hp', 'mana'] }, 3: { F: ['limit', 'hp', 'hp', 'mana'], E: ['limit', 'hp', 'hp', 'mana'], W: ['limit', 'hp', 'hp', 'mana'] } },   // Schritte je Stufe (Stufe III kommt auf Stufe II obendrauf): II = Limit 3, 4 HP, Mana 5; III = Limit 4, 6 HP, Mana 6
  magic: { 2: [3, 2, 1], 3: [3, 2, 1] },                                  // Stufen von Haupt-, Neben- und drittem Element
  deck: {
    2: (P, S, T) => [P + '3', P + '2', P + '2', P + '2', S + '3', S + '2', T + '1', T + '1', P + '1'],
    3: (P, S, T) => [P + '3', P + '3', P + '3', P + '2', P + '2', S + '3', S + '3', T + '2', T + '1'],
  },
  // Varianten (seit 0.4): Je Element gibt es zwei Formen, spitz und breit (6 mögliche Monster je Stufe, davon erscheinen drei: je Element eine Form, gewürfelt).
  // Folgemagie (S): Jedes Deck enthält mindestens eine Karte der Folgemagie eine Stufe über der Magie des Monsters (Stufe I: S2 bei Magie 1, Stufe II/III: S3 bei Magie 2). Sie wirkt normalerweise nur mit der Magie (also wie die Stufe darunter) und wird erst durch die Magiestufe des Pluswürfels voll nutzbar.
  // Dazu kommen zwei Würfel: der Pluswürfel macht das Monster stärker, der Minuswürfel schwächer (gleich starke Ausschläge, die Gesamtstärke bleibt). Die Ausschläge wachsen mit der Stufe: Spalten = Stufe I, II, III.
  variants: {
    deck: {   // Deckformen. Index 0 = Grundform (nur für die feste Form ohne Würfel), 1 = breit (mehr Nebenelement), 2 = spitz (stärkere Spitze, schwächere Basis)
      1: [null, (P, S, T) => [P + '2', P + '2', P + '1', P + '1', S + '2', S + '1', S + '1', T + '1', T + '1'], (P, S, T) => [P + '2', P + '2', P + '2', P + '2', P + '1', P + '1', S + '2', S + '1', S + '1']],
      2: [null, (P, S, T) => [P + '3', P + '2', P + '2', S + '3', S + '2', S + '2', T + '1', T + '1', P + '1'], (P, S, T) => [P + '3', P + '3', P + '1', P + '1', S + '3', S + '2', S + '2', T + '1', T + '1']],
      3: [null, (P, S, T) => [P + '3', P + '3', P + '3', P + '2', S + '3', S + '3', S + '2', T + '2', T + '1'], (P, S, T) => [P + '3', P + '3', P + '3', P + '3', P + '1', S + '3', S + '3', T + '2', T + '1']],
    },
    // Die Würfel: sechs Seiten je Würfel, jede Seite ein Wert und sein Ausschlag je Stufe (n: Stufe I, II, III).
    dice: {   // k: Wert, n: Ausschlag je Stufe (seit der Überarbeitung in allen Stufen gleich). Der Minuswürfel dreht das Vorzeichen um; die sechste Seite ist leer. Seit 0.5 trägt der Pluswürfel statt „Limit“ die Seite „mag“: eine Magiestufe mehr auf der Folgemagie des Monsters (Nebenelement seines Profils: Feuer → Erde, Erde → Wasser, Wasser → Feuer)
      plus:  [{ k: 'hp', n: [1, 1, 1] }, { k: 'mana', n: [1, 1, 1] }, { k: 'mag', n: [1, 1, 1] }, { k: 'draws', n: [1, 1, 1] }, { k: 'hand', n: [1, 1, 1] }, { k: 'none', n: [0, 0, 0] }],
      minus: [{ k: 'hp', n: [1, 1, 1] }, { k: 'mana', n: [1, 1, 1] }, { k: 'limit', n: [1, 1, 1] }, { k: 'draws', n: [1, 1, 1] }, { k: 'hand', n: [1, 1, 1] }, { k: 'none', n: [0, 0, 0] }],
    },
    diceNames: { hp: 'HP', mana: 'Mana', limit: 'Limit', mag: 'Magie', hand: 'Hand', draws: 'Ziehen' },
    diceHints: {
      hp: 'maximale Lebenspunkte',
      mana: 'maximales Mana',
      limit: 'Ausspiellimit (Karten je Zug)',
      mag: 'Magiestufe der Folgemagie des Monsters: Feuer → Erde, Erde → Wasser, Wasser → Feuer',
      hand: 'Handkarten',
      draws: 'Ziehen: Nachziehlimit (so oft hintereinander nachziehen, bevor der Marker auf Rot springt)',
    },
  },
  upgrades: { F: 3, E: 3, W: 3 },   // Karten des Startdecks, die auf Stufe 2 gehoben werden (nur Abschnitt I); mindestens eine, weil das Monster seine Hauptmagie auf Stufe 2 hat (ohne passende Karte wäre sie wertlos)
  startDraws: 2,                                                          // Ziehen = Nachziehlimit des Monsters (1 bis MAX_DRAW_LIMIT): so oft darf es hintereinander nachziehen, bevor sein Marker auf Rot springt; Grundwert, die Würfel verändern ihn
  startLimit: 2,                                                          // Ausspiellimit aller Monster vor den Tempel-Schritten (Spieler starten seit 0.3 mit 2; hier wird neu abgestimmt)
  gold: { 1: 1, 2: 2, 3: 3 },                                              // Beute
  names: { F: 'Feuermonster', E: 'Erdmonster', W: 'Wassermonster' },   // Grundform (ohne Würfel)
  formNames: { F: ['', 'Feuer-Generalist', 'Feuer-Spezialist'], E: ['', 'Erd-Generalist', 'Erd-Spezialist'], W: ['', 'Wasser-Generalist', 'Wasser-Spezialist'] },   // Index = Deckform: 1 breit (Generalist), 2 spitz (Spezialist)
};
const STAGE_NUMERAL = ['', 'I', 'II', 'III'];

// Würfelseite auf ein Monster anwenden (sign +1 = Pluswürfel, −1 = Minuswürfel). ‚ids‘ ist das Deck (wird verändert).
function applyDie(stats, face, sign, stage, el) {
  const n = face.n[stage - 1] * sign, k = face.k;
  if (k === 'hp') { stats.maxHp = Math.max(1, stats.maxHp + n); stats.hp = stats.maxHp; }
  else if (k === 'mana') { stats.maxMana = Math.max(1, stats.maxMana + n); stats.mana = stats.maxMana; }
  else if (k === 'limit') stats.limit = Math.min(MAX_LIMIT, Math.max(1, stats.limit + n));   // bis auf 1, nie auf 0 (Achtung: Limit 1 führt in Stufe I oft zu Patts, siehe Regelwerk)
  else if (k === 'mag') { const e = MONSTER.profile[el].secondary; stats.mag[e] = Math.min(MAX_MAGIC, Math.max(1, stats.mag[e] + n)); }   // Folgemagie des Monsters (Nebenelement seines Profils)
  else if (k === 'hand') stats.handExtra = (stats.handExtra || 0) + n;
  else if (k === 'draws') stats.drawLimit = Math.min(MAX_DRAW_LIMIT, Math.max(1, stats.drawLimit + n));
}
// v: gewürfelte Variante { d: Deckform (1 breit, 2 spitz), pl: Seite des Pluswürfels 0–5, mi: Seite des Minuswürfels 0–5 }; ohne v die feste Grundform (ohne Würfel).
function spawnOne(el, stage, rng, v) {
  const M = MONSTER, deck = START_DECK.slice(), V = M.variants;
  v = v || { d: 0, pl: -1, mi: -1 };
  for (let i = 0, src = SUPERIOR[el] + '1'; i < (M.upgrades[el] === undefined ? 2 : M.upgrades[el]); i++) { const idx = deck.indexOf(src); if (idx < 0) break; deck[idx] = el + '2'; }
  const stats = newStats();
  { const sIdx = deck.indexOf(M.profile[el].secondary + '1'); if (sIdx >= 0) deck[sIdx] = M.profile[el].secondary + '2'; }   // Folgemagie: eine Karte eine Stufe über der Magie (wirkt erst mit dem Magiebonus des Pluswürfels)
  stats.limit = M.startLimit;
  stats.drawLimit = M.startDraws;
  stats.mag[el] = 2;
  if (stage === 1) M.stage1Temple[el].forEach(f => applyTemple(stats, f));   // ab Stufe II zählen nur die Schritte von ‚temple‘
  stats.gold = M.gold[1];
  const prof = M.profile[el];
  const P = prof.primary, S = prof.secondary, T = ELEMENTS.find(e => e !== P && e !== S);
  let finalDeck = deck;
  if (stage === 1 && v.d && V.deck[1][v.d]) finalDeck = V.deck[1][v.d](P, S, T);
  for (let st = 2; st <= stage; st++) {
    const m = M.magic[st];
    stats.mag[P] = Math.max(stats.mag[P], m[0]); stats.mag[S] = Math.max(stats.mag[S], m[1]); stats.mag[T] = Math.max(stats.mag[T], m[2]);
    M.temple[st][el].forEach(f => {
      if (f === 'limit' && stats.limit >= MAX_LIMIT) f = 'hp';
      applyTemple(stats, f);
    });
    finalDeck = (st === stage && V.deck[st][v.d]) ? V.deck[st][v.d](P, S, T) : M.deck[st](P, S, T);
    stats.gold = M.gold[st];
  }
  finalDeck = finalDeck.slice();
  const base = { maxHp: stats.maxHp, maxMana: stats.maxMana, limit: stats.limit, drawLimit: stats.drawLimit, hand: Math.max(2, Math.max(MIN_SLOTS, stats.limit + 2)) };   // Standardwerte vor den Würfeln (die Weltphase zeigt sie, im Kampf gelten die veränderten)
  const tags = [], hints = [];
  if (v.d) {
    hints.push(v.d === 1 ? 'Generalist (breit): mehr Karten im Nebenelement, dafür weniger im Hauptelement. Vielseitiger, aber mit schwächerer Spitze.' : 'Spezialist (spitz): stärkere Spitze (mehr Karten der höchsten Stufe), dafür eine schwächere Basis (mehr Stufe-1-Karten).');
  }
  const same = v.pl >= 0 && v.mi >= 0 && V.dice.plus[v.pl].k === V.dice.minus[v.mi].k;   // gleicher Wert auf beiden Würfeln: die Ausschläge heben sich auf, sie werden weder angewendet noch gezeigt
  [[v.pl, 1, V.dice.plus], [v.mi, -1, V.dice.minus]].forEach(([i, sign, die]) => {
    if (i === undefined || i < 0 || same || die[i].k === 'none') return;
    const face = die[i], n = face.n[stage - 1];
    applyDie(stats, face, sign, stage, el);
    tags.push((sign > 0 ? '+' : '−') + V.diceNames[face.k]);
    hints.push((sign > 0 ? 'Pluswürfel' : 'Minuswürfel') + ': ' + (sign > 0 ? '+' : '−') + n + ' ' + V.diceNames[face.k] + ' (' + (sign > 0 ? 'mehr ' : 'weniger ') + V.diceHints[face.k] + ').');
  });
  finalDeck = finalDeck.map(id => id[0] !== 'C' && id[0] !== S && +id[1] > stats.mag[id[0]] ? id[0] + stats.mag[id[0]] : id);   // Eine Karte wirkt höchstens mit der Magie ihrer Farbe: die Anzeige soll das zeigen. Ausnahme: Karten der Folgemagie bleiben auf ihrer höheren Stufe (siehe oben, sie wirken erst mit dem Magiebonus des Pluswürfels)
  rng.shuffle(finalDeck);
  return { el, name: (v.d ? M.formNames[el][v.d] : M.names[el]) + ' ' + STAGE_NUMERAL[stage], label: tags.join(', '), hints, variant: v, stage, base, stats, deckIds: finalDeck };
}
// Mit ‚rng‘ (aus dem Spiel abgeleitet) werden Monster, Deckform und beide Würfel gewürfelt; ohne bleibt es die feste Grundform.
function spawnMonsters(stage, rng) {
  const out = {};
  const r = rng || makeRng(stage * 7919);
  // Mit Zufall: 3 der 6 möglichen Monster (Element × Form) ohne Zurücklegen; ein Element darf also doppelt vorkommen (dann in beiden Formen), ein anderes fehlen.
  // Die Plätze heißen weiter F, E, W (Reihenfolge von links nach rechts); das Element eines Monsters steht in ‚el‘.
  let picks = ELEMENTS.map(e => ({ el: e, d: 0 }));
  if (rng) {
    const all = []; ELEMENTS.forEach(e => [1, 2].forEach(d => all.push({ el: e, d })));
    picks = []; while (picks.length < 3) picks.push(all.splice(rng.randint(0, all.length - 1), 1)[0]);
    picks.sort((a, b) => ELEMENTS.indexOf(a.el) - ELEMENTS.indexOf(b.el) || a.d - b.d);
  }
  ELEMENTS.forEach((slot, i) => {
    const v = rng ? { d: picks[i].d, pl: rng.randint(0, 5), mi: rng.randint(0, 5) } : null;
    out[slot] = spawnOne(picks[i].el, stage, r, v);
  });
  return out;
}
// Handkarten eines Monsters: Limit + 2 (mindestens 3), dazu die Würfel-Seite „Hand“ (mindestens 2).
function monsterHand(m) { return Math.max(2, Math.max(MIN_SLOTS, m.stats.limit + 2) + (m.stats.handExtra || 0)); }
function monsterAlive(m) { return m.stats.hp > 0; }
// Monsterphase vorbei: alle drei Monster sind besiegt.
function allMonstersDead(state) { return ELEMENTS.every(e => !monsterAlive(state.monsters[e])); }
function regenMonsters(state) { ELEMENTS.forEach(e => { const m = state.monsters[e]; if (monsterAlive(m)) regen(m.stats); }); }

// Monster eines Abschnitts für ein Spiel: gewürfelt (eigener, vom Spielzufall getrennter Strom) oder feste Grundform.
function spawnForGame(state, stage) {
  return spawnMonsters(stage, makeRng(((state.seed ^ 0x9e3779b1) + stage * 7919) >>> 0));
}
function variantLog(state) {
  const t = ELEMENTS.map(e => state.monsters[e]).filter(m => m.label).map(m => m.name + ' (' + m.label + ')');   // nur Monster mit gewürfeltem Effekt
  return t.length ? ' Besonderheiten: ' + t.join('; ') + '.' : '';
}
