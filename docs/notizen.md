# Notizen und offene Fragen

Gedanken zu Regeln und Balance, über die noch nicht entschieden ist. Neue Einträge oben.

## Weitere Ideen (04.11.)

- **Umbenennung:** Das Spiel soll auf „Trimagus“ umbenannt werden.
- **Upgrades:** Jedes Upgrade soll auf höchstens 3 begrenzt werden.
- **Start:** Beide beginnen mit 3 Siegpunkten.
- **Siegpunkt-Belohnung:** In Stufe 2 soll sie 2 betragen, in Stufe 3 soll sie 3 betragen.

## Offene Punkte aus dem Spiel (04.11.) – umgesetzt in 0.4

Alle drei Punkte sind in Version 0.4 umgesetzt (Monster-Zweitmagie überlegen, Combo vor der Verteidigung, Ausgleich nur für den Verlierer und nur in Gold 1/2/3), siehe `docs/regelwerk.md`, Abschnitt „Änderungen 0.4“.

- **Monster mit erhöhter Magierichtung:** Ein Monster, das eine erhöhte Magierichtung hat, sollte die überlegene Magierichtung ausgebaut haben, nicht die unterlegene. Zu prüfen: Wo wird die erhöhte Richtung beim Monster bestimmt, und warum kann dort die unterlegene Richtung ausgebaut sein?
- **Combo zuerst:** Eine Combo sollte als erstes getriggert werden. Schwierig ist das vor allem bei der Heilung, die momentan eher als Verteidigung wirkt. Zu prüfen: Reihenfolge der Auflösung im Kampf, und wie die Heilung dabei eingeordnet wird.
- **Ausgleich bei Monsterniederlage:** Der Ausgleich gegen eine Monsterniederlage sollte nur für den Verlierer gelten. Zu prüfen: Soll er nur in Form von Gold und nicht in Form von Tempelpunkten ausgezahlt werden, weil Tempelpunkte tendenziell knapp sind?

## Beobachtung aus einem Kampf (17.10.)

Möglicher Schneeballeffekt (wer vorne liegt, baut den Vorsprung aus). Im Kampf kam nicht ein einziges Mal Überverteidigung mit den Schilden vor, also kein Rückwurf. Die Ultimate wurde nicht erreicht. Zu prüfen: Wie oft kommen Rückwurf und Ultimate in KI-Partien vor, und lohnt sich dafür eine Regel- oder Kostenänderung (siehe Rückwurf-Kosten unten)?

## Fliehen (17.10.): umgesetzt

Eingebaut als Aktion „Fliehen“ im Monsterkampf (Bedingungen siehe `docs/regelwerk.md`). Offen: Soll es im Showdown ein Fliehen geben (dann als verlorener Showdown)? Soll Fliehen etwas kosten? Die KI nutzt es nicht, weil sie im Selbstspiel damit schlechter abschnitt.

## Trostpreis (17.10.)

- Soll der Trostpreis nach Showdown 1 besser 2 Upgrade-Punkte betragen (bisher 1)?
- Soll der Trostpreis nach Showdown 2 besser 3 Upgrade-Punkte betragen (bisher 2)?

Stand heute: `loserUp` = 1 und `loserUp2` = 2 (siehe `docs/regelwerk.md`, Abschnitt Showdown). Zum Prüfen mit der KI: `node tools/balance/report.js 3000 '{"loserUp":2,"loserUp2":3}'` gegen den Standard.

## Schild: Kosten des Rückwurfs (17.10.)

Soll zurückgeworfener Schaden (Überverteidigung) das Schild Stufen kosten? Heute: eine Stufe je zurückgeworfenem Schaden. Optionen: gar nichts, halb, wie jetzt. Vorschlag war die Einstellung `reflectCost` und Messung in KI-Partien.

## Spiegel: Limit von 3 Markern (03.11. / 04.11.)

Entschieden am 04.11. (0.16.1): Das Limit gilt je Farbe (Feuer-Marker sind andere als Erde-Marker), nicht insgesamt. Anlass: Showdown 3 der Partie mit Seed 1653969251, in dem ein Erde-Spiegel (3) alle Feuer-Spiegel verhinderte. Balance am 04.11. gemessen (0.16.2): keine messbare Verschiebung, weil die KI Spiegel selten wirkt und nie zwei Farben hält; mehr Spiegel-Kombos schaden ihr (siehe `tools/balance/README.md`). Offen für Menschen: Ob zwei Spiegelfarben gleichzeitig (bis zu 6 Marker) im Spiel zu stark sind, zeigt nur Spielerfahrung, die KI-Messung sagt dazu nichts.
