> Archiv: Export des Claude-Docs-Dokuments „Magus – Regelwerk (bereinigte Fassung)“ (Stand 15.10.2026, Revision 163, Regelstand v6). Spätere Änderungen stehen in `docs/regelwerk.md`.

# Magus – Regelwerk (bereinigte Fassung)

2026-10-06 · @Henning

## Spielidee und Ablauf

Magus ist ein Duellspiel für zwei Personen: Ihr baut Deck und Magie aus, besiegt Monster und messt euch in bis zu drei Showdowns, in denen allein die Siegpunkte entstehen. Wer zuerst 4 Siegpunkte hat, gewinnt sofort. Dieses Regelwerk beschreibt den Stand v6 (Oktober 2026) der HTML-Version; die Änderungen seit v4 stehen unter „Offene Punkte“.

Eine Partie besteht aus drei Abschnitten:

1. Monsterphase: Die Spieler sind abwechselnd in der Weltphase am Zug. Wer ein lebendes Monster angreift, startet einen Monsterkampf. Je Abschnitt gibt es drei Monster, im ersten Stufe I, im zweiten Stufe II, im dritten Stufe III.
2. Showdown: Sobald alle drei Monster besiegt sind, beginnt sofort der Showdown, in dem beide Spieler direkt gegeneinander kämpfen. Danach erscheinen die Monster der nächsten Stufe.

Wer zuerst 4 Siegpunkte erreicht, gewinnt sofort. Sonst gewinnt nach dem dritten Showdown, wer mehr Siegpunkte hat.

## Startwerte, Karten und Elementkreis

Jeder Spieler startet mit demselben Zustand und einem Deck aus neun Stufe-1-Karten. Einen eigenen Ausgleich für den Beginnenden gibt es nicht; das Startgold von 2 gleicht ihn aus. Zu Beginn jedes Abschnitts erhalten beide Spieler einen Bonus: im ersten Abschnitt 1 Gold und 1 Upgrade-Punkt, im zweiten je 2, im dritten je 3.

| Wert | Start | Grenze |
|---|---|---|
| Gold | 2 (zuzüglich Abschnittsbonus) | – |
| HP | 3 | Startmaximum 3; jeder Upgrade-Punkt gibt +2 Maximum, keine Obergrenze |
| Mana | 3 | Startmaximum 3; jeder Upgrade-Punkt gibt +1 Maximum, keine Obergrenze |
| Magie Feuer / Erde / Wasser | je 1 | höchstens 3 |
| Ausspiellimit | 1 | per Tempel erhöhbar, höchstens 5 |
| Siegpunkte | 0 | – |

Startdeck: 3× F1, 3× E1, 3× W1. Karten heißen Element plus Stufe (F2 = Feuer, Stufe 2), Stufen gehen von 1 bis 3. Flüche sind Fluchkarten (C1), die Aggro auf den Ablagestapel der Gegenseite legt (siehe Kombos); der Todes-Fluch der Ultimate liegt als Marker. Das Marker-System (Schwäche-Marker) und das ältere Fluchkartensystem sind als austauschbare Varianten erhalten.

Spieler starten mit 3 Handplätzen; jeder Upgrade-Punkt kann einen weiteren Platz freischalten, höchstens 5. Monster haben Ausspiellimit + 2 Handplätze, mindestens 3. Das Ausspiellimit ist die Zahl der Karten, die man pro Aktion markieren darf.

Elementkreis: Feuer schlägt Erde, Erde schlägt Wasser, Wasser schlägt Feuer. „Überlegen“ bedeutet in diesem Regelwerk: Wasser ist gegen Feuer überlegen, Feuer gegen Erde, Erde gegen Wasser. Überlegene Elemente verteidigen gegen das unterlegene billiger.

## Weltphase

Im eigenen Zug führt ein Spieler genau eine Hauptaktion aus: Nachziehen, beim Händler eintauschen oder einen Kampf beginnen. Dazu kommen beliebig viele Bonusaktionen, die den Zug nicht beenden: im Tempel Gold opfern, Magie kaufen und Upgrade-Punkte ausgeben. Im Kampf sind Bonusaktionen nie erlaubt. Eine Erholungsphase gibt es nicht mehr.

Bei jedem Zugwechsel bekommt der Spieler, der dran kommt, +1 HP und +1 Mana (nicht über das Maximum). Alle lebenden Monster regenerieren dabei ebenfalls +1 HP und +1 Mana. Im Kampf gibt es keine Regeneration.

Aggro legt Fluchkarten (C1, höchstens 3 je Kombo) zuerst auf den Ablagestapel der Gegenseite. Sie kommen erst auf die Hand, wenn der Zugstapel leer ist und der Ablagestapel in den Zugstapel gemischt wird; vorher werden sie nicht gezogen. Eine Fluchkarte auf der Hand belegt einen Handplatz und wirkt nicht; sie lässt sich nicht ausspielen oder zum Verteidigen markieren. Sie bleibt dort, bis der Spieler nachzieht; beim Nachziehen werden erst die übrigen, nicht gesperrten Karten ersetzt, dann sind die schon liegenden Fluchkarten dauerhaft verworfen (sie kommen nicht zurück auf den Ablagestapel). Am Kampfende verschwinden alle Fluchkarten. Der Todes-Fluch der Ultimate liegt als Marker (siehe Kombos).

Alle nicht gesperrten Handkarten wandern auf den Ablagestapel, danach werden alle freien Handplätze neu aus dem Deck gefüllt. Ist das Deck leer, wird der Ablagestapel gemischt. Mit Rechtsklick sperrt man eine Handkarte, sie bleibt dann beim Nachziehen liegen. Nachziehen beendet den Zug.

Der Händler verlangt Karten, kein Gold. Er arbeitet mit den markierten Handkarten; wie viele man markieren kann, begrenzt das Ausspiellimit (bei Limit 1 ersetzt eine neue Markierung die alte). Die abgegebenen Karten und das Ergebnis Das Ergebnis landet auf dem Ablagestapel, der Tausch beendet den Zug.

| Ergebnis | Kosten |
|---|---|
| F1, E1, W1 | gratis (jederzeit, ohne Markierung; es werden weder Karten noch Markierungen verbraucht) |
| Stufe 2 oder 3 im Element X | 2 gleiche markierte Karten der Vorstufe in X (nur bei Ausspiellimit 2 oder mehr), oder 1 markierte Karte der Vorstufe im überlegenen Element |

Beispiel: F2 kostet 2× F1 oder 1× W1.

Wer n Gold opfert, erhält n·(n+1)/2 Tempelpunkte. Die nächste Tempelstufe kostet (aktuelle Stufe + 1) Punkte, jede erreichte Stufe gibt einen Upgrade-Punkt, überschüssige Punkte bleiben erhalten. Ein großes Opfer lohnt sich also mehr als mehrere kleine, und jede weitere Stufe wird teurer. Upgrade-Punkte dürfen aufgespart werden; geopfert werden darf jederzeit im eigenen Zug. Opfern und Punkte ausgeben sind Bonusaktionen und beenden den Zug nicht.

Ein Upgrade-Punkt gibt +2 maximale HP (und +2 HP), +1 maximales Mana (und +1 Mana), +1 Ausspiellimit (jeder Schritt kostet 2 Upgrade-Punkte) (höchstens 5) oder einen zusätzlichen Handplatz (höchstens 5).

Magie wird direkt mit Gold gesteigert: Stufe 2 kostet 1 Gold, Stufe 3 kostet 3 Gold, mehr gibt es nicht. Der Kauf ist eine Bonusaktion und beendet den Zug nicht.

Als eigene Aktion gibt es das nicht. Fluchkarten werden beim Nachziehen abgeworfen (siehe Fluchkarten); die Variante mit Fluchkarten-Abwurf als Zugaktion ist nicht aktiv.

## Monsterkampf

Der aktive Spieler wählt ein lebendes Monster und greift an; der Mitspieler übernimmt die Monsterseite mit Monsterdeck, Monster-HP und Monster-Mana. Zu Kampfbeginn werden das Monsterdeck und das gesamte Deck des Angreifers neu gemischt und aufgefüllt. Gespielte Karten gehen auf den Ablagestapel, die Hand füllt sich im Kampf nicht von selbst wieder auf.

A greift an, B verteidigt, danach greift B an und A verteidigt, und so fort. Jeder Zug besteht also aus Verteidigen und anschließendem Angreifen. Greift die Gegenseite nicht mit Schaden an, entfällt die Verteidigung.

Der Angreifer markiert bis zu Ausspiellimit Karten. Das Element der zuerst markierten Karte ist das Primärelement.

- Schaden: je Karte im Primärelement min(Kartenstufe, eigene Magie in diesem Element).
- Karten anderer Elemente machen keinen Schaden, sie zählen nur für Kombos.
- Fluchkarten gibt es nur im Fluchkartensystem (Variante); dort können sie mitgespielt werden und gehen auf den Ablagestapel.

Alle Verteidigungskarten müssen dasselbe Element haben, und zwar das des Angriffs oder das überlegene Element. Der Block ist je Karte min(Kartenstufe, eigene Magie in diesem Element). Nicht geblockter Schaden geht von den HP ab.



| Karte | Kosten |
|---|---|
| Angriff, Primärelement | 1 Mana pro Karte |
| Angriff, anderes Element (Kombo) | 0 |
| Verteidigung im Element des Angriffs | 1 Mana pro Karte |
| Verteidigung im überlegenen Element | 0 |
| Fluchkarte (nur Fluchkartensystem; Angriff oder Verteidigung) | 1 Mana pro Karte |

Statt anzugreifen darf der Angreifer erholen: Er und die Gegenseite erhalten je +1 Mana. Passen ist ebenfalls möglich. Im eigenen Angriffszug darf man stattdessen nachziehen (die Hand wird wie beim normalen Nachziehen getauscht). Das Nachziehen ist gratis und ersetzt den Angriff, ebenso wie Erholen und Passen: Jede dieser Aktionen beendet den Angriffszug. Das gilt schon im Code.



- Fällt eine Seite auf 0 HP, hat die andere gewonnen. Fallen beide gleichzeitig, gibt es keinen Sieger.
- Haben beide Seiten 0 Mana und noch HP (geprüft erst, wenn keine Verteidigung mehr aussteht, der letzte Angriff kann also noch gewinnen), zehrt nur der Todes-Fluch weiter: In jedem Schritt verliert jede Seite mit Todes-Fluch HP in Höhe ihrer Marker. Wer zuerst auf 0 HP fällt, verliert den Kampf; fällt beide im selben Schritt, gibt es keinen Sieger. Bleibt danach niemand bei 0 HP, endet der Kampf durch Erschöpfung ohne Sieger.
- Gewinnt der Spieler gegen das Monster, erhält er das gesamte Gold des Monsters. Gewinnt die Monsterseite (der Spieler fällt auf 0 HP), gibt es keine Beute: Monster und Spieler bleiben mit ihren Werten auf dem Brett, das Monster behält sein Gold, auch der Monsterführer erhält nichts.
- Ohne Sieger gibt es keine Beute, das Monster bleibt am Leben.
- Nach dem Kampf ist die bisherige Verteidigerseite in der Weltphase zuerst am Zug. Ungenutzte Gratis-Nachziehen verfallen.

In Monsterkämpfen bleiben HP und Mana erhalten und regenerieren in der Weltphase; nur die Hand wird vor und nach dem Kampf frisch gemischt. Vor und nach einem Showdown sind HP und Mana voll.

## Kombos und Ultimate

Kombos entstehen nur im Angriff, wenn zwei Elemente markiert sind. Sie kosten kein Mana und wirken zusätzlich zum Schaden.

| Kombo | Elemente | Effekt bei Stufe S |
|---|---|---|
| Control | Feuer + Wasser | Spiegel: Spiegel dieser Farbe wird auf S Marker gesetzt (nicht addiert; höchstens 3 insgesamt). Gegen jeden Angriff in der Farbe eines Spiegelmarkers wirkt automatisch ein Marker, egal in welcher Farbe der Verteidiger verteidigt, sofern er eine reguläre Verteidigung ausführt (mindestens eine Elementkarte; wer keine Verteidigung ausführt und nur Schaden nimmt, löst den Spiegel nicht aus): Der Marker wird verbraucht und wirft 1 Schaden unblockbar auf den Angreifer. Die Verteidigung kostet wie ohne Spiegel. Keine Heilung und kein Mana. Am Kampfende verfallen alle Marker. |
| Aggro | Feuer + Erde | Legt S Fluchkarten (höchstens 3) auf den Ablagestapel der Gegenseite. Gezogen belegt eine Fluchkarte einen Handplatz, lässt sich nicht ausspielen und wirkt nicht. Beim Nachziehen werden die Fluchkarten der Hand dauerhaft verworfen; am Kampfende verschwinden alle. |
| Lifeflow | Erde + Wasser | Angreifer heilt S HP (nicht über das Maximum) und nimmt bis zu S Marker vom Brett (Todes-Fluch- und Spiegelmarker, eigene oder gegnerische); je entferntem Marker erhält er 1 Gratis-Nachziehen |

Die Farbe der ersten markierten Karte bestimmt die Rolle (Feuer aggressiv, Wasser defensiv, Erde heilend), die zweite Farbe die Wirkung. S = die kleinere der beiden Kartensummen (je Farbe die Summe der markierten Kartenwerte, jede Karte höchstens so hoch wie die Magiestufe), höchstens 3; mehrere Karten einer Farbe zählen also zusammen. Kombos kosten kein Mana. Kombos gelten auch in der Verteidigung.

- Feuer + Erde (Aggro): S Fluchkarten für den Gegner.
- Feuer + Wasser (Zerrüttung): Der Gegner muss S Handkarten seiner Wahl abwerfen (er wählt selbst; hat er weniger Karten, wirft er alle ab). Bevor er weiterspielt, wirft er sie ab.
- Wasser + Feuer (Spiegel): Dein roter Spiegel steht danach auf S Marker (nicht addiert, höchstens 3 insgesamt).
- Wasser + Erde (Spiegel): Dein grüner Spiegel steht danach auf S Marker (gleiche Regel). Wasserangriffe lassen sich nie spiegeln.
- Erde + Wasser (Heilung): Du heilst S HP, nicht über das Maximum.
- Erde + Feuer (Läuterung): S Marker vom Brett entfernen (eigene Flüche, Todesmarker, gegnerische Spiegel; anklickbar), je Marker ein Nachziehtoken, keine Heilung.
- Alle drei Farben (Ultimate): Todes-Fluch der Stufe S, ersetzt die Einzel-Kombos; die Reihenfolge spielt keine Rolle.

Die Tabelle oben mit Control, Aggro und Lifeflow beschreibt die frühere Fassung; sie bleibt als Regelvariante comboMode „classic“ wählbar.

Die Kombostufe S ist das Minimum aus den beiden Magiewerten und den jeweils höchsten markierten Kartenstufen der beiden Elemente, höchstens 3. Gratis-Nachziehen entstehen durch Lifeflow (eines je entferntem Marker) und in der Variante controlMode „draw“ (Control = S Gratis-Nachziehen); im Standard ist Control der Spiegel. Daneben kann man im Angriffszug auch normal nachziehen (siehe Monsterkampf). Ungenutzte Gratis-Nachziehen verfallen am Kampfende.

Sind alle drei Elemente markiert, ist die Stufe das Minimum aus allen drei Magiewerten und allen drei höchsten Kartenstufen, höchstens 3. Die Ultimate ist ein Todes-Fluch: Der Gegner verliert Stufe-S HP am Ende jeder eigenen Angriffsphase (nach Angriff und gegnerischer Verteidigung) bis Kampfende; nur Lifeflow kann Marker entfernen. Die Einzel-Kombos entfallen.

## Monster

Jeder Abschnitt hat drei Monster, je eines für Feuer, Erde und Wasser; sie gewinnen von Stufe I bis III an Stärke und Beute. Die Monsterwerte stehen als Abstimmungsdaten im Code (MONSTER in index.html). Beim Erscheinen wird je Monster eine gleich starke Variante gewürfelt (Tempel-Verbesserungen, Nebenelement, Deckform). Sie sind so abgestimmt, dass Spieler mit ihren Startmitteln etwas stärker sind als die Stufe-I-Monster und sich unterschiedlich entwickeln müssen, weil die Monster verschieden sind.

| Stufe | Beute (Gold) | Aufbau |
|---|---|---|
| I | 1 | Startdeck; beim Feuermonster 2, beim Wassermonster 1, beim Erdmonster 0 Karten im eigenen Element auf Stufe 2; Magie 2 im eigenen Element; als Variante 1 Mana mehr |
| II | 2 | Magie 3/2/1 (Haupt-, Neben-, drittes Element), stärkeres Deck, Ausspiellimit 2, keine HP-Upgrades |
| III | 3 | Magie 3/2/1 wie Stufe II, nochmals stärkeres Deck, Ausspiellimit 3, 1 HP mehr |

Hauptelement und Nebenelement: Feuermonster Feuer und Erde, Erdmonster Erde und Wasser, Wassermonster Wasser und Feuer. Monster werden im Kampf vom Gegenspieler gesteuert. Siegt das Monster, bleibt es mit seinen Werten und seinem Gold auf dem Brett.

Verlorene Monster-HP bleiben bestehen, solange das Monster lebt; es regeneriert bei jedem Zugwechsel +1 HP und +1 Mana.

## Showdown

Sobald das dritte Monster eines Abschnitts besiegt ist, beginnt sofort der Showdown; eine Erholungsphase gibt es nicht. Beide Spieler starten mit vollen HP, vollem Mana und frisch gemischtem Deck.

Im Showdown greift der Spieler zuerst an, der hinten liegt. Verglichen werden nacheinander Siegpunkte, Tempelpunkte, Magiefortschritt (Summe der Magiestufen über 1) und Gold. Bei völligem Gleichstand entscheidet der Zufall.

Der Showdown läuft wie ein Monsterkampf, nur gegen den anderen Spieler, mit dessen eigenem Deck und Werten. Zu Beginn werden beide Decks neu gemischt und aufgefüllt.



- Sieger: 2 Siegpunkte. Es gibt keinen Goldraub, beide behalten ihr Gold.
- Kein Sieger (beide gleichzeitig auf 0 HP oder Erschöpfung): je 1 Siegpunkt.

Nach dem Showdown sind HP und Mana wieder voll. Wer einen Showdown verliert, erhält 1 Upgrade-Punkt (nach Showdown 1 und 2, nicht bei Remis) und beginnt die nächste Weltphase. Beim Erscheinen der nächsten Monster erhalten beide Spieler den Abschnittsbonus: im zweiten Abschnitt je 2, im dritten je 3 Gold und Upgrade-Punkte.

## Siegpunkte und Spielende

Siegpunkte gibt es nur im Showdown, insgesamt höchstens 6 pro Spieler über drei Showdowns. Monsterkämpfe bringen Gold, aber keine Siegpunkte.

| Ereignis | Siegpunkte |
|---|---|
| Showdown gewonnen | 2 |
| Showdown ohne Sieger | je 1 |

Das Spiel endet, sobald ein Spieler 4 Siegpunkte hat (frühestens nach dem zweiten Showdown), spätestens nach dem dritten Showdown. Es gewinnt, wer mehr Siegpunkte hat. Bei Gleichstand (etwa 3:3) endet die Partie im Code ohne Sieger; das Remis ist bewusst nicht aufgelöst.

## Offene Punkte

Alle offenen Fragen sind entschieden. Wo die Entscheidung vom Code abweicht, steht das im jeweiligen Abschnitt und in der Liste unten.

- Der Mitspieler steuert im Monsterkampf die Monsterseite (die alte Anleitung ließ das offen).
- Entschieden: Im Showdown gibt es keinen Goldraub (der Code nahm bisher das gesamte Gold des Verlierers).
- Bei Gleichstand nach dem dritten Showdown gibt es keinen Sieger (die Anleitung nannte Entscheidungskampf oder geteilten Sieg).
- Ein Spieler mit 0 HP nach verlorenem Monsterkampf bleibt spielfähig und regeneriert nur +1 HP pro Zug.
- entfällt (Überbleibsel einer älteren Regelvariante, nie mit Werten belegt).



- „Beim Händler kaufen“ klang nach Gold; der Händler tauscht Karten.
- „Magie“ war als Tempel-Upgrade genannt; Magie wird mit Gold gekauft.
- Mana-Kosten, Erholen im Kampf und die Regeneration pro Zugwechsel fehlten ganz. Ebenso fehlten die Handplätze per Upgrade-Punkt und die Regel, dass Nachziehen die ganze Hand tauscht.
- Kombostufe und Ultimate waren ungenauer beschrieben (siehe Abschnitt Kombos).



- Nachziehen im Kampf ist gratis und ersetzt den Angriff; das gab es im Code schon (erledigt).
- Entschieden: Fluch abwerfen ist in der Erholungsphase nicht erlaubt (erledigt).
- Entschieden: Das Ausspiellimit steigt höchstens bis 5 (erledigt).
- Entschieden: Aggro-Flüche gegen ein Monster wirken nur bis Kampfende (erledigt).



- Fluchmarker (höchstens 3) statt Fluchkarten: ein Marker wird zu Beginn des eigenen Zuges gegen 1 HP getauscht, Lifeflow nimmt Marker herunter. Das Fluchkartensystem bleibt als austauschbares Modul erhalten (docs/fluchkarten.md).
- Upgrade-Punkte dürfen aufgespart werden. Der erste Schritt beim Ausspiellimit kostet 2 Punkte.
- Bonusaktionen (Opfern, Magie kaufen, Punkte ausgeben) beenden den Zug nicht, sind in der eigenen Runde unbegrenzt und gelten auch in der Erholungsphase, nie im Kampf.
- Der Händler arbeitet mit markierten Karten; die Auswahl ist durch das Ausspiellimit begrenzt, Gratiskarten werden immer angezeigt.
- Monsterwerte wurden neu abgestimmt (Beute 4/5/6, feste Entwicklung je Stufe).
- Entschieden: Die Gratiskarte beim Händler verlangt keine Markierung und verbraucht nichts.
- Ausgleich geändert: Der Beginnende startet mit 1 Gold mehr (Regel firstPlayerGold). Der frühere Upgrade-Punkt für den zweiten Spieler entfällt, weil er mit der stärkeren KI zu stark wurde (Simulation: A 44 %, B 42 %, Remis 14 %).
- Erholungsphase ohne Nachziehen: erlaubt sind Händler und Erholen (je einmal) sowie Passen.
- Monster neu abgestimmt: Wassermonster I ohne Tempel-Verbesserung, Feuermonster III mit 6 statt 7 HP.
- Die KI wurde per Selbstspiel nachgestimmt und schlägt die frühere Fassung in 97 % der Partien.
- Oberfläche: Upgrade-Schritte, die mehr als 1 Punkt kosten (erster Limit-Schritt), tragen eine Kostenzahl am Plus-Knopf.
- Control ist jetzt der Spiegel (statt Gratis-Nachziehen): Marker, die man bei Verteidigung in der Farbe des Angriffs einsetzt (höchstens so viele, wie Schaden eingeht): je Marker 1 Schaden zurück, keine Heilung (HP gehören zu Lifeflow). Messwert: nur etwa +0,4 bis +1,3 Punkte (mit 2 Schaden je Marker etwa +1,1 bis +3,2). Die alte Fassung bleibt als Regelvariante controlMode „draw“.
- Lifeflow: „Nimm S Marker von dir oder deinem Gegner weg und heile S Punkte“ – bis zu S Marker beliebig vom Brett (eigene oder gegnerische Fluch- und Spiegelmarker). Messwert gegen die KI: etwa +0,4 bis +1,2 Punkte (Aggro etwa 5, Control etwa 0,4 bis 1,3), also noch schwach. Version 59: Lifeflow heilt jetzt 1 HP je entferntem Marker; Flüche sind Schwäche-Marker (doppelter Schaden, nach jedem eigenen Angriffszug des Betroffenen −1), die Ultimate ist ein Todes-Fluch (S HP pro eigenem Angriffszug bis Kampfende). Messwerte: Aggro etwa +5, Control +1,5, Ultimate +1,2, Lifeflow etwa 0.



- Abschnittsbonus: Startgold ist 1; zu Beginn jedes Abschnitts erhalten beide Spieler 1/2/3 Gold und 1/2/3 Upgrade-Punkte. Der Gold-Ausgleich für den Beginnenden entfällt.
- Ein Upgrade-Punkt gibt +2 maximale HP (statt +1). Beute der Monster: 1/2/3 Gold (statt 4/5/6).
- Die Erholungsphase entfällt: Nach dem dritten Monster beginnt sofort der Showdown.
- Siegbedingung: Wer zuerst 4 Siegpunkte hat, gewinnt sofort (Regel winSp), sonst entscheidet der dritte Showdown.
- Anti-Snowball: Wer einen Showdown verliert, erhält 1 Upgrade-Punkt (Regel loserUp, nur nach Showdown 1 und 2) und beginnt die nächste Runde. Messung im KI-Selbstspiel (4000 Partien): Das Auseinanderlaufen der Spielstärke von Abschnitt 2 zu 3 sinkt von +1,5 auf +0,9, der Führende nach Showdown 1 gewinnt in 68 statt 74 % der Partien.
- Verliert ein Spieler gegen ein Monster, bleibt das Monster mit seinen Werten und seinem Gold auf dem Brett; es gibt keine Beute und niemand erhält Gold.
- Kombos: Aggro legt Fluchkarten, Control ist der Spiegel, Lifeflow entfernt bis zu S Marker und gibt je Marker 1 Gratis-Nachziehen. Die Ultimate ist der Todes-Fluch; in der Erschöpfung zählt nur er.
- Monster erscheinen in zufällig gewürfelten, gleich starken Varianten.
- In Monsterkämpfen bleiben HP und Mana erhalten, im Showdown sind sie voll.
- Bekannt: Im KI-Selbstspiel enden etwa 32 % der Partien ohne Sieger (häufigster Endstand 3:3). Das wurde bewusst nicht geändert.

- Magie: Der zweite Ausbauschritt (Stufe 2 auf 3) kostet 3 Gold statt 2. Ein Upgrade-Punkt gibt weiterhin +2 maximale HP.
- Monster haben ein Ausspiellimit nach Stufe: I = 1, II = 2, III = 3. Ihre Werte wurden dafür neu abgestimmt (Stufe II ohne HP-Upgrades, Stufe III mit 1 HP mehr, Magie in Stufe III wie in II). Gemessen im KI-Selbstspiel (4000 Partien): Sieg gegen Monster II 46 bis 49 %, gegen Monster III 54 bis 61 %, Niederlagen 11 bis 18 %.

- Startgold ist 2 statt 1. Gemessen im KI-Selbstspiel: Beginner 47 % der Entscheidungen (vorher 41,5 %), Showdowns ausgeglichener.

- Ausspiellimit: Jeder Verbesserungsschritt kostet 2 Upgrade-Punkte (vorher nur der erste). Messung im KI-Selbstspiel: Monsterwerte und Fairness bleiben im Zielbereich, Beginner 47,6 % der Entscheidungen.

- Todes-Fluch: Die HP gehen am Ende der eigenen Angriffsphase verloren statt zu Beginn des Zuges. Ist der Kampf schon entschieden, wirkt er nicht mehr.
- Spiegel: Ein Control der Stufe S setzt den Spiegel dieser Farbe auf S Marker, statt S Marker draufzulegen (Stufe 1 und dann Stufe 2 ergibt 2, nicht 3). Höchstens 3 Marker insgesamt.
- Monster erholen sich (+1 HP, +1 Mana) einmal am Ende jeder Runde, nicht mehr bei jedem Spielerzug (vorher doppelt so schnell wie Spieler).
- Monster Stufe II und III sind stärker: Stufe II erhält Limit, +1 HP und +1 Mana, Stufe III +1 HP, Limit und +1 Mana. Varianten je Monster: Grundform, ohne Extra-Mana, Mana+ (ein weiteres Mana). Messwert gegen die KI: Spieler siegt etwa 37 bis 39 % (Stufe II) und 54 bis 60 % (Stufe III).
- Händler: Bei zwei gleichen Karten sinkt das Deck um 1, bei einer Karte des überlegenen Elements bleibt es gleich. Geändert: Die bezahlten (zuvor markierten) Karten werden aus dem Deck entfernt, nur die gekaufte Karte kommt auf den Ablagestapel.
- Spielende: Nach dem dritten Showdown entscheidet bei Gleichstand der Siegpunkte das Gold (wer mehr hat, gewinnt); nur bei gleichem Gold bleibt es unentschieden.
- Belohnung: Jede Runde bringt jedem Spieler 1 Gold und 1 Upgrade-Punkt (vorher 1, 2 und 3). Auch die erste Runde beginnt nur mit 1 Gold und 1 Upgrade-Punkt (Startgold 0).
- Karten: Fluchkarten kommen erst in den Zugstapel und damit auf die Hand, wenn der Ablagestapel in den Zugstapel gemischt wird. Upgrades für HP und Mana erhöhen nur das Maximum.
- Oberfläche: Ein Klick auf den eigenen Ablagestapel zeigt die Deckverteilung (F1 bis W3, Flüche) als Balkendiagramm.

- Fluchkarten: Aggro legt sie auf den Ablagestapel der Gegenseite. Beim nächsten Nachziehen des Betroffenen kommen sie zuerst auf seine Hand, beim darauffolgenden Nachziehen sind sie dauerhaft vernichtet (nicht auf dem Ablagestapel).
- Spiegel vereinfacht: Er wirkt automatisch gegen jeden Angriff in der Farbe eines Markers (ein Marker je Angriff, 1 Schaden zurück), unabhängig von der Verteidigungsfarbe. Kein Rabatt mehr, keine Auswahl der Markerzahl; die Verteidigungskosten bleiben wie ohne Spiegel. Im Kampfeffekt treffen die nicht verteidigten Funken den Spiegel, die verbrauchten Ringe zerspringen, der Rest fliegt weiter auf die HP.
- Kombos neu geordnet: Die Farbe der ersten Karte bestimmt die Rolle, die zweite Farbe die Wirkung (sechs Kombos plus Ultimate, siehe Kombo-Tabelle). Neu: Mana-Entzug, getrennte Heilung und Läuterung, fester roter oder grüner Spiegel. Die alten Kombos (Control, Aggro, Lifeflow) bleiben als Variante comboMode „classic“. Messwert gegen die KI: Zweiter gewinnt etwa 58 % (vorher etwa 61 %), alle Kombos werden genutzt.
- Kombos in der Verteidigung (Regel defenseCombos, jetzt Standard): Kombos auch in der Verteidigung. Beliebig viele Karten der Verteidigungsfarbe (gleiche oder überlegene Farbe), danach Kombokarten einer zweiten Farbe; alle zählen aufs Ausspiellimit. Kombokarten blocken nicht und kosten kein Mana; die Verteidigung kostet wie bisher (Angriffsfarbe 1 Mana je Karte, überlegene Farbe kostenlos). Die Kombo wirkt erst nach der Verteidigung und dem Spiegelrückwurf (ein neuer Spiegel wirkt also nicht rückwirkend). Messwert gegen die KI (800 Partien): Showdown-Angreifer gewinnen seltener (7 statt 10 % im 2. Showdown), mehr Unentschieden, längere Partien (90. Perzentil 2770 statt 2040 Aktionen); in etwa 25 % der Verteidigungen wird ein Kombo gespielt.
- Kombostufe aus Kartensummen und Kombos in der Verteidigung als Standard: Die erste markierte Karte bestimmt die Angriffs- bzw. Verteidigungsfarbe, alle markierten Karten dieser Farbe gehören dazu (goldener Rahmen), danach folgen Kombokarten einer zweiten Farbe (kein Rahmen, kein Mana, aber aufs Limit). Beispiel: Wasser + Wasser mit Feuer + Feuer ergibt einen Spiegel der Stufe 2, wenn Limit und Magie ausreichen. Messwert gegen die KI (800 Partien): Zweiter gewinnt etwa 60 %, Partien etwas länger (90. Perzentil etwa 2700 statt 2040 Aktionen), 10 von 800 Partien festgefahren (vorher 1).
- Zerrüttung ersetzt den Mana-Entzug (zu stark): Feuer + Wasser lässt den Gegner S Handkarten seiner Wahl abwerfen. Die Abwurfkarten wandern auf den Ablagestapel (auch Flüche). Der alte Entzug bleibt als Regelvariante rmMode „drain“.
- Belohnungen und Startwerte: Startmana 4 (vorher 3). Belohnung je Abschnitt: Stufe I 1 Gold und 1 Upgrade-Punkt, Stufe II 2 und 2, Stufe III 3 und 3. Die Monster wurden entsprechend verstärkt: Stufe II erhält zusätzlich 3 Zäh und 2 Mana, Stufe III zusätzlich 4 Zäh und 3 Mana und ein stärkeres Deck. Messwert gegen die KI (1000 Partien): Spieler siegt unter den entschiedenen Kämpfen etwa 89 % (Stufe I), 43 % (Stufe II) und 43 % (Stufe III); Partien kürzer (Median etwa 490 statt 700 Aktionen).
- Spiegel: Ein Marker wirkt nur noch, wenn auch eine reguläre Verteidigung ausgeführt wird (mindestens eine Elementkarte). Wer ohne Verteidigung Schaden nimmt, löst den Spiegel nicht aus.

Die Netzwerkschicht () betrifft keine Spielregeln und wurde nicht ausgewertet.
