# Werkstätten

Eigenständige HTML-Seiten zum Einstellen von Effekten (als Artifacts veröffentlicht; die Würfel-Werkstatt: https://claude.ai/artifact/MbPGteEuJQDhNfBRXmpbKp). Der Export (JSON) wird ins Spiel übernommen.

- `kampfeffekt-werkstatt.html` – Angriffs- und Verteidigungseffekte
- `erd-werkstatt.html` – Erdmagie (Monolithe, Ranken)
- `zugwechsel-werkstatt.html` – Wanderung des goldenen Rands und Einblendung „Du bist am Zug“
- `schild-werkstatt.html` – Spiegel-Schild: Variante „Mitte“ (Schildbild fliegt vergrößert in die Mitte, Einschlag/Durchschlag/Rückwurf dort, Rückflug) und Variante „Bögen vor den Karten“; Stand 17.10. mit der neuen Regel (Ausgleich fehlender Verteidigung, Rückwurf nur der Überverteidigung) und fünf Fall-Vorlagen; Rückwurf wahlweise „am Platz“ (Schild bleibt, Überschuss fliegt aus der Mitte zu ihm, dann zum Gegner) oder „in der Mitte“ (bisher)
- `wuerfel-werkstatt.html` – Monster-Würfel (seit 0.4): grüner Plus- und roter Minuswürfel auf drei Monsterkarten; Größe, Symbole, Wurf (Dauer, Umdrehungen, Hüpfer, Startpunkt, Kippung), Farben, Seiten je Monster wählbar, alle zwölf Seiten als Übersicht, Export/Import (JSON). Der Würfelcode (`DiceKit`) steht in `src/ui/31a-wuerfel.js`; `node tools/build-wuerfel-werkstatt.js` baut die Werkstatt aus `tools/wuerfel-werkstatt.template.html` und diesem Code.
- `runen-werkstatt.html` – Runen-Werkstatt (seit 0.9): die Runen im Steinhintergrund leuchten sporadisch auf; Pause, Zufall, Dauer (ein, halten, aus), Größe, Stärke, Weichheit, Wachsen, Flackern, zwei Farben, Überblendung; Klick in die Vorschau lässt dort aufleuchten, Export/Import (JSON). Gebaut mit `node tools/build-runen-werkstatt.js` aus `src/ui/11a-runenleuchten.js` (dasselbe `RuneGlow` wie im Spiel); die exportierten Werte gehören in `DEFAULTS` dieser Datei.
- `ton-werkstatt.html` – Ton-Werkstatt: alle 34 Sounds mit Einsatz im Spiel anhören, dazu Synth-Alternativen (Regler, Würfeln, Entwurf von Claude über die `sample`-Funktion im Artifact). Rezepte lassen sich mit `tools/ton-rendern.js` zu mp3 rendern. Einzeldatei mit eingebetteten Sounds: `node tools/build-werkstatt.js` (→ `dist/ton-werkstatt.html`).
