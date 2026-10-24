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

## Nachtraining nach 1/2/3 Gold Beute und Abschnittsbonus 1/2/3 Gold + Punkte (21.10.)

Regeln wieder auf dem alten Stand (Beute je Monsterstufe 1/2/3 Gold, Abschnittsbeginn 1/2/3 Gold und Upgrade-Punkte, Limit startet bei 1). `PARAMS=sRisk,sZero,fleeSafe,fleeHp,fleeA,fleeLHp,mRes,tLoot,tRace,tAlive,cBase,oHits,oFree,minMana,minHp,cMon,cWt,limitA,slotA,manaA,hpA node tools/balance/opt2.js 3 600` übernahm `slotA` 4 (+7,6 Punkte), `fleeLHp` 2 (+2,6) und `oHits` 2 (+1,8). Die Siegpunkt-Risiko-Stellschrauben (`sRisk`, `sZero`, `fleeSafe`, `fleeHp`) brachten auch mit der neuen Beute nichts Messbares und bleiben auf 0.
Ergebnis: 58,2 % ±1,1 gegen die vorherige KI (2000 Partien), 58,0 % ±1,6 gegen die vorherige KI bei früh angreifenden Gegnern (1000 Partien).

## Nachtraining nach der Regelkorrektur Monsterführer (22.10.)

Der Monsterführer verliert im Monsterkampf keine Siegpunkte mehr. `PARAMS=cWt,cBase,oHits,oFree,cMon,minMana,minHp,mRes,fleeA,fleeLHp,limitA,slotA,manaA,hpA,vOver,vOff,fleeSafe,sRisk,sZero,fleeHp node tools/balance/opt2.js 4 500` fand in den ersten beiden Runden keine bestätigte Verbesserung (beste Kandidaten +0,2 bis +2,0 Punkte, unter der Übernahmeschwelle); die Standardwerte bleiben.
Spieldauer: Im Selbstspiel steht beim Angriff oft keine Seite besser (Monster zäher als jede Hand), beide ziehen dann bis zu etwa 70 Züge Karten nach, bis `cWt` den Angriff freigibt (90-%-Quantil 4123 Aktionen je Partie). Ein größeres `cWt` verkürzt das (8: 2068, 20: 1360, 50: 737), kostet aber Spielstärke (Siegquote gegen die Standard-KI 43 %, 41 %, 35 %). Gegen Menschen entsteht das Warten nicht, weil dort einer angreift. Gelöst werden sollte es über die Balance von Monstern und Kosten.

## Nachtraining nach Hilfe, Rückzug und ohne Beute (22.10.)

Die Regeln `lossHelp` 1 (Hilfe für beide, Monster zieht sich zurück) und `monsterLoot` 0 (keine Beute) kamen nach dem letzten Training. Außerdem zählte `analyze.js` keinen Monstersieg mehr (erkannte ihn an „und erhält N Gold“): Siegquoten je Monster standen auf 0 %. Behoben, der Regex erkennt „besiegt X.“ mit und ohne Gold.
`PARAMS=sRisk,sZero,fleeSafe,fleeHp,fleeA,fleeA0,fleeLHp,mRes,mResL,cBase,oHits,oFree,minMana,minHp,cMon,cWt,limitA,slotA,manaA,hpA,vOver,vOff,tRace,tAlive,tLoot node tools/balance/opt2.js 3 600` übernahm `slotA` 5 (+1,8) und `oHits` 4 (+3,2); Runde 2 fand nichts Bestätigtes. Gegen die bisherige KI 53,4 % ±2,4 (1600 Partien); `oHits` 4 allein gegen 2: 55,2 %.
Nebenwirkung: Die Partien werden länger (P90 876 statt 1615 Aktionen, Maximum 12940), weil die KI zähe Monster länger meidet. Der Vorteil des Beginners verschwindet (46,4 % : 45,8 %). Etwa die Hälfte der Partien endet mit einem Verlierer auf 0 Siegpunkten (4:0 13 %, 0:4 13 %, 5:0 11 %, 0:5 8 %).

## Nachziehmarker (22.10.)

Neue Regel `drawMarker` (siehe Regelwerk). Neue Stellschrauben `dRed` (Abschlag aufs Nachziehen in der Weltphase bei rotem Marker) und `cRed` (im Kampf lieber erholen als nachziehen); beide brachten nichts Messbares (50,3 % und 49,6 % gegen die KI ohne sie) und stehen auf 0. `PARAMS=dRed,dBase,cWt,cBase,oHits,oFree,minMana,slotA,fleeA,fleeLHp,stallDec node tools/balance/opt2.js 2 500` übernahm `slotA` 4 (zurück von 5; +5,7, 54,4 % ±2,4 gegen slotA 5 in 1600 Partien).
Ergebnis (1000 Partien): P90 657, Maximum 4050 Aktionen (vorher 1615 und 12940); Beginner 46,1 %, Zweiter 50,5 %, Unentschieden 3,4 %.

## Monster bleiben nach ihrem Sieg stehen (22.10., Version 0.2)

Der Rückzug des siegreichen Monsters entfällt. Die Hilfe bleibt unbegrenzt. KI unverändert.

## KI auf den Nachziehmarker trainiert (22.10., Version 0.2)

Bestandsaufnahme: Die bisherige KI zog je Partie im Mittel 27,6-mal in der Weltphase und 11,6-mal im Kampf bei rotem Marker nach, schenkte dem Gegner also rund 28 Gold und 12 Nachziehtokens. Im reinen Selbstspiel hob sich das auf (darum waren `dRed`/`cRed` dort „nicht messbar“), gegen einen Gegner, der den Marker beachtet, ist es ein großer Vorteil für diesen.
Neu: `dTmp` (bei Rot 1 Gold im Tempel opfern statt nachziehen; die Wirtschaftsaktion opfert erst ab 2 Gold), `cRed` jetzt auch bei vollem Mana (im Kampf erholen statt nachziehen), `cRedA` (Angriffsschwelle bei Rot senken). `dRed` allein wirkte nicht, weil der KI dann eine Ausweichaktion fehlte.
Raster (1600 Partien gegen die bisherige KI): `dTmp` 10 55,5 %, `cRed` 1 51,1 %, beides 57,8 %, `cRedA` 1 bis 2 48,7 % (schadet, bleibt 0). `opt2.js 2 600` ab `dTmp` 10, `dRed` 10, `cRed` 1 fand keine weitere bestätigte Verbesserung.
Patt-Sicherung `fleeIdle` 120: Im Selbstspiel blieben 3 von 1000 Partien hängen (ein Spieler ohne Gold muss bei Rot nachziehen, der andere setzt das Gold im Tempel in HP um, kann das letzte Monster aber nicht besiegen und flieht jedes Mal). Nach 120 Weltphasen-Zügen ohne entschiedenen Kampf flieht die KI nicht mehr; neutral für die Spielstärke (49,7 % gegen die KI ohne Sicherung).
Ergebnis: 58,7 % ±0,9 gegen die bisherige KI (3200 Partien); gegen drei früh angreifende Gegner 54 bis 57 % (bisherige KI 50 bis 51 %). Selbstspiel (1000 Partien): im Kampf kein Nachziehen bei Rot mehr, in der Weltphase 31 statt 18 je Partie (meist ohne Gold, also ohne Ausweichaktion); P90 rund 960 statt 780, Maximum 2131 statt 3390 Aktionen.

## Monster ziehen sich nach ihrem Sieg wieder zurück (22.10., Version 0.2)

Mit stehenbleibenden Monstern ließ sich die unbegrenzte Hilfe farmen: Die HP stiegen in Einzelpartien auf über 130 (Spitzenwert je Partie, 400 Partien: Median 17, P90 55, Maximum 131). Mit Rückzug: Median 23, P90 49, Maximum 57. Die verbliebenen hohen Werte sind kein Farming: Upgrade-Punkte, für die nichts anderes mehr offen ist, gehen als Rückfall in HP (2 HP je Punkt). KI unverändert, 60,3 % ±0,9 gegen die KI vor dem Nachziehmarker-Training (3200 Partien).

## Strafnachziehen bei rotem Nachziehmarker (22.10.)

Befund (300 Partien KI gegen KI): 37 Gold je Partie (66 % allen erhaltenen Goldes) stammten aus der Strafe für Nachziehen bei rotem Marker. Die KI zog in Abschnitt 2 (97 % der Fälle) mit 0 Gold, vollem Mana und voller Hand bei Rot nach: Sie hielt jedes Monster für unbesiegbar, und ohne Gold blieb keine andere Aktion. Beide Seiten schenkten sich so abwechselnd Gold, das in den Tempel und damit in Upgrade-Punkte floss. Im Selbstspiel hebt sich das auf, gegen einen Menschen ist es ein reines Geschenk.
Neu: `dVen` 5 (bei Rot ohne Gold gratis beim Händler tauschen, solange der Vorrat reicht) und `rBroke` 400 (bleibt sonst nur das Strafnachziehen, lieber ein Monster angreifen).
Ergebnis: Strafgold 0,24 statt 37 je Partie (1 % statt 66 % des Goldes); Siegquote 70,7 % ±1,3 gegen die vorherige KI (1600 Partien, neue Seeds), `rBroke` allein 66,4 %, beide gegen nur `dVen` 63,9 %. Hilfe-Ereignisse (Niederlage gegen ein Monster) steigen von 2,6 auf 3,4 je Partie.

## KI und das Nachziehlimit (23.10., Version 0.2.1)

Neue Stellschrauben: `dlMax` (bis zu welcher Stufe die KI das Nachziehlimit kauft, jeder Kauf ist eine Zugaktion; Standard 0 = nie), `dlRes` (Gold, das danach bleiben muss), `dlFirst` (vor der Magie kaufen), `tKeep` (Notgroschen beim Tempel-Opfern), `cRedE` (mit leerer Hand bei Rot erst erholen), `dFree` (Nachziehlust bei grünem Marker), `rAtk` (Angriffslust auf ein Monster, solange der Marker rot ist; Standard 0).
Befund vor dem Strafnachziehen-Training (siehe oben): Alle Strafzüge in der Weltphase geschahen mit 0 Gold, vollem Mana und Monstern auf dem Feld, die KI nutzte das Nachziehen als „Passen“. Dort brachten `dlMax` 2 (51,2 %) und `rAtk` 80 (54,4 %, Strafen 13 statt 27 je Partie) etwas; `dlMax` 3 (43,6 %) und `dlFirst` 1 (9,5 %) schadeten.
Auf dem Stand mit `dVen`/`rBroke` (Strafgold 0,2 je Partie) bringt das Limit der KI nichts mehr (2400 Partien gegen den Stand ohne Kauf): `dlMax` 2 46,3 %, `dlMax` 3 35,3 %, `dlMax` 2 mit `rAtk` 80 46,9 %, `rAtk` 80 allein 49,8 %; mit Reserve `dlRes` 2 49,1 %, ab `dlRes` 4 kauft sie nie (50,0 %); `dFree` 3, `cRedE` 1, `dTmp` 0 neutral bis schlechter. Jeder Kauf kostet einen Zug und Gold, und es gibt kaum noch Strafen zu vermeiden. Die Standardwerte bleiben bei `dlMax` 0 und `rAtk` 0; die Stellschrauben bleiben für spätere Regeländerungen (etwa ein anderer Preis) im Code.
Hinweis: Im Selbstspiel schenken sich beide KIs gegenseitig Gold; gegen Menschen, die das Limit kaufen, ändert sich an der KI nichts.

## Nachziehlimit für Upgrade-Punkte (23.10.)

Regeländerung: Das Nachziehlimit kostet jetzt 1 Upgrade-Punkt je Stufe statt 1 Gold. Die KI kauft es über die Ausbaureihenfolge (`pickSpend`): `dlMax` bis zu welcher Stufe (0 = nie), `dlPos` an welcher Stelle (0 = zuerst; ab 7 nie erreicht, weil davor „max. HP“ immer greift). Die Gold-Stellschrauben `dlRes` und `dlFirst` sind entfallen.
Ergebnis (1200 Partien je Variante gegen die KI ohne Kauf): dlMax 2 an Stelle 0/2/4/6: 34,7 / 36,1 / 38,9 / 43,3 %; dlMax 3 an Stelle 0/2/4/6: 22,9 / 30,8 / 32,0 / 36,5 %. Standard bleibt `dlMax` 0.

## Nachtraining auf Version 0.3 (getauschte Kosten, 2 Startsiegpunkte)

Neue Stellschrauben: `sacG` (Gold opfern, damit die Upgrade-Punkte für die nächste Magiestufe reichen; Standard 0), `mgGoal` (nur solange der Magiefortschritt darunter liegt), `sacRes` (Gold, das übrig bleiben muss). Opfern für Magie schadet deutlich (`sacG` 1: 19 % gegen die KI ohne; mit `sacRes` 2 47 %, mit 3 bis 4 und `mgGoal` 4 wird es praktisch nie ausgelöst): Gold kauft als HP, Handplatz oder Limit mehr, als der Tempel an Magie liefert. Magie kommt deshalb aus den Abschnittsboni (1/2/3 Punkte) und der Hilfe nach Niederlagen.
Raster (1600 Partien gegen die bisherige KI, Siegquote): Eröffnung `strat` 3 (zwei Farben auf Stufe 2, Handplätze erst nach Showdown 1) 59 %, 2: 47 %, 1: 35 %, 4: 49 %; `hpA` 6: 54 % (2: 43 %); `limitA` 2/3: 35/29 % (Limit mit 2 Gold früh zu kaufen schadet); `manaA` 6: 31 %; `slotA`, `slotB`, `manaA` 2 neutral; Nachziehlimit mit Gold (`dlMax` 2/3): 42 bis 45 %. `strat` 3 und `hpA` 6 halten auch gegen die drei früh angreifenden Pool-Gegner (55 bis 62 %).
`opt2.js` ab `strat` 3/`hpA` 6 (600 Partien je Test, Pool aus Champion und drei frühen Angreifern) übernahm `minMana` 3 (+8,1 Punkte), `dSlot` 1 (+1,8) und `stallDec` 0,15 (+2,8); Runde 4 wurde durch einen Neustart der Umgebung abgebrochen, bis dahin nichts weiter Bestätigtes. Die Siegpunkt-Stellschrauben (`sRisk`, `sZero`, `fleeSafe`, `fleeHp`) brachten auch mit 2 Startsiegpunkten nichts Messbares.
Ergebnis: 64,6 % gegen die KI vor dem Nachtraining (3200 Partien, Regeln 0.3), 50,6 bis 52,0 % gegen drei früh angreifende Gegner (1600 Partien je Gegner, neutral). Selbstspiel (1000 Partien): keine festgefahrenen Partien, Beginner 47 % / Zweiter 45 % / Unentschieden 7 %; Median 927, P90 1590, Maximum 3037 Aktionen (die Partien sind länger als vor 0.3, Median 463). Am Ende im Mittel Magiefortschritt 4,1 von 6, max. HP 10, Limit 2,5, Handplätze 4,6.

## Ausspiellimit 2 zu Beginn (Version 0.3)

`startLimit` 2. Raster (1600 Partien gegen die KI davor): `limitA` 3 37 %, `limitB` 2 37 %, `limitB` 4 47 %, `slotA` 5 48 %, `hpA` 4 48 %, `minMana` 2 45 %, `oHits` 2 47 %, `minMana` 4 51 %; Eröffnung mit 4000 Partien `strat` 2 52,7 % ±1,5, 4: 52,1 %, 0: 51,9 % (gegen die Pool-Gegner `strat` 2: 53,1 und 52,1 %). Übernommen `strat` 2. Selbstspiel (1000 Partien): Beginner 51 % / Zweiter 39 % / Unentschieden 9 %, Median 670, P90 1246 Aktionen, keine festgefahrenen Partien. Der Beginner-Vorteil ist mit dem höheren Start deutlich größer als zuvor (±3 Punkte um 50 % Anteil an den Entscheidungen; jetzt 57 %).

## Monster neu abgestimmt (Version 0.3.1)

Anlass: Die Spieler starten mit Ausspiellimit 2 (0.3); die alten Monster hatten Limit 1/2/3 und passten nicht mehr. Neues Vorgehen: `node tools/balance/monster-tune.js <Partien> '<Liste von {"s1":[hp,mana,limit],"s2":[...],"s3":[...],"up":[F,E,W]}>'` setzt die Endwerte je Stufe frei und misst im KI-Selbstspiel je Stufe Angriffe je Partie und Sieg / Niederlage / Flucht des Monsterführers + Flucht des Angreifers; `node tools/balance/monster-bal.js <Partien> ['<Regeln>'] ['<Patch auf MONSTER>']` zeigt dieselbe Auswertung je Monster (und ist die Messung der Spielwerte).
Befund: Das Limit der Monster ist ein Sprung. Mit Limit 2 (wie die Spieler) verlieren die Angreifer kaum (3 bis 10 % Niederlagen), aber Stufe II mit 6 bis 8 HP verwickelt sie in endlose Angriffe und Fluchten (10 bis 27 Angriffe je Partie, 66 bis 81 % Flucht des Angreifers); mit Limit 3 sind es 5 Angriffe je Partie und 20 bis 50 % Niederlagen. Stufe I mit Limit 3 ist zu hart (25 bis 60 % Niederlagen), mit Limit 2 zu harmlos (8 %): Dort stellt das Startdeck die Gefahr (3 statt 1 bis 2 Karten auf Stufe 2: 8 % → 16 % Niederlagen, kürzere Kämpfe: 31 → 17 Züge).
Ergebnis (1500 Partien, Sieg / Niederlage des Angreifers): Stufe I 25 / 18 %, Stufe II 37 / 23 %, Stufe III 32 / 38 %; Elemente je Stufe ausgeglichen (Niederlagen 17 bis 19, 22 bis 23, 36 bis 41 %). Das Risiko steigt von Stufe zu Stufe (18 → 23 → 38 %). Erdmonster Stufe I Mana 6/7 (mit 5/6 verlor es die Angreifer nur halb so oft: 11 % statt 19 %). Die Mana-Varianten tauschen jetzt 1 HP gegen 1 Mana (ohne Extra-Mana +1 HP, Mana+ −1 HP); vorher war der Unterschied groß (Niederlagen Stufe II 17 / 24 / 31 %), jetzt 24 / 24 / 22 % (Stufe III 41 / 40 / 37 %). Die Deckformen (Grundform, breit, spitz) sind gleich schwer (Niederlagen Stufe II 23 / 22 / 26 %).
KI-Nachtraining dazu (`opt2.js 3 500`): `slotA` 5 (+2,0 Punkte) und `stallDec` 0,05 (+5,2). Die Abstimmung fand außerdem `stallDec` −0,05 (+5,7), das die Anti-Stillstands-Schwelle ausschaltet: nicht übernommen (Partielänge unverändert, aber gegen Wartende ohne Sicherung). Ergebnis: 55,0 % ±2 gegen die KI davor (2400 Partien). Selbstspiel (1000 Partien): Beginner 47 % / Zweiter 50 % / Unentschieden 3 %; Median 394, P90 564 Aktionen (vorher 621 / 1184); keine festgefahrene Partie. Der Beginner-Vorteil des höheren Start-Limits (51 : 39) ist mit den neuen Monstern verschwunden.

## Monster-Varianten als Tausch (Version 0.3.1, Nachtrag)

Jede Variante tauscht ein Merkmal gegen ein anderes, nichts kommt einfach obendrauf: „ausdauernd“ = 1 Mana mehr, dafür 1 HP weniger (Stufen I bis III), „zäh“ = 1 HP mehr, dafür 1 Mana weniger (Stufen II/III). In Stufe I war die zähe Gegenform zu harmlos (HP 4, Mana −1: 9 % Niederlagen, 11 Angriffe je Partie; mit einer Stufe-2-Karte weniger statt Mana 8 %), deshalb gibt es dort nur „ausdauernd“ (Niederlagen des Angreifers: Grundform 16 %, ausdauernd 17 %). Auf der Monsterkarte stehen die tatsächlichen Werte als Text unten (HP, Mana, Limit), oben nur der Tausch („ausdauernd“, „zäh“) mit Hinweis beim Darüberfahren.

## Mehr Einnahmen, steigende Preise (Version 0.3.2)

Abschnittsbonus 2/2, 3/3, 4/4 (vorher 1/2/3) und `priceRise` 1 (jeder Kauf verteuert seine Kategorie um den Grundpreis). KI: `pickSpend` prüft jetzt für jeden Schritt (HP, Handplatz, Mana, Limit, Nachziehlimit) den aktuellen Preis und spart, wenn nichts Bezahlbares da ist (vorher fiel sie auf „HP“ zurück). `opt2.js 4 500` übernahm `manaA` 5 (+4,7 Punkte), `vUp` 10,35 (+2,2) und `stallDec` −0,05 (+6,1; die Anti-Stillstands-Schwelle steigt, die KI wird mit der Zeit wählerischer; Partielänge unverändert, Median 299, Maximum 1075, keine festgefahrene Partie; in 0.3.1 hatte ich es noch zurückgehalten, jetzt zum dritten Mal in Folge und gegen alle Pool-Gegner bestätigt, also übernommen). Nicht besser: `hpA` 4/8, `slotA` 4, `limitB` 2/4 (40/48 %), `dlMax` 2 (45 %), `sacG` 1 (50 bis 51 %), `strat` 0/3.
Ergebnis: 60,2 % gegen die KI davor (2400 Partien), 52,5 bis 61,7 % gegen die drei früh angreifenden Gegner. Selbstspiel (1500 Partien): Beginner 47 % / Zweiter 48 % / Unentschieden 5 %; Median 299, P90 464 Aktionen. Am Ende im Mittel Magiefortschritt 3,6 von 6, max. HP 7,8, Mana 5,2, Limit 2,8, Handplätze 5.
Monster: Stufe III mit 8 HP verlor die Angreifer zu 48 % (mit den neuen Einnahmen); 7 HP 42 %, Mana 5 und 8 HP 42 %, **6 HP und Mana 6: 37 %** (übernommen). Ergebnis (3000 Partien, Sieg / Niederlage des Angreifers): Stufe I 35 / 15, II 50 / 20, III 38 / 37.

## Magiepreise zählen hoch (Version 0.3.2)

`magicCount` 1: der n-te Magiekauf kostet n (1 bis 6, zusammen 21), unabhängig von Farbe und Stufe (vorher je Zielstufe 1, 2, 3 und 3, 6, 9). Neue Stellschraube `mono` (Magie nur in einer Farbe, Test auf Einfarbigkeit): gegen die normale KI 44,9 % (strat 2), 44,6 % (strat 3), 49,5 % (strat 0, neutral), gegen die früh angreifenden Gegner 38,7 und 45,4 %; mit den alten Preisen 46,1 %. Die normale KI endet mit Magie 3/2/1 (42 %), 3/3/1 (33 %), 3/3/3 (8 %). Weitere Raster (2400 Partien): `sacG` 1, `mPlan` ±2, `mCost` 1/3, `hpA` 4 neutral (49,9 bis 50,7 %), `manaA` 4 46,1 %, `strat` 3 52,6 % (±2,0, nicht übernommen), `strat` 0 51,2 %. Monster unverändert (Niederlagen des Angreifers Stufe I 15 %, II 20 %, III 39 %).
