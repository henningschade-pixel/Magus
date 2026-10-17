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
