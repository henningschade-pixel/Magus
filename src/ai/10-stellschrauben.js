/* ---------- Stellschrauben ---------- */
// Alle Gewichte der KI an einer Stelle (abgestimmt per Selbstspiel: Änderungen wurden nur übernommen, wenn sie sich in 800 Partien mit getauschten Plätzen klar durchsetzten). Pro Platz überschreibbar (setParams), damit Varianten gegeneinander spielen können.
const DEFAULTS = {
  limitA: 1, slotA: 3, manaA: 4, hpA: 4, limitB: 3, slotB: 5,          // Ausbaureihenfolge der Upgrade-Punkte
  cBase: 34, cHp: 3, cMana: 1.5, cWt: 2.8, cMon: 0.8, minHp: 1, minMana: 3,   // Lust, ein Monster anzugreifen
  dBase: 7, dCurse: 4, dEmpty: 12, dSlot: 2, dNorm: 5,                    // Lust, nachzuziehen
  vUp: 8.85, vUpW: 1.4,                                                       // Händler-Aufwertung
  smart: 1, wMark: 0.5, keepB: 3, keepOn: 0, wDeath: 6, wDraw: 1.6, wFW: 2, wFE: 0.9, wEW: 2.8, aDmg: 1.5, aCost: 1.5, aCurse: 1.6, aThr: 0.5, oHits: 2, oFree: 4, stallDec: 0.25, stallFrom: 24,   // Angriffsbewertung
  rW: 0, rRef: 3, dRec: 0, dU: 2,                                                 // Erholen als Manaquelle: Angriffsschwelle steigt bei wenig Mana, Verzicht auf Verteidigung bringt Mana
  dLeth: 40, dPend: 6, dCost: 1.4, dKeep: 0.9, mirW: 4, mirKeep: 3, mirAvoid: 2, lfOpp: 2, lfOppW: 0.8,                            // Verteidigungsbewertung
  mBase: 14, mCost: 2.1, mCnt: 0.7, mTop: 2,
  mPlan: 0, vOff: 0.5,   // Ziel-Farbe: gegen ein Monster zählt die ihm überlegene Magie. mPlan: Bonus beim Magiekauf, vOff: Aufwertungen anderer Farben zählen nur so viel
  vOver: 0.5, vFut: 0,   // Händler: Eine Karte über dem Magielevel ihrer Farbe bringt (noch) nichts: Wert dieser Aufwertung × vOver (1 = wie bisher), vFut: ab so viel Gold zum Magiekauf zählt sie schon
  xPen: 0, xCost: 2, xHp: 1.5, xHor: 3,   // Erschöpfung: Ein überhasteter Angriff, der das Monster nicht schafft, lässt es angeschlagen zurück, und der Gegner (der danach am Zug ist) besiegt es leicht
  fleeT: 999,   // Fliehen: ab so vielen Kampfschritten ohne brauchbaren Angriff gegen ein Monster ohne Mana (999 = nie; im Selbstspiel verlor die KI mit 14 Schritten 48 %, mit 6 Schritten 42 %)
  fleeHits: 0,   // Fliehen als Monsterführer: fliehe, wenn der Angreifer kein Mana mehr hat und ich das Monster danach in höchstens so vielen Angriffen selbst besiege (0 = nie)
  strat: 0, fHand: 3, fWeak: 4, sLock: 1,   // Eröffnung (Spielerstrategien): 0 frei, 1 Limit zuerst (Tempel-Gold für Ausspiellimit 2), 2 Fokus (eine Farbe, Handplätze erst nach dem ersten Sieg), 3 zwei Richtungen (zwei Farben auf 2, Handplätze erst nach dem 1. Showdown), 4 wählt je nach Starthand; fHand/fWeak: Farbwahl nach Handkarten bzw. geschwächtem Monster; sLock 0 hebt die Sperre der Handplätze auf
  tRace: 0, tHorizon: 3, tAlive: 0, tLoot: 0, mCounter: 0, mCatch: -1.5,   // Zeitdruck (Gegner nimmt mir ein Monster weg, Beute, wenige Monster übrig) und Reaktion auf den Aufbau des Gegners (überlegene Magie, Rückstand aufholen)                              // Magie kaufen
};
const PARAMS = {};
function setParams(pid, obj) { if (obj) PARAMS[pid] = Object.assign({}, DEFAULTS, obj); else delete PARAMS[pid]; }
function P(pid) { return PARAMS[pid] || DEFAULTS; }

function handList(d) { const out = []; d.hand.forEach((card, slot) => { if (card) out.push(Object.assign({ slot, card }, M.parseCard(card.id))); }); return out; }
function subsets(arr, maxSize) {
  const res = [];
  const n = arr.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sub = []; for (let i = 0; i < n; i++) if (mask & (1 << i)) sub.push(arr[i]);
    if (sub.length <= maxSize) res.push(sub);
  }
  return res;
}
function canDraw(d) { return d.hand.some(c => !c || !c.locked) && (d.draw.length + d.discard.length > 0 || d.hand.some(c => c && !c.locked)); }

