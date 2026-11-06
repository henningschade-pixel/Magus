# Magus – Regelwerk (Stand v8, 20.10.2026; Version 0.5.1: Stufe 3 als Maximum)

Dies ist die maßgebliche Fassung der Regeln. Sie ersetzt das Claude-Docs-Dokument „Magus – Regelwerk (bereinigte Fassung)“, dessen Export als Archiv in `docs/regelwerk-v6-aus-claude-docs.md` liegt (Regelstand v6, dort steht auch die gesamte Änderungsgeschichte bis v6). Die Zahlen stehen als Regelflags in `DEFAULT_RULES` und als Abstimmungsdaten (`MONSTER`) in `index.html`.

## Spielidee und Ablauf

Duellspiel für zwei Personen: Deck und Magie ausbauen, Monster besiegen und in bis zu drei Showdowns Siegpunkte holen. Nach dem dritten Showdown entscheidet, wer mehr hat (bei Gleichstand das Gold, danach die Tempelstufe, danach unentschieden).

**Siegpunkte im Überblick (seit v8):** Monsterkampf: besiegt der Angreifer das Monster, erhält er +1; verliert der Angreifer, verliert er 1 (nie unter 0); der Monsterführer gewinnt und verliert dabei nie Siegpunkte. Flucht und Unentschieden zählen nicht. Showdown: Sieger +1, Verlierer −1 (nie unter 0), Unentschieden und Flucht 0/0, kein Trostpreis. Je Abschnitt sind damit höchstens 4 Siegpunkte möglich (drei Monsterkämpfe und der Showdown), nach zwei Abschnitten 8 (`showdownSp`).

Eine Partie hat drei Abschnitte (1, 2, 3). Je Abschnitt gibt es drei Monster (Stufe I, II, III). Sind alle drei besiegt, beginnt sofort der Showdown; danach erscheinen die Monster der nächsten Stufe.

## Startwerte

| Wert | Start | Anmerkung |
|---|---|---|
| Gold | 0 | Abschnittsbonus siehe unten |
| Siegpunkte | 2 | seit 0.3 (`startSp`): schon die ersten Kämpfe kosten bei einer Niederlage etwas; nie unter 0 |
| HP | 4 | seit 0.3.1 (`startHp`, vorher 3); jeder Upgrade-Punkt +2 Maximum (seit 0.3 mit Gold bezahlt) |
| Mana | 4 | jeder Upgrade-Punkt +1 Maximum |
| Magie Feuer / Erde / Wasser | je 1 | höchstens 3 |
| Ausspiellimit | 1 | seit 0.5.1 (`startLimit`, 0.3 bis 0.4.1: 2); höchstens 3, die Schritte kosten 1 und 2 Gold (`limitCost` 1 mit `priceRise`) |
| Handplätze | 3 | je Upgrade-Punkt ein weiterer, höchstens 5 |

**Kartenvorrat (neu):** Vom Vorrat jeder Karte gibt es: Stufe 1 je 8 (`supply`), Stufe 2 je 6 (`supply2`), Stufe 3 je 4 (`supply3`), also F1/E1/W1, F2/E2/W2 und F3/E3/W3. Vor der Partie werden die 24 Stufe-1-Karten gemischt und gleichmäßig verteilt: jeder Spieler erhält 12 als Startdeck (`startCards` 0 = alle; die Startdecks sind daher ungleich, zum Beispiel 5/4/3 statt 4/4/4). Im Vorrat der Bibliothek liegen danach nur Stufe-2- und Stufe-3-Karten (je 6 bzw. 4); Stufe-1-Karten tauchen dort erst auf, wenn welche beim Aufwerten zurückgegeben werden. Die Bibliothek zeigt, wie viele Karten jeder Art noch im Vorrat sind; sind sie weg, ist die Karte vergriffen und nicht kaufbar (auch die Gratiskarten F1/E1/W1 nicht). Beim Aufwerten gehen die bezahlten Karten zurück in den Vorrat, die gekaufte Karte kommt heraus. Monsterdecks haben ihren eigenen Vorrat und zählen nicht mit. `supply` 0 schaltet den Vorrat ab (altes Startdeck 3× F1, E1, W1, unbegrenzte Karten). Karten heißen Element plus Stufe (F2 = Feuer, Stufe 2), Stufen 1 bis 3.

**Abschnittsbonus** (zu Beginn jedes Abschnitts, beide Spieler): nur Gold, 1 / 2 / 3 Gold je Monster, also 3 / 6 / 9 Gold in Abschnitt 1 / 2 / 3, keine Upgrade-Punkte (seit 0.4; davor 2/2, 3/3, 4/4 Gold und Punkte).

**Elementkreis:** Feuer schlägt Erde, Erde schlägt Wasser, Wasser schlägt Feuer. „Überlegen“: Wasser gegen Feuer, Feuer gegen Erde, Erde gegen Wasser.

## Weltphase

Im eigenen Zug genau eine Aktion, danach wechselt der Spieler: Nachziehen, in der Bibliothek tauschen, einen Kampf beginnen, im Tempel Gold opfern, Magie kaufen oder ein Upgrade kaufen (Magiestufe mit Upgrade-Punkten; HP, Mana, Limit, Handkarten, Nachziehlimit mit Gold; jeder Klick ist eine Aktion). Upgrade-Punkte und Gold dürfen aufgespart werden. Eine Erholungsphase gibt es nicht.

**Regeneration:** Bei jedem Zugwechsel erhält der Spieler, der dran kommt, **HP und Mana in Höhe des Abschnitts** (Abschnitt 1: +1/+1, Abschnitt 2: +2/+2, Abschnitt 3: +3/+3; nicht über das Maximum). Dasselbe bekommt der Verteidiger nach einem Kampf. Alle lebenden Monster regenerieren am Ende jeder Runde +1 HP und +1 Mana (Regel `regenByStage` gilt nur für Spieler).

**Nachziehen:** Alle nicht gesperrten Handkarten wandern auf den Ablagestapel, freie Plätze werden aus dem Deck neu gefüllt (Deck leer: Ablagestapel mischen). Rechtsklick sperrt eine Karte. Nachziehen beendet den Zug.

**Freischaltung (neu):** Eine Karte der Stufe t im Element X darf nur erwerben, wer die Magie X auf Stufe t hat. Für F2 braucht man also Feuer-Magie 2, für F3 Feuer-Magie 3. Gesperrte Karten sind in der Bibliothek abgedunkelt (Hinweis: Magie nötig), die Gratiskarten der Stufe 1 sind immer freigeschaltet.

**Bibliothek:** tauscht Karten, kein Gold. Mit markierten Handkarten (begrenzt durch das Ausspiellimit):

| Ergebnis | Kosten |
|---|---|
| F1, E1, W1 | gratis (keine Markierung nötig) |
| Stufe 2 oder 3 im Element X | 2 gleiche markierte Karten der Vorstufe in X (nur bei Limit ≥ 2) oder 1 markierte Karte der Vorstufe im überlegenen Element |

Die bezahlten Karten werden aus dem Deck entfernt, nur die gekaufte kommt auf den Ablagestapel.

**Tempel:** n Gold opfern ergibt n·(n+1)/2 Tempelpunkte; die nächste Tempelstufe kostet (aktuelle Stufe + 1) Punkte, jede erreichte Stufe gibt einen Upgrade-Punkt. Die Tempelstufe ist die Zahl der durch Opfer erlangten Upgrades (kostet die nächste Stufe 4 Punkte, hat man Stufe 3) und zählt als drittes Kriterium der Siegbedingung (nach Siegpunkten und Gold). Die Vorschau (Gold, Punkte, Bruch) zeigt sich schon beim Einstellen mit den Pfeilen.

**Magie kaufen:** Stufe 2 kostet 1, Stufe 3 kostet 3 **Upgrade-Punkte** (seit 0.3, vorher Gold; siehe „Getauschte Kosten“).

## Monsterkampf

Der aktive Spieler wählt ein lebendes Monster und greift an, der Mitspieler führt das Monster. Zu Beginn werden das Monsterdeck und das Deck des Angreifers neu gemischt. Gespielte Karten gehen auf den Ablagestapel. Der Kampf läuft in Zügen: erst Verteidigen, dann Angreifen.

**Angriff:** bis Ausspiellimit Karten markieren. Die zuerst markierte Karte bestimmt das Primärelement; Schaden = je Karte im Primärelement min(Stufe, Magie). Karten anderer Elemente machen keinen Schaden, sie sind Kombokarten.

**Verteidigung:** Karten der Verteidigungsfarbe (Farbe des Angriffs oder die überlegene) blocken je min(Stufe, Magie). Danach dürfen Kombokarten einer zweiten Farbe folgen. Nicht geblockter Schaden geht von den HP ab.

**Manakosten (seit v7):** Jede gespielte Karte kostet 1 Mana, auch Kombokarten der zweiten Farbe. Ausnahme: Karten der Verteidigung im überlegenen Element sind gratis.

**Statt anzugreifen** darf man: nachziehen (gratis, Hand wird getauscht; bei rotem Nachziehmarker kostet es 1 Mana, siehe „Nachziehmarker“), **erholen** oder passen. Jede dieser Aktionen beendet den Angriffszug.

**Fliehen (neu):** Im Monsterkampf darf jede Seite fliehen, wenn das Monster 0 Mana hat, ihm gerade kein Angriff entgegengebracht wird (er ist in seinem Angriffszug) und er nicht unter einem Todesfluss steht. Der Kampf endet ohne Sieger und ohne Beute, das Monster behält seine HP und sein Mana, der Mitspieler ist als Nächster dran (mit der üblichen Regeneration). Im Showdown gilt dasselbe Fliehen: Der Showdown endet dann ohne Sieger, und es gibt keine Siegpunkte (anders als bei einem Showdown, in dem beide fallen). Die KI flieht nicht (`fleeT` 999): Im Selbstspiel verlor sie damit.

**Erholen:** Wer den Angriff auslässt, erhält **Mana in Höhe des Abschnitts** (1 / 2 / 3). In der Verteidigung gibt es **kein Erholen**: Wer dort passt, führt keine Verteidigung aus und nimmt den Schaden hin (ein Spiegel dieser Farbe gleicht bis zu seiner Stufe aus und verliert dafür Stufen), erhält aber kein Mana. Nachziehen, Erholen und Passen beenden den Zug.

**Kampfende:**
- Fällt eine Seite auf 0 HP, hat die andere gewonnen; fallen beide gleichzeitig, gibt es keinen Sieger.
- Haben beide 0 Mana, endet der Kampf **nicht mehr automatisch** ohne Sieger. Er geht weiter: Erholen im Angriffszug bringt Mana, der Todesfluss zehrt am Ende der Angriffsphasen. Beenden lässt er sich durch **Fliehen** (möglich, wenn der Gegner 0 Mana hat). Als technische Sicherung endet ein Kampf nach 400 Schritten ohne Sieger.
- Siegt der Spieler gegen das Monster, gibt es **keine Beute** (`monsterLoot` 0; ohne die Regel gälte das Gold des Monsters 1/2/3, auch für den Monsterführer mit `lootBoth`). Der Angreifer erhält 1 Siegpunkt (`monsterSp`); der Monsterführer verliert nichts. Siegt das Monster, gibt es keine Beute, und das Monster **zieht sich zurück**: Es verlässt das Brett, gilt als besiegt und bringt keine Beute (sonst ließe sich die Hilfe durch absichtliche Niederlagen farmen, die HP stiegen ohne Ende); der Angreifer verliert 1 Siegpunkt (nie unter 0), der Monsterführer gewinnt und verliert dabei nie Siegpunkte. **Ausgleich (seit 0.4, vorher „Hilfe“ für beide):** Gewinnt das Monster, erhält nur der Verlierer (der Angreifer) Gold: 1 / 2 / 3 je Abschnitt (`lossHelp` 1, `lossGold` [0,1,2,3], `lossPoints` 0, `lossBoth` 0; mit `lossBoth` 1 bekämen beide den Ausgleich), ohne Begrenzung. Ohne Sieger (Flucht, beide fallen) gibt es weder Beute noch Siegpunkte, das Monster bleibt am Leben.
- In Monsterkämpfen bleiben HP und Mana erhalten und regenerieren in der Weltphase; vor und nach einem Showdown sind sie voll.

**Ergebnis-Bildschirm:** Nach der letzten Aktion läuft die Animation zu Ende, die Werte passen sich an, der Bildschirm dunkelt ab und zeigt „Sieg“, „Niederlage“ oder „Unentschieden“ (bei Sieg mit Beute). Erst nach einem Klick geht es in die Weltphase zurück.

## Kombos und Ultimate

Die Farbe der ersten markierten Karte bestimmt die Rolle (Feuer aggressiv, Wasser defensiv, Erde heilend), die zweite Farbe die Wirkung. Kombos gelten im Angriff und in der Verteidigung (dort wirken Zerrüttung, Lähmung, Läuterung und Spiegel vor der Verteidigung, die Heilung danach). Kombokarten kosten seit v7 wie alle Karten 1 Mana.

**Kombostufe S:** je Farbe die Summe der markierten Kartenwerte (jede Karte höchstens so hoch wie die Magiestufe), davon die kleinere der beiden Summen, höchstens 3.

| Kombo | Farben | Wirkung bei Stufe S |
|---|---|---|
| Lähmung | Feuer + Erde | **2·S Fluchkarten** (2 / 4 / 6) auf den Ablagestapel der Gegenseite |
| Zerrüttung | Feuer + Wasser | Gegner wirft S Handkarten seiner Wahl ab |
| Spiegel (rot) | Wasser + Feuer | roter Spiegel auf Stufe S (nicht addiert, höchstens Stufe 3 je Farbe) |
| Spiegel (grün) | Wasser + Erde | grüner Spiegel auf Stufe S |
| Heilung | Erde + Wasser | S HP heilen |
| Läuterung | Erde + Feuer | S beliebige Marker vom Brett entfernen, je entferntem Marker ein Nachziehtoken |
| Ultimate | alle drei | je nach Farbe der ersten Karte: **Feuer** Todesfluss, **Erde** Heilfluss, **Wasser** Prisma (Stufe S) |

**Fluchkarten:** Sie kommen erst in den Zugstapel, wenn der Ablagestapel gemischt wird. Auf der Hand belegen sie einen Platz und wirken nicht. Beim Nachziehen werden sie dauerhaft verworfen, am Kampfende verschwinden alle.

**Spiegel:** Dauerhaft (bis Kampfende), je Farbe eine Stufe (1 bis 3; die Farben zählen getrennt, bis zu 3 Stufen je Farbe, auch gleichzeitig). Er wirkt gegen Angriffe in seiner Farbe: (1) Fehlt dem Verteidiger Verteidigung, gleicht der Spiegel den fehlenden Schaden aus, höchstens in Höhe seiner Stufe, und verliert dafür je ausgeglichenem Schaden eine Stufe (die HP des Verteidigers werden um diesen Betrag geschont). (2) Verteidigt der Verteidiger mehr als nötig, wirft der Spiegel den Überschuss unblockbar auf den Angreifer zurück, höchstens in Höhe seiner Stufe und höchstens in Höhe des eingehenden Schadens, und verliert dafür je zurückgeworfenem Schaden eine Stufe. Beides schließt sich aus. Beim Erholen (ohne Verteidigung) gleicht der Spiegel ebenfalls aus. Wasserangriffe lassen sich nicht spiegeln.

**Läuterung:** Wählbar sind alle Marker auf dem Brett, auch eigene: Todesmarker, Spiegelmarker und **gegnerische Nachziehtokens**. Gegnerische Tokens werden nur zerstört, sie werden nicht gutgeschrieben. Für jeden anderen entfernten Marker erhält der Angreifer ein Nachziehtoken. Keine Heilung.

**Ultimate (Todesfluss):** Die Stufe ist das Minimum aus den drei Magiewerten und den drei höchsten Kartenstufen, höchstens 3. Der Gegner verliert S HP am Ende jeder eigenen Angriffsphase bis Kampfende; nur Läuterung kann Marker entfernen. Die Ultimate **gilt auch in der Verteidigung** (alle drei Farben, die Verteidigungsfarbe blockt, die beiden anderen sind Kombokarten): Nach der Verteidigung erhält der Angreifer den Todesfluss.

**Ultimate nach Farbe (seit 0.7):** Die Farbe der ersten Karte entscheidet. Die Stufe S gilt wie bisher (Minimum der drei Kartensummen, höchstens 3); mehrere Marker einer Art werden nicht addiert, es gilt der höchste. Alle drei Marker entfernt nur die Läuterung (sie sind wählbar wie die Todesmarker).
- **Feuer: Todesfluss** wie bisher (S Todesmarker beim Gegner, S HP Verlust am Ende jeder seiner Angriffsphasen).
- **Erde: Heilfluss.** S grüne Marker mit Plus bei dir selbst: Am Ende jeder deiner Angriffsphasen heilst du S HP (höchstens bis zu den max. HP) bis Kampfende.
- **Wasser: Prisma.** Ein Schild der Stufe S bei dir selbst, der gegen **jede** Farbe wirkt und nach der Mechanik der Spiegel arbeitet (gleicht fehlende Verteidigung bis S aus, wirft Überschuss bis S zurück), aber **keine Stufen verliert**. Gegenüber einem Farbspiegel zählt der höhere Wert; bei Gleichstand der Prisma. In der Verteidigung wirkt er schon gegen den laufenden Angriff.


## Monster

Variante je Monster wird beim Erscheinen gewürfelt (seit 0.4: Deckform und zwei Würfel, siehe „Monster-Würfel“ unten).

| Stufe | HP | Mana | Limit | Magie (Haupt/Neben/dritte) | Startdeck |
|---|---|---|---|---|---|
| I | 3 | 5 (Erdmonster 6) | 2 | 2 im eigenen Element | Startdeck, 3 Karten des eigenen Elements auf Stufe 2 |
| II | 4 | 5 | 3 | 3 / 2 / 1 | siehe `MONSTER.deck` |
| III | 6 | 6 | 4 | 3 / 2 / 1 | siehe `MONSTER.deck` |

Die Tabelle zeigt die Grundform (`spawnMonsters` ohne Zufall); im Spiel kommen Deckform und Würfel dazu.

**Neu abgestimmt in 0.3.1** (Spieler starten mit Ausspiellimit 2). Die Beute entfällt (`monsterLoot` 0), die Stufen I bis III zahlten früher 1/2/3 Gold. Das Monster-Limit steigt von Stufe zu Stufe um 1 (2/3/4); die frühere Reihe 1/2/3 passt nicht mehr zu Spielern mit Limit 2. Ein Monster mit Limit 2 und vielen HP führt den Angreifer in endlose Angriffs-/Fluchtschleifen (Stufe II mit Limit 2: bis 27 Angriffe je Partie), erst Limit 3 gibt ihm die nötige Gefahr. Gemessen (KI gegen KI, je Angreifer: Sieg / Niederlage): Stufe I 25 % / 16 %, Stufe II 37 % / 23 %, Stufe III 32 % / 41 %; der Rest sind Fluchten (meist des Monsterführers, der das schwache Monster danach selbst besiegt). Das Risiko für den Angreifer steigt also von Stufe zu Stufe (16 → 23 → 41 %). Messwerkzeuge: `tools/balance/monster-bal.js`, `tools/balance/monster-tune.js`.

Monsterdecks passen zur Magie (Test in `tests/engine.test.js`): Zu jeder Magiestufe ab 2 gibt es mindestens eine Karte dieser Stufe, und keine Karte steht über der Magie ihrer Farbe (Stufe III: Nebenelement höchstens Stufe 2, drittes Element Stufe 1). Das Erdmonster I hat dafür wie die anderen eine Stufe-2-Karte (E2 statt eines F1).

Hauptelement / Nebenelement: Feuermonster Feuer und Erde, Erdmonster Erde und Wasser, Wassermonster Wasser und Feuer. Monster haben Ausspiellimit + 2 Handplätze (mindestens 3).

## Showdown

Beginnt sofort nach dem dritten Monster eines Abschnitts. Vorher erscheint ein Ankündigungsbildschirm („Showdown N von 3“, wer zuerst angreift, was auf dem Spiel steht). Beide Spieler starten mit vollen HP, vollem Mana und frisch gemischtem Deck. Zuerst greift an, wer hinten liegt (Siegpunkte, Tempelpunkte, Magiefortschritt, Gold, sonst Zufall). Der Showdown läuft wie ein Monsterkampf gegen den anderen Spieler.

- Sieger: +1 Siegpunkt, Verlierer −1 (nie unter 0), kein Goldraub. Kein Sieger (beide fallen): 0/0. **Fliehen** zählt nie als Sieg oder Niederlage: weder Siegpunkte noch Gold (auch im Showdown).
- Nach dem Showdown sind HP und Mana voll. Der Verlierer beginnt die nächste Weltphase. Den **Trostpreis gibt es nicht mehr** (`loserUp` und `loserUp2` stehen auf 0).
- **Vorzeitiges Ende:** vorerst deaktiviert (`winSp` 0, vorher 4 ab `winSpFromShowdown` 2). Das Spiel endet immer nach dem dritten Showdown; mit `winSp` > 0 gewinnt sofort, wer ab Showdown 2 diese Siegpunkte erreicht.
- Der Ergebnis-Bildschirm nennt Sieger, Siegpunkte und den nächsten Abschnitt.

## Zugwechsel (Oberfläche)

Ein goldener Rand zeigt, wer am Zug ist (unten du, oben Gegner). Am Zugende teilt er sich in der Mitte, zwei Lichtköpfe laufen links und rechts zur anderen Seite; eine Einblendung „Du bist am Zug“ gibt es nicht (entfernt am 16.10.). Einstellung aus der Zugwechsel-Werkstatt (`werkstatt/zugwechsel-werkstatt.html`). Entfällt bei reduzierter Bewegung und im Schnellmodus.

## Änderungen seit v7 (Siegpunkte)

- Monsterkampf bringt Siegpunkte (Sieg über das Monster +1, Niederlage gegen das Monster −1, nie unter 0; der Monsterführer gewinnt und verliert nie Siegpunkte); die Beute geht an beide Spieler; Trostpreis nach Showdown gestrichen; vorzeitiges Ende ab 4 Siegpunkten nach Showdown 2 (zuerst 8, am 20.10. auf 4 gesenkt, weil 8 im KI-Spiel nie erreicht wurde). Hintergrund: Ein geschwächtes Monster zu hinterlassen war besser als ein Sieg. Fliehen bleibt ohne Wertung. Im KI-Selbstspiel entfällt Abschnitt 3 dadurch in etwa 32 % der Partien (600 Partien, KI nicht neu abgestimmt).

## Änderungen seit v6

- Monster: Stufe II 8 HP (Mana unverändert), Stufe III 11 HP und 6–7 Mana (vorher 14 HP, 9–10 Mana); Auswertung in `tools/balance/mon3.js`.
- Kartenkosten: jede gespielte Karte 1 Mana, nur überlegene Verteidigung gratis (`comboCardCost`).
- Erholen im Kampf gibt Mana je Abschnitt 1/2/3 (`recoverByStage`), nur im Angriffszug; Passen in der Verteidigung gibt kein Mana.
- Regeneration in der Weltphase je Abschnitt 1/2/3 HP und Mana (`regenByStage`).
- Lähmung 2/4/6 Fluchkarten; Läuterung mit Auswahl eigener Marker und gegnerischer Nachziehtokens; Ultimate in der Verteidigung.
- Trostpreis nach Showdown 2: 2 Upgrade-Punkte (`loserUp2`).
- Oberfläche: Ergebnis-Bildschirme nach Kampf und Showdown, Showdown-Ankündigung, Zugwechsel-Animation, Opfer-Vorschau, zweizeilige Kampfeffekte ab 6 Geschossen, neue Grafiken für besiegte Monster.
- Technik: Bilder, Sounds und Cursor liegen in `assets/` (Einzeldatei-Build per `tools/build-single.js`).
- KI per Selbstspiel neu abgestimmt (schlägt die vorige Fassung in etwa 80 % der Partien, `tools/balance/`).
- Bekannt: Der Beginner hat einen Vorteil von etwa 7 Prozentpunkten gegenüber dem Zweiten (KI-Selbstspiel).

**Zuschauermodus (vorläufig):** Auf dem Startbildschirm „Zwei Computern zuschauen“: Computer A und Computer B spielen gegeneinander, Eingaben sind gesperrt, Ergebnis- und Ankündigungsbildschirme schließen sich nach kurzer Zeit selbst. Im Menü lässt sich das Tempo der Computerzüge einstellen (normal, ×3, maximal; ab ×3 ohne Animationen und Töne). Die Statistik und das Protokoll funktionieren wie im normalen Spiel.

**Statistik (Stand 17.10.):** Die Kurven „HP“ und „Mana“ zeigen die aktuellen Werte zum Messzeitpunkt (nicht mehr die Höchstwerte). Ein Kampf (★ Showdown, ● Monsterkampf) lässt sich anklicken: Die Kampfansicht zeigt HP und Mana beider Seiten nach jedem Schritt, die Angriffe (▲ Schaden) und Verteidigungen (◆ Block) sowie eine Zusammenfassung (geblockt, durchgegangen, Endwerte). „Zurück zur Statistik“ führt zum Gesamtverlauf.

## Stillstandsregel (Vorschlag, Schalter `idleLimit`, Standard 0 = aus; am Tisch kaum umsetzbar, deshalb verworfen)

Gegen Patt-Schleifen (beide warten mit „Nachziehen“, einer greift an und flieht, wieder warten; die längste Partie in 1000 hatte 12940 Aktionen, davon 11000 Nachziehzüge). Am Tisch: ein **Stillstandsmarker**. Er rückt nach jedem Zug einer Weltphase um 1 vor und geht nur zurück, wenn ein Kampf einen Sieger hat (Monster besiegt oder Niederlage gegen das Monster, Showdown). Flucht und Erschöpfung setzen ihn nicht zurück. Erreicht er `idleLimit` Züge (30 = 15 Runden), beginnt sofort der Showdown des Abschnitts, auch wenn Monster übrig sind.
Messung (KI gegen KI, 1000 Partien): ohne Regel P90 1615, Maximum 12940 Aktionen; mit Limit 20/30/40 P90 454/459/459, Maximum 850; Unentschieden 7,8 % statt 9,2/10,1/11,1 %. Zwischen zwei entschiedenen Kämpfen vergehen normalerweise 7 Züge (75 % höchstens 10), die Regel löst aber in rund 70 % der KI-Partien aus, weil die KI lange wartet. Die KI ist darauf nicht trainiert.

## Nachziehmarker (neu, Schalter `drawMarker`, Standard 1)

Jeder Spieler hat einen beidseitigen Marker (grün/rot) beim Nachziehstapel. Er startet grün. **Nachziehen** dreht ihn auf rot; **jede andere Zugaktion** dreht ihn auf grün (Weltphase: Bibliothek, Kampf beginnen, Tempel, Magie kaufen, Upgrade; Kampf: Angreifen, Verteidigen, Passen, Erholen, Fliehen). Markieren, Sperren und das Gratis-Nachziehen mit einem Nachziehtoken ändern ihn nicht. Der Marker bleibt zwischen Weltphase und Kampf liegen.
**Strafe:** Wer nachzieht, obwohl sein Marker rot ist, zahlt dafür. In der Weltphase gibt er dem Gegner `drawPenaltyGold` (1) Gold (ein Geschenk an den Gegner). **Im Kampf (seit 03.11.2026) verliert er `drawPenaltyMana` (1) Mana; ohne genug Mana ist das Nachziehen bei rotem Marker nicht möglich** (Erholen, Angreifen, Passen und Fliehen bleiben möglich). Das Mana geht verloren, der Gegner bekommt nichts. Das gilt auch für das Monster im Monsterkampf (es zahlt von seinem Mana). Der Marker bleibt nach dem Nachziehen rot. Bis 02.11.2026 bekam der Gegner im Kampf stattdessen ein Nachziehtoken. Das Gratis-Nachziehen mit einem Token kostet kein Mana und ändert den Marker nicht.
KI: Sie zieht bei rotem Marker nur noch nach, wenn sie keine andere Aktion hat (Weltphase: lieber 1 Gold im Tempel opfern, ohne Gold gratis in der Bibliothek tauschen oder ein Monster angreifen; Kampf: lieber erholen; ohne Mana zieht sie bei Rot gar nicht nach), siehe `tools/balance/README.md`. Die KI-Gewichte sind für die neue Kampfstrafe noch nicht nachtrainiert.
Messung (KI gegen KI, 1000 Partien, KI nachtrainiert): P90 657 statt 1615, Maximum 4050 statt 12940 Aktionen, Unentschieden 3,4 % statt 7,8 %. Die Schleife verschwindet nicht ganz: Beim Warten wandert Gold hin und her und wird im Tempel angelegt; die Stillstandsregel (`idleLimit`) bleibt als zweite Sicherung möglich.

## Nachziehlimit (neu in 0.2.1)

Neuer Wert je Spieler, **Nachziehlimit** 1 bis 3 (Start 1, höchstens `MAX_DRAW_LIMIT` 3). Er sagt, wie oft ein Spieler hintereinander nachziehen darf, bevor sein Nachziehmarker auf Rot springt (Limit 1 = bisherige Regel: das erste Nachziehen dreht den Marker auf Rot).
**Steigern:** In der Weltphase im eigenen Zug für `drawLimitCost` Upgrade-Punkte (aus dem Tempel) je Schritt (vorläufig `[1, 1]`: 1 Punkt für Stufe 2, 1 Punkt für Stufe 3), wie max. HP, Mana, Ausspiellimit und Handplätze; Gold kostet es nicht. Das ist eine Zugaktion wie ein Upgrade und dreht den Marker auf Grün zurück. (Bis 23.10. kostete es Gold.)
**Ablauf:** Jedes Nachziehen zählt hoch; sobald die Zahl das Limit erreicht, ist der Marker rot. Nachziehen bei rotem Marker kostet (Weltphase 1 Gold für den Gegner, Kampf 1 Mana für den Nachziehenden, ohne Mana nicht möglich). Jede andere Zugaktion setzt die Zahl auf 0 und den Marker auf Grün. Das Gratis-Nachziehen mit einem Token zählt nicht.
**Anzeige:** Drei Kreise unter dem Nachziehstapel (beide Spieler); Stufen über dem Limit sind abgedunkelt, auf der nächsten sitzt der Plus-Knopf (wie bei den anderen Upgrades: nur im eigenen Zug und nur mit genug Upgrade-Punkten). Der Marker liegt auf der Stufe des nächsten freien Nachziehens (Limit 3, noch nichts nachgezogen: Stufe 1; zwei Mal nachgezogen: Stufe 3, noch grün; drei Mal: Stufe 3, rot). In der Statistik gibt es die Kurve „Nachziehlimit“.
KI: kauft das Nachziehlimit nicht. Nachtraining mit dem Preis in Upgrade-Punkten (23.10., 1200 Partien je Variante, `dlMax` Stufe, `dlPos` Stelle in der Ausbaureihenfolge): Jeder Kauf schwächt sie, am wenigsten bis Stufe 2 an Stelle 6 (43 %), sonst 23 bis 39 %. Ein Punkt fürs Nachziehlimit fehlt als +2 max. HP. Schon mit dem Goldpreis brachte der Kauf nichts (bis Stufe 2: 45 %, bis Stufe 3: 33 %), auch nicht der alten KI, die noch viel Strafgold verschenkte: Ist der Marker einmal rot, kostet jedes weitere Nachziehen in Folge wieder; das Limit schiebt die Strafe nur um zwei Züge auf.

## KI gegen Dauerpasser (23.10.)

Wer im Angriffszug immer passt, setzt die KI nicht unter Druck. Früher wartete sie dann mit schwachen Karten (ein Angriff mit einer Stufe-1-Karte ist für sie 0 Punkte wert, die Schwelle liegt bei 0,5): Sie wechselte rund 15 eigene Züge lang zwischen Nachziehen und Erholen, bis die Anti-Stillstands-Schwelle (`stallFrom` 24, `stallDec`) sank. Neu: Jeder Passen-Zug des Gegners in Folge senkt die Angriffsschwelle um `pasDec` (1); die Engine zählt ihn je Seite in `passed`, ein Angriff setzt ihn zurück. Die KI greift damit nach dem ersten Passen an. KI gegen KI ändert sich nicht (die KI passt nie im Angriffszug, `golden.json` unverändert).

## Getauschte Kosten (Version 0.3, Schalter `swapCosts`, Standard 1)

Nur die **Bezahlung** ist vertauscht, nicht was man wann bekommt. Gold und Upgrade-Punkte kommen weiter aus denselben Quellen (Abschnittsbonus 1/2/3 Gold und Punkte, Hilfe nach einer Niederlage gegen ein Monster, Strafgold, Tempel: n Gold ergeben n(n+1)/2 Tempelpunkte, jede Tempelstufe einen Upgrade-Punkt).

| Verbesserung | früher | seit 0.3 |
|---|---|---|
| Magie Stufe 2 / 3 | 1 / 3 Gold | 1 / 3 Upgrade-Punkte |
| max. HP (+2), max. Mana (+1), Handplatz | 1 Upgrade-Punkt | 1 Gold |
| Ausspiellimit | 2 Upgrade-Punkte je Schritt | 2 Gold je Schritt |
| Nachziehlimit | 1 Upgrade-Punkt je Schritt | 1 Gold je Schritt |

Die Knöpfe tauschen mit: Die goldene Münz-Scheibe sitzt jetzt an den Verbesserungen (HP, Mana, Limit, Handplatz, Nachziehlimit), das grüne Plus der Upgrade-Punkte rund um das Magiebrett. `swapCosts` 0 stellt die alte Zuordnung wieder her.
Folge: Der Tempel ist jetzt der Weg zur Magie (Gold opfern, Punkte sammeln), Gold kauft die Werte im Kampf direkt. Die Siegbedingung ändert sich nicht (Gold bleibt das zweite, die Tempelstufe das dritte Kriterium).
KI: Auf 0.3 nachtrainiert (siehe `tools/balance/README.md`): Eröffnung mit zwei Farben auf Stufe 2, Gold in max. HP und Handplätze, kein Opfern für Magie (Magie kommt aus den Abschnittsboni und der Hilfe); 64,6 % Siegquote gegen die KI vor dem Nachtraining.

## Startsiegpunkte (Version 0.3, Schalter `startSp`, Standard 2)

Jeder Spieler beginnt mit 2 Siegpunkten (vorher 0), damit schon die ersten Kämpfe ein Risiko sind: Eine Niederlage gegen ein Monster oder im Showdown kostet einen Siegpunkt, der vorher „nie unter 0“ wegfiel. Die Schwelle für das vorzeitige Ende (`winSp` 4 nach Showdown 2) und die übrigen Siegpunktregeln bleiben, die 4 sind also mit 2 Punkten Vorsprung schneller erreicht. KI-Selbstspiel (400 Partien): keine festgefahrenen Partien, Unentschieden 4,8 % statt 7,5 %, Beginner 46 % / Zweiter 49 %; die KI ist nicht darauf abgestimmt.

## Überschusspunkte werden Siegpunkte (Version 0.3, Schalter `surplusSp`, Standard 1)

Mit den getauschten Kosten kaufen Upgrade-Punkte nur noch Magie. Stehen **alle drei Magien auf Stufe 3**, wandeln sich offene und neu erhaltene Upgrade-Punkte (Abschnittsbonus, Hilfe, Tempel) sofort in Siegpunkte um, `surplusSp` Siegpunkte je Punkt (1; 0 = aus). Das Protokoll nennt die Umwandlung. **Überschüssiges Gold wird nicht umgewandelt**, es bleibt Gold (Gleichstand-Kriterium, Verbesserungen). Die Umwandlung gibt es nur mit `swapCosts`, weil die Punkte sonst Verbesserungen kaufen.
KI-Selbstspiel (400 Partien): In rund 24 % der Partien erreicht mindestens ein Spieler die volle Magie und wandelt Punkte um. Die KI plant das nicht ein (Opfern für Magie bleibt neutral, 50,0 bis 50,5 %).

## Ausspiellimit startet bei 2 (Version 0.3, Schalter `startLimit`, Standard 2)

Beide Spieler beginnen mit Ausspiellimit 2 (vorher 1; mit `startLimit` 0 gilt wieder 1). Damit gehen zwei markierte Karten sofort: Angriff mit zwei Karten, Kombos und die Bibliothek-Tausch „2 gleiche Karten der Vorstufe“ stehen von Anfang an offen. Weitere Schritte (bis 5) kosten wie bisher 2 Gold.
KI-Selbstspiel (1000 Partien): Der Vorteil des Beginners wächst, Beginner 51 % / Zweiter 39 % / Unentschieden 9 % (vorher 47 / 45 / 7); Median 670 Aktionen (vorher 927). Die KI wurde nachgestimmt: Eröffnung `strat` 2 (eine Farbe zuerst) statt 3 (+2,7 Punkte in 4000 Partien, 52 bis 53 % gegen die Pool-Gegner); Limit-Stellschrauben und `minMana` blieben.

## Monster neu abgestimmt (Version 0.3.1)

Siehe Abschnitt „Monster“ (Werte je Stufe) und `tools/balance/README.md` (Messung). KI-Selbstspiel (1000 Partien): Beginner 47 % / Zweiter 50 % / Unentschieden 3 %, Median 394 Aktionen; der Beginner-Vorteil durch das Start-Limit 2 ist mit den neuen Monstern ausgeglichen.

## Start-HP 4 (Version 0.3.1, Schalter `startHp`, Standard 4)

Die Spieler beginnen mit 4 HP (vorher 3), damit sie dem Angriff der Stufe-I-Monster etwas entgegensetzen können. Die Monster behalten ihre eigenen Werte (Stufe I: 3 HP). Wirkung auf die Monster (KI-Selbstspiel, 1500 Partien, Niederlagen des Angreifers): Stufe I 12 % (vorher 16), Stufe II 20 % (20), Stufe III 34 % (39); das Risiko steigt weiter von Stufe zu Stufe. Die KI bleibt am Optimum ihrer Stellschrauben (`hpA`, `slotA`, `manaA`, `minMana`, `oHits` geprüft, keine Verbesserung).
Anzeige: Auf den Monsterkarten stehen HP und Mana an den Balken, unten stehen Limit, Hand und Nachziehen (es hat keinen Balken).

## Mehr Einnahmen, steigende Preise (Version 0.3.2, Schalter `priceRise`, Standard 1)

Mehr Aktionspotential: Der Abschnittsbonus (und damit die Hilfe nach einer Niederlage gegen ein Monster) steigt auf **2/2, 3/3 und 4/4** Gold/Upgrade-Punkte je Abschnitt (`stageGold`, `stagePoints`; vorher 1/2/3). Dafür **verteuert jeder Kauf die nächste Stufe seiner Kategorie um deren Grundpreis**: Preis = Grundpreis × (1 + bisherige Käufe der Kategorie).

| Kategorie (Währung seit 0.3) | 1. Kauf | 2. | 3. | 4. |
|---|---|---|---|---|
| max. HP (+2), Gold | 1 | 2 | 3 | 4 |
| max. Mana (+1), Gold | 1 | 2 | 3 | 4 |
| Handplatz, Gold | 1 | 2 | 3 | – |
| Ausspiellimit, Gold | 2 | 4 | 6 | – |
| Nachziehlimit, Gold | 1 | 2 | – | – |
| Magie auf Stufe 2 (beliebige Farbe), Upgrade-Punkte | 1 | 2 | 3 | – |
| Magie auf Stufe 3 (beliebige Farbe), Upgrade-Punkte | 3 | 6 | 9 | – |

Gezählt werden die Käufe jedes Spielers, nicht der Wert selbst. Der Tempel (Gold → Punkte) und die Monster sind unverändert. `priceRise` 0 schaltet die Verteuerung ab (alle Preise bleiben beim Grundpreis).
Folge: Volle Magie (24 Punkte) ist kaum erreichbar, die Umwandlung von Überschusspunkten in Siegpunkte greift selten. Die Anzeige nennt immer den aktuellen Preis (Kostenzahl am Knopf, Hinweis beim Darüberfahren, rote Vorschau).
Monster Stufe III neu abgestimmt (6 statt 8 HP): mit den höheren Einnahmen verloren die Angreifer sonst 48 % der Kämpfe; jetzt Niederlagen des Angreifers Stufe I 15 %, II 20 %, III 37 %.
KI nachgestimmt (`manaA` 5, `vUp` 10,35, `stallDec` −0,05; 60 % gegen die KI davor). Selbstspiel (1500 Partien): Beginner 47 % / Zweiter 48 % / Unentschieden 5 %, Median 299 Aktionen, keine festgefahrene Partie.


## Monster-Würfel (Version 0.4)

Jedes Monster hat eine **Deckform** und wird von **zwei Würfeln** verändert. Alles wird beim Erscheinen der Monster eines Abschnitts gewürfelt (aus dem Spielzufall abgeleitet, daher in Mehrspielerpartien auf beiden Geräten gleich).

**Deckform (6 mögliche Monster je Stufe):** Zu jedem der drei Monster (Feuer, Erde, Wasser) gibt es einen **Spezialisten** (spitze Form) und einen **Generalisten** (breite Form), also zum Beispiel „Feuerspezialist II“ und „Feuergeneralist II“, zusammen 3 × 2 = 6 mögliche Monster je Stufe. Davon werden **drei ohne Zurücklegen ausgelost** (20 mögliche Kombinationen, gleich wahrscheinlich): Ein Element kann doppelt vorkommen (dann als Spezialist und als Generalist), ein anderes fehlen. Die Plätze auf dem Brett bleiben Feuer/Erde/Wasser-Plätze in der Reihenfolge der Elemente; das Element steht im Monster selbst. *Spezialist:* stärkere Spitze (mehr Karten der höchsten Stufe), dafür eine schwächere Basis. *Generalist:* mehr Karten im Nebenelement, vielseitiger, dafür schwächere Spitze. Stufe I: Spezialist 4× Hauptelement Stufe 2, 2× Stufe 1, 3× Nebenelement; Generalist 2× Hauptelement Stufe 2, 2× Stufe 1, 3× Nebenelement, 2× drittes Element. Das frühere Nebenelement-Tauschen („Wasser-lastig“) und die Tempel-Varianten „zäh“ und „ausdauernd“ entfallen.

**Pluswürfel und Minuswürfel (je 6 Seiten):** Der Pluswürfel macht das Monster in einem Wert stärker, der Minuswürfel in einem Wert schwächer. Beide haben dieselben sechs Seiten mit demselben Betrag, der Minuswürfel dreht nur das Vorzeichen um. Die Beträge sind **in allen Stufen gleich**:

| Seite | Pluswürfel | Minuswürfel | Wirkung |
|---|---|---|---|
| a | +1 HP | −1 HP | maximale Lebenspunkte (mindestens 1) |
| b | +1 Mana | −1 Mana | maximales Mana (mindestens 1) |
| c | +1 Limit | −1 Limit | Ausspiellimit (mindestens 1, höchstens 5) |
| d | +1 Ziehen | −1 Ziehen | Nachziehlimit des Monsters (Grundwert 2, zwischen 1 und 3) |
| e | +1 Hand | −1 Hand | Handkarten des Monsters (mindestens 2) |
| f | leer | leer | keine Wirkung, wird nicht angezeigt |

Würfelt man denselben Wert auf beiden Würfeln (zum Beispiel +HP und −HP), heben sich die Ausschläge auf: sie werden weder angewendet noch angezeigt, es bleibt nur die Deckform. Die leere Seite macht die Würfel zusätzlich asymmetrisch: Wirkt nur einer der beiden, ist das Monster stärker oder schwächer als die Grundform (Wahrscheinlichkeit je Würfel 1/6).

**Darstellung (Würfel-Anzeige):** Die Würfel werden zu Beginn jedes Abschnitts als animierte Würfel (rot = Plus: das Monster wird stärker, ein Nachteil für den Spieler; grün = Minus: das Monster wird schwächer, ein Vorteil) auf die Monsterkarten geworfen und bleiben dort liegen; sie ersetzen die Beschriftung unter dem Namen. In der Weltphase zeigt die Monsterkarte die unveränderten Standardwerte (ohne Würfel); im Kampf sind die Würfel verschwunden und es gelten die veränderten Werte. Die Seiten zeigen Symbole (Herz HP, Tropfen Mana, Pfeil Limit, Kreispfeil Ziehen, Karten Hand, leer) und den Betrag (+2, −1 …). Zeigen beide Würfel denselben Wert, sind sie abgedunkelt. Am Ende des Wurfs kommt jeder Würfel ohne Kippung zur Ruhe, sodass die Symbole gerade stehen (`restTiltX`/`restTiltY` in der Werkstatt); die Ecken sind durch einen inneren Kern geschlossen. Jedes Monster bekommt leicht abweichende Würfel (Farbton, Lage, Endlage mit leichter Verdrehung und Kippung von wenigen Grad, Wurfbahn und Drehgeschwindigkeit; `vary`, aus dem Spielzufall abgeleitet, daher bei allen Spielern gleich). Der Mauszeiger erklärt die Wirkung (Hinweis am Würfel, Form und Würfel am Monstername). Aussehen und Wurf lassen sich in `werkstatt/wuerfel-werkstatt.html` einstellen (Export in `DiceKit.P`, `src/ui/31a-wuerfel.js`; `node tools/build-wuerfel-werkstatt.js` erzeugt die Werkstatt neu, `npm test` prüft, dass sie zum Spiel passt).

**Frühere Beschriftung:** Unter dem Namen steht, was gewürfelt wurde, zum Beispiel „Wasser-Spezialist II“ und darunter *+Mana, −HP*; heben sich die Würfel auf, bleibt die Zeile frei. Beim Darüberfahren erklärt ein Hinweis Form und genaue Zahlen. Die Grundform ohne Zufall (Tests, Werkzeuge) heißt weiter „Feuermonster“. Die Monsterkarte zeigt die tatsächlichen Werte.

**Ziehen (Nachziehlimit):** Jedes Monster hat ein Nachziehlimit (`stats.drawLimit`, Grundwert 2, `startDraws`; die Würfel ändern es auf 1 bis 3). Es gilt wie bei den Spielern: So oft darf das Monster hintereinander nachziehen, ohne dass etwas anderes dazwischen geschieht, danach springt sein **eigener Nachziehmarker** auf Rot, und jedes weitere Nachziehen schenkt dem Gegner ein Nachziehtoken. Im Monsterkampf gehört der Marker der Monsterseite dem Monster (nicht dem Spieler, der es führt) und startet in jedem Kampf auf Grün; die Anzeige unter dem Nachziehstapel der Monsterseite zeigt sein Limit. Auf der Monsterkarte stehen unten „Limit · Hand · Ziehen“. Die Grundwerte der Monster (HP, Mana, Limit) sind die von 0.3.2, das Nachziehlimit ändert sie nicht.

**Limit bis auf 1:** Der Minuswürfel darf das Limit eines Stufe-I-Monsters von 2 auf 1 senken (nie auf 0). Bekannte Nebenwirkung: Ein Monster mit Limit 1 ist für die KI kaum zu besiegen, in Stufe I endeten 4,7 % der Kämpfe in Erschöpfung (Patt), und die längsten Partien dauerten bis 7800 Aktionen (Median 398, 99. Perzentil 2750 statt 350 und 980 mit Untergrenze 2). Bewusst so gewählt.

**Messung (`tools/balance/monster-dice.js`, 5000 Partien KI gegen KI; Angreifer: Sieg / Niederlage je Angriff):** ohne Würfel Stufe I 33,3 / 13,1 %, II 46,0 / 21,4 %, III 35,7 / 40,2 %; mit Würfeln I 28,5 / 13,9 %, II 48,2 / 20,7 %, III 37,1 / 37,5 %. Die festen Beträge machen Stufe I gefährlicher (+6 Punkte, Niederlagen minus Siege des Angreifers), Stufe II etwas schwächer (−3), Stufe III etwas schwächer (−5), weil +2 HP bei 3 HP viel und bei 6 HP weniger wiegt. Die Gefahr steigt weiter von Stufe zu Stufe.

## Anzeige der Kombo-Wirkung (0.4)

Wie beim Angriff läuft bei den Kombos zuerst die Animation, dann erscheint die Wirkung: Die Flüche der Lähmung liegen erst im Ablagestapel des Gegners, wenn die Funken ankommen; die Abfrage der Zerrüttung (Karten abwerfen) und die Heilung und entfernten Marker der Läuterung erscheinen erst nach ihrer Animation. Die Engine wendet die Wirkung sofort an, nur die Anzeige hält den Stand davor zurück (`withComboHold` in `src/ui/26-erde.js`). Mehrere Karten derselben zweiten Farbe zählen für die Kombostufe zusammen (F2, W1, W1 = Zerrüttung 2; Test in `tests/engine.test.js`).

## Monster-Hand höchstens 5, Stufe III mit 7 HP (0.5)

Die Hand eines Monsters (Limit + 2, plus oder minus der Würfel) ist höchstens so groß wie die eines Spielers (`MAX_SLOTS`, 5). Das trifft die Monster der Stufe III (Limit 4, vorher Hand 6). Als Ausgleich haben sie 7 statt 6 HP. Messung (1200 Partien KI gegen KI, Siegquote der Spieler in Stufe III): vorher 58,6 %, nur Hand 5 ohne Ausgleich 63,8 %, mit +1 HP 57,2 %, mit +1 Mana 65,1 %. Mana bringt also kaum etwas.

## Auflösungseffekte der Elementkombinationen (0.14)

Treffen im Kampf Angriff und Verteidigung verschiedener Elemente aufeinander, wählt `clashStyle` (`src/ui/25-aufloesung.js`) den Effekt nach dem Paar: Feuer + Wasser **Dampf** (0,6 s), Feuer + Erde **Lava** (1,5 s: glühende Brocken, die abkühlen, Lavalache mit Kruste, Funkenflug, Rauch), Erde + Wasser **Schlamm** (1,5 s: Klumpen und Tropfen, Pfütze mit Blasen und Wellen). Erde gegen Erde bleibt Splitter, gleiche Elemente sonst Welle. Lava und Schlamm wackeln den Bildschirm doppelt so stark wie Dampf. Die Dauer der Auflösung (`T.cl`, Wert `clashT`) bestimmt nun auch das Ende der Animation. Die Werte stammen aus `werkstatt/elementkombi-werkstatt.html` (Vorlage „Standard“) und stehen in `KP` (`src/ui/25-aufloesung.js`). Nur die Anzeige ändert sich, die Regeln nicht.

## Gleiche Elemente und versetzte Symbole (0.14.1)

Treffen Angriff und Verteidigung im **gleichen Element** aufeinander, wählt `clashStyle` (`src/ui/25-aufloesung.js`) einen eigenen Effekt: Feuer + Feuer **Feuerball** (kurzer Knall in alle Richtungen mit Flammenzungen, Glut, Druckwelle, Rußfleck und Rauch), Erde + Erde **Bersten** (Brocken, Staub, Risse im Boden), Wasser + Wasser **Woge** (Tropfen und Ringwellen; der Wasserberg der Werkstatt ist mit `waterDome` 0 abgeschaltet). Alle drei dauern wie Lava und Schlamm 1,5 s (`clashT`); Feuerball und Bersten wackeln stark, die Woge wie Dampf. Das frühere „Welle“ (`schock`) und „Splitter“ kommen mit der Einstellung `clash` nur noch von Hand vor. Werte und Vorschau: `werkstatt/elementkombi-werkstatt.html`. Stehen so viele Angriffssymbole im Kampf, dass sie in **zwei Zeilen** angeordnet werden (ab 6), sind die Zeilen um eine halbe Symbolbreite gegeneinander versetzt (erste Zeile nach links, zweite nach rechts). Nur die Anzeige ändert sich.

## Zeilenversatz bei 7 und 9 Symbolen, Spiegel-Limit im Protokoll (0.16)

**Zeilenversatz:** Der Versatz der beiden Symbolzeilen (0.14.1) galt nur bei gerader Symbolzahl. Bei 7 oder 9 Symbolen sind die Zeilen schon durch die Mittelung (4+3 bzw. 5+4) um eine halbe Breite versetzt; die zusätzliche Verschiebung hob das wieder auf, und die Symbole standen genau übereinander. `grid` in `src/ui/26-erde.js` verschiebt die Zeilen jetzt nur noch bei gleich langen Zeilen (6, 8, 10). Gilt für Angriffs- und Verteidigungssymbole. Nur die Anzeige ändert sich.

**Spiegel-Limit (in 0.16 nur im Protokoll geändert, in 0.16.1 abgelöst):** Bis 0.16 galten höchstens 3 Spiegelmarker insgesamt über alle Farben. Lagen z. B. 3 Erde-Marker, blieb ein neuer Feuer-Spiegel ganz aus, obwohl das Protokoll „Spiegel 3 (Feuer, 3 Marker)“ meldete und der Schild-Effekt lief (aufgefallen im Showdown 3 der Partie mit Seed 1653969251). Seit 0.16.1 siehe unten.

## Spiegel: bis zu 3 Marker je Farbe (0.16.1)

**Regeländerung:** Das Limit von 3 Spiegelmarkern gilt **je Farbe** und nicht mehr insgesamt: Feuer-, Erde- (und Wasser-)Marker sind verschiedene Marker und zählen getrennt. Es können also bis zu 3 Feuer- und 3 Erde-Marker gleichzeitig liegen (Summe `stats.mirror` bis 6; die Anzeige zeigt je Farbe einen Schild mit ×n). Ein Kombo der Stufe S bringt den Spiegel dieser Farbe weiter auf Stufe S (nicht addiert, höchstens 3). Umgesetzt in `mirrorAdd` (`src/engine/65-kampfablauf.js`); Protokolltext „Spiegel N (Farbe, M Marker)“ nennt die Gesamtzahl aller Marker. Die Meldung „kein neuer Marker“ aus 0.16 entfällt, da der Fall nicht mehr vorkommt. Die KI wertet Spiegel weiter je Farbe (`mirrorOf`); ob sie die neue Möglichkeit klug nutzt, ist nicht eigens abgestimmt (`npm run balance`).

**KI (0.16.2):** Die KI bewertet einen Spiegel-Kombo nach dem Zugewinn gegenüber dem Spiegel der Farbe (`mirMarg`), gewichtet die Farbe nach dem Bedrohungsanteil des Gegners (`mirGrade`, `mirMin`) und entfernt mit der Läuterung gegnerische Spiegel zuerst in der Farbe, mit der sie selbst am stärksten angreift (`lfColor`); siehe `mirrorWorth` in `src/ai/30-kampf.js` und `tools/balance/README.md`. Balance neu gemessen: keine messbare Verschiebung (Beginner 48,0 %, Zweiter 49,2 %, Unentschieden 2,8 % in 4000 KI-Partien; neue gegen alte KI 49,8 % ±0,65). Die Regeln ändern sich nicht.


## Änderungen 0.4 (04.11.)

- **Monster-Zweitmagie überlegen:** `profile` der Monster: Feuer → Wasser, Erde → Feuer, Wasser → Erde (überlegen gegenüber der Primärmagie, `SUPERIOR`). Die Grundform-Aufwertung nimmt die dritte Farbe als Kartenquelle.
- **Combo zuerst, auch in der Verteidigung:** Reihenfolge: Mana zahlen, Karten abgeben, Ultimate und Combo, danach die Verteidigung. Heilung wirkt seit 0.5.4 wieder nach dem Schaden (siehe unten). Ein Spiegel-Combo (roter/grüner Spiegel) wirkt sofort gegen den laufenden Angriff (`defenseComboPre`). Vorschau und Animation folgen derselben Reihenfolge.
- **Ausgleich nur für den Verlierer, nur Gold:** siehe oben. Abschnittsbonus `stageGold` [0,3,6,9], `stagePoints` 0.
- Upgrade-Punkte kommen mit `swapCosts` damit nur noch aus dem Tempel (Gold opfern); die KI kauft Magie über `sacG`/`mgGoal`/`sacRes`.
- **KI nachtrainiert (0.4):** `sacG` 1, `mgGoal` 2 (Gold für die erste Magiestufe über den Tempel opfern), `manaA` 4, `minMana` 2. Messung (3000 KI-Partien): Beginner 47,6 % / Zweiter 52,2 % / Unentschieden 0,2 %, Median 444 Aktionen. Showdown-Angreifer gewinnt 55,1 / 45,6 / 38,4 % (0.17: 48,4 / 41,1 / 41,1 %). Endwerte: Magie im Mittel 2,0, Gold 1,2, Tempel 3,0. Monster Stufe III: Niederlage der Spieler 43–46 %.


## Änderungen 0.5.1 (04.11.)

Das Spiel hieß ab hier **Trimagus**; seit 0.5.7.3 heißt es wieder **Magus** (Repository, Adresse und Namen im Code, `Magus` und `MagusAI`, blieben immer gleich).

- **Ausspiellimit startet bei 1** (`startLimit` 1, vorher 2). Damit geht zu Beginn nur eine Karte je Zug; die Bibliothek verlangt für „2 gleiche Karten“ Limit 2 (Tausch mit der überlegenen Vorstufe geht mit einer Karte).
- **Steigende Kosten überall:** Jeder Kauf einer Entwicklung verteuert die nächste um den Grundpreis, also **1 Gold für den ersten Ausbau, 2 Gold für den zweiten**. Das gilt jetzt auch für das Ausspiellimit (`limitCost` 1, vorher 2; Folge 2, 4, 6). Für Handplätze, Nachziehlimit, max. HP und max. Mana galt es schon (`priceRise` 1). Die Magie kostet unverändert 1, 2, 3 … Upgrade-Punkte (unabhängig von Element und Stufe).
- **Höchstens Stufe 3, also zwei Ausbauten je Entwicklung** (`MAX_UPGRADES` 2): Ausspiellimit 1 bis 3 (`MAX_LIMIT` 3, vorher 5), Handplätze 3 bis 5, Nachziehlimit 1 bis 3, max. HP 4 / 6 / 8 (+2 je Ausbau), max. Mana 4 / 5 / 6, Magie 1 bis 3. Für Spiegel-Marker galt Stufe 3 schon.
- **Monster unverändert:** Sie behalten ihre Werte; ihr Limit darf weiter bis 5 reichen (`MONSTER_MAX_LIMIT`).
- **Computer nicht neu abgestimmt:** Die KI-Strategien und die Monster sind noch auf Spieler mit Ausspiellimit 2 abgestimmt. Neu messen: `npm run balance`, Golden-Dateien mit `npm run golden` neu erzeugen.


## Änderungen 0.5.2 (04.11.)

Keine Regeländerung, nur die Bedienung des Tempels: Das Opfern läuft wie die Upgrade-Knöpfe. Ein goldener **Münzknopf** steht links neben dem Gold; die Zahl der geopferten Münzen (0 bis 4) zeigt er als Plakette. Die Pfeile ◀ ▶ rechts neben der Goldzahl stellen die Anzahl ein. Die Schaltfläche „Opfern“ ist entfallen.


## Änderungen 0.5.4 (04.11.)

- **Heilung wieder nach Angriff und Verteidigung:** Die Heilung eines Kombos in der Verteidigung (Erde + Wasser) wirkt erst nach dem Schaden und dem Spiegelrückwurf und gleicht ihn nachträglich aus, höchstens bis zu den maximalen HP; ein sonst tödlicher Restschaden lässt sich so noch ausgleichen (HP − Restschaden + Heilung, nie unter 0, nie über dem Maximum). Zerrüttung, Lähmung, Läuterung und Spiegel wirken wie seit 0.4 **vor** der Verteidigung. Im Angriff ändert sich nichts. Umsetzung: `execDefense` und `defenseComboPre` in `src/engine/65-kampfablauf.js`; Vorschau (`previewDefense`) und Animation folgen derselben Reihenfolge (Heilungseffekt mit `late`).

## Änderung 0.5.7 (04.11.)

- **Dauerhafte Verteidigungs-Vorschau:** Ist der Mensch in der Verteidigung am Zug, stehen der zu erwartende HP-Verlust und die Mana-Kosten schon ohne Überfahren in den Werten (rot, Spiegelrückwurf beim Angreifer). Mit markierten Karten gilt die Vorschau von „Verteidigen“, sonst die von „Passen“. Beim Überfahren der Knöpfe gilt weiter deren Vorschau. (`pvSticky` in `src/ui/30-eingaben.js`)


## Änderung 0.6 (05.11.)

Keine Regeländerung, nur die Darstellung: Das Magie-Board ist die Grafik „Dreifacher Ouroboros mit Runenkern“ (`assets/img/board.webp`). Feuer liegt oben (rot), Erde rechts unten (grün), Wasser links unten (blau); je Element ein Edelstein pro Ring, innen Stufe 1, außen Stufe 3. Erreichte Stufen leuchten, die übrigen sind abgedunkelt; die Vorschau beim Überfahren des Magie-Knopfes markiert den nächsten Stein grün. Die Siegpunkte stehen jetzt in der Mitte des Rings statt in der Kopfzeile des Panels (nur bei Spielern, Monster haben keine). Die Kaufknöpfe der Magie sitzen auf dem Drachenkörper in Richtung des Elements. Die Boards sind etwas größer (`boardMe` 132, `boardOpp` 116). (`boardHTML` in `src/ui/16-seitenleisten.js`)

## Änderung 0.6.0.1 (05.11.)

Der Stern über den Siegpunkten in der Ringmitte entfällt; die Zahl steht allein und etwas größer.

## Änderung 0.6.0.2 (05.11.)

Darstellung: Magie-Boards 120 px (Spieler) und 108 px (Gegner), ohne Abstand nach oben, damit das Board nicht über den Panelrand ragt. Die Kaufknöpfe der Magie liegen mit ihrer Mitte auf dem äußeren Rand des Boards (Radius 0,5 der Bildgröße), die HP- und Mana-Bögen des Spielers wieder 23 px außerhalb.

## Änderung 0.6.0.3 (05.11.)

Darstellung: Erreichte Magiestufen (Edelsteine im Ouroboros) haben einen hellen Rand und ein stärkeres goldenes Leuchten; noch nicht erreichte Steine sind dunkler und entsättigt (`.rg.on`, `.rg.off` in `src/style.css`).

## Änderung 0.6.1.1 (05.11.)

Gegen Patt-Schleifen zwischen zwei KI-Spielern (Auswertung eines Zuschauer-Logs, Seed 1396742866: 4984 Aktionen, 169 Fluchten in Abschnitt 1, nur 3 entschiedene Monsterkämpfe; die Monster heilen sich in den zwei Weltzügen nach jeder Flucht wieder): `idleLimit` steht jetzt auf 30 (nach 15 Runden ohne entschiedenen Kampf beginnt der Showdown), die KI-Patt-Sicherung `fleeIdle` sinkt von 120 auf 30 (die KI flieht dann nicht mehr), und `fleeA` steigt von 1 auf 2 (der Angreifer flieht erst, wenn das Monster in der Prognose zwei Züge vorn liegt). Golden-Datei und Balance-Messung sind nachzuziehen (`npm run golden`, `npm run balance`).

## Änderung 0.6.1.2 (05.11.)

Die Stillstandsregel `idleLimit` bleibt aus (Standard 0): Sie lässt sich am Tisch kaum umsetzen. Die Patt-Schleifen der KI werden nur noch über die KI-Parameter vermieden: `fleeIdle` 30 (nach 30 Weltzügen ohne entschiedenen Kampf flieht die KI nicht mehr) und `fleeA` 2 (Flucht erst bei zwei Zügen Rückstand in der Prognose). Der Absatz zu 0.6.1.1 gilt insoweit nicht mehr für `idleLimit`.


## Änderung 0.7 (06.11.)

- **Opfern ohne Obergrenze:** Es lässt sich beliebig viel Gold auf einmal opfern (vorher höchstens 4 in der Oberfläche).
- **Kartenkauf ohne Freischaltung:** Karten der Stufe 2 und 3 sind unabhängig von der entwickelten Magie kaufbar. Die Magie begrenzt nur noch, wie viel eine Karte im Kampf zählt.
- **Ultimates nach Primärfarbe:** Feuer Todesfluss, Erde Heilfluss (grüner Marker mit Plus), Wasser Prisma (siehe oben). Nur Läuterung entfernt diese Marker.
- **Nachziehmarker-Strafe nach Abschnitt:** Mana (Kampf) und Gold (Weltphase) kosten 1/2/3 je Abschnitt; vor dem Nachziehen bei rotem Marker erscheint eine Warnung (wie beim Fliehen).
- Der Hinweistext zur Schildwirkung („Spiegel: …“) im Kampf entfällt.

## Änderung 0.7.0.1 (06.11.)

- **Kombo-Übersicht:** Alle Kombos stehen nach der Farbe der ersten Karte geordnet (Feuer, Wasser, Erde), die Ultimate jeweils darunter, und passen ohne Scrollbalken in das Fenster. Ausführliche Wirkungen stehen im Tooltip.
- **Umbenennung:** Der Todes-Fluch (Feuer-Ultimate) heißt **Todesfluss**.

## Änderung 0.7.0.2 (06.11.)

- Kombo-Übersicht: Farbüberschriften und der Zusatz „(Ultimate)“ entfallen; die Kombos bleiben nach Farbe geordnet.

## Änderung 0.7.0.3 (06.11.)

- Kombo-Übersicht: Die Zeilen verteilen sich auf die volle Höhe des Fensters.

## Änderung 0.7.1.1 (06.11.)

- Kombo-Übersicht: größerer Schriftgrad (füllt die Fensterhöhe); die Zeilen sind nach Farbe der ersten Karte getönt und die Farbgruppen durch Abstand getrennt.

## Änderung 0.7.1.2 (06.11.)

- Umbenennung: Regenbogenschild heißt **Prisma**; die Kombo Wasser + Feuer heißt **Feuerspiegel**, Wasser + Erde **Erdspiegel**.
