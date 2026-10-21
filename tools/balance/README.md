# Balance-Simulation

KI gegen KI, abwechselnd als Beginner und Zweiter. Engine und KI kommen direkt aus `../../index.html`.

    node tools/balance/report.js 4000 '{}'                       # Gesamtauswertung (Regelüberschreibung als JSON)
    node tools/balance/report.js 3000 '{"winSp":3}'   # Variante testen
    node tools/balance/deep.js 2000                              # Kampfausgänge je Stufe, Endstände

Gilt für KI-Spiel; Fehlerspanne bei 3000–4000 Partien etwa ±2 Prozentpunkte.

## KI-Abstimmung (Selbstspiel)

    node tools/balance/tune.js 1600 '{"aCost":1.5}' '{}'        # Varianten A gegen B (Standard), Siegquote von A; gleiche Parameter = exakt 50 %
    node tools/balance/opt.js 4 1000 '{}'                       # paralleler Koordinatenabstieg über alle Gewichte (Log: opt.log)
    node tools/balance/mon3.js 300 3,1,5,1                      # Stufe-III-/II-Monster: Zäh- und Mana-Schritte

Stand 15.10.: KI gegen die alte KI (gleiche Regeln) 80 % Siegquote. Die Erholen-Parameter (rW, rRef, dRec) schaden im Selbstspiel und stehen auf 0.

## Pool-Abstimmung (17.10.)

Im reinen Selbstspiel schaukelten sich beide KIs auf „erst alle Karten aufwerten, dann angreifen“ hoch (beim ersten Monsterangriff im Mittel 2 Stufe-III-Karten, 92 Logzeilen), was gegen einen früh angreifenden Menschen Beute kostet. `node tools/balance/opt2.js <Runden> <Partien>` stimmt deshalb gegen einen Pool ab (Champion plus drei früh angreifende Gegner).
Übernommene Werte (Standard): `cBase` 34, `oHits` 2, `oFree` 4 (früher und mutiger angreifen), `vOver` 0,5 (Aufwertungen über dem Magielevel zählen halb), `mCatch` −1,5 (beim Magiekauf nicht dem Gegner hinterherlaufen, die eigene Richtung stärken).
Ergebnis: Siegquote 55 bis 57 % gegen die bisherige KI und 52 bis 71 % gegen fünf früh angreifende Gegner, die nicht im Training waren; beim ersten Monsterangriff im Mittel 0,2 Stufe-III-Karten und 37 statt 92 Logzeilen. Zeitdruck-Gewichte (`tRace`, `tAlive`, `tLoot`) und Erschöpfungs-Gewichte (`xPen`) blieben auf 0, sie brachten im Test nichts Messbares.
Nachtrag: `vOff` 0,5 (Aufwertungen von Karten außerhalb der Zielfarbe zählen halb) bestätigt: 53,7 % gegen die vorherige KI, 51 bis 57 % gegen vier weitere Gegner (1600 Partien). Der Bonus für die Zielfarbe beim Magiekauf (`mPlan`) verschlechterte die KI und bleibt auf 0. Außerdem behoben: In der Oberfläche führte die KI ihre Bonusaktionen (Magie kaufen, Tempel, Punkte ausgeben) nicht aus, nur in den Simulationen.

## Eröffnungsstrategien (17.10.)

`node tools/balance/strat.js 800 '{}' 0,1,2,3,4` spielt die Eröffnungen aus der Spielerbeobachtung gegeneinander (Parameter `strat`: 0 frei, 1 Limit zuerst mit Tempel-Gold für Ausspiellimit 2, 2 Fokus auf eine Farbe, 3 zwei Richtungen auf Stufe 2, 4 Auswahl nach Starthand). Siegquote der Zeile gegen die Spalte (800 Partien je Paar, ±1,8): Zwei Richtungen 51 % gegen frei, 58 % gegen Fokus, 74 % gegen Limit; Fokus 45 % gegen frei; Limit zuerst 26 bis 38 % gegen alle. Mit 3200 Partien: Zwei Richtungen 51,1 % ±0,9 gegen frei und 49 bis 51 % gegen drei früh angreifende Gegner, also kein belastbarer Unterschied zur freien KI (die zweite Farbe auf Stufe 2 ist dort ohnehin billiger als die dritte Stufe). Die Sperre der Handplätze (`sLock`) ändert nichts, weil die KI Handplätze vor dem ersten Showdown sowieso nicht ausbaut. Standard bleibt `strat` 0.

## Nachtraining nach „Passen ohne Mana“ (18.10.)

Nach der Regeländerung (in der Verteidigung gibt Passen kein Mana mehr) stieg der Anteil der Monsterkämpfe ohne Sieger (Erschöpfung) bei Stufe I von etwa 40 auf 52 %, bei Stufe II von 39 auf 55 %. `opt2.js 2 500` übernahm nur `wFW` 1,3 (statt 2; bestätigt mit +2,8 Punkten, 51,3 % gegen die vorherige KI in 1600 Partien). Den Anteil der Erschöpfungsenden senkte das kaum (Stufe I 52 bis 54 %, Stufe II 50 bis 54 %): Die Gewichte der KI reichen dafür nicht, die Ursache liegt in der Regel selbst.

## Nachtraining nach den Monster-Siegpunkten (20.10.)

Neue Regel: Sieg über ein Monster +1 Siegpunkt (Monsterführer −1), Niederlage gegen das Monster −1 (nie unter 0), Showdown ±1, Flucht 0. Neue Stellschrauben (Standard 0): `sRisk`/`sZero` (Siegpunkt-Risiko beim Angriff), `fleeSafe` (als Monsterführer fliehen, bevor der Angreifer das Monster besiegt), `fleeHp` (als Angreifer bei wenig HP fliehen).
`PARAMS=sRisk,sZero,fleeSafe,fleeHp,cBase,oHits,oFree,minMana,minHp,cMon,cWt,tRace,tAlive,mCounter,xPen node tools/balance/opt2.js 3 600` übernahm `minMana` 4 (erst mit vollem Start-Mana angreifen, +7 Punkte bestätigt) und `oHits` 4 (zähe Monster stärker meiden, +1,9). Die neuen Stellschrauben und `mCounter` brachten nichts Messbares; `minMana` 5 bricht ein (28 %), weil die KI dann vor dem ersten Mana-Ausbau gar nicht angreift.
Ergebnis: 60 % ±0,9 gegen die vorherige KI (3200 Partien). Niederlagen gegen Monster je Partie 13,5 statt 18 (Monstersiege der Spieler unverändert 9).

## Fliehen nach Kampfprognose (21.10.)

Vorher floh die KI als Angreifer nie: In Stufe II verlor sie 66 % ihrer Monsterkämpfe (8 Niederlagen je Partie), obwohl bei 78 % dieser Niederlagen eine Flucht möglich gewesen wäre (`node tools/balance/flucht.js 400` zeigt Ausgänge und Fluchtgelegenheiten je Stufe). Neu: `raceTurns` schätzt für jede Seite, wie viele Züge sie bis zum Sieg braucht (Nettoschaden aus dem Kampfdeck, Erholen bei fehlendem Mana). Der Abstand sagt den Ausgang gut voraus (Stufe II: liegt das Monster 2 oder mehr Züge vorn, verliert der Angreifer zu 75 bis 88 %).
Neue Stellschrauben: `fleeA`/`fleeA0` (Angreifer mit/ohne Siegpunkte flieht, wenn das Monster so viele Züge vorn liegt; erst wenn im Kampf schon Schaden gefallen ist, sonst greifen beide Seiten endlos an und fliehen sofort), `fleeL`/`fleeLHp`/`fleeLMana` (Monsterführer flieht, wenn der Angreifer das Rennen gewinnt bzw. das Monster nur noch so viele HP hat, und erledigt das angeschlagene Monster danach selbst), `fleeW` (Angriffsabschlag bei verlorener Prognose).
Ohne Siegpunkte lohnt die Flucht als Angreifer nicht (die Siegchance ist zwei Punkte wert, die Niederlage kostet dann nichts): `fleeA0` bleibt 0. `opt2.js 4 1000` übernahm `fleeLHp` 1 (+2,5 Punkte); `fleeA` 1 bestätigt mit 3200 Partien (+0,7 auf neuen Seeds, +0,4 bis +1,8 gegen frühe Angreifer). `fleeW`, `fleeL`, `fleeHits` brachten nichts Messbares.
Ergebnis (400 Partien, KI gegen KI): Niederlagen gegen Monster in Stufe II 41 % statt 66 %, in Stufe III 52 % statt 61 %; verlorene Siegpunkte durch Monsterniederlagen 3,4 statt 4,6 je Partie; die Schwelle von 4 Siegpunkten greift in 13 % statt 7 % der Partien. In Stufe I flieht der Monsterführer oft beim letzten HP und besiegt das Monster danach selbst.

## Mana-Reserve und Fluchtbewertung (21.10.)

Fliehen darf nur, wessen Gegner kein Mana hat. Die dominierende Seite gab dem Gegner die Flucht oft selbst frei: In Stufe I griff der Angreifer ein Monster mit 1 HP mit seinem letzten Mana an (der +100-Bonus für einen „tödlichen“ Angriff überwog, obwohl das Monster blocken konnte), der Monsterführer floh und besiegte das Monster danach selbst (1400 solcher Fluchten in 400 Partien).
Neu: `mRes` (Abschlag für einen Angriff, der mich auf 0 Mana bringt, solange ich das Rennen anführe und das Monster danach nach erwartetem Block `mResBlk` mit höchstens `mResHp` HP stehen bleibt; ein solcher Angriff zählt nicht als sicher tödlich), `mResRec` (statt des zurückgehaltenen Angriffs erholen, damit die KI nicht nachzieht und später doch mit dem letzten Mana angreift), `mResL` (dasselbe als Monster; schadet, weil das Monster dann schwächer zuschlägt, bleibt 0).
Übernommen `mRes` 10: 53,3 % ±0,8 gegen die vorherige KI, 52,2 % gegen die KI ganz ohne neue Flucht (4000 Partien), gegen frühe Angreifer neutral (−1,0 bis +1,1). Fluchten des Monsterführers in Stufe I 148 statt 1417, Monstersiege der Angreifer in Stufe I 77 % statt 46 %, Monsterkämpfe je Partie 3,9 statt 6,6 in Stufe I.
Geprüft und verworfen: Fliehen nach Bewertung der Ausgänge (`fleeEV`, Sieg > Flucht > Niederlage in Siegpunkten, Sieg- und Niederlagenwahrscheinlichkeit logistisch aus der Kampfprognose; für den Monsterführer zählt die Flucht zusätzlich als Chance auf den eigenen Folgeangriff). Sie verlor gegen die Schwellenregel mit Reserve 47,4 % und in allen Teilvarianten 48,5 bis 49,5 %: Die Wahrscheinlichkeiten beschreiben den Kampf bis zum Ende, übersehen also, dass man später immer noch fliehen kann, und die Bewertung flieht zu früh. Die Schwellen setzen dasselbe Prinzip einfacher um (Angreifer defensiv nur mit Siegpunkten und klar verlorener Prognose, Monsterführer früh beim letzten HP des Monsters).
