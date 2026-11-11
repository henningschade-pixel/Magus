# Quellen von Magus

`index.html` wird aus diesen Dateien gebaut (`npm run build`, Reihenfolge in `manifest.json`).
Engine, KI und Oberfläche sind drei getrennte Schichten; die Oberfläche kennt nur `Magus` (Engine) und `MagusAI`.

## engine/ – Regelkern (ohne Oberfläche, läuft auch in Node)
00 Rahmen · 10 Karten · 20 Werte · 30 Monster · 40 Flüche (Lähmung, Todesmarker) · 50 Bibliothek · 60 Kampfberechnung · 65 Kampfablauf · 70 Weltphase · 80 Start/Schnittstelle (`DEFAULT_RULES`, `newGame`, `apply`)

## ai/ – Computergegner
10 Stellschrauben (`DEFAULTS`) · 20 Weltphase · 30 Kampf (zusammen die Basis-KI: bewertet jeden Zug einzeln mit festen Gewichten) · 40 Suche (seit 0.13 Vorausschau im Kampf: spielt jeden möglichen Zug in vielen Kampfverläufen durch, `setSearch`) · 90 Schnittstelle (`plan`, `runTurn`)

## ui/ – Oberfläche (eine IIFE, Dateien werden nacheinander verkettet)
- Grundlage: 00 Start/Zustand · 10 Layout · 11 Skalierung · 12 Hilfen · 14 Sound
- Darstellung: 15 Karten · 16 Seitenleisten · 16a Balkenblinken (Vorschau auf den HP- und Mana-Bögen) · 17 Weltphase · 18 Kampf · 19 Gesamtdarstellung · 26 Erde und Kampfeffekt-Ablauf · 26a Darstellung (render, Menüs, Start-/Ergebnis-Bildschirm) · 26b Endbildschirm (Sieg/Niederlage, Rückblick auf die Höhepunkte)
- Animationen: 13 Zugwechsel · 20 Todesfluch · 21 Spiegelbruch · 22 Lifeflow/Lähmung · 23 Kampffunken · 24 Funken · 25 Auflösung
- Ablauf und Eingaben: 27 Ablauf (Spielschleife, Ergebnis-Overlay) · 30 Eingaben · 31 Statistik · 32 Spiellog (Export)
- Mehrspieler: 28 PeerJS · 29 Mehrspieler

Regeln: Die Engine hält allen Spielzustand (`G`); die Oberfläche rendert ihn nur und schickt Aktionen über `M.apply`.
Tests: `tests/` (Regeln, Referenzpartien `golden.json`, Vorausschau `suche.test.js`, Browser). Tests und Balance-Werkzeuge spielen mit der Basis-KI (`tools/balance/load.js` schaltet die Vorausschau ab; `MAGUS_SIM=120` schaltet sie ein), im Spiel plant der Computer voraus. Änderungen am Verhalten der Engine/KI müssen den Golden-Test bewusst neu erzeugen (`npm run golden`).
