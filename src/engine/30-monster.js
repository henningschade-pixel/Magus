/* Magus – Regelkern (Teil 3): Monster. Jeder Abschnitt hat je Element ein Monster.
   Die Werte sind Abstimmungsdaten (abgestimmt mit tools/sim-monster-stufen.js gegen skriptierte Spielerbauten);
   die Monster werden im Kampf vom Gegenspieler gesteuert. */

// Startdeck jedes Monsters: das Startdeck mit Karten des Elements auf Stufe 2 (Anzahl: ‚upgrades‘).
// Tempel-Verbesserungen: Stufe I ‚stage1Temple‘, danach je Stufe die Liste ‚temple[stufe][element]‘.
// Werte je Stufe (Version 0.3.1, neu abgestimmt auf Spieler mit Ausspiellimit 2 von Anfang an; Messung mit tools/balance/monster-tune.js):
//   Stufe I   3 HP, Mana 5 (Erdmonster 6), Limit 2; Variante: ausdauernd (+1 Mana, −1 HP) (wie die Spieler), Startdeck mit 3 Karten des eigenen Elements auf Stufe 2
//   Stufe II  4 HP, Mana 5 (Varianten 4/6), Limit 3
//   Stufe III 8 HP, Mana 6 (Varianten 5/7), Limit 4
// Das Limit steigt nur dort, wo es gewollt ist: Ein Monster mit Limit 2 und vielen HP verwickelt den Angreifer in endlose Angriffe und Fluchten (bis 27 Angriffe je Partie), erst Limit 3 gibt ihm die nötige Gefahr.
const MONSTER = {
  profile: { F: { primary: 'F', secondary: 'E' }, E: { primary: 'E', secondary: 'W' }, W: { primary: 'W', secondary: 'F' } },
  stage1Temple: { F: [], E: [], W: [] },
  temple: { 2: { F: ['limit', 'hp', 'mana'], E: ['limit', 'hp', 'mana'], W: ['limit', 'hp', 'mana'] }, 3: { F: ['limit', 'hp', 'hp', 'hp', 'hp', 'mana'], E: ['limit', 'hp', 'hp', 'hp', 'hp', 'mana'], W: ['limit', 'hp', 'hp', 'hp', 'hp', 'mana'] } },   // Schritte je Stufe (Stufe III kommt auf Stufe II obendrauf): II = Limit 3, 4 HP, Mana 5; III = Limit 4, 8 HP, Mana 6
  magic: { 2: [3, 2, 1], 3: [3, 2, 1] },                                  // Stufen von Haupt-, Neben- und drittem Element
  deck: {
    2: (P, S, T) => [P + '3', P + '2', P + '2', P + '2', S + '2', S + '2', T + '1', T + '1', P + '1'],
    3: (P, S, T) => [P + '3', P + '3', P + '3', P + '2', P + '2', S + '3', S + '3', T + '2', T + '1'],
  },
  // Varianten (gleich stark, gemessen): je Monster wird beim Erscheinen gewürfelt. Index 0 = Grundform.
  variants: {
    temple1: {   // Stufe I: Grundform (F/W: 3 HP, Mana 5; Erde: 3 HP, Mana 6 – sonst verlor es die Angreifer nur halb so oft), ausdauernd (1 Mana mehr, dafür 1 HP weniger; die Gegenstücke „zäh“ mit 1 HP mehr waren mit 1 Mana weniger oder einer Karte weniger zu harmlos: 8 bis 9 % Niederlagen)
      F: [['mana'], ['mana', 'mana', '-hp']], E: [['mana', 'mana'], ['mana', 'mana', 'mana', '-hp']], W: [['mana'], ['mana', 'mana', '-hp']],
    },
    temple: {   // Stufe II/III: Grundform, dazu ohne das Mana-Extra, dafür 1 HP mehr (ruhiger), und mit einem Mana mehr, dafür 1 HP weniger (zielt auf Dauerdruck); gemessen gleich oft Niederlage für den Angreifer (24/24/22 % in Stufe II, 40/41/37 % in Stufe III)
      2: { F: [['limit', 'hp', 'mana'], ['limit', 'hp', 'hp'], ['limit', 'mana', 'mana']], E: [['limit', 'hp', 'mana'], ['limit', 'hp', 'hp'], ['limit', 'mana', 'mana']], W: [['limit', 'hp', 'mana'], ['limit', 'hp', 'hp'], ['limit', 'mana', 'mana']] },
      3: { F: [['limit', 'hp', 'hp', 'hp', 'hp', 'mana'], ['limit', 'hp', 'hp', 'hp', 'hp', 'hp'], ['limit', 'hp', 'hp', 'hp', 'mana', 'mana']], E: [['limit', 'hp', 'hp', 'hp', 'hp', 'mana'], ['limit', 'hp', 'hp', 'hp', 'hp', 'hp'], ['limit', 'hp', 'hp', 'hp', 'mana', 'mana']], W: [['limit', 'hp', 'hp', 'hp', 'hp', 'mana'], ['limit', 'hp', 'hp', 'hp', 'hp', 'hp'], ['limit', 'hp', 'hp', 'hp', 'mana', 'mana']] },
    },
    swap: { F: { primary: 'F', secondary: 'W' }, E: { primary: 'E', secondary: 'F' }, W: { primary: 'W', secondary: 'E' } },   // Neben- und drittes Element getauscht
    deck: {   // Deckformen: Grundform, breit (mehr Nebenelement), spitz (stärkere Spitze, schwächere Basis)
      2: [null, (P, S, T) => [P + '3', P + '2', P + '2', S + '2', S + '2', S + '2', T + '1', T + '1', P + '1'], (P, S, T) => [P + '3', P + '3', P + '1', P + '1', S + '2', S + '2', S + '2', T + '1', T + '1']],
      3: [null, (P, S, T) => [P + '3', P + '3', P + '3', P + '2', S + '3', S + '3', S + '2', T + '2', T + '1'], (P, S, T) => [P + '3', P + '3', P + '3', P + '3', P + '1', S + '3', S + '3', T + '2', T + '1']],
    },
    deckNames: ['', 'breit', 'spitz'],
  },
  upgrades: { F: 3, E: 3, W: 3 },   // Karten des Startdecks, die auf Stufe 2 gehoben werden (nur Abschnitt I); mindestens eine, weil das Monster seine Hauptmagie auf Stufe 2 hat (ohne passende Karte wäre sie wertlos)
  startLimit: 2,                                                          // Ausspiellimit aller Monster vor den Tempel-Schritten (Spieler starten seit 0.3 mit 2; hier wird neu abgestimmt)
  gold: { 1: 1, 2: 2, 3: 3 },                                              // Beute
  names: { F: 'Feuermonster', E: 'Erdmonster', W: 'Wassermonster' },
};
const STAGE_NUMERAL = ['', 'I', 'II', 'III'];

// v: gewürfelte Variante { t: Tempel-Index, p: 0/1 (Neben-/drittes Element getauscht), d: Deck-Index }; ohne v die Grundform.
function spawnOne(el, stage, rng, v) {
  const M = MONSTER, deck = START_DECK.slice(), V = M.variants;
  v = v || { t: 0, p: 0, d: 0 };
  for (let i = 0, src = SUPERIOR[el] + '1'; i < (M.upgrades[el] === undefined ? 2 : M.upgrades[el]); i++) { const idx = deck.indexOf(src); if (idx < 0) break; deck[idx] = el + '2'; }
  const stats = newStats();
  stats.limit = M.startLimit;
  stats.mag[el] = 2;
  (stage === 1 ? V.temple1[el][v.t] || M.stage1Temple[el] : M.stage1Temple[el]).forEach(f => applyTemple(stats, f));
  stats.gold = M.gold[1];
  let finalDeck = deck;
  const prof = v.p && stage >= 2 ? V.swap[el] : M.profile[el];
  const P = prof.primary, S = prof.secondary, T = ELEMENTS.find(e => e !== P && e !== S);
  for (let st = 2; st <= stage; st++) {
    const m = M.magic[st];
    stats.mag[P] = Math.max(stats.mag[P], m[0]); stats.mag[S] = Math.max(stats.mag[S], m[1]); stats.mag[T] = Math.max(stats.mag[T], m[2]);
    const tv = st === stage && V.temple[st] && V.temple[st][el] ? V.temple[st][el][v.t] : null;
    (tv || M.temple[st][el]).forEach(f => {
      if (f === 'limit' && stats.limit >= MAX_LIMIT) f = 'hp';
      applyTemple(stats, f);
    });
    finalDeck = (st === stage && V.deck[st][v.d]) ? V.deck[st][v.d](P, S, T) : M.deck[st](P, S, T);
    stats.gold = M.gold[st];
  }
  finalDeck = finalDeck.map(id => id[0] !== 'C' && +id[1] > stats.mag[id[0]] ? id[0] + stats.mag[id[0]] : id);   // Eine Karte wirkt höchstens mit der Magie ihrer Farbe: die Anzeige soll das zeigen
  rng.shuffle(finalDeck);
  const tags = [], hints = [];
  {   // Wertetausch-Varianten (alle Stufen): kein Monster ist einfach „mehr“, jede Variante tauscht 1 HP gegen 1 Mana; Etikett und Hinweis nennen den Tausch, die tatsächlichen Werte stehen auf der Karte
    const lists = stage === 1 ? V.temple1[el] : V.temple[stage] && V.temple[stage][el];
    if (v.t && lists && lists[v.t]) {
      const net = (l, f) => l.filter(x => x === f).length - l.filter(x => x === '-' + f).length, dh = net(lists[v.t], 'hp') - net(lists[0], 'hp'), dm = net(lists[v.t], 'mana') - net(lists[0], 'mana');
      if (dh > 0 && dm < 0) { tags.push('zäh'); hints.push('Zäh: 1 maximale HP mehr, dafür 1 Mana weniger (hält mehr aus, kann weniger lange angreifen).'); }
      else if (dm > 0 && dh < 0) { tags.push('ausdauernd'); hints.push('Ausdauernd: 1 Mana mehr, dafür 1 maximale HP weniger (kann länger angreifen, ist leichter zu besiegen).'); }
    }
  }
  if (stage >= 2 && v.p) { tags.push(ELEMENT_NAME_SHORT[S] + '-lastig'); { const FN = { F: 'Feuer', E: 'Erde', W: 'Wasser' }; hints.push(ELEMENT_NAME_SHORT[S] + '-lastig: Das Nebenelement dieses Monsters ist ' + FN[S] + ' (normalerweise ' + FN[M.profile[el].secondary] + '). Es spielt neben seinem Hauptelement vor allem ' + FN[S] + '.'); } }
  if (stage >= 2 && v.d) { tags.push(V.deckNames[v.d]); hints.push(v.d === 1 ? 'breit: mehr Karten im Nebenelement, dafür weniger im Hauptelement. Vielseitiger, aber mit schwächerer Spitze.' : 'spitz: stärkere Spitze (mehr Karten der höchsten Stufe), dafür eine schwächere Basis (mehr Stufe-1-Karten).'); }
  return { el, name: M.names[el] + ' ' + STAGE_NUMERAL[stage], label: tags.join(', '), hints, variant: v, stage, stats, deckIds: finalDeck };
}
const ELEMENT_NAME_SHORT = { F: 'Feuer', E: 'Erd', W: 'Wasser' };
// Mit ‚rng‘ (aus dem Spiel abgeleitet) werden die Varianten gewürfelt; ohne bleibt es die feste Grundform.
function spawnMonsters(stage, rng) {
  const out = {}, V = MONSTER.variants;
  const r = rng || makeRng(stage * 7919);
  for (const e of ELEMENTS) {
    let v = null;
    if (rng) {
      const nt = stage === 1 ? V.temple1[e].length : (V.temple[stage] && V.temple[stage][e] ? V.temple[stage][e].length : 1);
      v = { t: rng.randint(0, nt - 1), p: stage >= 2 ? rng.randint(0, 1) : 0, d: stage >= 2 ? rng.randint(0, V.deck[stage].length - 1) : 0 };
    }
    out[e] = spawnOne(e, stage, rng ? rng : r, v);
  }
  return out;
}
function monsterAlive(m) { return m.stats.hp > 0; }
// Monsterphase vorbei: alle drei Monster sind besiegt.
function allMonstersDead(state) { return ELEMENTS.every(e => !monsterAlive(state.monsters[e])); }
function regenMonsters(state) { ELEMENTS.forEach(e => { const m = state.monsters[e]; if (monsterAlive(m)) regen(m.stats); }); }

// Monster eines Abschnitts für ein Spiel: gewürfelt (eigener, vom Spielzufall getrennter Strom) oder feste Grundform.
function spawnForGame(state, stage) {
  return spawnMonsters(stage, makeRng(((state.seed ^ 0x9e3779b1) + stage * 7919) >>> 0));
}
function variantLog(state) {
  const t = ELEMENTS.map(e => state.monsters[e]).filter(m => m.label).map(m => m.name + ' (' + m.label + ')');
  return t.length ? ' Besonderheiten: ' + t.join('; ') + '.' : '';
}
