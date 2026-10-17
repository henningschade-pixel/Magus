# Notizen und offene Fragen

Gedanken zu Regeln und Balance, über die noch nicht entschieden ist. Neue Einträge oben.

## Trostpreis (17.10.)

- Soll der Trostpreis nach Showdown 1 besser 2 Upgrade-Punkte betragen (bisher 1)?
- Soll der Trostpreis nach Showdown 2 besser 3 Upgrade-Punkte betragen (bisher 2)?

Stand heute: `loserUp` = 1 und `loserUp2` = 2 (siehe `docs/regelwerk.md`, Abschnitt Showdown). Zum Prüfen mit der KI: `node tools/balance/report.js 3000 '{"loserUp":2,"loserUp2":3}'` gegen den Standard.

## Schild: Kosten des Rückwurfs (17.10.)

Soll zurückgeworfener Schaden (Überverteidigung) das Schild Stufen kosten? Heute: eine Stufe je zurückgeworfenem Schaden. Optionen: gar nichts, halb, wie jetzt. Vorschlag war die Einstellung `reflectCost` und Messung in KI-Partien.
