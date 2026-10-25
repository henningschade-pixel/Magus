/* ---------- Stellschrauben ---------- */
// Alle Gewichte der KI an einer Stelle (abgestimmt per Selbstspiel: Änderungen wurden nur übernommen, wenn sie sich in 800 Partien mit getauschten Plätzen klar durchsetzten). Pro Platz überschreibbar (setParams), damit Varianten gegeneinander spielen können.
const DEFAULTS = {
  limitA: 1, slotA: 5, manaA: 5, hpA: 6, limitB: 3, slotB: 5,          // Ausbaureihenfolge der Upgrade-Punkte
  cBase: 34, cHp: 3, cMana: 1.5, cWt: 2.8, cMon: 0.8, minHp: 1, minMana: 3,   // Lust, ein Monster anzugreifen
  dRed: 10, dTmp: 10, dVen: 5, rBroke: 400, cRed: 1, cRedA: 0,   // Nachziehmarker rot (Nachziehen schenkt dem Gegner Gold bzw. ein Nachziehtoken): dRed Abschlag auf das Nachziehen in der Weltphase, dTmp Lust, stattdessen 1 Gold im Tempel zu opfern, dVen Lust, ohne Gold stattdessen gratis in der Bibliothek zu tauschen, rBroke Bonus für einen Monsterangriff, wenn sonst nur das Strafnachziehen bleibt; im Kampf cRed 1: erholen statt nachziehen (auch bei vollem Mana), cRedA: Angriffsschwelle sinkt um so viel
  sacG: 0, mgGoal: 6, sacRes: 0,   // swapCosts (0.3): Magie kostet Upgrade-Punkte, die es nur aus dem Tempel gibt. sacG 1: Gold opfern, wenn die Punkte für die nächste Magiestufe nicht reichen; mgGoal: nur solange der Magiefortschritt (Summe der Stufen über 1, höchstens 6) darunter liegt; sacRes: Gold, das dabei übrig bleiben muss (Vorrang der Verbesserungen)
  dlMax: 0, dlPos: 4, tKeep: 0, cRedE: 0, dFree: 0, rAtk: 0,   // rAtk: Angriffslust auf ein Monster, solange der Marker rot ist (statt nachzuziehen und dem Gegner Gold zu schenken); Nachziehlimit (Upgrade-Punkte): dlMax bis zu welcher Stufe die KI es kauft (0 = nie), dlPos Stelle in der Ausbaureihenfolge von pickSpend (0 = vor allem anderen, 4 = nach den A-Zielen, 9 = zuletzt); tKeep: Gold, das beim Tempel-Opfern zurückbleibt (Notgroschen gegen die Strafe, siehe dTmp); cRedE 1: mit leerer Hand bei Rot erst erholen (Marker auf Grün), dann nachziehen; dFree: Bonus aufs Nachziehen in der Weltphase, solange der Marker noch grün ist
  dBase: 7, dCurse: 4, dEmpty: 12, dSlot: 1, dNorm: 5,                    // Lust, nachzuziehen
  vUp: 10.35, vUpW: 1.4,                                                       // Bibliotheks-Aufwertung
  smart: 1, wMark: 0.5, keepB: 3, keepOn: 0, wDeath: 6, wDraw: 1.6, wFW: 1.3, wFE: 0.9, wEW: 2.8, aDmg: 1.5, aCost: 1.5, aCurse: 1.6, aThr: 0.5, oHits: 4, oFree: 4, stallDec: -0.05, stallFrom: 24, pasDec: 1,   // Angriffsbewertung; pasDec: die Angriffsschwelle sinkt um so viel je Passen-Zug des Gegners in Folge
  rW: 0, rRef: 3, dRec: 0, dU: 2,                                                 // Erholen als Manaquelle: Angriffsschwelle steigt bei wenig Mana, Verzicht auf Verteidigung bringt Mana
  dLeth: 40, dPend: 6, dCost: 1.4, dKeep: 0.9, mirW: 4, mirKeep: 3, mirAvoid: 2, lfOpp: 2, lfOppW: 0.8,                            // Verteidigungsbewertung
  mBase: 14, mCost: 2.1, mCnt: 0.7, mTop: 2,
  mPlan: 0, vOff: 0.5,   // Ziel-Farbe: gegen ein Monster zählt die ihm überlegene Magie. mPlan: Bonus beim Magiekauf, vOff: Aufwertungen anderer Farben zählen nur so viel
  vOver: 0.5, vFut: 0,   // Bibliothek: Eine Karte über dem Magielevel ihrer Farbe bringt (noch) nichts: Wert dieser Aufwertung × vOver (1 = wie bisher), vFut: ab so viel Gold zum Magiekauf zählt sie schon
  xPen: 0, xCost: 2, xHp: 1.5, xHor: 3,   // Erschöpfung: Ein überhasteter Angriff, der das Monster nicht schafft, lässt es angeschlagen zurück, und der Gegner (der danach am Zug ist) besiegt es leicht
  fleeIdle: 120,   // Patt-Sicherung: Nach so vielen Weltphasen-Zügen ohne entschiedenen Kampf flieht die KI nicht mehr (sonst konnte ein Spieler, der Gold aus roten Nachziehmarkern des Gegners in HP umsetzt, endlos angreifen und fliehen)
  fleeT: 999,   // Fliehen: ab so vielen Kampfschritten ohne brauchbaren Angriff gegen ein Monster ohne Mana (999 = nie; im Selbstspiel verlor die KI mit 14 Schritten 48 %, mit 6 Schritten 42 %)
  fleeHits: 20,   // Fliehen als Monsterführer: fliehe, wenn der Angreifer kein Mana mehr hat und ich das Monster danach in höchstens so vielen Angriffen selbst besiege (0 = nie; 20 gewann 50,9 % gegen 0 in 1600 Partien, 1 bis 4 waren wirkungslos, weil der Fall selten vorkommt)
  strat: 2, fHand: 3, fWeak: 4, sLock: 1,   // Eröffnung (Spielerstrategien): 0 frei, 1 Limit zuerst (Tempel-Gold für Ausspiellimit 2), 2 Fokus (eine Farbe, Handplätze erst nach dem ersten Sieg), 3 zwei Richtungen (zwei Farben auf 2, Handplätze erst nach dem 1. Showdown), 4 wählt je nach Starthand; fHand/fWeak: Farbwahl nach Handkarten bzw. geschwächtem Monster; sLock 0 hebt die Sperre der Handplätze auf
  sRisk: 0, sZero: 0, fleeSafe: 0, fleeHp: 0,   // Siegpunkte: Niederlage gegen ein Monster kostet 1 Siegpunkt. sRisk: Abschlag, wenn Mana und HP voraussichtlich nicht für das ganze Monster reichen (nur mit Siegpunkten auf dem Konto); sZero: Bonus ohne Siegpunkte (nichts zu verlieren); fleeSafe: als Monsterführer fliehen, wenn der Angreifer das Monster in höchstens so vielen Angriffen besiegt (sonst kostet es mich 1 Siegpunkt); fleeHp: als Angreifer fliehen, wenn meine HP höchstens so hoch sind (0 = nie)
  fleeA: 1, fleeA0: 0, fleeW: 0, fleeL: 0, fleeLHp: 2, fleeLMana: 0,   // Fliehen nach Kampfprognose (Züge bis zum Sieg je Seite, siehe raceTurns), nur möglich, wenn der Gegner kein Mana hat. fleeA: Angreifer mit Siegpunkten flieht, wenn das Monster in der Prognose mindestens so viele Züge vorn liegt (0 = nie); fleeA0: dasselbe ohne Siegpunkte. Monsterführer flieht, wenn der Angreifer weniger als fleeL × so viele Züge braucht wie das Monster oder das Monster höchstens fleeLHp HP hat, und er selbst mindestens fleeLMana Mana hat. fleeW: Abschlag beim Angriffswunsch je Zug, den das Monster in der Prognose vorn liegt
  fleeEV: 0, evLoot: 0.3, evHp: 0.3, fleeVA: 0, fleeVL: 1,   // Fliehen nach Bewertung der Ausgänge (Sieg > Flucht > Niederlage, in Siegpunkten), fleeEV 1 als Gegner des Monsters, 2 als Monsterführer, 3 beides: evLoot Wert der Beute, evHp Wert der vollen HP (eine Niederlage kostet sie), fleeVA Wert der Flucht für den Gegner des Monsters (0 = nur Niederlage abwenden), fleeVL Gewicht des eigenen Folgeangriffs nach der Flucht als Monsterführer
  mRes: 10, mResHp: 2, mResL: 0, mResBlk: 1, mResRec: 1,   // Mana-Reserve im Monsterkampf: Abschlag für einen Angriff, der mich auf 0 Mana bringt, solange ich das Rennen anführe (sonst darf der Gegner fliehen); ein tödlicher Angriff ist frei. mRes: als Angreifer, wenn das Monster danach höchstens mResHp HP hat (der Führer würde fliehen und es selbst besiegen). mResL: als Monster, wenn der Angreifer Siegpunkte zu retten hat; mResBlk: erwarteter Block (ein Angriff zählt erst als tödlich, wenn er auch danach reicht); mResRec 1: statt des zurückgehaltenen Angriffs erholen
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

