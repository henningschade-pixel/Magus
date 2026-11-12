# Magus – Regelwerk (Stand v8, 20.10.2026; Version 0.5.1: Stufe 3 als Maximum)

Dies ist die maßgebliche Fassung der Regeln. Sie ersetzt das Claude-Docs-Dokument „Magus – Regelwerk (bereinigte Fassung)“, dessen Export als Archiv in `docs/regelwerk-v6-aus-claude-docs.md` liegt (Regelstand v6, dort steht auch die gesamte Änderungsgeschichte bis v6). Die Zahlen stehen als Regelflags in `DEFAULT_RULES` und als Abstimmungsdaten (`MONSTER`) in `index.html`.

## Spielidee und Ablauf

Duellspiel für zwei Personen: Deck und Magie ausbauen, Monster besiegen und in bis zu drei Showdowns Siegpunkte holen. Nach dem dritten Showdown entscheidet, wer mehr hat (bei Gleichstand die Tempelstufe, danach das Gold, danach unentschieden; seit 0.8.6.1).

**Siegpunkte im Überblick (seit v8):** Monsterkampf: besiegt der Angreifer das Monster, erhält er +1; verliert der Angreifer, verliert er 1 (nie unter 0); der Monsterführer gewinnt und verliert dabei nie Siegpunkte. Flucht und Unentschieden zählen nicht. Showdown: Sieger +1, Verlierer −1 (nie unter 0), Unentschieden und Flucht 0/0, kein Trostpreis. Je Abschnitt sind damit höchstens 4 Siegpunkte möglich (drei Monsterkämpfe und der Showdown), nach zwei Abschnitten 8 (`showdownSp`).

Eine Partie hat drei Abschnitte (1, 2, 3). Je Abschnitt gibt es drei Monster (Stufe I, II, III). Sind alle drei besiegt, beginnt sofort der Showdown; danach erscheinen die Monster der nächsten Stufe.

## Startwerte

| Wert | Start | Anmerkung |
|---|---|---|
| Gold | 0 | Abschnittsbonus siehe unten |
| Siegpunkte | 3 | seit 0.3 (`startSp`, 0.3 bis 0.7.2.23: 2; seit 0.7.2.24: 3): schon die ersten Kämpfe kosten bei einer Niederlage etwas; nie unter 0 |
| HP | 4 | seit 0.3.1 (`startHp`, vorher 3); jeder Upgrade-Punkt +2 Maximum (seit 0.3 mit Gold bezahlt) |
| Mana | 4 | jeder Upgrade-Punkt +1 Maximum |
| Magie Feuer / Erde / Wasser | je 1 | höchstens 3 |
| Ausspiellimit | 1 | seit 0.5.1 (`startLimit`, 0.3 bis 0.4.1: 2); höchstens 3, die Schritte kosten 1 und 2 Gold (`limitCost` 1 mit `priceRise`) |
| Handplätze | 3 | je Upgrade-Punkt ein weiterer, höchstens 5 |

**Kartenvorrat (neu):** Vom Vorrat jeder Karte gibt es: Stufe 1 je 8 (`supply`), Stufe 2 je 6 (`supply2`), Stufe 3 je 4 (`supply3`), also F1/E1/W1, F2/E2/W2 und F3/E3/W3. Vor der Partie werden die 24 Stufe-1-Karten gemischt und gleichmäßig verteilt: jeder Spieler erhält 12 als Startdeck (`startCards` 0 = alle; die Startdecks sind daher ungleich, zum Beispiel 5/4/3 statt 4/4/4). Im Vorrat der Bibliothek liegen danach nur Stufe-2- und Stufe-3-Karten (je 6 bzw. 4); Stufe-1-Karten tauchen dort erst auf, wenn welche beim Aufwerten zurückgegeben werden. Die Bibliothek zeigt, wie viele Karten jeder Art noch im Vorrat sind; sind sie weg, ist die Karte vergriffen und nicht kaufbar (auch die Gratiskarten F1/E1/W1 nicht). Beim Aufwerten gehen die bezahlten Karten zurück in den Vorrat, die gekaufte Karte kommt heraus. Monsterdecks haben ihren eigenen Vorrat und zählen nicht mit. `supply` 0 schaltet den Vorrat ab (altes Startdeck 3× F1, E1, W1, unbegrenzte Karten). Karten heißen Element plus Stufe (F2 = Feuer, Stufe 2), Stufen 1 bis 3.

**Abschnittsbonus** (zu Beginn jedes Abschnitts, beide Spieler): nur Gold, 1 / 2 / 3 Gold je Monster, also 3 / 6 / 9 Gold in Abschnitt 1 / 2 / 3, keine Upgrade-Punkte (seit 0.4; davor 2/2, 3/3, 4/4 Gold und Punkte).

**Elementkreis:** Feuer schlägt Erde, Erde schlägt Wasser, Wasser schlägt Feuer. „Überlegen“: Wasser gegen Feuer, Feuer gegen Erde, Erde gegen Wasser.

## Weltphase

Im eigenen Zug genau eine Aktion, danach wechselt der Spieler: **Nachziehen, in der Bibliothek tauschen (Händler) oder einen Kampf beginnen (Angriff)**. Im Tempel Gold opfern, Magie kaufen und jedes Upgrade kaufen (Magiestufe mit Upgrade-Punkten; HP, Mana, Limit, Handkarten, Nachziehlimit mit Gold) sind **keine Aktion** (seit 0.9.3; das Opfern schon seit 0.7.6.4): Der Spieler bleibt am Zug und darf davon beliebig viele ausführen, bevor er eine der drei Aktionen wählt. Upgrade-Punkte und Gold dürfen aufgespart werden. Eine Erholungsphase gibt es nicht.

**Regeneration:** Bei jedem Zugwechsel erhält der Spieler, der dran kommt, **HP und Mana in Höhe des Abschnitts** (Abschnitt 1: +1/+1, Abschnitt 2: +2/+2, Abschnitt 3: +3/+3; nicht über das Maximum). Dasselbe bekommt der Verteidiger nach einem Kampf. Alle lebenden Monster regenerieren am Ende jeder Runde +1 HP und +1 Mana (Regel `regenByStage` gilt nur für Spieler).

**Nachziehen:** Alle nicht gesperrten Handkarten wandern auf den Ablagestapel, freie Plätze werden aus dem Deck neu gefüllt (Deck leer: Ablagestapel mischen). Rechtsklick sperrt eine Karte. Nachziehen beendet den Zug.

**Freischaltung (neu):** Eine Karte der Stufe t im Element X darf nur erwerben, wer die Magie X auf Stufe t hat. Für F2 braucht man also Feuer-Magie 2, für F3 Feuer-Magie 3. Gesperrte Karten sind in der Bibliothek abgedunkelt (Hinweis: Magie nötig), die Gratiskarten der Stufe 1 sind immer freigeschaltet.

**Bibliothek:** tauscht Karten, kein Gold. Mit markierten Handkarten (begrenzt durch das Ausspiellimit):

| Ergebnis | Kosten |
|---|---|
| F1, E1, W1 | gratis (keine Markierung nötig) |
| Stufe 2 oder 3 im Element X | 2 gleiche markierte Karten der Vorstufe in X (nur bei Limit ≥ 2) oder 1 markierte Karte der Vorstufe im überlegenen Element |

Die bezahlten Karten werden aus dem Deck entfernt, nur die gekaufte kommt auf den Ablagestapel.

**Tempel:** n Gold opfern ergibt n·(n+1)/2 Tempelpunkte; die nächste Tempelstufe kostet (aktuelle Stufe + 1) Punkte, jede erreichte Stufe gibt einen Upgrade-Punkt. Die Tempelstufe ist die Zahl der durch Opfer erlangten Upgrades (kostet die nächste Stufe 4 Punkte, hat man Stufe 3) und zählt als zweites Kriterium der Siegbedingung (nach Siegpunkten, vor dem Gold; seit 0.8.6.1). Die Vorschau (Gold, Punkte, Bruch) zeigt sich schon beim Einstellen mit den Pfeilen.

**Magie kaufen:** Stufe 2 kostet 1, Stufe 3 kostet 3 **Upgrade-Punkte** (seit 0.3, vorher Gold; siehe „Getauschte Kosten“).

## Monsterkampf

Der aktive Spieler wählt ein lebendes Monster und greift an, der Mitspieler führt das Monster. Zu Beginn werden das Monsterdeck und das Deck des Angreifers neu gemischt. Gespielte Karten gehen auf den Ablagestapel. Der Kampf läuft in Zügen: erst Verteidigen, dann Angreifen.

**Angriff:** bis Ausspiellimit Karten markieren. Die zuerst markierte Karte bestimmt das Primärelement; Schaden = je Karte im Primärelement min(Stufe, Magie). Karten anderer Elemente machen keinen Schaden, sie sind Kombokarten.

**Verteidigung:** Karten der Verteidigungsfarbe (Farbe des Angriffs oder die überlegene) blocken je min(Stufe, Magie). Danach dürfen Kombokarten einer zweiten Farbe folgen. Nicht geblockter Schaden geht von den HP ab.

**Manakosten (seit v7):** Jede gespielte Karte kostet 1 Mana, auch Kombokarten der zweiten Farbe. Ausnahme: Karten der Verteidigung im überlegenen Element sind gratis.

**Statt anzugreifen** darf man: nachziehen (gratis, Hand wird getauscht; bei rotem Nachziehmarker kostet es 1 Mana, siehe „Nachziehmarker“), **erholen** oder passen. Jede dieser Aktionen beendet den Angriffszug.

**Fliehen (neu):** Im Monsterkampf darf jede Seite fliehen, wenn das Monster 0 Mana hat, ihm gerade kein Angriff entgegengebracht wird (er ist in seinem Angriffszug) und er nicht unter einem Todesfluch steht. Der Kampf endet ohne Sieger und ohne Beute, das Monster behält seine HP und sein Mana, der Mitspieler ist als Nächster dran (mit der üblichen Regeneration). Im Showdown gilt dasselbe Fliehen: Der Showdown endet dann ohne Sieger, und es gibt keine Siegpunkte (anders als bei einem Showdown, in dem beide fallen). Die KI flieht nicht (`fleeT` 999): Im Selbstspiel verlor sie damit.

**Erholen:** Wer den Angriff auslässt, erhält **Mana in Höhe des Abschnitts** (1 / 2 / 3). In der Verteidigung gibt es **kein Erholen**: Wer dort passt, führt keine Verteidigung aus und nimmt den Schaden hin (ein Spiegel dieser Farbe gleicht bis zu seiner Stufe aus und verliert dafür Stufen), erhält aber kein Mana. Nachziehen, Erholen und Passen beenden den Zug.

**Kampfende:**
- Fällt eine Seite auf 0 HP, hat die andere gewonnen; fallen beide gleichzeitig, gibt es keinen Sieger. Geprüft wird in fester Reihenfolge (seit 0.8.3.1): 1) reflektierter Schaden (Falle), 2) Schaden nach der Verteidigung (samt Heilung), 3) Dauereffekte am Ende der Angriffsphase (Todesfluch, Erschöpfung, Meditation und Erleuchtung). Die erste Stufe, in der eine Seite auf 0 HP fällt, entscheidet; spätere Stufen wirken dann nicht mehr.
- Haben beide 0 Mana, endet der Kampf **nicht mehr automatisch** ohne Sieger. Er geht weiter: Erholen im Angriffszug bringt Mana, der Todesfluch zehrt am Ende der Angriffsphasen. Beenden lässt er sich seit 0.9.1 nur noch durch Sieg, Niederlage oder die **Erschöpfung**; **Fliehen** (möglich, wenn der Gegner 0 Mana hat) ist abgeschaltet (`fleeAllowed` 0, siehe Änderung 0.9.1). Als technische Sicherung endet ein Kampf nach 400 Schritten ohne Sieger.
- Siegt der Spieler gegen das Monster, gibt es **keine Beute** (`monsterLoot` 0; ohne die Regel gälte das Gold des Monsters 1/2/3, auch für den Monsterführer mit `lootBoth`). Der Angreifer erhält 1 Siegpunkt (`monsterSp`); der Monsterführer verliert nichts. Siegt das Monster, gibt es keine Beute, und das Monster **zieht sich zurück**: Es verlässt das Brett, gilt als besiegt und bringt keine Beute (sonst ließe sich die Hilfe durch absichtliche Niederlagen farmen, die HP stiegen ohne Ende); der Angreifer verliert 1 Siegpunkt (nie unter 0), der Monsterführer gewinnt und verliert dabei nie Siegpunkte. **Ausgleich (seit 0.4, vorher „Hilfe“ für beide):** Gewinnt das Monster, erhält nur der Verlierer (der Angreifer) Gold: 1 / 2 / 3 je Abschnitt (`lossHelp` 1, `lossGold` [0,1,2,3], `lossPoints` 0, `lossBoth` 0; mit `lossBoth` 1 bekämen beide den Ausgleich), ohne Begrenzung. Ohne Sieger (Flucht, beide fallen) gibt es weder Beute noch Siegpunkte, das Monster bleibt am Leben.
- In Monsterkämpfen bleiben HP und Mana erhalten und regenerieren in der Weltphase; vor und nach einem Showdown sind sie voll.

**Ergebnis-Bildschirm:** Nach der letzten Aktion läuft die Animation zu Ende, die Werte passen sich an, der Bildschirm dunkelt ab und zeigt „Sieg“, „Niederlage“ oder „Unentschieden“ (bei Sieg mit Beute). Erst nach einem Klick geht es in die Weltphase zurück.

## Kombos und Ultimate

Die Farbe der ersten markierten Karte (**Primärfarbe**) liefert den Schaden und wählt unter den zwei Kombos der zweiten Farbe (**Sekundärfarbe**); die Sekundärfarbe bestimmt den **Charakter** (seit 0.9.9): Rot (Feuer) Schaden, Blau (Wasser) variabel, Grün (Erde) Heilung und Verbesserung der eigenen Seite. Kombos gelten im Angriff und in der Verteidigung (dort wirken Lähmung und Läuterung vor der Verteidigung, Heilung und Schilde (Spiegel, Multispiegel) danach). Kombokarten kosten seit v7 wie alle Karten 1 Mana.

**Kombostufe S:** je Farbe die Summe der markierten Kartenwerte (jede Karte höchstens so hoch wie die Magiestufe), davon die kleinere der beiden Summen, höchstens 3.

| Sekundär | Kombo | Primär + Sekundär | Wirkung bei Stufe S |
|---|---|---|---|
| Rot (Schaden) | Falle | Blau + Rot | ziehe drei Karten vom Stapel, lege eine davon verdeckt vor dich, die übrigen kommen auf den Ablagestapel (Stufe S, kein Marker) |
| Rot (Schaden) | Lähmung | Grün + Rot | **2·S Fluchkarten** (2 / 4 / 6) auf den Ablagestapel der Gegenseite |
| Rot (Schaden) | Todesfluch (Ultimate) | alle drei Farben, Rot als zweite Karte | Todesfluch (Stufe S) |
| Blau (variabel) | Hellsicht | Rot + Blau | ziehe 3 Karten, wähle S davon aus und lege sie offen vor dich (ohne Manakosten nutzbar, danach abgelegt); die übrigen kommen auf den Ablagestapel |
| Blau (variabel) | Schild | Grün + Blau | Schild: S Ladungen kommen zu den liegenden dazu (seit 0.12.1.1 stapelnd, ohne Obergrenze) |
| Blau (variabel) | Erleuchtung (Ultimate) | alle drei Farben, Blau als zweite Karte | Erleuchtung (Stufe S) |
| Grün (Heilung) | Heilung | Blau + Grün | S HP heilen |
| Grün (Heilung) | Läuterung | Rot + Grün | S beliebige Marker vom Brett entfernen, je entferntem Marker ein Nachziehtoken |
| Grün (Heilung) | Meditation (Ultimate) | alle drei Farben, Grün als zweite Karte | Meditation (Stufe S) |

**Ultimate (seit 0.11.0.9):** Sie entsteht mit allen drei Farben und hängt wie jede Kombo an der **Sekundärfarbe**, der Farbe der ersten Karte, die nicht der Primärfarbe entspricht (Rot Todesfluch, Blau Erleuchtung, Grün Meditation). Die dritte Farbe hat keine Wirkung und löst die Ultimate nur aus. Die Reihenfolge der Karten ist damit Primär-, Sekundär-, dritte Farbe; zu jeder Primärfarbe gibt es zwei Ultimates (je nach Sekundärfarbe). Bis 0.11.0.8 bestimmte die zuletzt markierte Karte die Ultimate (0.9.9), bis 0.9.8 die erste. Der Schaden kommt weiter von der Primärfarbe (erste Karte); die Stufe S bleibt das Minimum der drei Kartensummen (höchstens 3). Das Echo verstärkt die Ultimate, wenn es die Sekundärfarbe hat.

**Echo (seit 0.9):** Jede Nutzung von Primärmagie (seit 0.9.6 auch Angriffe und Verteidigungen **ohne** Kombo; davor nur die sechs Zwei-Farben-Kombos und die Ultimate) hinterlässt bei der Seite, die sie wirkt, ein **Echo in der Farbe der ersten Karte (Primärmagie)**. Jede neue Nutzung **erneuert** das Echo (neue Farbe); Passen, Erholen und Spielzüge ohne farbige erste Karte (nur Fluchkarten) lassen es stehen. Enthält der **nächste Kombo** eine **Sekundärkarte in der Farbe des Echos**, steigt seine Stufe um **1 (höchstens 3)**; das gilt auch, wenn er das Echo gleichzeitig durch seine eigene Primärfarbe erneuert. Bei der Ultimate ist (seit 0.11.0.9) nur die **zweite Karte (Sekundärfarbe)** die Sekundärkarte; 0.9.9 bis 0.11.0.8 war es die Schlusskarte (bis 0.9.8 beide Farben außer der ersten); das Echo, das sie hinterlässt, hat weiter die Farbe der ersten Karte. Das Echo ist **kein Marker im Sinne der Läuterung** (nicht läuterbar), gilt nur bis Kampfende und wird digital seit 0.9.4 auf dem Magie-Brett gezeigt: Die Schlange der Echo-Farbe leuchtet pulsierend und sendet Wellen nach außen (beim Gegner genauso). Der Echo-Marker (neutraler Stein mit hellen Ringen) gehört nur zum analogen Spiel.

**Fluchkarten:** Sie kommen erst in den Zugstapel, wenn der Ablagestapel gemischt wird. Auf der Hand belegen sie einen Platz und wirken nicht. Beim Nachziehen werden sie dauerhaft verworfen, am Kampfende verschwinden alle.

**Hellsicht (Blau + Rot, seit 0.8.0.9 in dieser Form):** Die Seite zieht drei Karten vom Zugstapel (bei Bedarf wird der Ablagestapel gemischt) und wählt davon S aus (höchstens so viele, wie nicht verfluchte Karten gezogen wurden; Fluchkarten kommen immer auf den Ablagestapel). Die gewählten Karten liegen **offen vor ihr**: Sie hängen als zusätzliche Kartenplätze hinten an die Hand an (belegen keine Handplätze, werden nicht nachgezogen) und lassen sich wie Handkarten markieren und ausspielen, **kosten aber kein Mana**. Nach dem Ausspielen kommen sie auf den Ablagestapel; zum Kampfende werden unbenutzte offene Karten ebenfalls abgelegt. Bleibt keine Wahl (alle brauchbaren Karten sind zu nehmen), entscheidet das Spiel selbst. Vorher ist keine andere Aktion möglich.

**Falle (Rot + Blau, seit 0.8.0.1 statt der Zerrüttung; vorher Blau + Rot, seit 0.8):** Die Seite zieht drei Karten vom Zugstapel (bei Bedarf wird der Ablagestapel gemischt; seit 0.8.0.5 ersetzen sie keine Handkarten), legt eine davon verdeckt vor sich und die übrigen auf den Ablagestapel; Fluchkarten kommen nicht in Frage, bei mehreren Kandidaten wählt der Spieler, bei einem gilt sie sofort. Die Karte ist kein Marker (die Läuterung erreicht sie nicht). Sobald Schaden eingeht, wird sie aufgedeckt, **vor der Verteidigung**: Entspricht der Schaden in seiner Farbe der Karte, werden **1 / 2 / 3** (Stufe 1 / 2 / 3, seit 0.8.0.8; vorher 2 / 4 / 6) **unblockbarer Schaden** auf den Angreifer zurückgeworfen, höchstens in Höhe des eingehenden Schadens; der eingehende Schaden sinkt entsprechend. Danach kommt die Karte auf den Ablagestapel, auch wenn nichts reflektiert wurde. Am Kampfende kehrt eine noch liegende Karte in den Ablagestapel zurück. **Seit 0.12.1.1 stapeln die Fallen:** Eine neue Falle ersetzt die liegende nicht mehr, alle liegen nebeneinander. Geht Schaden ein, werden **alle** aufgedeckt (in der Reihenfolge des Legens) und abgelegt; jede Karte in der Farbe des Schadens wirft ihre Stufe zurück, die Rückwürfe addieren sich, zusammen höchstens der eingehende Schaden (eine spätere Falle wirft nur noch, was übrig ist). Fallen sind weiter keine Marker und nicht läuterbar. In der Verteidigung gestellt, wirkt sie erst nach ihr.

**Schild (Blau + Grün, seit 0.8):** Es mindert eingehenden, nicht geblockten Schaden gegen **jede** Farbe um bis zu seine Ladungen (1 / 2 / 3) und verliert je geminderten Schaden eine Ladung. **Seit 0.12.1.1 stapelt das Schild:** Ein neues Schild addiert seine Ladungen zu den liegenden, ohne Obergrenze (vorher: die höhere Zahl, höchstens 3). Läuterbar. Ein Rückwurf findet nicht mehr statt. In der Verteidigung gestellt, wirkt es erst nach ihr. Die Grafik ist die des früheren Multischilds, ohne dessen Anfangsanimation.

**Farbspiegel (bis 0.7.7.8):** ersetzt durch Falle und Schild; der Multispiegel (Wasser-Ultimate) ist durch den Erleuchtung ersetzt.

**Läuterung:** Wählbar sind alle Marker auf dem Brett, auch eigene: Todesmarker, Heil-, Mana- und Schildmarker sowie **gegnerische Nachziehtokens**. Gegnerische Tokens werden nur zerstört, sie werden nicht gutgeschrieben. Für jeden anderen entfernten Marker erhält der Angreifer ein Nachziehtoken. Keine Heilung.

**Ultimate (Todesfluch):** Die Stufe ist das Minimum aus den drei Magiewerten und den drei höchsten Kartenstufen, höchstens 3. Der Gegner verliert S HP am Ende jeder eigenen Angriffsphase bis Kampfende; nur Läuterung kann Marker entfernen. Die Ultimate **gilt auch in der Verteidigung** (alle drei Farben, die Verteidigungsfarbe blockt, die beiden anderen sind Kombokarten): Nach der Verteidigung erhält der Angreifer den Todesfluch.

**Ultimate nach Farbe (seit 0.7):** Die Farbe der ersten Karte entscheidet. Die Stufe S gilt wie bisher (Minimum der drei Kartensummen, höchstens 3); mehrere Marker einer Art galten bis 0.12.1.0 nicht addiert (es galt der höchste); **seit 0.12.1.1 stapeln sie**: Jede Ultimate legt ihre Stufe zusätzlich zu den liegenden Markern. Alle drei Marker entfernt nur die Läuterung (sie sind wählbar wie die Todesmarker).
- **Feuer: Todesfluch** wie bisher (S Todesmarker beim Gegner, S HP Verlust am Ende jeder seiner Angriffsphasen).
- **Erde: Meditation.** S grüne Marker mit Plus bei dir selbst: Am Ende jeder deiner Angriffsphasen heilst du S HP (höchstens bis zu den max. HP) bis Kampfende.
- **Wasser: Erleuchtung (seit 0.8, vorher Multispiegel).** S blaue Marker mit Kristall bei dir selbst: Am Ende jeder deiner Angriffsphasen regenerierst du S Mana (höchstens bis zum maximalen Mana) bis Kampfende. Nur Marker, die schon zu Beginn der Phase lagen, zählen. Die Läuterung kann sie entfernen. Animation: neues Ritual in der Ultimate-Werkstatt (Ring, Achtstern, aufsteigender Kristall, Manafunken), im Spiel eine blaue Wolke zur Manaanzeige.


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

## Nachziehmarker (neu, Schalter `drawMarker`, Standard seit 0.12: 0 = aus)

Jeder Spieler hat einen beidseitigen Marker (grün/rot) beim Nachziehstapel. Er startet grün. **Nachziehen** dreht ihn auf rot; **jede andere Zugaktion** dreht ihn auf grün (Weltphase: Bibliothek, Kampf beginnen; Tempel, Magie kaufen und Upgrades sind seit 0.9.3 keine Zugaktion mehr und lassen den Marker unverändert; Kampf: Angreifen, Verteidigen, Passen, Erholen, Fliehen). Markieren, Sperren und das Gratis-Nachziehen mit einem Nachziehtoken ändern ihn nicht. Der Marker bleibt zwischen Weltphase und Kampf liegen.
**Strafe:** Wer nachzieht, obwohl sein Marker rot ist, zahlt dafür. In der Weltphase gibt er dem Gegner `drawPenaltyGold` (1) Gold (ein Geschenk an den Gegner). **Im Kampf (seit 03.11.2026) verliert er `drawPenaltyMana` (1) Mana; ohne genug Mana ist das Nachziehen bei rotem Marker nicht möglich** (Erholen, Angreifen, Passen und Fliehen bleiben möglich). Das Mana geht verloren, der Gegner bekommt nichts. Das gilt auch für das Monster im Monsterkampf (es zahlt von seinem Mana). Der Marker bleibt nach dem Nachziehen rot. Bis 02.11.2026 bekam der Gegner im Kampf stattdessen ein Nachziehtoken. Das Gratis-Nachziehen mit einem Token kostet kein Mana und ändert den Marker nicht.
KI: Sie zieht bei rotem Marker nur noch nach, wenn sie keine andere Aktion hat (Weltphase: lieber 1 Gold im Tempel opfern, ohne Gold gratis in der Bibliothek tauschen oder ein Monster angreifen; Kampf: lieber erholen; ohne Mana zieht sie bei Rot gar nicht nach), siehe `tools/balance/README.md`. Die KI-Gewichte sind für die neue Kampfstrafe noch nicht nachtrainiert.
Messung (KI gegen KI, 1000 Partien, KI nachtrainiert): P90 657 statt 1615, Maximum 4050 statt 12940 Aktionen, Unentschieden 3,4 % statt 7,8 %. Die Schleife verschwindet nicht ganz: Beim Warten wandert Gold hin und her und wird im Tempel angelegt; die Stillstandsregel (`idleLimit`) bleibt als zweite Sicherung möglich.

## Nachziehlimit (neu in 0.2.1)

Neuer Wert je Spieler, **Nachziehlimit** 1 bis 3 (Start 1, höchstens `MAX_DRAW_LIMIT` 3). Er sagt, wie oft ein Spieler hintereinander nachziehen darf, bevor sein Nachziehmarker auf Rot springt (Limit 1 = bisherige Regel: das erste Nachziehen dreht den Marker auf Rot).
**Steigern:** In der Weltphase im eigenen Zug für `drawLimitCost` Upgrade-Punkte (aus dem Tempel) je Schritt (vorläufig `[1, 1]`: 1 Punkt für Stufe 2, 1 Punkt für Stufe 3), wie max. HP, Mana, Ausspiellimit und Handplätze; Gold kostet es nicht. Das ist seit 0.9.3 wie jedes Upgrade keine Zugaktion mehr: Der Spieler bleibt am Zug, der Marker bleibt unverändert. (Bis 23.10. kostete es Gold.)
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
Folge: Der Tempel ist jetzt der Weg zur Magie (Gold opfern, Punkte sammeln), Gold kauft die Werte im Kampf direkt. Die Siegbedingung ändert sich dadurch nicht (zu dieser Zeit: Gold das zweite, die Tempelstufe das dritte Kriterium; seit 0.8.6.1 umgekehrt).
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
- **Ultimates nach Primärfarbe:** Feuer Todesfluch, Erde Meditation (grüner Marker mit Plus), Wasser Prisma (siehe oben). Nur Läuterung entfernt diese Marker.
- **Nachziehmarker-Strafe nach Abschnitt:** Mana (Kampf) und Gold (Weltphase) kosten 1/2/3 je Abschnitt; vor dem Nachziehen bei rotem Marker erscheint eine Warnung (wie beim Fliehen).
- Der Hinweistext zur Schildwirkung („Spiegel: …“) im Kampf entfällt.

## Änderung 0.7.0.1 (06.11.)

- **Kombo-Übersicht:** Alle Kombos stehen nach der Farbe der ersten Karte geordnet (Feuer, Wasser, Erde), die Ultimate jeweils darunter, und passen ohne Scrollbalken in das Fenster. Ausführliche Wirkungen stehen im Tooltip.
- **Umbenennung:** Der Todes-Fluch (Feuer-Ultimate) heißt **Todesfluch**.

## Änderung 0.7.0.2 (06.11.)

- Kombo-Übersicht: Farbüberschriften und der Zusatz „(Ultimate)“ entfallen; die Kombos bleiben nach Farbe geordnet.

## Änderung 0.7.0.3 (06.11.)

- Kombo-Übersicht: Die Zeilen verteilen sich auf die volle Höhe des Fensters.

## Änderung 0.7.1.1 (06.11.)

- Kombo-Übersicht: größerer Schriftgrad (füllt die Fensterhöhe); die Zeilen sind nach Farbe der ersten Karte getönt und die Farbgruppen durch Abstand getrennt.

## Änderung 0.7.1.2 (06.11.)

- Umbenennung: Regenbogenschild heißt **Prisma**; die Kombo Wasser + Feuer heißt **Feuerspiegel**, Wasser + Erde **Erdspiegel**.

## Änderung 0.7.2.1 (06.11.)

- **Keine Spieländerung:** Neue Werkstatt `werkstatt/ultimate-werkstatt.html` (Ultimate-Werkstatt) für die Kombos aus allen drei Elementen: Todesfluch (Feuer, das Pentagramm aus `CurseFx`), Meditation (Erde: Kreis mit Ranken, Pluszeichen und Lichtsäule) und Prisma (Wasser: Lichtstrahl, der sich im Kristall in Feuer, Erde und Wasser aufspaltet, dann die Schildkuppel). Nach dem Ritual fliegen die Marker auf ihre Plätze und die Wirkung läuft (Gegner verliert HP, Heilung, Abwehr dreier Farben). Meditation und Prisma sind Entwürfe; im Spiel haben sie bisher nur den Ton.

## Änderung 0.7.2.2 (06.11.)

- **Prisma verliert Stufen:** Die Stufen des Prisma verfallen wie die eines Farbspiegels: Je ausgeglichenem oder zurückgeworfenem Schaden geht eine Stufe ab. Es gilt weiter der höhere Wert von Farbspiegel und Prisma gegen die Angriffsfarbe (höchstens so viel Schaden je Verteidigung), **verbraucht werden aber immer zuerst die Stufen des Farbspiegels**, dann die des Prisma (Beispiel: Feuerspiegel 1 und Prisma 2 gleichen 2 Schaden aus, der Feuerspiegel verliert 1, das Prisma 1). Umsetzung: `defenseOutcome` (`lostStd`, `lostRb`), `defenseComboPre` und `execDefense` in `src/engine/65-kampfablauf.js`; Vorschau und Protokoll folgen derselben Rechnung („Spiegel und Prisma: … verliert 2 Stufen (1 vom Spiegel, 1 vom Prisma)“). Der Schild-Effekt (`MirrorFx`) gilt dem Farbspiegel, wenn er Stufen verliert, sonst dem Prisma (Schild mit Regenbogenfarben, `elem` R). Test: `Standardschilde werden vor dem Prisma verbraucht` in `tests/engine.test.js`. Die KI ist nicht neu abgestimmt; die Referenzpartien (`tests/golden.json`) sind neu erzeugt.
- **Rituale für Meditation und Prisma:** Aus der Ultimate-Werkstatt ins Spiel übernommen (`UltFx` in `src/ui/20a-ultimates.js`). Wie das Pentagramm des Todesfluch laufen sie mittig auf dem Bildschirm (4 s), sobald der erste Heilmarker bzw. das Prisma gelegt wird: Meditation mit Kreis, Ranken, Pluszeichen, Lichtsäule und Heilwellen; Prisma mit Lichtstrahl, der sich im Kristall in Feuer, Erde und Wasser aufspaltet, und der Schildkuppel. Die Werte stehen in `P` dort (Standard der Werkstatt).

## Änderung 0.7.2.3 (06.11.)

- **Effekt der Heilmarker:** Heilt die Meditation am Ende der eigenen Angriffsphase, steigt aus jedem Heilmarker (bis zu 4 dargestellt) eine grüne Wolke mit Lichtpunkten und Pluszeichen zur Lebensanzeige (`FlowFx.heal` in `src/ui/22-lifeflow-aggro.js`), analog zur Wolke des Todesfluch. Die Lebensanzeige zeigt bis zum Eintreffen den alten Stand (`holdHp` in `src/ui/26a-darstellung.js`, gemeinsam mit dem Todesfluch). Keine Regeländerung.

## Änderung 0.7.2.4 (06.11.)

- **Umbenennung:** Das Prisma (Wasser-Ultimate) heißt **Multischild**. Die Regeln bleiben unverändert (Spielfeld, Log, Tooltips, Werkstatt und die aktuellen Regelzeilen oben nutzen den neuen Namen; ältere Änderungsabschnitte nennen noch „Prisma“). Interne Namen (`stats.rainbow`, Schildeffekt „R“) bleiben.
- **Neuer Ablauf des Rituals:** Erst bildet sich ein Kreis am Boden (Ring, Gegenring, Rastmarken in Feuer-, Erd- und Wasserfarbe), danach wächst daraus die Schildkuppel. Kristall und Lichtstrahl entfallen; die Werkstatt-Regler „Größe des Kristalls“ und „Auffächerung“ entfallen ebenfalls.

## Änderung 0.7.2.5 (06.11.)

- **Rituale bei jedem Wirken:** Die Rituale von Meditation und Multischild starten jetzt über den Effekt der Ultimate im Kampflog (`showFx`), nicht mehr nur, wenn die Summe der Marker steigt. Bisher blieb das Multischild-Ritual aus, wenn die Stufe schon gleich hoch oder höher lag (die Ultimate setzt nur das Maximum). Keine Regeländerung.

## Änderung 0.7.2.6 (06.11.)

- **Marker vor dem Stapel:** Todes- und Heilmarker liegen als einzelne Tokens zentral vor dem Nachziehstapel ihres Spielers (eigene oberhalb, die des Gegners unterhalb), mit festem, mäßigem Zufallsversatz und Drehung. Todesmarker bilden die vordere Reihe, Heilmarker eine zweite Reihe dahinter. Der Heilmarker ist kleiner (46 statt 50 px) und gedämpfter. Spiegel und Multischild bleiben neben dem Handbrett. Keine Regeländerung.

## Änderung 0.7.2.7 (06.11.)

- **Umbenennung:** Das Multischild (Wasser-Ultimate, zuvor Prisma) heißt **Multispiegel**: Oberfläche, Log, Tooltips, Werkstatt, Tests und die aktuellen Regelzeilen. Ältere Änderungsabschnitte nennen noch die damaligen Namen. Keine Regeländerung.

## Änderung 0.7.2.8 (06.11.)

- **Meditation wie Todesfluch:** Ein Heilmarker, der in der eigenen Angriffsphase gelegt wird (Ultimate im Angriff), heilt erst am Ende der **nächsten** eigenen Angriffsphase. Bisher heilte er schon am Ende der Phase, in der er gelegt wurde. Technisch merkt `stats.healPhase` die Stufe zu Beginn der Phase (wie `deathPhase`); eine Erhöhung in derselben Phase zählt erst ab der nächsten. Wird die Ultimate in der Verteidigung gelegt, heilt der Marker wie bisher am Ende der nächsten eigenen Angriffsphase.

## Änderung 0.7.2.9 (06.11.)

- **Pappmarker-Optik:** Todes- und Heilmarker haben eine dunkle Kante (Materialstärke, Licht von oben links), einen weichen Wurfschatten und einen schwachen Glanz oben links. Die Drehung liegt auf dem Bild, der Schatten bleibt für alle Marker gleich ausgerichtet. Nur Darstellung, keine Regeländerung.

## Änderung 0.7.2.10 und 0.7.2.11 (06.11.)

- **Schatten (0.7.2.10):** Der Wurfschatten der Marker liegt näher am Marker und ist härter (3 px Versatz, 1 px Unschärfe). Spiegel- und Multispiegel-Marker haben dieselbe Pappmarker-Optik und liegen bei den übrigen Markern.
- **Lage (0.7.2.11):** Todes-, Heil- und Schildmarker (Farbspiegel, Multispiegel) liegen in **einer** lockeren Reihe mittig direkt vor den Handkarten ihres Spielers (eigene oberhalb, die des Gegners unterhalb der Hand), mit mäßigem Versatz und Drehung; Reihenfolge: Todesmarker, Heilmarker, Schildmarker. Sie liegen nicht mehr beim Nachziehstapel und verdecken weder Karten noch Anzeigen. Nur Darstellung, keine Regeländerung.

## Änderung 0.7.2.12 (06.11.)

- **Zähler statt Mehrfachabbildung:** Todes- und Heilmarker zeigen sich als **ein** Token mit Zähler (×N ab 2), wie Farbspiegel und Multispiegel. In der Läuterung wählt ein Klick einen Marker mehr, nach dem Maximum wieder alle ab (wie bei den Schildmarkern). Die Wolken von Todesfluch und Meditation starten weiterhin je eine pro Marker (höchstens 4), alle aus diesem Token. Nur Darstellung und Bedienung, keine Regeländerung.

## Änderung 0.7.2.13 bis 0.7.2.15 (06.11.)

- **Zähler sichtbar (0.7.2.13/14):** Die Markerreihe liegt so hoch (eigene) bzw. tief (Gegner), dass auch angehobene, markierte Handkarten und die Zähler der Marker nicht verdeckt werden; der Abstand der Marker ist so groß, dass kein Zähler vom Nachbarmarker überdeckt wird.
- **Multispiegel dunkler (0.7.2.15):** Farben, Kontur und Glanz des Multispiegel-Schildes sind gedämpft, damit er im Verhältnis zu den Farbspiegeln nicht heller wirkt (gilt auch für die Bruch-Animation).

## Änderung 0.7.2.16 (06.11.)

- **Schatten dichter:** Die Kante der Marker ist 2 statt 3 px stark, der Wurfschatten liegt bei 2/3 px Versatz (vorher 3/4 px). Nur Darstellung.

## Änderung 0.7.2.17 (06.11.)

- **Innenschatten:** Das Multispiegel-Schild hat einen weichen dunklen Schatten, der vom Rand nach innen fällt (auch in der Bruch-Animation). Nur Darstellung.

## Änderung 0.7.2.18 (06.11.)

- **Geteiltes Schild:** Das Multispiegel-Schild ist mittig senkrecht geteilt, die rechte Hälfte ist abgedunkelt (wie die Facetten der Farbschilder); der frühere helle Glanz entfällt. Gilt auch für die Bruch-Animation. Nur Darstellung.

## Änderung 0.7.2.19 (06.11.)

- **Ohne Trennlinie:** Beim geteilten Multispiegel-Schild (0.7.2.18) entfällt die Mittellinie; die Teilung ergibt sich nur aus der abgedunkelten rechten Hälfte. Nur Darstellung.

## Änderung 0.7.2.20 (06.11.)

- **Innenschatten kleiner und härter:** Der Schattenwurf vom Rand des Multispiegel-Schildes nach innen hat einen kleineren Radius (Kantenbreite 5 statt 11) und ist härter (Unschärfe 0,7 statt 2,6). Nur Darstellung.

## Änderung 0.7.2.21 (06.11.)

- **Innenschatten weicher:** Unschärfe des Randschattens im Multispiegel-Schild 1,3 statt 0,7 (Kantenbreite unverändert 5). Nur Darstellung.

## Änderung 0.7.2.22 (06.11.)

- **Versionsliste gekürzt:** Der Hinweistext im Menü nennt nur noch die Updates der aktuellen Hauptversion 0.7 (erste Nachkommastelle); Einträge ab 0.6.x entfallen aus der Anzeige. Die Änderungsabschnitte in dieser Datei bleiben vollständig.

## Änderung 0.7.2.23 (06.11.)

- **Schilde erst nach der Verteidigung:** Ein Farbspiegel-Kombo (Wasser + Feuer/Erde) und die Wasser-Ultimate (Multispiegel), die in der Verteidigung gewirkt werden, stellen den Schild erst **nach** dem Schaden. Er gleicht den laufenden Angriff nicht mehr aus, gilt aber ab dem nächsten Angriff (analog zur Heilung seit 0.5.4). Bereits stehende Schilde wirken wie bisher. Im Angriffszug gewirkte Schilde sind davon nicht betroffen. Zerrüttung, Lähmung, Läuterung und Todesfluch wirken weiter vor der Verteidigung. Das ändert die KI-Referenzpartien (`tests/golden.json` neu erzeugt) und die Vorschau der Verteidigung.

## Änderung 0.7.2.24 (06.11.)

- **Start-Siegpunkte 3:** Jeder Spieler beginnt mit 3 statt 2 Siegpunkten (`startSp`). Das verändert die KI-Referenzpartien (`tests/golden.json` neu erzeugt).

## Änderung 0.7.5.1 (06.11.)

- **Keine Regeländerung, KI neu abgestimmt** (Messung in `tools/balance/README.md`): kein Opfern von Gold für Magie mehr (`sacG` 0), Meditation höher und Multispiegel niedriger bewertet (`uHeal`, `uMulti`), Läuterung entfernt gezielt eigene Todesmarker und gegnerische Heilmarker (`lfDeath`, `lfHeal`), neue Angriffsgewichte, Fliehen nur noch in den ersten vier Weltzügen ohne entschiedenen Kampf (`fleeIdle` 4). Die Eröffnung (Handplätze erst nach dem ersten Sieg) wartet auf den ersten besiegten Monsterkampf: Die Engine zählt dafür `stats.kills`. Die Referenzpartien (`tests/golden.json`) sind neu erzeugt. 86,6 % gegen die KI von 0.7.3.3.

## Änderung 0.7.6.1 (06.11.)

- **Läuterung in der Verteidigung wählbar:** Die Markerwahl der Läuterung (Marker auf dem Brett anklicken, auch eigene Spiegel, Heilmarker, Todesmarker und Nachziehtokens) gilt jetzt auch für eine Läuterung, die in der Verteidigung gewirkt wird (`lfp` ist im Angriffs- und im Verteidigungszug erlaubt). Ohne Wahl bleibt die automatische Auswahl. Die Wahl gilt nur für den jeweiligen Zug und wird danach gelöscht (auch beim Passen). Zeitpunkt unverändert: Die Läuterung wirkt vor der Verteidigung; die Vorschau nennt das jetzt richtig („vor“ statt „nach der Verteidigung“ bei Lähmung, Zerrüttung und Läuterung).

## Änderung 0.7.6.2 (06.11.)

- **Heilung verfällt bei Tod:** Die Heilung der Verteidigung (Erde + Wasser) wirkt weiter nach dem Schaden, aber nur, wenn der Verteidiger danach noch über 0 HP steht. Fällt er durch den Schaden auf 0 HP, ist er besiegt und die Heilung verfällt (früher konnte sie einen sonst tödlichen Schaden nachträglich ausgleichen). Die KI wertet die Heilung bei tödlichem Restschaden nicht mehr. Das ändert die Vorschau der Verteidigung und die KI-Referenzpartien (`tests/golden.json` neu erzeugt).

## Änderung 0.7.6.3 (06.11.)

- **Abwerfen nach Zerrüttung ist kein Zug (abgesichert):** Das Abwerfen der Karten nach einer Zerrüttung ist eine Pflichtabfrage, keine Zugaktion. Es zählt nicht für den Zugzähler des Kampfes (`turns`), nicht für den Passen-Zähler der KI und lässt den Nachziehmarker unverändert; die Seite am Zug und die laufende Aktion (Angriff, Verteidigung) bleiben, wie sie waren. Das war in der Engine schon so; ein Test hält es jetzt fest (`engine.test.js`).

## Änderung 0.7.6.4 (07.11.)

- **Opfern im Tempel ist kein Zug mehr:** Gold in Tempelpunkte umzutauschen beendet den Zug nicht mehr. Der Spieler bleibt am Zug, darf mehrmals opfern und danach in derselben Runde Magie kaufen, Upgrades kaufen oder eine andere Aktion wählen. Das Opfern ändert auch den Nachziehmarker nicht (früher stellte es ihn auf grün). Die KI opfert vor ihrer eigentlichen Aktion im selben Zug (`runTurn`, höchstens 12 Wirtschaftsschritte); ihr Zug „roter Marker: 1 Gold opfern“ (`dTmp`) entfällt, weil er den Marker nicht mehr zurückstellt. Das ändert die KI-Referenzpartien (`tests/golden.json` neu erzeugt).
- **Anzeige:** Unter der Magiegrafik des eigenen Bretts (Weltphase) steht, was die nächste Magiestufe kostet („Nächste Magiestufe: N Upgrade-Punkte“, mit swapCosts in Punkten, sonst in Gold; „Magie auf Maximum“, wenn alle drei Farben auf Stufe 3 stehen). Reichen die Punkte nicht, ist die Zahl gedämpft rot.

## Änderung 0.7.6.5 (07.11.)

- **Kampfrunden, höchstens 10:** Der Kampf zählt Runden (`combat.atkTurns`, Anzeige „Runde N von 10“ im Kampffenster). Eine Runde ist ein Angriffszug jeder Seite; zum Angriffszug zählen Angriff, Passen, Erholen und Nachziehen, die Verteidigung gehört zum Angriffszug des Gegners. Sind 10 Runden (20 Angriffszüge) vorbei und der letzte Angriff verteidigt, endet der Kampf **unentschieden** (`reason: 'rounds'`): im Monsterkampf behält das Monster HP und Mana (wie bei der Flucht), im Showdown gibt es keine Siegpunkte. Fällt jemand auf 0 HP, entscheidet das wie immer vor dem Rundenlimit. Die Regel heißt `maxRounds` (Standard 10, 0 = aus); die alte Sicherung `MAX_COMBAT_TURNS` bleibt.
- **KI darauf abgestimmt:** Ohne Anpassung entschied die KI nur 34 % der Monsterkämpfe und 4 % der Showdowns innerhalb von 10 Runden (Median 18 bzw. 58 Runden), und mit dem Limit kam ein Großteil der Partien nie zu Ende. Jetzt sinkt ihre Angriffsschwelle schon ab Runde 1 (`stallFrom` 0, `stallDec` 3, `aThr` 0,4). Messung (30 Partien KI gegen KI): alle Partien enden; etwa 40 % der Showdowns werden noch entschieden, der Rest endet nach 10 Runden unentschieden. Das ändert die KI-Referenzpartien (`tests/golden.json` neu erzeugt).

## Änderung 0.7.6.6 (07.11.)

- **Vorzeitiges Spielende wieder aktiv:** Wer nach einem Showdown (ab dem ersten, `winSpFromShowdown` 1) mit mindestens 4 Siegpunkten (`winSp` 4) **führt**, gewinnt das Spiel sofort. Bei Gleichstand (auch bei 4 : 4) geht es mit dem nächsten Abschnitt weiter; nach dem dritten Showdown endet das Spiel wie bisher (Siegpunkte, dann Gold, dann Tempelstufe). Da jeder Spieler mit 3 Siegpunkten beginnt, entscheidet damit oft schon der erste Showdown das Spiel. Das ändert die KI-Referenzpartien (`tests/golden.json` neu erzeugt).

## Änderung 0.7.6.7 (07.11.)

- **Zwei Schilde nebeneinander:** Verbraucht eine Verteidigung Stufen vom Farbspiegel **und** vom Multispiegel (der Farbspiegel zuerst, den Rest trägt der Multispiegel), zeigt die Oberfläche beide Schild-Effekte gleichzeitig nebeneinander statt nur den des Farbspiegels. Die Engine liefert dafür `fx.mirror` (Farbspiegel) und `fx.mirror2` (Multispiegel) mit aufgeteilten Werten (`abs`, `r`, `broken`). Keine Regeländerung.

## Änderung 0.7.6.8 (07.11.)

- **Multischild kräftiger:** Die Verlaufsfarben des Multischilds (Marker und Schild-Effekt) sind weniger entsättigt. Keine Regeländerung.

## Änderung 0.7.7.2 (07.11.)

- **Kein Rundenlimit mehr, dafür Erschöpfung:** `maxRounds` steht auf 0 (aus; die Regel bleibt als Schalter erhalten, die Version 0.7.7.1 mit 20 Runden ist damit zurückgenommen). Neu ist die Regel `exhaustRounds` (Standard 10, 0 = aus): Nach je 10 Kampfrunden steigt die **Erschöpfung** um 1. Beide Seiten verlieren am Ende ihrer Angriffsphase (nach Angriff und Verteidigung der Gegenseite, gleicher Zeitpunkt wie der Todesfluch) so viele HP, wie die Erschöpfung hoch ist: Runde 1–10: 0, Runde 11–20: 1, Runde 21–30: 2 usw. Sie gilt in Monsterkämpfen (auch für das Monster) und im Showdown. Fällt eine Seite dadurch auf 0 HP, verliert sie wie sonst; der Kampf endet nie unentschieden durch die Runden. Anzeige im Kampffenster: „Runde N · Erschöpfung X“ (vor Runde 11: „Erschöpfung ab Runde 11“). Anlass: Spiellog Seed 2127820936, dritter Showdown mit 148 Aktionen ohne HP-Änderung. Die Erschöpfung ist unabhängig von der alten Sicherung `MAX_COMBAT_TURNS` („Beide Seiten sind erschöpft“, 400 Züge).
- **Offen:** Die KI kennt die Erschöpfung nicht; ihre Parameter (`stallFrom`, `stallDec`, `aThr`) sind noch auf das frühere Limit abgestimmt. KI-Referenzpartien (`tests/golden.json`) sind neu erzeugt; `npm run balance` steht noch aus.

## Änderung 0.7.7.3 (07.11.)

- **Vorzeitiges Spielende nach Vorsprung, nicht nach Punktestand:** Fehler aus 0.7.6.6 behoben. Die Regel `winSp` (Führung mit mindestens 4 Siegpunkten) ist ersetzt durch `winLead` (Standard 4): Nach einem Showdown (ab `winSpFromShowdown` 1) endet das Spiel sofort, wenn ein Spieler **mindestens 4 Siegpunkte Vorsprung** hat (4 : 0, 5 : 1, 6 : 2 …). Bei 4 : 1 (Vorsprung 3) geht es weiter. Nach dem dritten Showdown endet das Spiel wie bisher (Siegpunkte, dann Gold, dann Tempelstufe). Das ändert die KI-Referenzpartien (`tests/golden.json` neu erzeugt).

## Änderung 0.7.7.4 (07.11.)

- **Versionsanzeige:** Der Link im Hauptmenü („Neu in Version …“) stand noch auf 0.7.6.8, während die Über-Seite schon die neue Nummer zeigte. Beide lesen die Nummer jetzt aus einer Konstante (`MAGUS_VERSION` in `src/ui/26a-darstellung.js`); ein Test prüft, dass keine Nummer mehr fest eingetragen ist und dass das Regelwerk einen Eintrag zur aktuellen Version hat.

## Änderung 0.7.7.5 (07.11.)

- **KI setzt Überschussgold für Magie ein (neue Stellschraube `sacSur`, Standard 6, 0 = aus):** Ein Spiellog (Seed 578637422, KI gegen KI) endete mit 162 und 175 Gold. Beide KIs standen in Abschnitt 3 noch auf Magie 1/1/1 mit Tempelstufe 0, weil `sacG` 0 das Opfern von Gold für Magie abschaltet und alle Verbesserungen für Gold schon gekauft waren. Das Gold stammte vor allem aus dem Nachziehen bei rotem Marker (104 Strafzüge à 3 Gold in Abschnitt 3, 312 Gold) und hatte keinen Verwendungszweck. Jetzt gilt: Findet `pickSpend` nichts mehr zu kaufen und hat die KI mindestens `sacSur` Gold, opfert sie im Tempel so viel, wie für die nächste Magiestufe nötig ist (auch bei `sacG` 0, auch über `mgGoal` hinaus).
- **Messung (300 KI-Partien, vorher | nachher):** Magie im Mittel 0,03 | 1,9; Endgold 41,6 | 3,8; Spiellänge Median 376 | 344 Aktionen, Maximum 1474 | 582; Beginner siegt 41,7 % | 53,0 %. Beim Höchstgold von 60 Partien: 278 | 20 Gold.
- **Offen:** Die Goldstrafe beim Nachziehen mit rotem Marker (Weltphase) schafft weiterhin Gold aus dem Nichts: Der Nachziehende zahlt nichts, der Gegner erhält `drawPenaltyGold` × Abschnitt. Das ist eine Regelfrage und bleibt unverändert, bis über eine Änderung entschieden ist (Vorschläge: der Nachziehende zahlt selbst, oder die Strafe entfällt).

## Änderung 0.7.7.6 (07.11.)

- **KI nachtrainiert (`sacSur`, `hpA`):** Magie als letzte Option zu bewerten ist nicht von vornherein richtig, darum wurde `sacSur` gemessen statt gesetzt. Scan gegen den Pool (Champion plus drei früh angreifende Gegner, 800 Partien je Wert und Gegner, mittlere Siegquote): `sacSur` 0 (aus) 15,7 %, 1 65,1 %, 2 61,3 %, 3 61,7 %, 4 61,3 %, 5 60,2 %, 6 52,5 %, 10 35,2 %, 20 20,7 % (jeweils gegen die KI mit `sacSur` 6). Neuer Standard: `sacSur` 1 (alles Gold, das nichts Bezahlbares mehr kauft, geht in Magie). Danach `PARAMS=sacSur,sacG,mgGoal,sacRes,hpA,manaA,slotA,limitA node tools/balance/opt2.js 3 600 '{"sacSur":1}'`: übernommen wurde nur `hpA` 7 (+16,6 Punkte bestätigt in 1200 Partien je Gegner); `sacG` 1 (Magie vor den Verbesserungen, +1,1) wurde nicht bestätigt, `mgGoal`, `sacRes`, `manaA`, `slotA`, `limitA` brachten nichts. Die Runden 2 und 3 übernahmen nichts mehr.
- `sacSur` steht jetzt in `tools/balance/opt.js` (Schrittweite 1) und `opt2.js` (nicht negativ).

## Änderung 0.7.7.7 (07.11.)

- **Tempelopfer der KI: sammeln statt sofort opfern geprüft (`sacBatch`, `sacMaxCost`):** Anlass war der Einwand, Überschussgold lohne nur dann sofort, wenn es nutzbare Tempelpunkte ergibt und die Magiestufe nicht zu teuer ist; sonst sei Sparen besser, weil ein großes Opfer mehr Punkte bringt (n Gold ergeben n(n+1)/2 Punkte; ein geteiltes Opfer verschenkt den Zuwachs). Rechnung: Bei Tempelstufe 3 kosten drei Upgrade-Punkte in einem Opfer 5 Gold, in drei getrennten Opfern 8 Gold; bei Tempelstufe 0 spielt es keine Rolle (k Punkte kosten k Gold). Neu in der KI: `sacBatch` (für wie viele Magiestufen sie das Gold sammelt und auf einmal opfert, 1 = sofort die nächste) und `sacMaxCost` (teuerste Magiestufe in Upgrade-Punkten, für die sie noch opfert; 99 = keine Grenze). Die bisherige Bedingung bleibt: Geopfert wird nur, wenn das Opfer die Punkte für die Stufe(n) tatsächlich erreicht, sonst spart die KI.
- **Messung (je 500 Partien je Gegner, Pool wie bei `sacSur`, Mittel gegen die KI mit Standardwerten):** `sacBatch` 1: 48,6 % (Vergleichswert), 2: 43,8 %, 3: 44,9 %, 4: 43,6 %, 6: 41,6 %. `sacMaxCost` 2: 46,3 %, 3: 47,4 %, 4: 48,4 %, 5: 48,5 %, 6: 48,6 % (99 = 48,6 %). Warten ist also gegen diese Gegner schlechter, weil die Magie früher gebraucht wird (Monsterkämpfe, Showdown); eine Kostengrenze bringt nichts. Standardwerte bleiben `sacBatch` 1, `sacMaxCost` 99; das Verhalten der KI ist unverändert (Golden-Datei identisch). Die Messung gilt für diese Gegner: Gegen einen Menschen, der spät angreift, oder in Partien mit hohem Tempelstand könnte Sparen anders abschneiden; dazu fehlen Messungen.

## Änderung 0.7.7.8 (07.11.)

- **KI opfert im Tempel nur, wenn das Opfer etwas bewirkt (`sacOpen`, Standard 1):** Regel für die KI: Gold wird nur geopfert, wenn (a) dadurch überhaupt Tempelpunkte (mindestens eine Stufe) entstehen und (b) die verfügbaren Punkte dann für die nächste Magiestufe reichen; sonst spart sie. Im Überschusszweig (`sacSur`, seit 0.7.7.5) war das schon so (`sacMagic` opfert erst, wenn `previewTemple(...).gained` den Bedarf deckt). Geprüft an 200 KI-Partien: 504 Opfer, **alle 504 unmittelbar von einem Magiekauf gefolgt**, im Mittel 3,01 Gold je Opfer, kein Opfer ohne Folge. Die einzige Stelle ohne Prüfung war die Eröffnung (2 bis 3 Gold, sobald Gold da ist, ohne Rücksicht auf die Punkte); sie ist jetzt wie der Überschusszweig abgesichert (`sacOpen` 0 stellt das alte Verhalten wieder her). Im Test kam die Stelle in 100 Partien nie zum Zug (0 Opfer vor dem ersten Showdown, mit und ohne Schalter 259 Opfer insgesamt, gleiche Siegquote 48,5 %); das Verhalten der KI ist also unverändert, Golden-Datei identisch.
- Neuer Test: Jedes Tempelopfer der KI wird im selben Zug von einem Magiekauf gefolgt.

## Änderung 0.8 (07.11.)

- **Blaue Kombos überarbeitet:** (a) **Blau + Rot = Falle:** ziehe bis zu drei Karten, lege eine verdeckt vor dich; bei eingehendem Schaden wird sie aufgedeckt, passt die Farbe des Schadens, werden 2 / 4 / 6 unblockbar vor der Verteidigung reflektiert (gedeckelt durch den eingehenden Schaden, der entsprechend sinkt), danach kommt die Karte auf den Ablagestapel (auch ohne Rückwurf); sie ist kein Marker. (b) **Blau + Grün = Schild:** mindert eingehenden, nicht geblockten Schaden um 1 / 2 / 3 Ladungen, Grafik des Multischilds ohne Anfangsanimation. (c) **Blau + Rot + Grün = Erleuchtung:** regeneriert 1 / 2 / 3 Mana am Ende des eigenen Angriffszugs, Marker mit Kristall, Läuterung wählbar (Codes `sm`/`om`).
- **Entfallen:** Farbspiegel (rot, grün) und Multispiegel samt Rückwurf an Verteidigungsüberschuss und Spiegelbruch-Ablauf in der Engine; die Läuterungscodes `sm:F` usw. gelten nicht mehr.
- **Animationen:** Neues Erleuchtung-Ritual (`fxMana` in `UltFx`, auch in der Ultimate-Werkstatt, Vorlagen „Erleuchtung einzeln“ und „kühl“); Manawolke in `FlowFx.heal` (Variante `mana`); `TrapFx` (Karte dreht sich um, Geschoss zum Angreifer, „−N“).
- **KI und Tests:** KI bewertet Falle, Schild und Erleuchtung neu (`trapWorth`, `shieldWorth`, `uMana`, `wTrap`); Engine-Tests für Falle, Schild, Erleuchtung und Läuterung umgeschrieben; Golden-Datei neu erzeugt.

## Änderung 0.8.0.1 (07.11.)

- **Falle ersetzt die Zerrüttung:** Die Kombo Rot + Blau (erste Karte Feuer, zweite Wasser) legt jetzt ebenfalls die Falle; die Zerrüttung (Gegner wirft S Handkarten seiner Wahl ab) entfällt samt KI-Bewertung, Anzeige und Tabellenzeile. Die Falle gilt damit für beide Reihenfolgen (Blau + Rot und Rot + Blau), Stufe S wie bei allen geordneten Kombos aus der Summe der Kartenwerte je Farbe (kleinere Summe, höchstens 3). Rot + Blau schlägt in Feuer zu, Blau + Rot in Wasser.
- Der Abwurf-Ablauf der Zerrüttung (`fd`) bleibt nur noch für die Fallenwahl in Gebrauch; der Ton `ruin` und die Animation `FlowFx.ruin` sind ungenutzt.
- Tests: Zerrüttungs-Tests auf die Falle umgestellt.

## Änderung 0.8.0.2 (07.11.)

- **Hellsicht (Blau + Rot):** Neue Kombo anstelle der Falle in dieser Reihenfolge (die Falle bleibt bei Rot + Blau). Zieht S Karten, je Karte Hand, Ablage oder Händler (siehe „Kombos“). Engine: `sightDraw`, `sightResolve`, Aktion `fd` mit `pick`; Oberfläche: Panel mit Karte und drei Knöpfen je Karte, Bestätigen; KI: Fluchkarten zum Händler, echte Karten auf die Hand, solange Platz ist, sonst Ablage (Wert 0,5 je Stufe).
- Tests: Hellsicht-Tests, Falle auf Rot + Blau umgestellt.

## Änderung 0.8.0.3 (07.11.)

- **Hellsicht im Vordergrund:** Die gezogenen Karten liegen groß über dem Kampffeld (abgedunkelter Hintergrund, Einblend-Animation), unter jeder stehen die drei Möglichkeiten „Auf die Hand“, „Ablegen“ und „Abwerfen“ (zurück zum Händler); mit „Bestätigen“ gilt die Wahl. Keine Regeländerung. Der Gegner sieht die Karten nicht, nur den Hinweis im Kampffeld.

## Änderung 0.8.0.4 (07.11.)

- **Hellsicht-Auswahl ohne erneutes Einblenden:** Beim Anklicken von „Auf die Hand“, „Ablegen“ oder „Abwerfen“ färbt sich nur der Knopf ein; die Karten bleiben stehen und blenden nicht neu ein (vorher wurde das Overlay bei jeder Wahl neu aufgebaut und wirkte wie eine weitere Karte). Nur Darstellung.

## Änderung 0.8.0.5 (07.11.)

- **Falle zieht vom Stapel und zeigt die Karten in der Mitte:** Die drei Karten kommen direkt vom Zugstapel (nicht mehr in freie Handplätze), liegen groß im Vordergrund, unter jeder Karte steht „Als Falle legen“ (Fluchkarten sind gesperrt). Die gewählte liegt verdeckt vor dir, die übrigen gehen auf den Ablagestapel; die Hand bleibt unverändert. Gibt es nur eine mögliche Karte, gilt sie sofort. Unentschiedene Karten kehren bei Kampfende in den Ablagestapel zurück.
- KI: wählt die Karte in der Farbe, mit der der Gegner nach seinem Deck am ehesten angreift. Die Hervorhebung der Handkarten als Kandidaten entfällt.

## Änderung 0.8.0.6 (07.11.)

- **Falle und Hellsicht mischen bei Bedarf:** Reicht der Zugstapel für die gezogenen Karten nicht, wird (wie beim normalen Nachziehen) der Ablagestapel gemischt und weitergezogen; die Restkarten des Zugstapels kommen zuerst. Im Ablagestapel liegen dann auch die eben gespielten Kombokarten. Das war im Ablauf schon so (gleiche Mischlogik wie `fillHand`); neu ist ein Test, der es absichert. Gibt es auch danach zu wenig Karten, wird gezogen, was da ist.

## Änderung 0.8.0.7 (07.11.)

- **Fallenkarte schlichter:** Die liegende Falle hat keinen blauen Rahmen und keinen Schein mehr; sie zeigt nur die Karte (für den Besitzer mit ihrem Symbol, für den Gegner umgedreht, also die Rückseite) mit einem Stufenzähler (×S) unten rechts, im Stil der anderen Marker. Nur Darstellung.

## Änderung 0.8.0.8 (07.11.)

- **Falle schwächer:** Der Rückwurf der Falle beträgt **S = 1 / 2 / 3** unblockbaren Schaden (vorher 2·S = 2 / 4 / 6), weiterhin höchstens der eingehende Schaden und vor der Verteidigung. KI-Wert der Falle entsprechend halbiert (`trapWorth`: Stufe statt 2 × Stufe).

## Änderung 0.8.1 (07.11.)

- **Spieleinstellungen:** Neue Seite „Spieleinstellungen“ im Hauptmenü mit zwei Werten: **Runden bis Erschöpfung** (`exhaustRounds`, Standard 10, 0 = keine Erschöpfung) und **Siegpunkt-Vorsprung** für das vorzeitige Spielende nach einem Showdown (`winLead`, Standard 4, 0 = kein vorzeitiges Ende). Die Engine kannte beide Regeln schon; neu ist die Oberfläche (Knöpfe − / +, „Standardwerte“). Die Werte gelten für neue Spiele (Einzelspieler, Zuschauen, Raum erstellen; der Gastgeber legt sie für beide fest) und liegen im Browser (`localStorage`, Schlüssel `magus_rules`). Ein laufendes Spiel behält seine Werte.

## Änderung 0.8.1.1 (07.11.)

- **Spieleinstellungen in den Einstellungen:** Die Seite „Spieleinstellungen“ entfällt als eigener Menüpunkt. Die Einstellungen (Hauptmenü und Spielmenü) haben jetzt zwei Abschnitte: **Ton** (Schalter, Regler Effekte und Musik) und **Spiel** (Runden bis Erschöpfung, Siegpunkt-Vorsprung, Standardwerte). Nur Oberfläche.

## Änderung 0.8.2.1 (07.11.)

- **Neuer Endbildschirm (nur Oberfläche, keine Regeländerung):** Testspieler fanden das Spielende abrupt. Der Endbildschirm hebt jetzt das Ergebnis hervor: beim **Sieg** goldenes Siegel, Strahlen und aufsteigende Funken, bei der **Niederlage** ein zerbrochenes Siegel, rote Tönung und fallende Asche, bei Unentschieden eine schlichte Variante. Danach folgt ein **Rückblick auf die Höhepunkte** (aus dem Kampfverlauf `G.hist`/`trace`): letzter Hieb, mächtigster Angriff, stärkste Abwehr, knappster Sieg, makelloser Sieg, Blitzsieg bzw. zähes Ringen und die Aufholjagd (Siegpunkt-Rückstand, der noch gedreht wurde). Der **Verlierer** sieht dieselben eigenen Glanzmomente, bei knapper Führung die „fast geschafft“-Karte und zusätzlich den **Wendepunkt** (den Treffer des Gegners, der die Partie entschied). Dazu kommen der Siegpunktverlauf, eine Bilanz (Monster besiegt, Showdowns, Schaden ausgeteilt und geblockt) und die bisherigen Knöpfe. Die Karten erscheinen nacheinander; ein Klick überspringt die Animation, ein Klick auf eine Karte zeigt den Kampfverlauf (der Weg zurück führt über die Statistik wieder zum Endbildschirm). Bei zwei Computern wird der Rückblick für den Sieger gezeigt. Neue Datei `src/ui/26b-endbildschirm.js`.

## Änderung 0.8.3.1 (07.11.)

- **Reihenfolge der Niederlagenprüfung (0 HP):** Die Engine prüft jetzt ausdrücklich in drei Stufen, und die erste Stufe mit einer Seite auf 0 HP entscheidet den Kampf: **1) reflektierter Schaden** (Rückwurf der Falle, vor der Verteidigung: der Angreifer ist besiegt, ohne dass der Verteidiger noch verteidigt oder Schaden nimmt), **2) Schaden nach der Verteidigung** (Restschaden nach Block und Schild, danach die Heilung), **3) Dauereffekte** am Ende der Angriffsphase (Todesfluch, Erschöpfung, danach Meditation und Erleuchtung). Folgen: Ein Todesfluch kann den Angreifer nicht mehr zusammen mit dem Verteidiger auf 0 bringen (kein Unentschieden), und eine Meditation oder Erleuchtung belebt niemanden wieder. Engine: neue Hilfsfunktion `hpDecided` in `65-kampfablauf.js` als Tor vor den Stufen 2 und 3; drei neue Tests („Niederlagenprüfung 1–3“). Die bisherigen Ergebnisse (Golden-Datei) bleiben unverändert.

## Änderung 0.8.4 (07.11.)

- **Einstellungen aufgeräumt:** Jede Gruppe (Ton, Spiel) hat eine Kopfzeile; rechts steht der Ton-Schalter beziehungsweise „Standardwerte“ für die Spielwerte. Die beiden Spielwerte stehen mit kompakten −/+-Knöpfen je in einer Zeile; die Seite ist breiter und passt in das Fenster (vorher ragte „Zurück“ heraus). Nur Oberfläche.

## Änderung 0.8.4.1 (07.11.)

- **Schild vor jeder Schadensquelle (Regeländerung):** Das Schild (`stats.rainbow`) mindert nicht mehr nur den Angriffsschaden, sondern **jeden** HP-Verlust: auch den **Rückwurf der Falle** (der Angreifer verliert nur den Rest über seinen Ladungen), den **Todesfluch** und die **Erschöpfung**. Je gemindertem Schaden geht eine Ladung verloren (Engine: `shieldHit`). Der eingehende Angriffsschaden sinkt durch die Falle weiterhin um den vollen Rückwurf. Passt zur Reihenfolge von 0.8.3.1: Das Schild wirkt in jeder Stufe vor dem Abzug der HP. Golden-Datei neu erzeugt (absichtliche Regeländerung); drei neue Tests.

## Änderung 0.8.5 (07.11.)

- **KI auf die neuen blauen Kombos abgestimmt, keine Änderung nötig:** `PARAMS=wFW,wTrap,uMana,uHeal,mirKeep,mirAvoid,wDeath,wEW,wFE,wDraw,lfDeath,lfHeal,keepB node tools/balance/opt2.js 3 600` (Pool: Champion plus drei früh angreifende Gegner). Runde 1: bester Kandidat `wDeath` 8 mit +0,9 Punkten, `wFW` 0,6 mit +0,7; Runde 2: `uMana` 0,7 mit +0,6. Alle liegen unter der Übernahmeschwelle (1,5 Standardfehler, etwa ±2 Punkte), nichts wurde übernommen; die Standardwerte der KI bleiben. Die Gewichte für Falle (`wTrap`), Schild (`wFW`), Erleuchtung (`uMana`) und Hellsicht liegen damit nahe am Optimum. Runde 3 entfiel, weil Runde 2 nichts übernahm. Gemessen wurde auf dem Regelstand 0.8.4 (vor der Änderung 0.8.4.1, die das Schild vor jeder Schadensquelle wirken lässt); `wFW` (Schild) ist danach nicht neu gemessen.
- `wTrap` und `mirKeep` sind jetzt in der Schrittweitentabelle von `tools/balance/opt.js` und damit für `opt2.js` abstimmbar.
- Keine Regel- und keine KI-Änderung; `tests/golden.json` bleibt unverändert.

## Änderung 0.8.6 (07.11.)

- **Spielanleitung als Präsentation (keine Regel- und keine KI-Änderung):** Zu Magus gibt es eine Anleitung im Stil eines analogen Spiels (Regelheft mit Pergamentfarben, Kartenrahmen und Elementfarben), 20 Seiten: Idee, Ablauf einer Partie, Material, Elementkreis, Startwerte, Karten, Zug der Weltphase, Nachziehen und Marker, Bibliothek und Tempel, Kauf von Magie und Upgrades, Angriff und Verteidigung, Aktionen statt Angriff, Kampfende, Monster, Monsterwürfel, Kombos, Ultimates, Showdown, Siegpunkte und Spielende. Grundlage ist der Regelstand 0.8.5. Die Präsentation liegt als Claude-Folienartefakt im claude.ai-Projekt „Magus“, nicht im Repository.
- Die Versionsbeschreibung im Spiel nennt die Anleitung; `tests/golden.json` bleibt unverändert.

## Änderung 0.8.6.1 (07.11.)

- **Siegbedingung: Siegpunkte > Tempelstufe > Gold (Regeländerung):** Bei Gleichstand an Siegpunkten nach dem dritten Showdown entscheidet zuerst die Tempelstufe, danach das Gold (vorher umgekehrt). Engine: `65-kampfablauf.js` (Spielende), Endbildschirm: „bei gleicher Tempelstufe das meiste Gold“ bzw. „bei Punktgleichstand die höhere Tempelstufe“. Die Spielanleitung (Präsentation, Seiten 2 und 20) nennt die neue Reihenfolge. Gemeint ist die Tempelstufe, wie bisher als Kriterium verwendet, nicht der Punktestand im Tempel.

## Änderung 0.8.7.1 (08.11.)

- **Karten unter den Bildschirmen (keine Regel- und keine KI-Änderung):** Karten, die zum Stapel zurückfliegen oder verbrennen, sowie gekaufte Karten, die noch auf ihren Platz warten, hatten die Ebene 400 und lagen damit über dem Endbildschirm (ebenfalls Ebene 400) und den Menü- und Startbildschirmen (Ebene 300). Sie liegen jetzt auf Ebene 280, unter allen Bildschirmen, aber weiter über dem Spielfeld. Änderung in `src/ui/15-karten.js` und `src/style.css` (`.card.fadeout`).
- Die Versionsbeschreibung im Spiel nennt die Änderung; `tests/golden.json` bleibt unverändert.

## Änderung 0.8.7.2 (08.11.)

- **Sinnlose Knöpfe inaktiv (keine Regel- und keine KI-Änderung):** Im Kampfpanel ist **Erholen** ausgegraut, wenn das eigene Mana schon voll ist, und **Nachziehen**, wenn bei rotem Nachziehmarker das Mana für die Kosten nicht reicht (der Knopf zeigt den Grund als Tooltip). Nur die Oberfläche (`src/ui/18-kampf.js`); die Engine lässt Erholen bei vollem Mana weiterhin zu, damit die KI und gespeicherte Spiellogs unverändert laufen.
- Die Versionsbeschreibung im Spiel nennt die Änderung; `tests/golden.json` bleibt unverändert.

## Änderung 0.8.7.3 (08.11.)

- **Verteidigung bei vollem Rückwurf (keine Regeländerung):** Wirft die Falle den gesamten eingehenden Schaden zurück, entfällt die Verteidigungsphase wie beim Angriff ohne Schaden: Der Verteidiger ist sofort im Angriffszug, die Angriffsphase des Angreifers endet mit ihren Dauereffekten. Das war schon so (`execAttack` in `65-kampfablauf.js`); neu ist nur ein Test dazu in `tests/engine.test.js`.

## Änderung 0.9 (08.11.)

- **Echo der Kombos (Regeländerung):** Jeder Kombo hinterlässt ein Echo in der Farbe seiner ersten Karte (Primärmagie); der nächste Kombo erneuert es. Enthält der nächste Kombo eine Sekundärkarte in der Farbe des Echos, wird er um eine Stufe erhöht (höchstens 3). Beispiel: Erde + Wasser (Heilung) hinterlässt ein Erde-Echo; Feuer + Erde (Lähmung) hat Erde als Sekundärfarbe und wirkt deshalb als Stufe 2 statt 1 und erneuert das Echo auf Feuer. Gilt für alle Kombos und die Ultimate (dort zählen beide nicht-ersten Farben als Sekundärfarben), im Angriff und in der Verteidigung, für Spieler, Gegner und Monster. Das Echo ist nicht läuterbar und endet mit dem Kampf. Ein Echo, das die Stufe nicht erhöht (Stufe schon 3 oder falsche Farbe), wird im Protokoll nicht genannt.
- **Umsetzung:** `echoBoost` und `evalAttack`/`evalDefense` in `src/engine/60-kampfberechnung.js` (Vorschau und KI sehen die erhöhte Stufe, `levels.echo` bzw. `ord.echo` melden die Erhöhung), `stats.echo` wird in `execAttack` und `execDefense` (`src/engine/65-kampfablauf.js`) gesetzt und am Kampfende gelöscht. Darstellung: `EchoWave` (`src/ui/12a-echo-welle.js`, seit 0.9.4; vorher `echoToken`), aufgerufen in `boardHTML` (`src/ui/16-seitenleisten.js`), Hinweiszeile „Echo (Farbe): Kombo +1 Stufe“ in der Vorschau und im Protokoll. Tests: sechs Tests „Echo: …“ in `tests/engine.test.js`.
- **KI:** nicht eigens abgestimmt; sie sieht die erhöhte Stufe über `evalAttack` und wählt Kombos danach, plant das Echo aber nicht voraus. Die Referenzpartien (`tests/golden.json`) sind neu erzeugt.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.0.1 (08.11.; als Zweig 0.8.0.9 begonnen)

- **Hellsicht neu gefasst:** Statt je Karte Hand/Ablage/Händler zu entscheiden, werden drei Karten gezogen; davon werden S Karten offen vor die Seite gelegt, die übrigen abgelegt. Offene Karten sind wie Handkarten nutzbar, kosten aber kein Mana und werden danach abgelegt (unbenutzte am Kampfende). Das Abwerfen zum Händler entfällt.
- **Technik:** Offene Karten sind angehängte Handplätze (`deck.extra`, Karten mit `free`); `baseLen`, `addSight`, `trimSight`, `dropSight` in `src/engine/10-karten.js`. Aktion `fd` mit `pick` = `'k'`/`'a'` je Karte (genau S mal `'k'`, keine Flüche). KI behält die S höchsten Nicht-Fluchkarten.
- **Darstellung:** Auswahl im Vordergrund mit „Offen vor mich legen“ / „Ablegen“; offene Karten liegen in einer kleineren Reihe über der Hand mit goldenem Rand (`.card.sightopen`).
- **Tests:** Hellsicht-Tests neu (3 aus 3 Karten, Kosten, Auto-Entscheidung, Auswahlprüfung); Mischtest auf 3 gezogene Karten angepasst.

## Änderung 0.9.1 (08.11.)

- **Fliehen abgeschaltet (Regeländerung):** Jetzt, da die Erschöpfung (`exhaustRounds`, Standard 10) festgefahrene Kämpfe beendet, ist die Aktion **Fliehen** im Monsterkampf und im Showdown nicht mehr verfügbar. Ein Kampf endet durch Sieg, Niederlage (0 HP), Erschöpfung oder die technische Sicherung nach 400 Schritten. Das Monster behält nach einem Kampf damit nicht mehr „angeschlagen“ seine Verletzungen durch Flucht; ohne Sieger endet ein Kampf nur noch, wenn beide gleichzeitig auf 0 HP fallen.
- **Umsetzung:** Neuer Regelschalter `fleeAllowed` in `DEFAULT_RULES` (`src/engine/80-start.js`, Standard 0 = aus, 1 = Fliehen wie bisher). `canFlee` und die Aktion `flee` (`src/engine/65-kampfablauf.js`) prüfen ihn; die Aktion meldet „Fliehen ist abgeschaltet.“. Der Knopf **Fliehen** samt Bestätigung entfällt in der Oberfläche (`src/ui/18-kampf.js`), wenn die Regel aus ist. Keine Einstellung im Menü.
- **KI:** Die Fluchtparameter (`fleeA`, `fleeL`, `fleeIdle` u. a.) bleiben unverändert, greifen aber nicht mehr, weil die KI nur über `canFlee` flieht. Die Referenzpartien (`tests/golden.json`) sind neu erzeugt; `npm run balance` steht noch aus.
- **Tests:** Die Flucht-Tests schalten `fleeAllowed` ein; neuer Test „Fliehen ist standardmäßig abgeschaltet“.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.2 (08.11.)

- **Auswahl bei Falle und Hellsicht schlichter (keine Regeländerung):** Im Vordergrund liegen nur noch die gezogenen Karten und darunter ein Knopf **Bestätigen**. Ein Klick wählt eine Karte an oder wieder ab; gewählte Karten sind angehoben und golden umrandet, Fluchkarten sind abgedunkelt und nicht wählbar. Der Knopf gilt, sobald genau so viele Karten gewählt sind, wie zu wählen sind (Falle: eine, Hellsicht: Kombostufe S). Ist nur eine Karte zu wählen, ersetzt eine neue Wahl die bisherige. Überschrift, Hinweistext und die Knöpfe je Karte („Als Falle legen“, „Offen vor mich legen“, „Ablegen“) entfallen.
- **Umsetzung:** `sightOverlayHTML` (`src/ui/18-kampf.js`) für beide Fälle; Aktionen `sight` (an-/abwählen) und `sightok` (bestätigen) in `src/ui/30-eingaben.js`, die Aktion `trapok` entfällt. Die Engine-Aktion `fd` bleibt unverändert (Falle: `slots`, Hellsicht: `pick`), ebenso `tests/golden.json`.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.3 (08.11.)

- **Weniger Aktionen in der Weltphase (Regeländerung):** **Magie kaufen** und **jedes Upgrade** (max. HP, max. Mana, Ausspiellimit, Handplätze, Nachziehlimit) sind keine Aktion mehr; das **Opfern von Gold im Tempel** war es schon seit 0.7.6.4. Der Spieler bleibt am Zug und darf davon beliebig viele Käufe ausführen. Zugaktionen der Weltphase sind nur noch **Nachziehen, Händler (Bibliothek) und Angriff**; nur sie wechseln den Spieler, zählen für `worldTurns` und den Stillstandszähler (`idleTurns`) und stellen den Nachziehmarker zurück (Händler, Angriff) beziehungsweise auf Rot (Nachziehen).
- **Nachziehmarker:** Magie, Upgrades und Opfern lassen ihn unverändert (wie das Opfern seit 0.7.6.4). Wer bei rotem Marker kauft, bleibt also rot und zahlt beim nächsten Nachziehen weiter die Strafe, bis er eine echte Aktion (Händler, Angriff) ausführt.
- **Umsetzung:** `applyWorld` (`src/engine/70-weltphase.js`) ruft `execMagic`, `execDrawLimit` und `execSpend` ohne `endTurn` auf (`endOnOk` entfällt); `markerKind` (`src/engine/80-start.js`) kennt in der Weltphase nur noch Nachziehen als `draw` sowie Händler und Kampf als `other`. Die Oberfläche braucht keine Änderung: Nach dem Kauf ist derselbe Spieler weiter am Zug (`pump`).
- **KI:** `runTurn` (`src/ai/30-kampf.js`) führt alle Wirtschaftsschritte (`ecoStep`, höchstens 12) vor der eigentlichen Aktion im selben Zug aus; bisher beendete jeder Schritt außer dem Opfern den Zug. Die Stellschrauben bleiben unverändert und sind für die neue Regel nicht nachtrainiert (Messung mit `npm run balance` offen).
- **Tests:** Drei Tests angepasst (Nachziehmarker Weltphase, Nachziehlimit Kauf, Nachziehlimit Weltphase; der Marker-Reset läuft jetzt über den Händler), neuer Test „Magie kaufen und Upgrades sind keine Aktion mehr“. `tests/golden.json` ist neu erzeugt (absichtliche Regeländerung).
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.13.1 (12.11.)

- **Interner Umbau des Codes (keine Regeländerung, kein geändertes Verhalten):** `tests/golden.json` bleibt unverändert, alle Tests laufen wie zuvor.
- **Versionsbeschreibung:** `MAGUS_VERSION` und die Versionstexte stehen in `src/ui/01-versionen.js` (Liste `VERSIONEN`, ein Eintrag je Version, neueste zuerst).
- **Kampfablauf:** `src/engine/65-kampfablauf.js` ist aufgeteilt in `61-kampfstart.js`, `62-kampfende.js`, `63-kampfeffekte.js`, `64-angriff.js`, `66-verteidigung.js` und `67-kampfaktionen.js`. `endCombat`, `execDefense` und `applyCombat` rufen benannte Teilfunktionen auf (z. B. `settleMonsterCombat`, `settleShowdown`, `finishGame`, `beginNextStage`, `defenseEarlyCombos`, `applyForcedChoice`). Ältere Einträge dieses Regelwerks nennen noch `65-kampfablauf.js`.
- **Nachziehmarker:** Die abgeschaltete Mechanik (Schalter `drawMarker`) liegt gebündelt in `src/engine/45-nachziehmarker.js`.
- **Computergegner:** `combatPlan` (`src/ai/30-kampf.js`) ist in `planReaction`, `planAttack`, `fleeByForecast`, `purifyPicks` und `planDefense` zerlegt.
- **Oberfläche:** Menüs, Einstellungen und Startseite (`showStart`) liegen in `src/ui/26c-startseite.js`; `combatCenter` ruft `combatRoundNote`, `combatForcedNote` und `combatPreview` auf.
- **Lange Zeilen:** Zeilen über 300 Zeichen sind an Anweisungsgrenzen umgebrochen (nur Zeilenumbrüche).
- **Werkzeuge:** `tools/build-werkstaetten.js` ersetzt die vier einzelnen Build-Skripte der Werkstätten; die Arbeitsregeln stehen in `CLAUDE.md`.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.13.0.2 (12.11.)

- **Ultimates umbenannt (nur Namen, Wirkung unverändert):** Heilfluss heißt **Meditation**, Manafluss **Erleuchtung**, Todesfluss **Todesfluch**. Die neuen Namen stehen im Spiel (Kombo-Übersicht, Hilfen, Protokoll, Versionsbeschreibung), im Code, in den Tests, in der Werkstatt und in diesem Regelwerk, auch in den älteren Einträgen der Änderungsliste.
- Der Sammelbegriff „Flusseffekte“ (Wirkungen am Ende der Angriffsphase: Todesfluch, Erschöpfung, Meditation, Erleuchtung) heißt jetzt „Dauereffekte“.
- Marker (Todes-, Heil- und Manamarker) und interne Bezeichner (`death`, `heal`, `manaflow`) behalten ihre Namen.

## Änderung 0.13.0.1 (12.11.)

- **Kombo-Übersicht mit Farbverlauf (nur Darstellung):** Hintergrund und Rand jeder Zeile verlaufen von der Primärfarbe (links) zur Sekundärfarbe (rechts); die Tertiärfarbe einer Ultimate geht nicht in den Verlauf ein. Bisher war die ganze Zeile in der Sekundärfarbe getönt.
- **Ausrichtung:** Primär-, Sekundär- und Tertiärfarbe stehen in festen Spalten, also in allen Zeilen untereinander. Die erreichte Stufe steht nicht mehr hinter den Farben, sondern vor dem Text der Kombo. Die markierte Kombo bleibt grün hervorgehoben.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.13 (11.11.)

- **Computergegner plant voraus (keine Regeländerung):** Bisher bewertete der Computer im Kampf jeden Zug einzeln mit festen Gewichten; was ein Kombo später bringt, steckte nur als Schätzwert darin, und er nutzte Kombos kaum sinnvoll. Jetzt stellt er alle Züge zusammen, die ihm die Regeln gerade erlauben (jede Kartenfolge samt Kombos und Ultimates, Erholen, Nachziehen mit gesperrten Karten, jede Verteidigung, die Wahl bei Falle und Hellsicht), spielt jeden davon in vielen möglichen Kampfverläufen bis zum Kampfende durch und wählt den Zug mit dem besten mittleren Ausgang, gemessen in Siegpunkten (`src/ai/40-suche.js`).
- **Fair:** Verdecktes kennt er nicht. Handkarten, Zugstapel und Fallen des Gegners und die Reihenfolge des eigenen Zugstapels werden für jeden Durchlauf neu gemischt; bekannt ist nur, was auch ein Mensch am Tisch weiß (welche Karten der Gegner besitzt, was offen liegt oder abgelegt wurde). Ein Test prüft, dass die Entscheidung nicht von der wirklichen Verteilung der verdeckten Karten abhängt.
- **Bedenkzeit:** 120 Durchläufe je Entscheidung (im Mittel 67 ms, höchstens 252 ms, gemessen in Node über zwei Partien), im Spiel höchstens eine halbe Sekunde.
- **Messung:** Gegen die bisherige KI (gleiche Regeln, Plätze und Beginner gewechselt) gewann die Vorausschau 96 von 96 Partien (48 mit 120, 48 mit 240 Durchläufen) und 106 von 114 entschiedenen Showdowns; sie wirkte dabei 893 Kombos, die bisherige KI 121 (Ultimates 54 gegen 92). Mehr Durchläufe brachten keinen messbaren Gewinn (240 gegen 60: 35 von 64 Partien, innerhalb der Fehlerspanne von ±12 Punkten). Probekämpfe vor dem Angriff auf ein Monster in der Weltphase (Schalter `world`) brachten in 160 Partien genau 50 % und bleiben abgeschaltet. Gegen Menschen ist die Stärke nicht gemessen.
- Tests, Referenzpartien (`golden.json`, unverändert) und Balance-Werkzeuge spielen weiter mit der bisherigen, schnellen Basis-KI; `MAGUS_SIM=120` schaltet dort die Vorausschau ein. Neu: `tests/suche.test.js`, `tools/balance/duell.js`.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.12.1.4 (11.11.)

- **Anzeige (keine Regeländerung):** Stehen alle drei Magien auf der Höchststufe (3 je Element, Summe 9), zeigt der Magiekreis „IX“ statt eines Hakens; die Zahlenreihe reicht bis IX.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.12.1.3 (11.11.)

- **Anzeige (keine Regeländerung):** Nach der Vorgabe des Spielers (farbige Rechtecke im Screenshot) liegen **Marker** (Todes-, Heil-, Manamarker, Schild) und **Fallen** auf breiter Bühne in der freien Spalte rechts neben dem Kampffenster, zwischen Kampfmitte und den rechten Blöcken: die des Gegners oben auf Höhe seines Ablagestapels, meine unten auf Höhe meiner Hand. Sie liegen dort in einem Raster (`markBox`, `deathPos` in `src/ui/12-hilfen.js`; Spaltenbreite = halber Bühnenüberstand, mindestens 100 px, sonst gilt die bisherige Reihe vor den Handkarten samt Ausweichen vor den offenen Karten).
- **Hellsichtkarten** liegen weiter in ihrer Reihe zwischen Hand und Kampffenster (meine etwas kleiner, Maßstab 0,5, damit sie die Hand nicht berühren; markierte Karten heben sich weniger). **Nachziehtokens** bleiben neben dem jeweiligen Nachziehstapel.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.12.1.2 (11.11.)

- **Standardwerte „Erlaubte Aktionen“ (Regeländerung der Voreinstellung):** `DEFAULT_RULES.allowDef` (`src/engine/80-start.js`) steht jetzt auf Verteidigen *nach Angriff* (2), Erholen *aus*, Nachziehen *aus*, Passen *an*, Echo setzen *aus*, Kombo wirken *an* (vorher Erholen und Nachziehen *ohne Angriff* (3), Echo *an*). Die Angriffsphase bleibt unverändert (alles an). Übernommen aus den Einstellungen des Spielers (Screenshot); der Passen-Schalter war dort verdeckt und bleibt auf *an*.
- **Wirkung:** In der Verteidigungsphase setzt das Echo nicht mehr; da die Verteidigung nur nach einem Angriff entsteht, ändert die Voreinstellung bei Erholen und Nachziehen am Spielverlauf nichts. Selbst gewählte Einstellungen im Browser bleiben erhalten.
- **Tests:** Standard-Test angepasst; `tests/golden.json` ist neu erzeugt.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.12.1.1 (11.11.)

- **Regeländerung: Alle Marker stapeln, die Höchstgrenzen entfallen.** Die Kombo-Effekte addieren sich jetzt zu dem, was schon liegt:
  - **Ultimates** (Todesfluch, Meditation und Erleuchtung, läuterbar): Jede Ultimate legt ihre Stufe S zusätzlich zu den liegenden Markern (`castUltimate`, `src/engine/65-kampfablauf.js`; vorher galt der höhere Wert). Der Phasenmerker (`deathPhase`, `healPhase`, `manaPhase`) hält die Regel „wirkt erst am Ende der nächsten eigenen Angriffsphase“ für die neu gelegten Marker aufrecht.
  - **Schild** (läuterbar): Die Ladungen addieren sich ohne Obergrenze (`shieldAdd`; vorher höchstens 3, nicht addiert).
  - **Hellsichtkarten** (nicht läuterbar): Sie stapelten schon (jede Hellsicht hängt ihre offenen Karten hinten an die Hand an); es gibt keine Obergrenze.
  - **Fallen** (nicht läuterbar): `stats.trap` ist jetzt die Liste `stats.traps`. Eine neue Falle ersetzt die liegende nicht mehr. Bei eingehendem Schaden werden alle aufgedeckt und abgelegt, passende Fallen werfen ihre Stufe zurück, zusammen höchstens der eingehende Schaden (`springTraps`).
  - **Gratistokens** (läuterbar, dabei zerstört): Sie stapelten schon (`freeDraws`, ohne Obergrenze); ein läuterndes Entfernen zerstört sie weiter, ohne ein Gratis-Nachziehen gutzuschreiben.
- **Anzeige:** Jede liegende Falle ist eine eigene Karte in der Markerreihe (Zähler = Stufe); die Fallen-Animation deckt alle Karten nebeneinander auf. Die Kombo-Beschreibungen und die Versionsbeschreibung nennen das Stapeln.
- **KI:** Die Abschläge für „schon liegt ein Marker, Schild oder eine Falle“ entfallen (`ultiWorth`, `shieldWorth`, `trapWorth`, Ultimate in der Verteidigung). Die Balance der KI ist für die neue Regel nicht neu abgestimmt.
- **Tests:** Schild-Test ersetzt, neue Tests für Stapeln von Schild, Ultimates und Fallen; `tests/golden.json` ist neu erzeugt (absichtliche Regeländerung).
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.12.1 (11.11.)

- **Anzeige (keine Regeländerung):** Die Markerreihe vor den Handkarten (Todes-, Heil-, Manamarker, Schild und Falle) lag auf derselben Höhe wie die offenen Hellsichtkarten und verschwand dahinter. `deathPos` (`src/ui/12-hilfen.js`) rückt die Reihe jetzt neben die offenen Karten: rechts davon, wenn sie dort bis zum Rand der rechten Blöcke passt, sonst links, im Extremfall (viele offene Karten) mit engerem Abstand (mindestens 36 px). `layoutDeck` (`src/ui/15-karten.js`) merkt dafür den x-Bereich der offenen Karten je Seite in `OPEN_SPAN`. Ohne Hellsichtkarten bleibt die Reihe mittig wie bisher.
- Das Spiel selbst (Regeln, KI, Referenzpartien) ist unverändert; `tests/golden.json` bleibt gleich.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.12 (11.11.)

- **Regeländerung: Nachziehmarker aus.** Der Regelschalter `drawMarker` (`DEFAULT_RULES`, `src/engine/80-start.js`) steht jetzt auf 0. Damit entfallen für beide Spieler: der grün/rote Nachziehmarker, die Strafe bei rotem Marker (Gold in der Weltphase, Mana im Kampf), das Nachziehlimit mit seinem Upgrade (`drawlimit` ist ohne Marker nicht möglich, die KI kauft es nicht) und die Warnung vor dem Nachziehen. Nachziehen ist **uneingeschränkt** (nur die Phaseneinstellungen `allowAtk`/`allowDef` gelten weiter); Gratis-Nachziehen durch Läuterung (Nachziehtokens) bleibt unverändert.
- **Anzeige:** Die drei Kreise und der Marker unter dem Nachziehstapel (`drawTrack`, `src/ui/15-karten.js`) erscheinen nur bei `drawMarker` 1; ebenso das „Ziehen“ in den Werten der Monsterkarte (`src/ui/17-weltphase.js`).
- **Unverändert (bewusst):** Monster-Wert „Ziehen“ in den Würfeln und das Statistik-Diagramm „Nachziehlimit“ sind vorerst nicht angepasst und ohne Wirkung. Die Regel ist nur abgeschaltet, nicht entfernt; die Abschnitte „Nachziehmarker“ und „Nachziehlimit“ weiter oben beschreiben den Zustand bei `drawMarker` 1.
- **Tests:** Die Tests der Marker-Mechanik setzen `rules.drawMarker = 1`; neue Prüfung in der Oberfläche: standardmäßig keine Kreise und kein Marker. `tests/golden.json` ist neu erzeugt (absichtliche Regeländerung); die Balance der KI ist für die neue Regel nicht nachgemessen.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.11.2 (11.11.)

- **Anzeige (keine Regeländerung):** Die römische Zahl in der Mitte des Magiekreises ist bei beiden Spielern auf die Ringmitte zentriert. Gemessen im Browser (Alegreya, Ring-Mittelpunkt aus den Edelsteinen der Grafik bei 50,2 % | 48,2 % der Bildgröße): Die Tinte der Zahl lag bei 50,1 % | 47,6 %, also etwa 0,7 % der Brettgröße zu hoch; `.bsp` sitzt jetzt bei `left:50.2%; top:48.4%`. Eigener Spieler und Gegner hatten denselben Versatz.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.11.1 (11.11.)

- **Marker gleiten statt zu springen (Oberfläche, keine Regeländerung):** Alle Objekte sind physisch, ihre Marker bewegen sich deshalb sichtbar. Die Steine im Tempel (eigener, Gegner und der grüne Vorschau-Stein des eingestellten Opfers) und der Nachziehmarker beim Stapel (Feld und Grün/Rot) sprangen bei jedem Neuzeichnen, weil die Ebene neu geschrieben wurde. Neue Hilfsfunktion `glideSet` in `src/ui/12-hilfen.js`: Der neue Marker startet an der alten Position (auch mitten in einer Bewegung) und gleitet in 0,5 s an die neue (`.mk.glide`, `.dmark.glide` in `src/style.css`). Ohne Änderung, mit `?fast`, beim Zuschauen ab Tempo ×3 und bei reduzierter Bewegung (`prefers-reduced-motion`) bleibt alles wie bisher.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.11.0.9 (11.11.)

- **Regeländerung Ultimate:** Die Ultimate hängt wie jede Kombo an der Sekundärfarbe (zweite Farbe) statt an der zuletzt markierten Karte; die dritte Farbe löst nur aus und hat sonst keine Funktion. Das Echo verstärkt die Ultimate bei Sekundärfarbe (vorher Schlusskarte). Die KI probiert die Karten entsprechend mit jeder möglichen Karte an zweiter Stelle.
- **Kombo-Übersicht:** Alle Kombos und Ultimates sind nach Primärfarbe sortiert (je Primärfarbe zwei Kombos und zwei Ultimates, Reihenfolge Primär, Sekundär, dritte Farbe); die Farbmarkierung zeigt die Sekundärfarbe.

## Änderung 0.11.0.8 (11.11.)

- **Anzeige (keine Regeländerung):** Die Plakette in der Kampfmitte zeigt nur noch „Aktion“ oder „Reaktion“, ohne den Namen des Spielers davor. Wer am Zug ist, steht weiter im Tooltip und in der Rahmenfarbe.

## Änderung 0.11.0.7 (11.11.)

- **Anzeige (keine Regeländerung):** Die Vorschau beim Opfern von Gold zeigt nur noch die Zeile „n Gold opfern: +X Punkte (gesamt T)“. Die Zeile mit Stufenwechsel und Upgrade-Punkten entfällt; die Markierung auf dem Raster bleibt. Die Vorschau überlagert die Upgrade-Punkte am unteren Rand nicht mehr.

## Änderung 0.11.0.6 (11.11.)

- **Anzeige (keine Regeländerung):** Die verfügbaren Upgrade-Punkte stehen nicht mehr in der Tempel-Überschrift, sondern am unteren Rand des Tempels, je Spieler in einer eigenen Zeile (eigener Spieler gold, Gegner silber).

## Änderung 0.11.0.5 (11.11.)

- **Anzeige (keine Regeländerung):** Mittig im Magiekreis steht die römische Zahl (I bis VI) als Preis der nächsten Magiestufe in Upgrade-Punkten, in der Farbe des Spielers (eigener Spieler gold, Gegner silber, bei voller Magie „✓“). Die Zeile unter dem Magiekreis entfällt. Die aktuell verfügbaren Upgrade-Punkte beider Spieler stehen in der Überschrift des Tempels (eigene gold, gegnerische silber). Die Tempelpunkte stehen nur noch auf dem Raster des Tempels.

## Änderung 0.11.0.4 (11.11.)

- **Preisanzeige (keine Regeländerung):** Statt „Nächste Magiestufe: n Upgrade-Punkt(e)“ steht unter dem Magiekreis „Magiestufe I“ bis „Magiestufe VI“; die römische Zahl ist der Preis der nächsten Magiestufe in Upgrade-Punkten (1 bis 6, zusammen 21 für den vollen Ausbau). Der Hover-Text nennt weiter Preis und Bestand. Der Name des Gegners ist silbern.

## Änderung 0.11.0.3 (11.11.)

- **Spielerfenster (keine Regeländerung):** Die **Siegpunkte** stehen wieder oben rechts im Fenster mit einem Stern (★). Die **Tempelpunkte** (Summe `Stufe·(Stufe+1)/2 + Pool`, wie auf dem Tempel-Raster) stehen in der Mitte des Magiekreises, ohne Bruch und ohne den Hinweis auf die nächste Stufe. Die grüne Kopfzeile („Punkte <Upgrade-Punkte> <Bruch> (<n> Gold)“) entfällt, ebenso die zugehörige Vorschau beim Opfern; die offenen Upgrade-Punkte stehen nicht mehr als Zahl im Fenster (Kosten und Bestand nennt der Hover-Text der Magie-Knöpfe und die Zeile „Nächste Magiestufe“).
- **Farben:** Der eigene Spieler ist golden, der Gegner silbern (Stern, Tempelpunkte, Marker im Tempel).

## Änderung 0.11.0.2 (11.11.)

- **Tempel schlichter (keine Regeländerung):** Die Legendenzeile unter der Überschrift entfällt, die Spieler stehen als einfache runde Marker auf dem Raster (eigener golden, Gegner grau, Opfer-Vorschau grün gestrichelt) statt als Holzzylinder; Name, Punkte und Stufe stehen im Hover-Text des Markers. Das Raster nutzt die frei gewordene Höhe.
- **Nachrechnung Magieausbau:** Zwei Ausbauten in allen drei Magien sind 6 Käufe; die Preise steigen je Kauf um 1 und gelten für alle Farben gemeinsam (`bought(s, 'mag')`). Eine Simulation mit der Engine bestätigt 1 + 2 + 3 + 4 + 5 + 6 = **21 Upgrade-Punkte**, also Tempelstufe 21 = 231 Punkte; das Raster reicht bis Feld 231. Weitere Upgrade-Punkte wandeln sich danach in Siegpunkte um (`surplusSp`); ein Stein darüber bleibt auf Feld 231 stehen.

## Änderung 0.11.0.1 (11.11.)

- **Tempel-Raster bis zum vollen Magieausbau (keine Regeländerung):** Magie auf Stufe 3 in allen drei Farben braucht 6 Käufe; der Preis steigt je Kauf um 1 (`priceRise`), also 1 + 2 + 3 + 4 + 5 + 6 = **21 Upgrade-Punkte**. Jede Tempelstufe gibt einen Upgrade-Punkt, also ist **Tempelstufe 21** nötig, das sind 21·22/2 = **231 Tempelpunkte** (HP, Mana und Limit kommen noch dazu). Das Raster zeigt deshalb die Felder 0 bis 231 zeilenweise, aber nur so viele, wie die Steine brauchen (mindestens bis 55 = Stufe 10, sonst bis zur Schwelle von drei Stufen über dem weitesten Stein); die Spaltenzahl wird so gewählt, dass die Felder möglichst groß bleiben. Die Reihen entsprechen keinen Stufen mehr; die goldenen Zahlen k(k+1)/2 bleiben hervorgehoben.
- **Opfer-Vorschau:** Der Hinweis zum Einstellen mit ◀ ▶ entfällt (Platz); beim Einstellen zeigen der durchscheinende Stein und die grün gestrichelten Felder den Fortschritt, darunter stehen Punkte, Gesamtzahl und neue Stufe.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.11 (11.11.; 0.10 ist durch eine experimentelle Entwicklung belegt)

- **Neues Layout der Weltphase (keine Regeländerung):** Das **Protokoll** liegt hinter einem runden Knopf oben links neben dem Statistik-Knopf (`#logbtn`, 36 px). Es öffnet als Fenster (`#logpop`, ganze Partie, mit Export-Knopf) und schließt mit dem Knopf, mit Esc oder durch einen Klick daneben; der Knopf gilt in Weltphase und Kampf, der Kampflog links im Kampf bleibt. Im frei gewordenen linken Fenster steht die **Bibliothek** (größere Karten, Anzahl darunter), das bisherige Bibliotheksfenster rechts ist der **Tempel**.
- **Tempel-Raster:** Reihe *k* ist Tempelstufe *k* und enthält die Punktzahlen k(k+1)/2 bis k(k+1)/2 + k; die erste Zahl jeder Reihe (**1, 3, 6, 10, 15, 21 …**) ist der Eintritt in die nächste Stufe und golden hervorgehoben. Die Position eines Spielers ist `Stufe·(Stufe+1)/2 + Punkte im Pool` (`templeTotal`). **Holzsteine** (Zylinder) zeigen beide Spieler; stehen sie auf demselben Feld, liegen sie nebeneinander. Das Raster zeigt mindestens 7 Reihen (bis 21 Punkte) und wächst mit dem weitesten Stein (höchstens 14 Reihen).
- **Opfer-Vorschau:** Unter dem Raster steht, wie viele Punkte das mit ◀ ▶ eingestellte Gold bringt, die neue Gesamtpunktzahl und ob eine Stufe (mit Upgrade-Punkten) erreicht wird. Der durchscheinende grüne Stein und die grün gestrichelten Felder markieren diesen Fortschritt auf der Tafel.
- **Umsetzung:** `libraryPanel` und `templePanel` in `src/ui/17-weltphase.js`; Layout-Schlüssel `library`, `temple`, `logPop` (`src/ui/10-layout.js`); Protokoll-Fenster in `renderInner` (`src/ui/26a-darstellung.js`), Knopf in `src/ui/30-eingaben.js`. Tempo-Knopf (Zuschauen) und Mehrspieler-Chip rücken nach rechts.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.9.16 (11.11.)

- **Plakette:** Sie zeigt nur noch „Du/<Name> Aktion“ oder „Du/<Name> Reaktion“. Der Zusatz („nach Angriff“, „ohne Angriff“, Schaden) entfällt; er steht weiterhin im Hover-Text der Plakette (Schaden, Angriff). Keine Regeländerung.

## Änderung 0.9.9.15 (11.11.)

- **Vereinfachung „nach Angriff / ohne Angriff“:** Allein die Aktion des Spielers davor entscheidet: War sie ein Angriff, gilt für den Gegner in der Verteidigungsphase *nach Angriff*; war sie etwas anderes (Erholen, Nachziehen, Passen), gilt *ohne Angriff*. Die Höhe des Schadens (auch 0) ist unerheblich; nur *Verteidigen* setzt eingehenden Schaden voraus. Die Plakette zeigt „nach Angriff“ bzw. „ohne Angriff“ (der Schaden steht im Hover-Text).
- **KI-Schwelle beim Nachziehen:** In der Reaktion zieht die KI nur nach, wenn nach den Nachziehkosten mindestens so viel Mana bleibt wie das Ausspiellimit (1 Mana je Karte, höchstens Maximum − Nachziehkosten). Sonst erholt sie sich zuerst (Nachziehen folgt in einer späteren Reaktion). Zuvor genügte 1 Mana.

## Änderung 0.9.9.14 (11.11.)

- **„Ohne Angriff“ ist nicht „ohne Schaden“ (Klarstellung, Regeländerung bei Angriffen ohne Schaden):** Welche Stufe der Verteidigungs-Einstellungen gilt, richtet sich danach, ob die vorausgegangene Aktion ein Angriff war. *Ohne Angriff* gilt nach Erholen, Nachziehen und Passen, auch wenn dabei Schaden eintrat (Todesfluch trifft am Ende der Aktion und ist nicht blockbar). *Nach Angriff* gilt nach jedem Angriff, auch einem Angriff ohne Schaden (Reaktion ohne Schaden, kein Verteidigen). Zuvor wurde ein Angriff ohne Schaden wie „ohne Angriff“ behandelt.
- **KI in der Reaktion ohne Schaden:** Sie zieht nach, wenn Nachziehen erlaubt ist, die Hand schwach ist (leer, höchstens eine Karte oder kein Angriff mit Schaden) und nach den Nachziehkosten mindestens 1 Mana bleibt. Sonst erholt sie sich, wenn Mana fehlt und Erholen erlaubt ist; sonst passt sie.
- Anzeige: Die Plakette nennt „ohne Angriff“ oder „nach Angriff ohne Schaden“. Tests ergänzt, `golden.json` neu erzeugt.

## Änderung 0.9.9.13 (10.11.)

- **Reaktion ohne Angriff (Regeländerung):** Jeder Zug besteht aus der Aktion eines Spielers und der Reaktion des anderen. Entscheidet sich Spieler A in seiner Aktion gegen einen Angriff (Erholen, Nachziehen, Passen) oder bleibt sein Angriff ohne Schaden, hat Spieler B dennoch eine Reaktionsphase (Verteidigungsphase ohne eingehenden Schaden). Dort gelten die Einstellungen der Verteidigungsphase mit den Stufen *an* und *ohne Angriff*; *nach Angriff* und *aus* gelten dort nicht. Danach führt B seine eigene Aktion aus.
- **Optionen der Reaktion ohne Angriff:** Erholen (Mana wie in der Aktion), Nachziehen (Hand tauschen, Mana bei rotem Marker) und Passen (nicht reagieren). *Verteidigen* sowie Echo und Kombo entfallen, weil nichts zu verteidigen ist.
- **Entfällt die Reaktion?** Ja, wenn Erholen und Nachziehen dort nicht erlaubt oder nicht sinnvoll sind (Mana voll bzw. zu wenig Mana für den roten Nachziehmarker); Passen allein löst keine Reaktion aus. Dann beginnt der Gegner gleich mit seiner Aktion.
- **Standard:** Erholen und Nachziehen stehen auf *ohne Angriff*. Nach einer Aktion ohne Angriff kann der Gegner sich also vor seiner Aktion erholen oder nachziehen.
- **Zählung:** Die Reaktion zählt nicht als Angriffszug (Kampfrunden, Erschöpfung, Dauereffekte unverändert: sie wirken am Ende der Aktion). Die Reaktion zählt aber als Kampfschritt im Verlauf. Passen in der Reaktion beendet nicht die Serie der Passen-Züge.
- **KI:** Sie erholt sich in der Reaktion ohne Angriff, wenn es erlaubt ist und Mana fehlt, sonst passt sie. Nachziehen wählt sie dort nicht.
- Anzeige: Plakette „Reaktion ohne Angriff“ und blauer Rahmen wie bei der Reaktion auf einen Angriff. Tests: Kampftests setzen Erholen/Nachziehen der Verteidigung auf aus (alter Ablauf); neuer Test „Reaktion ohne Angriff“; `golden.json` neu erzeugt.

## Änderung 0.9.9.12 (10.11.)

- **Heilung und Läuterung getauscht (Regeländerung):** Heilung wirkt jetzt mit **Blau + Grün** (Primärfarbe Blau, Sekundärfarbe Grün), Läuterung mit **Rot + Grün** (zuvor Heilung Rot + Grün, Läuterung Blau + Grün). Wirkung, Stufen und Echo bleiben unverändert.
- **Kombo-Übersicht nach Primärfarbe sortiert:** Die Liste steht in der Reihenfolge Rot, Blau, Grün nach der ersten Karte (Hellsicht, Läuterung | Falle, Heilung | Lähmung, Schild), danach die drei Ultimates. Die Hintergrundfarbe der Zeilen bleibt nach der Sekundärfarbe (zuletzt markierte Karte).
- Tests angepasst (Läuterungs- und Heilungstests mit den neuen Farben), `golden.json` neu erzeugt (die KI spielt andere Kombos).

## Änderung 0.9.9.11 (10.11.)

- **Aktion und Reaktion sichtbar:** In der Kampfmitte steht unter der Rundenzeile eine Plakette „Du/<Name> Aktion“ (Angriffsphase, Gold) bzw. „Du/<Name> Reaktion auf N Schaden“ (Verteidigungsphase, Blau). Der Zugrahmen bleibt in der Aktion gold und wird in der Reaktion blau. Der Zugmarker wandert unverändert.
- **Stand der Umsetzung (Prüfung):** Eine Reaktion entsteht derzeit nur nach einem Angriff mit Schaden. Folgt auf eine Aktion kein Angriff (Erholen, Nachziehen, Passen, Angriff ohne Schaden), gibt es keine Reaktion; der andere Spieler beginnt direkt mit seiner Aktion. Wirksam sind daher in der Verteidigungsphase die Stufen *an*, *aus* und *nach Angriff*; *ohne Angriff* greift nie. Die Einstellungen der Verteidigungsphase wirken auf Verteidigen, Erholen, Nachziehen, Passen, Echo und Kombo (Engine, Knöpfe, Vorschau, KI-Auswahl).

## Änderung 0.9.9.10 (10.11.)

- **Standardwerte Verteidigungsphase:** Verteidigen *nach Angriff* (2), Erholen *ohne Angriff* (3), Nachziehen *ohne Angriff* (3), Passen *an*, Echo setzen *an*, Kombo wirken *an*. Da die Verteidigung derzeit nur nach einem Angriff entsteht, sind Erholen und Nachziehen dort im Spielverlauf weiterhin nicht verfügbar. Angriffsphase unverändert (alles an).

## Änderung 0.9.9.9 (10.11.)

- **Standardwerte Verteidigungsphase:** Verteidigen *nach Angriff* (2), Erholen *aus*, Nachziehen *aus*, Passen *an*, Echo setzen *an*, Kombo wirken *an*. Angriffsphase unverändert (alles an). Im Spielverlauf ändert sich dadurch nichts, da die Verteidigung nur nach einem Angriff entsteht.
- **Passen abschaltbar:** In den Einstellungen lässt sich Passen auch dann auf *aus* stellen, wenn Erholen aus ist. Sind in einer Lage Erholen und Passen beide nicht erlaubt, bleibt Passen als Notausgang möglich, damit der Zug nie blockiert.

## Änderung 0.9.9.8 (10.11.)

- **Scrollposition im Menü:** Beim Umschalten einer Einstellung (Schalter, Stufen, Ton) bleibt die Scrollposition des Menüfensters erhalten. Keine Regeländerung.

## Änderung 0.9.9.7 (10.11.)

- **Vier Stufen je Aktion der Verteidigungsphase:** Verteidigen, Erholen, Nachziehen, Passen, Echo setzen und Kombo wirken lassen sich auf *an* (die Option besteht in jeder Verteidigung), *aus* (in keiner), *nach Angriff* (nur wenn ein Angriff mit Schaden vorausging) oder *ohne Angriff* (nur wenn kein Angriff vorausging) stellen. Ein Klick schaltet in dieser Reihenfolge weiter. Regel `allowDef`: 1 an, 0 aus, 2 nach Angriff, 3 ohne Angriff. Die Angriffsphase behält an/aus.
- **Hinweis:** Die Verteidigungsphase entsteht derzeit nur durch einen Angriff mit Schaden. Dort entspricht *nach Angriff* daher *an*, und *ohne Angriff* greift nicht (die Option fehlt in der Verteidigung). Die Stufen wirken erst, wenn eine Verteidigung ohne vorausgegangenen Angriff möglich ist.
- Ist in einer Lage weder Erholen noch Passen erlaubt, gilt Passen (Notausgang).

## Änderung 0.9.9.6 (10.11.)

- **Menüs scrollbar:** Menüfenster (Hauptmenü, Einstellungen, Neu in Version, …) scrollen innerhalb des Fensters, wenn der Inhalt höher ist als der Bildschirm; zuvor wurde der Rand abgeschnitten (u. a. Verteidigungsphase und „Zurück“ in den Einstellungen). Keine Regeländerung.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.9.5 (10.11.)

- **Einstellung „Erlaubte Aktionen“:** Im Einstellungsmenü gibt es je Phase Schalter für die erlaubten Aktionen. Angriffsphase: Angreifen, Erholen, Nachziehen, Passen, Echo setzen, Kombo wirken. Verteidigungsphase: Verteidigen, Erholen, Nachziehen, Passen, Echo setzen, Kombo wirken. Die Werte gelten für neue Spiele, werden im Browser gespeichert und gehen im Mehrspielermodus vom Gastgeber aus (Regeln `allowAtk`, `allowDef`, Werte 1/0).
- **Standardwerte** entsprechen dem Stand 0.9.9: Angriffsphase alles an; Verteidigungsphase Verteidigen, Passen, Echo, Kombo an, Erholen und Nachziehen aus.
- **Bedeutung:** *Echo setzen* aus: Die Primärmagie der Phase hinterlässt kein Echo (ein vorhandenes Echo verstärkt weiter). *Kombo wirken* aus: Die Phase erlaubt nur Karten einer Farbe. *Erholen* und *Nachziehen* in der Verteidigungsphase (neu): Der Schaden wird ohne Block hingenommen (ein Schild mindert ihn), danach folgt wie beim Passen der eigene Angriff. *Angreifen* und *Verteidigen* aus: Die Magie-Aktion der Phase entfällt. Erholen oder Passen bleibt je Phase immer erlaubt (sind beide ausgeschaltet, gilt Passen).
- **Umsetzung:** `allowed(state, phase, k)` und Prüfungen in `applyCombat`/`execAttack`/`execDefense` (`src/engine/65-kampfablauf.js`); `evalAttack`/`evalDefense` mit `opt.combo`; Einstellungsseite `PHASE_OPTS` (`src/ui/26a-darstellung.js`); Kampfknöpfe zeigen nur erlaubte Aktionen (`src/ui/18-kampf.js`); KI-Fallback probiert alle Aktionen. Die KI wählt in der Verteidigung weiter nur Verteidigen oder Passen.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.9 (09.11.)

- **Kombos nach Sekundärfarbe (Regeländerung):** Die Sekundärfarbe (zweite Farbe) bestimmt den Charakter der Kombo: Rot (Schaden) Falle und Lähmung, Blau (variabel) Hellsicht und Schild, Grün (Heilung) Heilung und Läuterung. Neue Farbpaare (Primär + Sekundär): **Falle** Blau + Rot (vorher Rot + Blau), **Lähmung** Grün + Rot (vorher Rot + Grün), **Hellsicht** Rot + Blau (vorher Blau + Rot), **Schild** Grün + Blau (vorher Blau + Grün), **Heilung** Rot + Grün (vorher Grün + Blau), **Läuterung** Blau + Grün (vorher Grün + Rot). Die Wirkungen und Stufen sind unverändert; nur `ORD_COMBO` (`src/engine/60-kampfberechnung.js`) ordnet die Paare neu zu.
- **Ultimate nach Schlusskarte (Regeländerung):** Die zuletzt markierte Karte bestimmt die Ultimate (Rot Todesfluch, Blau Erleuchtung, Grün Meditation); die Basis aus den beiden anderen Farben darf in beliebiger Reihenfolge liegen. `evalAttack` und `evalDefense` liefern `ultiEl` jetzt aus der letzten normalen Karte. Auch in der Verteidigung gilt die Schlusskarte; die erste Karte bestimmt weiter die Verteidigungsfarbe und den Schaden.
- **Echo:** Das Echo hinterlässt weiter die Farbe der ersten Karte (`ev.prim`, `defEv.el`). Die Ultimate wird durch ein Echo verstärkt, wenn dessen Farbe die der Schlusskarte ist (`echoBoost`); vorher genügte eine der beiden Farben außer der ersten.
- **Kombo-Übersicht:** Sie ist nach Sekundärfarbe gruppiert (Rot, Blau, Grün); je Gruppe stehen die zwei Kombos und die Ultimate der Schlusskarte, alle Zeilen einer Gruppe sind gleich getönt (CSS `.cref.pF/.pW/.pE` jetzt nach Sekundärfarbe). In jeder Zeile steht die Primärfarbe vorn. Mit einer markierten Farbe zeigt sie die Kombos dieser Primärfarbe und die Ultimates, die sie enthalten; mit zwei Farben die erreichte Kombo samt Hinweis auf die dritte Farbe als Schlusskarte.
- **KI:** `bestAttack` und die Verteidigungsvarianten (`src/ai/30-kampf.js`) probieren neben der ersten Karte auch jede Karte als letzte durch, damit die Ultimate der gewünschten Farbe gefunden wird. Die Stellschrauben sind nicht nachtrainiert.
- **Tests:** Hände der betroffenen Tests auf die neuen Paare umgestellt, neue Tests „Zuordnung (0.9.9)“ und „Ultimate (0.9.9)“; `tests/golden.json` neu erzeugt (absichtliche Regeländerung).
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.8 (08.11.)

- **Credits im Hauptmenü:** Neuer Menüpunkt **Credits** (zwischen Einstellungen und Beenden) mit dem Dank an die Testspieler:innen: DarkParladin, Deekixx, H5, Leon aka Tim und Zockerboy (alphabetisch). Reine Oberflächenänderung (`showStart`, Seite `credits`), keine Regeländerung.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.7.1 (08.11.)

- **Standard wieder 10 (Regeländerung):** `exhaustRounds` steht wieder auf 10 (in 0.9.7 kurz 8); das gilt für Erschöpfung und Zermürbung.
- **Zähler der Weltphase läuft durch (Regeländerung):** Ein Monsterkampf setzt den Rundenzähler der Weltphase nicht mehr zurück. Er zählt jetzt alle Züge der Weltphase (`state.wearTurns`, in `endTurn`); Kampfzüge zählen nicht mit. Zurückgesetzt wird er nur nach einem Showdown (neuer Abschnitt). Ist der kritische Wert einmal erreicht, gilt die Zermürbung bis dahin auch nach jedem Monsterkampf weiter. `state.worldTurns` (Züge seit dem letzten Kampf) bleibt unverändert und dient weiter der Monstererholung und der KI.
- **Tests:** Zermürbungstest angepasst (Zähler läuft nach dem Monsterkampf weiter), Standardwerte 10 in Tests und Browser-Test; `tests/golden.json` neu erzeugt.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.7 (08.11.)

- **Rundenzähler und Zermürbung in der Weltphase (Regeländerung):** Die Weltphase hat denselben Rundenzähler wie der Kampf (eine Runde = ein Zug jedes Spielers). Er zählt die Züge seit dem letzten Kampf (`state.worldTurns`, wird nach jedem Kampf auf 0 gesetzt) und beginnt damit nach jedem Monsterkampf wieder bei Runde 1. Hat er den kritischen Wert erreicht, also **ab Runde `exhaustRounds` + 1**, setzt die **Zermürbung** ein: Wer seinen Zug beendet (Nachziehen oder Bibliothek), ohne ein Monster angegriffen zu haben, schenkt dem Gegner **Gold in Höhe der aktuellen Spielstufe** (Abschnitt 1/2/3, wie die Strafe des roten Nachziehmarkers). Ein Monsterangriff beendet den Zug nicht über `endTurn`, löst also nichts aus; nach dem Kampf beginnt der Zähler neu. `exhaustRounds` 0 schaltet die Zermürbung ab.
- **Kritischer Wert:** Derselbe Regler wie bei der Erschöpfung (`exhaustRounds`). **Standard von 10 auf 8 gesenkt** (gilt auch für die Erschöpfung im Kampf: Stufe 1 ab Runde 9).
- **Umsetzung:** `worldRound`, `worldWear`, `worldWearGold` und die Gold-Gutschrift in `endTurn` (`src/engine/70-weltphase.js`), Standard in `DEFAULT_RULES` (`src/engine/80-start.js`). Logzeile: „Zermürbung (Runde N): … greift kein Monster an, … erhält G Gold.“
- **Darstellung:** Der Rundenzähler steht in der Weltphase mittig über den Monstern (`worldRoundNote` in `src/ui/26a-darstellung.js`) mit Hinweis „Zermürbung ab Runde N“. Ab dem kritischen Wert wird der Zustand wie die Erschöpfung hervorgehoben, aber bernsteinfarben (das Gold geht an den Gegner): Der Zähler zeigt „Zermürbung: ohne Monsterangriff erhält der Gegner G Gold“, der Hintergrund dunkelt ab (`stage.dataset.zerm`, `#stage[data-zerm]` in `src/style.css`) und beim Einsetzen erscheint kurz der Schriftzug „Zermürbung setzt ein“ (`zermBanner`, Sound `ruin`).
- **Tests:** neuer Test „Zermürbung …“ in `tests/engine.test.js`; Standardwert 8 in den Tests zu Erschöpfung und Spieleinstellungen angepasst (der Erschöpfungstest rechnet ausdrücklich mit 10), Browser-Test der Einstellungen (8/7). `tests/golden.json` ist neu erzeugt (absichtliche Regeländerung). Die KI-Parameter sind unverändert.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.6.1 (08.11.)

- **Erschöpfung deutlicher dargestellt (keine Regeländerung):** Geprüft wurde zuerst die Engine: Nach `exhaustRounds` Kampfrunden (Standard 10) verlieren beide Seiten am Ende ihres Angriffszugs je Stufe 1 HP (Stufe 1 ab Angriffszug 21, Stufe 2 ab Angriffszug 41 …). Das gilt im Pfad Angriff mit Schaden und Verteidigung ebenso wie beim Passen, Erholen und Nachziehen; eine Simulation über 30 Angriffszüge bestätigt die Abzüge. Der Abzug war nur kaum sichtbar (eine Zeile im Kampflog, die HP sprangen).
- **Hintergrund:** Ab Runde `exhaustRounds + 1` dunkelt der Hintergrund ab (`stage.dataset.exh` = 1 bis 3, `#stage[data-exh]` in `src/style.css`, weiche Überblendung); je Stufe stärker und röter. Beim Eintritt und bei jedem Anstieg erscheint kurz der Schriftzug „Erschöpfung setzt ein“ bzw. „Erschöpfung N“ (`exhaustBanner` in `src/ui/26a-darstellung.js`, Sound `ruin`).
- **HP-Abzug animiert:** `showFx` erkennt die Logzeile „Erschöpfung N: … verliert X HP“ und startet `FlowFx.exhaust` (`src/ui/22-lifeflow-aggro.js`): kurzes rotes Abdunkeln des Bildes, Schwaden von der Rundenanzeige zur Lebensanzeige der betroffenen Seite, Einschlag mit Ring und Zahl „−X HP“. Die HP zeigen bis zum Einschlag den alten Stand (`holdHp`). Folgt auf einen Todesfluch derselben Seite, läuft die Erschöpfung erst nach ihm ab (`tickEnd`). Ohne Animationen (Schnellmodus, reduzierte Bewegung) bleibt es bei der Textzeile.
- **Tests:** neuer Browser-Test in `tests/ui.test.js`; Engine, KI und `tests/golden.json` sind unverändert.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.6 (08.11.)

- **Echo bei jeder Nutzung von Primärmagie (Regeländerung):** Jede Nutzung hinterlässt ein Echo der Primärmagie, also auch Angriffe und Verteidigungen ohne Kombo. Das Echo hat die Farbe der ersten (farbigen) Karte und ersetzt das bisherige Echo der Seite. Passen, Erholen und Züge nur mit Fluchkarten lassen es unverändert. Der **Effekt auf die Kombos bleibt gleich** und läuft weiter über die Sekundärkarte: Enthält ein Kombo eine Sekundärkarte in der Farbe des Echos, steigt seine Stufe um 1 (höchstens 3); die Primärfarbe eines Kombos zählt dafür nicht. Beispiel: Ein einfacher Wasserangriff hinterlässt ein Wasser-Echo; ein folgender Kombo Feuer + Wasser (Falle) wirkt dann als Stufe 2 statt 1 und erneuert das Echo auf Feuer.
- **Umsetzung:** `execAttack` und `execDefense` (`src/engine/65-kampfablauf.js`) setzen `stats.echo` bei jeder Karte mit Primärfarbe statt nur bei Kombos (`ev.prim` bzw. `defEv.el`); `echoBoost` (`src/engine/60-kampfberechnung.js`) ist unverändert. Die Darstellung (Schlange auf dem Magie-Brett) liest weiter `stats.echo`; Tooltip am Magie-Brett und Kommentare sind angepasst.
- **KI:** nicht eigens abgestimmt (sie plant das Echo nicht voraus); die Referenzpartien (`tests/golden.json`) sind neu erzeugt, weil sich das Echo und damit Kombostufen im Spielverlauf ändern.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.5.1 (08.11.)

- **Falle zeigt kein Upgrade-Symbol mehr (Fehlerbehebung, nur Darstellung):** Die Fallenkarte bekam beim Umdrehen die Klasse `up`, die zugleich für den Upgrade-Knopf (Plus-Symbol als Hintergrund) gilt. Beim Zerbrechen der Karte war dieses Symbol groß sichtbar, beim erfolgreichen Rückwurf lag es hinter der Kartenfläche. Die Klasse heißt jetzt `flipped` (`src/ui/20a-ultimates.js`, `src/style.css`). Regeln, KI und `tests/golden.json` sind unverändert.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.5 (08.11.)

- **Falle löst nach dem Angriff aus (keine Regeländerung, nur Darstellung):** Bisher lief die Falle gleichzeitig mit dem Angriff. Jetzt erscheint zuerst der volle Angriff in der Mitte (auch der Teil, den die Falle zurückwirft). Danach fliegt die verdeckte Falle auf die Seite ihres Besitzers neben die Geschosse und dreht sich um. Passt die Farbe, lösen sich so viele Geschosse, wie die Falle zurückwirft (Stufe S, höchstens der eingehende Schaden), und fliegen als unblockbarer Schaden zum Angreifer; die HP des Angreifers sinken erst beim Einschlag. Passt die Farbe nicht, zerbricht die Karte in Splitter und der Angriff bleibt unverändert. Die Verteidigung beginnt erst nach der Falle. Wirft die Falle den ganzen Angriff zurück, gibt es keine Verteidigung, der Angriff verschwindet nach dem Rückwurf.
- **Umsetzung:** Die Falle ist Teil der Angriffsanimation (`KampfFx`, `src/ui/26-erde.js`): `showFx` (`src/ui/26a-darstellung.js`) gibt dem Angriff den Wert `trap` mit und setzt `n` auf den vollen Schaden (`dmg0`); `TrapFx` (`src/ui/20a-ultimates.js`) spielt Karte, Rückwurf und Bruch. Die Engine liefert im Falleneffekt zusätzlich `dmg0` (Schaden vor dem Rückwurf). Regeln, KI und `tests/golden.json` sind unverändert.
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.4.1 (08.11.)

- **Echo-Effekt schmaler (keine Regeländerung):** Die in der Echo-Werkstatt angepassten Werte sind in `EchoWave.DEFAULTS` (`src/ui/12a-echo-welle.js`) übernommen. Einzige Abweichung von 0.9.4: `span` 100° statt 130°, der Effekt deckt also einen kleineren Ausschnitt der Schlange ab. Alle anderen Werte sind gleich geblieben. Die Echo-Werkstatt ist neu gebaut.
- Die Versionsbeschreibung im Spiel nennt die Änderung; Engine, KI und `tests/golden.json` sind unverändert.

## Änderung 0.9.4 (08.11.)

- **Echo digital als Schlangen-Effekt statt als Marker (keine Regeländerung):** Der Echo-Marker bleibt dem analogen Spiel vorbehalten. Digital entfallen `echoToken`, `placeEchoTokens` und `.echotok`. Stattdessen **leuchtet auf dem Magie-Brett die Schlange der Echo-Farbe pulsierend und sendet Wellen nach außen** (Feuer oben, Erde rechts unten, Wasser links unten, wie die Magie-Knöpfe). Das gilt für das eigene Brett und das des Gegners; ohne Echo bleibt das Brett unverändert. Der Tooltip des Bretts nennt Echo-Farbe und Wirkung.
- **Aufbau des Effekts:** Ein weiches Leuchten auf dem Körper der Schlange (pulsierend) und mehrere Wellenringe (mit hellem Kern), die vom Körper der Schlange (Radius `r0` vom Mittelpunkt des Bretts) nach außen wachsen und dabei ausblenden. Eine Kegelmaske (`conic-gradient`) begrenzt alles auf den Winkelbereich der Schlange (`span`, weiche Enden `edge`). Die Phase wird aus der Uhrzeit berechnet, damit die Wellen beim Neuzeichnen der Oberfläche nicht von vorn beginnen. Bei „weniger Bewegung“ (`prefers-reduced-motion`) bleibt nur das ruhige Leuchten.
- **Umsetzung:** `EchoWave` (`src/ui/12a-echo-welle.js`, Marken `ECHOWAVE BEGIN/END`) erzeugt das HTML der Ebene und bringt sein CSS selbst mit; `boardHTML` (`src/ui/16-seitenleisten.js`) bekommt dafür den Parameter `echo`. Engine, KI und `tests/golden.json` sind unverändert.
- **Echo-Werkstatt:** `werkstatt/echo-werkstatt.html` (gebaut mit `node tools/build-echo-werkstatt.js` aus `tools/echo-werkstatt.template.html`, dasselbe `EchoWave` wie im Spiel): Wellen (Anzahl, Dauer, Reichweite, Dicke), Leuchten und Puls, Radius und Ausschnitt der Schlange, Farben je Element, Überblendung; Ansicht groß, „Alle drei“ und in Spielgröße (120 und 108 px); Export/Import (JSON). Die exportierten Werte gehören in `DEFAULTS` von `EchoWave`.
- **Tests:** neuer Test „Echo digital: kein Marker mehr, die Schlange der Echo-Farbe bekommt Wellen“; der Werkstatt-Abgleich läuft in `npm test` (`build-echo-werkstatt.js --check`).
- Die Versionsbeschreibung im Spiel nennt die Änderung.

## Änderung 0.9.1.2 (08.11.)

- **Echo-Marker neu gestaltet und platziert (keine Regeländerung):** Der Marker ist wieder das Echo-Symbol (Stein mit konzentrischen Ringen), aber neutral und ohne Hinweis auf die Farbe (kein Buchstabe, keine Farbe). Die Farbe zeigt seine Lage: Er liegt senkrecht mittig neben dem Farbbereich der Kombo-Übersicht, zu dem das Echo gehört (die drei Zeilen Rot, Blau oder Grün). Das eigene Echo liegt links am Rand der Übersicht, das des Gegners rechts und etwas kleiner (28 statt 38 Pixel). Ohne Echo wird kein Marker gezeigt. Die Lage wird in `placeEchoTokens` (`src/ui/12-hilfen.js`) im Zustand „nichts markiert“ gemessen und für die anderen Zustände der Übersicht (eine Kombo oder Ultimate gewählt) beibehalten, damit der Marker nicht springt.
- **Hellsicht ohne Umrandung:** Offen vor die Seite gelegte Hellsichtkarten haben keine goldene Umrandung mehr (`.card.sightopen` entfernt); sie liegen weiterhin in der eigenen, kleineren Reihe über der Hand.
- Die Versionsbeschreibung im Spiel nennt die Änderung; `tests/golden.json` bleibt unverändert.

## Änderung 0.9.1.1 (08.11.)

- **Echo-Marker farblos und neu platziert (keine Regeländerung; mit 0.9.1.2 überholt):** Der Marker hat keine Farbe mehr: ein Stein mit hellen Ringen, die Farbe des Echos steht als Buchstabe (F, E, W) darin und im Tooltip. Er liegt mittig vor dem Statusfeld der jeweiligen Seite, auf der Trennlinie: das eigene Echo oben am eigenen Statusfeld (unten rechts), das des Gegners unter dem Gegnerfeld (oben rechts). Vorher saß er links und rechts am Rand der Kombo-Übersicht, der rechte teilweise außerhalb der Bühne.
- Die Versionsbeschreibung im Spiel nennt die Änderung; `tests/golden.json` bleibt unverändert.
