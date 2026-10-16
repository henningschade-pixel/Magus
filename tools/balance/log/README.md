# Spiellog und Analyse

- `spiellog-2026-10-15.json`: Export einer Partie zweier menschlicher Spieler (Mehrspieler, 1559 Aktionen, Seed 790042916), erstellt auf dem Spielstand von Commit `5f3feb5`. Format siehe Feld `hinweis` in der Datei.
- `replay.js`: spielt die Partie Aktion für Aktion nach und prüft, dass die Handkarten mit dem Log übereinstimmen (auf dem alten Stand: 0 Abweichungen).
- `agree.js`: vergleicht an jeder echten Entscheidung die Aktion des Menschen mit dem Vorschlag der KI (`AI.plan`).

Die Skripte brauchen den Spielstand von damals als Ordner `old/` neben ihnen:

    mkdir -p tools/balance/log/old/tools && cp -r tools/balance tools/balance/log/old/tools/ && rm -rf tools/balance/log/old/tools/balance/log tools/balance/log/old/tools/balance/.gen
    git show 5f3feb5:index.html > tools/balance/log/old/index.html
    node tools/balance/log/replay.js old
    node tools/balance/log/agree.js old

Auf dem aktuellen Stand lässt sich die Partie nicht mehr nachspielen (Regeln und Monsterwerte haben sich geändert).
