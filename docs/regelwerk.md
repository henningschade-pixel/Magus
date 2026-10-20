# Magus – Regelwerk (Stand v8, 20.10.2026)

Dies ist die maßgebliche Fassung der Regeln. Sie ersetzt das Claude-Docs-Dokument „Magus – Regelwerk (bereinigte Fassung)“, dessen Export als Archiv in `docs/regelwerk-v6-aus-claude-docs.md` liegt (Regelstand v6, dort steht auch die gesamte Änderungsgeschichte bis v6). Die Zahlen stehen als Regelflags in `DEFAULT_RULES` und als Abstimmungsdaten (`MONSTER`) in `index.html`.

## Spielidee und Ablauf

Duellspiel für zwei Personen: Deck und Magie ausbauen, Monster besiegen und in bis zu drei Showdowns Siegpunkte holen. Wer nach dem zweiten Showdown mindestens 8 Siegpunkte hat, gewinnt sofort (Abschnitt 3 entfällt), sonst entscheidet nach dem dritten Showdown, wer mehr hat (bei Gleichstand das Gold, danach die Tempelstufe, danach unentschieden).

**Siegpunkte im Überblick (seit v8):** Monsterkampf: besiegt der Angreifer das Monster, erhält er +1 und der Monsterführer verliert 1; verliert der Angreifer, verliert er 1 und der Monsterführer erhält nichts (jeweils nie unter 0), Flucht und Unentschieden zählen nicht. Showdown: Sieger +1, Verlierer −1 (nie unter 0), Unentschieden und Flucht 0/0, kein Trostpreis. Je Abschnitt sind damit höchstens 4 Siegpunkte möglich (drei Monsterkämpfe und der Showdown), nach zwei Abschnitten 8 (`showdownSp`).

Eine Partie hat drei Abschnitte (1, 2, 3). Je Abschnitt gibt es drei Monster (Stufe I, II, III). Sind alle drei besiegt, beginnt sofort der Showdown; danach erscheinen die Monster der nächsten Stufe.

## Startwerte

| Wert | Start | Anmerkung |
|---|---|---|
| Gold | 0 | Abschnittsbonus siehe unten |
| HP | 3 | jeder Upgrade-Punkt +2 Maximum |
| Mana | 4 | jeder Upgrade-Punkt +1 Maximum |
| Magie Feuer / Erde / Wasser | je 1 | höchstens 3 |
| Ausspiellimit | 1 | höchstens 5, jeder Schritt kostet 2 Upgrade-Punkte |
| Handplätze | 3 | je Upgrade-Punkt ein weiterer, höchstens 5 |

**Kartenvorrat (neu):** Vom Vorrat jeder Karte gibt es: Stufe 1 je 8 (`supply`), Stufe 2 je 6 (`supply2`), Stufe 3 je 4 (`supply3`), also F1/E1/W1, F2/E2/W2 und F3/E3/W3. Vor der Partie werden die 24 Stufe-1-Karten gemischt und gleichmäßig verteilt: jeder Spieler erhält 12 als Startdeck (`startCards` 0 = alle; die Startdecks sind daher ungleich, zum Beispiel 5/4/3 statt 4/4/4). Im Vorrat des Händlers liegen danach nur Stufe-2- und Stufe-3-Karten (je 6 bzw. 4); Stufe-1-Karten tauchen dort erst auf, wenn welche beim Aufwerten zurückgegeben werden. Der Händler zeigt, wie viele Karten jeder Art noch im Vorrat sind; sind sie weg, ist die Karte vergriffen und nicht kaufbar (auch die Gratiskarten F1/E1/W1 nicht). Beim Aufwerten gehen die bezahlten Karten zurück in den Vorrat, die gekaufte Karte kommt heraus. Monsterdecks haben ihren eigenen Vorrat und zählen nicht mit. `supply` 0 schaltet den Vorrat ab (altes Startdeck 3× F1, E1, W1, unbegrenzte Karten). Karten heißen Element plus Stufe (F2 = Feuer, Stufe 2), Stufen 1 bis 3.

**Abschnittsbonus** (zu Beginn jedes Abschnitts, beide Spieler): Abschnitt 1: 1 Gold und 1 Upgrade-Punkt, Abschnitt 2: 2 und 2, Abschnitt 3: 3 und 3.

**Elementkreis:** Feuer schlägt Erde, Erde schlägt Wasser, Wasser schlägt Feuer. „Überlegen“: Wasser gegen Feuer, Feuer gegen Erde, Erde gegen Wasser.

## Weltphase

Im eigenen Zug genau eine Aktion, danach wechselt der Spieler: Nachziehen, beim Händler tauschen, einen Kampf beginnen, im Tempel Gold opfern, Magie kaufen oder einen Upgrade-Punkt ausgeben (Magiestufe, HP, Mana, Limit, Handkarten; jeder Klick ist eine Aktion). Upgrade-Punkte dürfen aufgespart werden. Eine Erholungsphase gibt es nicht.

**Regeneration:** Bei jedem Zugwechsel erhält der Spieler, der dran kommt, **HP und Mana in Höhe des Abschnitts** (Abschnitt 1: +1/+1, Abschnitt 2: +2/+2, Abschnitt 3: +3/+3; nicht über das Maximum). Dasselbe bekommt der Verteidiger nach einem Kampf. Alle lebenden Monster regenerieren am Ende jeder Runde +1 HP und +1 Mana (Regel `regenByStage` gilt nur für Spieler).

**Nachziehen:** Alle nicht gesperrten Handkarten wandern auf den Ablagestapel, freie Plätze werden aus dem Deck neu gefüllt (Deck leer: Ablagestapel mischen). Rechtsklick sperrt eine Karte. Nachziehen beendet den Zug.

**Freischaltung (neu):** Eine Karte der Stufe t im Element X darf nur erwerben, wer die Magie X auf Stufe t hat. Für F2 braucht man also Feuer-Magie 2, für F3 Feuer-Magie 3. Gesperrte Karten sind im Händler abgedunkelt (Hinweis: Magie nötig), die Gratiskarten der Stufe 1 sind immer freigeschaltet.

**Händler:** tauscht Karten, kein Gold. Mit markierten Handkarten (begrenzt durch das Ausspiellimit):

| Ergebnis | Kosten |
|---|---|
| F1, E1, W1 | gratis (keine Markierung nötig) |
| Stufe 2 oder 3 im Element X | 2 gleiche markierte Karten der Vorstufe in X (nur bei Limit ≥ 2) oder 1 markierte Karte der Vorstufe im überlegenen Element |

Die bezahlten Karten werden aus dem Deck entfernt, nur die gekaufte kommt auf den Ablagestapel.

**Tempel:** n Gold opfern ergibt n·(n+1)/2 Tempelpunkte; die nächste Tempelstufe kostet (aktuelle Stufe + 1) Punkte, jede erreichte Stufe gibt einen Upgrade-Punkt. Die Tempelstufe ist die Zahl der durch Opfer erlangten Upgrades (kostet die nächste Stufe 4 Punkte, hat man Stufe 3) und zählt als drittes Kriterium der Siegbedingung (nach Siegpunkten und Gold). Die Vorschau (Gold, Punkte, Bruch) zeigt sich schon beim Einstellen mit den Pfeilen.

**Magie kaufen:** Stufe 2 kostet 1 Gold, Stufe 3 kostet 3 Gold.

## Monsterkampf

Der aktive Spieler wählt ein lebendes Monster und greift an, der Mitspieler führt das Monster. Zu Beginn werden das Monsterdeck und das Deck des Angreifers neu gemischt. Gespielte Karten gehen auf den Ablagestapel. Der Kampf läuft in Zügen: erst Verteidigen, dann Angreifen.

**Angriff:** bis Ausspiellimit Karten markieren. Die zuerst markierte Karte bestimmt das Primärelement; Schaden = je Karte im Primärelement min(Stufe, Magie). Karten anderer Elemente machen keinen Schaden, sie sind Kombokarten.

**Verteidigung:** Karten der Verteidigungsfarbe (Farbe des Angriffs oder die überlegene) blocken je min(Stufe, Magie). Danach dürfen Kombokarten einer zweiten Farbe folgen. Nicht geblockter Schaden geht von den HP ab.

**Manakosten (seit v7):** Jede gespielte Karte kostet 1 Mana, auch Kombokarten der zweiten Farbe. Ausnahme: Karten der Verteidigung im überlegenen Element sind gratis.

**Statt anzugreifen** darf man: nachziehen (gratis, Hand wird getauscht), **erholen** oder passen. Jede dieser Aktionen beendet den Angriffszug.

**Fliehen (neu):** Im Monsterkampf darf jede Seite fliehen, wenn das Monster 0 Mana hat, ihm gerade kein Angriff entgegengebracht wird (er ist in seinem Angriffszug) und er nicht unter einem Todes-Fluch steht. Der Kampf endet ohne Sieger und ohne Beute, das Monster behält seine HP und sein Mana, der Mitspieler ist als Nächster dran (mit der üblichen Regeneration). Im Showdown gilt dasselbe Fliehen: Der Showdown endet dann ohne Sieger, und es gibt keine Siegpunkte (anders als bei einem Showdown, in dem beide fallen). Die KI flieht nicht (`fleeT` 999): Im Selbstspiel verlor sie damit.

**Erholen:** Wer den Angriff auslässt, erhält **Mana in Höhe des Abschnitts** (1 / 2 / 3). In der Verteidigung gibt es **kein Erholen**: Wer dort passt, führt keine Verteidigung aus und nimmt den Schaden hin (ein Spiegel dieser Farbe gleicht bis zu seiner Stufe aus und verliert dafür Stufen), erhält aber kein Mana. Nachziehen, Erholen und Passen beenden den Zug.

**Kampfende:**
- Fällt eine Seite auf 0 HP, hat die andere gewonnen; fallen beide gleichzeitig, gibt es keinen Sieger.
- Haben beide 0 Mana, endet der Kampf **nicht mehr automatisch** ohne Sieger. Er geht weiter: Erholen im Angriffszug bringt Mana, der Todes-Fluch zehrt am Ende der Angriffsphasen. Beenden lässt er sich durch **Fliehen** (möglich, wenn der Gegner 0 Mana hat). Als technische Sicherung endet ein Kampf nach 400 Schritten ohne Sieger.
- Siegt der Spieler gegen das Monster, erhält er **1 Gold** (feste Beute für jedes Monster, egal welcher Stufe, `monsterLoot`) **und der Mitspieler (Monsterführer) bekommt ebenfalls 1 Gold** (`lootBoth`). Der Sieger erhält 1 Siegpunkt, der Verlierer verliert 1 (nie unter 0, `monsterSp`). Siegt das Monster, gibt es keine Beute, das Monster bleibt mit Werten und Gold; der Angreifer verliert 1 Siegpunkt (nie unter 0), der Monsterführer erhält **keinen** (sonst ließe sich ein unbesiegtes Monster endlos farmen). Ohne Sieger (Flucht, beide fallen) gibt es weder Beute noch Siegpunkte, das Monster bleibt am Leben.
- In Monsterkämpfen bleiben HP und Mana erhalten und regenerieren in der Weltphase; vor und nach einem Showdown sind sie voll.

**Ergebnis-Bildschirm:** Nach der letzten Aktion läuft die Animation zu Ende, die Werte passen sich an, der Bildschirm dunkelt ab und zeigt „Sieg“, „Niederlage“ oder „Unentschieden“ (bei Sieg mit Beute). Erst nach einem Klick geht es in die Weltphase zurück.

## Kombos und Ultimate

Die Farbe der ersten markierten Karte bestimmt die Rolle (Feuer aggressiv, Wasser defensiv, Erde heilend), die zweite Farbe die Wirkung. Kombos gelten im Angriff und in der Verteidigung (dort wirken sie nach der Verteidigung und dem Spiegelrückwurf). Kombokarten kosten seit v7 wie alle Karten 1 Mana.

**Kombostufe S:** je Farbe die Summe der markierten Kartenwerte (jede Karte höchstens so hoch wie die Magiestufe), davon die kleinere der beiden Summen, höchstens 3.

| Kombo | Farben | Wirkung bei Stufe S |
|---|---|---|
| Lähmung | Feuer + Erde | **2·S Fluchkarten** (2 / 4 / 6) auf den Ablagestapel der Gegenseite |
| Zerrüttung | Feuer + Wasser | Gegner wirft S Handkarten seiner Wahl ab |
| Spiegel (rot) | Wasser + Feuer | roter Spiegel auf Stufe S (nicht addiert, höchstens 3 Stufen insgesamt) |
| Spiegel (grün) | Wasser + Erde | grüner Spiegel auf Stufe S |
| Heilung | Erde + Wasser | S HP heilen |
| Läuterung | Erde + Feuer | S beliebige Marker vom Brett entfernen, je entferntem Marker ein Nachziehtoken |
| Ultimate | alle drei | Todes-Fluch der Stufe S |

**Fluchkarten:** Sie kommen erst in den Zugstapel, wenn der Ablagestapel gemischt wird. Auf der Hand belegen sie einen Platz und wirken nicht. Beim Nachziehen werden sie dauerhaft verworfen, am Kampfende verschwinden alle.

**Spiegel:** Dauerhaft (bis Kampfende), je Farbe eine Stufe (1 bis 3, zusammen höchstens 3). Er wirkt gegen Angriffe in seiner Farbe: (1) Fehlt dem Verteidiger Verteidigung, gleicht der Spiegel den fehlenden Schaden aus, höchstens in Höhe seiner Stufe, und verliert dafür je ausgeglichenem Schaden eine Stufe (die HP des Verteidigers werden um diesen Betrag geschont). (2) Verteidigt der Verteidiger mehr als nötig, wirft der Spiegel den Überschuss unblockbar auf den Angreifer zurück, höchstens in Höhe seiner Stufe und höchstens in Höhe des eingehenden Schadens, und verliert dafür je zurückgeworfenem Schaden eine Stufe. Beides schließt sich aus. Beim Erholen (ohne Verteidigung) gleicht der Spiegel ebenfalls aus. Wasserangriffe lassen sich nicht spiegeln.

**Läuterung:** Wählbar sind alle Marker auf dem Brett, auch eigene: Todesmarker, Spiegelmarker und **gegnerische Nachziehtokens**. Gegnerische Tokens werden nur zerstört, sie werden nicht gutgeschrieben. Für jeden anderen entfernten Marker erhält der Angreifer ein Nachziehtoken. Keine Heilung.

**Ultimate (Todes-Fluch):** Die Stufe ist das Minimum aus den drei Magiewerten und den drei höchsten Kartenstufen, höchstens 3. Der Gegner verliert S HP am Ende jeder eigenen Angriffsphase bis Kampfende; nur Läuterung kann Marker entfernen. Die Ultimate **gilt auch in der Verteidigung** (alle drei Farben, die Verteidigungsfarbe blockt, die beiden anderen sind Kombokarten): Nach der Verteidigung erhält der Angreifer den Todes-Fluch.

## Monster

Variante je Monster wird beim Erscheinen gewürfelt (Tempel-Verbesserungen, Nebenelement, Deckform).

| Stufe | Beute (Gold) | HP | Mana | Limit | Magie (Haupt/Neben/dritte) |
|---|---|---|---|---|---|
| I | 1 | 3 | 4 (Variante 5) | 1 | 2 im eigenen Element |
| II | 2 | 8 | 4–6 | 2 | 3 / 2 / 1 |
| III | 3 | 11 | 6–7 | 3 | 3 / 2 / 1 |

Monsterdecks passen zur Magie (Test in `tests/engine.test.js`): Zu jeder Magiestufe ab 2 gibt es mindestens eine Karte dieser Stufe, und keine Karte steht über der Magie ihrer Farbe (Stufe III: Nebenelement höchstens Stufe 2, drittes Element Stufe 1). Das Erdmonster I hat dafür wie die anderen eine Stufe-2-Karte (E2 statt eines F1).

Hauptelement / Nebenelement: Feuermonster Feuer und Erde, Erdmonster Erde und Wasser, Wassermonster Wasser und Feuer. Monster haben Ausspiellimit + 2 Handplätze (mindestens 3).

## Showdown

Beginnt sofort nach dem dritten Monster eines Abschnitts. Vorher erscheint ein Ankündigungsbildschirm („Showdown N von 3“, wer zuerst angreift, was auf dem Spiel steht). Beide Spieler starten mit vollen HP, vollem Mana und frisch gemischtem Deck. Zuerst greift an, wer hinten liegt (Siegpunkte, Tempelpunkte, Magiefortschritt, Gold, sonst Zufall). Der Showdown läuft wie ein Monsterkampf gegen den anderen Spieler.

- Sieger: +1 Siegpunkt, Verlierer −1 (nie unter 0), kein Goldraub. Kein Sieger (beide fallen): 0/0. **Fliehen** zählt nie als Sieg oder Niederlage: weder Siegpunkte noch Gold (auch im Showdown).
- Nach dem Showdown sind HP und Mana voll. Der Verlierer beginnt die nächste Weltphase. Den **Trostpreis gibt es nicht mehr** (`loserUp` und `loserUp2` stehen auf 0).
- **Vorzeitiges Ende:** Hat nach dem zweiten Showdown ein Spieler mindestens 8 Siegpunkte (`winSp`, geprüft ab `winSpFromShowdown` 2), gewinnt er sofort und Abschnitt 3 entfällt. Nach Showdown 1 sind höchstens 5 Siegpunkte möglich, die Grenze greift dort nie.
- Der Ergebnis-Bildschirm nennt Sieger, Siegpunkte und den nächsten Abschnitt.

## Zugwechsel (Oberfläche)

Ein goldener Rand zeigt, wer am Zug ist (unten du, oben Gegner). Am Zugende teilt er sich in der Mitte, zwei Lichtköpfe laufen links und rechts zur anderen Seite; eine Einblendung „Du bist am Zug“ gibt es nicht (entfernt am 16.10.). Einstellung aus der Zugwechsel-Werkstatt (`werkstatt/zugwechsel-werkstatt.html`). Entfällt bei reduzierter Bewegung und im Schnellmodus.

## Änderungen seit v7 (Siegpunkte)

- Monsterkampf bringt Siegpunkte (Sieg über das Monster +1, der Verlierer −1, nie unter 0; ein Monstersieg bringt dem Führer nichts); die Beute geht an beide Spieler; Trostpreis nach Showdown gestrichen; vorzeitiges Ende ab 8 Siegpunkten nach Showdown 2 (vorher 4 Siegpunkte jederzeit). Hintergrund: Ein geschwächtes Monster zu hinterlassen war besser als ein Sieg. Fliehen bleibt ohne Wertung. Im KI-Selbstspiel entfällt Abschnitt 3 dadurch in etwa 32 % der Partien (600 Partien, KI nicht neu abgestimmt).

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
