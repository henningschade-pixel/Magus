# Balance-Simulation

KI gegen KI, abwechselnd als Beginner und Zweiter. Engine und KI kommen direkt aus `../../index.html`.

    node tools/balance/report.js 4000 '{}'                       # Gesamtauswertung (Regelüberschreibung als JSON)
    node tools/balance/report.js 3000 '{"secondPlayerGold":1}'   # Variante testen
    node tools/balance/deep.js 2000                              # Kampfausgänge je Stufe, Endstände

Gilt für KI-Spiel; Fehlerspanne bei 3000–4000 Partien etwa ±2 Prozentpunkte.

## KI-Abstimmung (Selbstspiel)

    node tools/balance/tune.js 1600 '{"aCost":1.5}' '{}'        # Varianten A gegen B (Standard), Siegquote von A; gleiche Parameter = exakt 50 %
    node tools/balance/opt.js 4 1000 '{}'                       # paralleler Koordinatenabstieg über alle Gewichte (Log: opt.log)
    node tools/balance/mon3.js 300 3,1,5,1                      # Stufe-III-/II-Monster: Zäh- und Mana-Schritte

Stand 15.10.: KI gegen die alte KI (gleiche Regeln) 80 % Siegquote. Die Erholen-Parameter (rW, rRef, dRec) schaden im Selbstspiel und stehen auf 0.
