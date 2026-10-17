# Notizen und offene Fragen

Gedanken zu Regeln und Balance, über die noch nicht entschieden ist. Neue Einträge oben.

## Beobachtung aus einem Kampf (17.10.)

Möglicher Schneeballeffekt (wer vorne liegt, baut den Vorsprung aus). Im Kampf kam nicht ein einziges Mal Überverteidigung mit den Schilden vor, also kein Rückwurf. Die Ultimate wurde nicht erreicht. Zu prüfen: Wie oft kommen Rückwurf und Ultimate in KI-Partien vor, und lohnt sich dafür eine Regel- oder Kostenänderung (siehe Rückwurf-Kosten unten)?

## Fliehen (17.10.)

Fliehen als Option im Kampf einbauen, immer dann, wenn der Gegner auf 0 Mana sitzt. Offen: Was kostet das Fliehen (Gold, HP, ein Zug)? Gilt es im Monsterkampf, im Showdown oder in beiden? Wie bewertet die KI die Option?

## Trostpreis (17.10.)

- Soll der Trostpreis nach Showdown 1 besser 2 Upgrade-Punkte betragen (bisher 1)?
- Soll der Trostpreis nach Showdown 2 besser 3 Upgrade-Punkte betragen (bisher 2)?

Stand heute: `loserUp` = 1 und `loserUp2` = 2 (siehe `docs/regelwerk.md`, Abschnitt Showdown). Zum Prüfen mit der KI: `node tools/balance/report.js 3000 '{"loserUp":2,"loserUp2":3}'` gegen den Standard.

## Schild: Kosten des Rückwurfs (17.10.)

Soll zurückgeworfener Schaden (Überverteidigung) das Schild Stufen kosten? Heute: eine Stufe je zurückgeworfenem Schaden. Optionen: gar nichts, halb, wie jetzt. Vorschlag war die Einstellung `reflectCost` und Messung in KI-Partien.
