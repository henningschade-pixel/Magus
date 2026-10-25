# Länge der drei Abschnitte (KI gegen KI)

Messung: 1000 Partien (Seeds 1000 bis 1999, Beginner wechselt), Regeln und KI von Version 0.10, `node tools/balance/phasen.js 1000`.
Länge = erfolgreiche Spielaktionen im Abschnitt (ohne Markieren und Sperren), einschließlich des Showdowns am Abschnittsende.
Alle 1000 Partien wurden regulär beendet.

## Ergebnis

| | Abschnitt 1 | Abschnitt 2 | Abschnitt 3 |
|---|---|---|---|
| Aktionen Ø ± Streuung | 297 ± 345 | 161 ± 62 | 90 ± 26 |
| Median (P10 bis P90) | 199 (112 bis 579) | 173 (75 bis 237) | 87 (62 bis 125) |
| Anteil an der Partie | 48 % | 33 % | 19 % |
| davon Weltzüge / Monsterkämpfe / Showdown | 41 / 207 / 50 | 91 / 50 / 20 | 19 / 45 / 26 |
| Monsterangriffe je Partie | 6,1 | 4,6 | 3,8 |
| Angriff endet ohne Sieger (Flucht, Erschöpfung) | 51 % | 35 % | 21 % |

Der längste Abschnitt einer Partie ist im Mittel das Vierfache des kürzesten (Median 2,8, P90 7,5). Die Längen der Abschnitte hängen nicht zusammen (Korrelation 0,07 / 0,00 / −0,15): Es sind unabhängige Ausreißer, keine „langsamen Partien“.

## Gründe

**1. Abschnitt 1: Patt im Monsterkampf (der größte Einzeleffekt).**
12 % aller Stufe-I-Kämpfe dauern über 100 Aktionen (Maximum 669; eine Partie hat 3257 Kampfaktionen in Abschnitt 1). Diese Kämpfe machen 41 % aller Aktionen des Abschnitts aus. Im Protokoll zeigt sich eine Schleife: beide Seiten „ziehen Karten nach (ersetzt den Angriff)“ und „erholen sich +1 Mana“, niemand greift an. Die Angriffsbewertung der KI (`aThr`) wird nicht erreicht, und die Anti-Stillstands-Staffel `stallDec` ist mit −0,05 negativ eingestellt: Sie hebt die Schwelle nach 24 Zügen an, statt sie zu senken. Beendet wird der Kampf erst durch die Sicherung `MAX_COMBAT_TURNS` (400 Züge, „Beide Seiten sind erschöpft“); danach greift die KI das noch lebende Monster erneut an. In Stufe I bringt „Erholen“ nur +1 Mana, daher dauert die Schleife dort am längsten.

**2. Abschnitt 2: Wartezeit vor dem Angriff.**
Die Hälfte der Partien hat über 100 Weltzüge im Abschnitt 2 (Median 106 gegenüber 22 im unteren Zehntel); die Zahl der Angriffe ist in langen und kurzen Abschnitten gleich (4,6). Die Weltzüge zwischen zwei Kämpfen haben in Abschnitt 2 einen Median von 4, aber P90 86 und Maximum 123, in den Abschnitten 1 und 3 P90 18 bzw. 8. Die Wartezeit hängt am Limit: Hat das Monster 1 Limit mehr als der Angreifer (Stufe-II-Monster Limit 3, Spieler meist noch Limit 2), warten die Spieler im Mittel 25,8 Züge (237 von 1191 Angriffen über 40 Züge); bei gleichem Limit 6,5 Züge. In Abschnitt 3 (Monster 4, Spieler 3) ist der Abstand ebenfalls 1, die Wartezeit aber nur 4: Dort haben die Spieler durch die höheren Abschnittsboni (3 Gold und 3 Punkte) und die früheren Beutegewinne genug Mittel. Die KI wartet, weil `oHits` (Abschlag je Treffer über `oFree`) den Angriff unattraktiv macht, bis Aufwertung, Gold oder `cWt` (+2,8 je Weltzug) die Schwelle überwinden. Im Wartezustand tauschen die Spieler nur nach (ca. 40 „Ziehen“ und 40 „Bibliothek“), Einkommen entsteht nur aus den Strafgold-Zügen des roten Nachziehmarkers. Die Regel `idleLimit` (Stillstand) ist ausgeschaltet.

**3. Abschnitt 1 ist auch ohne Ausreißer lang.**
Nach Beseitigung der Patts bleiben im Mittel 104 Kampfaktionen in 6 Angriffen (Abschnitt 2: 32 in 4,6). Kämpfe der Stufe I laufen in kleinen Schritten: Karten der Stufe 1, Limit 2, wenig Mana, und die Hälfte der Angriffe endet ohne Sieger (Flucht des Monsterführers, Erschöpfung), das Monster behält Verletzungen und wird erneut angegriffen. Mehr Start-Mana verlängert Abschnitt 1 noch (213 statt 172).

**4. Abschnitt 3 ist kurz.**
Die Spieler sind am stärksten ausgebaut, nur noch 19 Weltzüge und 3,8 Angriffe, kaum Wartezeit. Kein Ausreißerproblem, aber der Gegenpol zu Abschnitt 1.

## Maßnahmen und gemessene Wirkung

`node tools/balance/phasen-varianten.js 2000 <Name>`; Werte: Aktionen Ø ± Streuung je Abschnitt, Kürzester/Längster = mittleres Verhältnis je Partie (1 = gleich lang). „Beginner“ ist der Siegeranteil des Beginners (Fairness), „Remis“ der Anteil unentschiedener Partien.

| Variante | Abschn. 1 | Abschn. 2 | Abschn. 3 | kürzer/länger | Beginner | Remis |
|---|---|---|---|---|---|---|
| Basis | 291 ± 315 | 160 ± 62 | 90 ± 25 | 0,37 | 50 % | 2,5 % |
| KI: `stallDec` +0,15 (Patt im Kampf auflösen) | 197 ± 76 | 161 ± 60 | 90 ± 25 | 0,41 | 49 % | 3,2 % |
| Kampf: Erschöpfung nach 60 statt 400 Zügen | 216 ± 106 | 160 ± 62 | 89 ± 24 | 0,39 | 50 % | 2,8 % |
| Regel `idleLimit` 40 (Stillstand beendet den Abschnitt) | 288 ± 346 | 100 ± 33 | 85 ± 26 | 0,40 | 51 % | 6,3 % |
| Stufe-II-Monster ohne Limit-Schritt, dafür +1 HP | 297 ± 345 | 148 ± 62 | 102 ± 37 | 0,42 | 50 % | 1,4 % |
| Stufe II: 3 statt 2 Gold | 297 ± 345 | 151 ± 62 | 90 ± 25 | 0,37 | 51 % | 2,5 % |
| Limit-Schritt kostet 1 | 293 ± 343 | 134 ± 59 | 92 ± 25 | 0,38 | 51 % | 2,6 % |
| Erholen +2 / +2 / +3 | 299 ± 399 | 158 ± 60 | 89 ± 24 | 0,38 | 51 % | 4,0 % |
| **Paket B**: `stallDec` +0,15, `idleLimit` 40, Erholen +2/+2/+3 | 175 ± 67 | 99 ± 29 | 84 ± 24 | 0,47 | 51 % | 6,0 % |
| Paket B mit `idleLimit` 60 | 179 ± 69 | 114 ± 34 | 85 ± 24 | 0,47 | 51 % | 5,0 % |
| Paket B mit `idleLimit` 30 | 164 ± 65 | 88 ± 28 | 83 ± 26 | 0,48 | 50 % | 5,9 % |
| Paket B + Start-Mana 6 | 213 ± 80 | 94 ± 29 | 81 ± 24 | 0,38 | 49 % | 4,8 % |
| Paket B + Regeneration +2/+2/+3 | 179 ± 68 | 98 ± 30 | 85 ± 26 | 0,46 | 52 % | 7,0 % |
| **Paket F**: B + Stufe-I-Monster Limit 3, Stufe II ohne Limit-Schritt | 126 ± 54 | 104 ± 42 | 95 ± 28 | 0,58 | 52 % | 5,3 % |

Gesamtlänge der Partie: Basis 542, Paket B 358, Paket F 325 Aktionen.

## Empfehlung

1. **Sofort, ohne Regeländerung: KI-Patt auflösen** (`stallDec` positiv, etwa +0,15). Beseitigt den Ausreißer in Abschnitt 1 (Streuung 315 auf 76) und kostet kein Gleichgewicht (Beginner 49 %). Zusätzlich lohnt, die Sicherung `MAX_COMBAT_TURNS` als echte Regel zu fassen, auch für menschliche Spieler, die Pattkämpfe nicht so lange fortsetzen müssen.
2. **Wartezeit in Abschnitt 2 begrenzen: `idleLimit` 40.** Bringt Abschnitt 2 von 160 auf 100 Aktionen; Preis: mehr Remis (6 % statt 2,5 %), weil der Showdown dann früher mit weniger Siegpunkten beginnt. Alternativ am Limit-Sprung ansetzen (Stufe-II-Monster ohne Limit-Schritt, +1 HP): kein Remis-Anstieg, aber nur −12 Aktionen.
3. **Erholen +2 / +2 / +3** verkürzt die Stufe-I-Schleifen leicht (−10 Aktionen) und ist schlicht eine Zahl in `recoverByStage`.
4. **Angleichung von Abschnitt 1 an 2 und 3:** Die Stufe-I-Monster bekommen Limit 3 (Stufe II dafür ohne Limit-Schritt). Das bringt die drei Abschnitte auf 126 / 104 / 95 Aktionen (Verhältnis 0,58 gegenüber 0,37). **Achtung:** das verschiebt das Monster-Gleichgewicht deutlich (Spieler siegt in Stufe I nur noch 18 % statt 28 %, in Stufe II dafür 52 % statt 44 %, Niederlagen 41 % bzw. 10 %); die Monsterwerte (HP, Mana, Würfel) müssten mit `tools/balance/monster-tune.js` neu abgestimmt werden. Als Richtung gedacht, nicht als fertige Einstellung.

Nicht empfohlen: mehr Start-Mana (verlängert Abschnitt 1), mehr Gold in Stufe II (kaum Wirkung), billigeres Limit (nur −27 Aktionen in Stufe II, löst die Ursache nicht).

Grenzen der Messung: Alles gilt für KI gegen KI. Menschen warten seltener ohne Grund (Wartezeit) und fliehen oder passen anders; die Schleifen in Abschnitt 1 sind ein KI-Verhalten. Die Länge ist in Aktionen gemessen, nicht in Minuten (Kampfaktionen sind schneller als Weltzüge mit Animation).
