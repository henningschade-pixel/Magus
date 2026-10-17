# Werkstätten

Eigenständige HTML-Seiten zum Einstellen von Effekten (als Artifacts veröffentlicht). Der Export (JSON) wird ins Spiel übernommen.

- `kampfeffekt-werkstatt.html` – Angriffs- und Verteidigungseffekte
- `erd-werkstatt.html` – Erdmagie (Monolithe, Ranken)
- `zugwechsel-werkstatt.html` – Wanderung des goldenen Rands und Einblendung „Du bist am Zug“
- `schild-werkstatt.html` – Spiegel-Schild: Variante „Mitte“ (Schildbild fliegt vergrößert in die Mitte, Einschlag/Durchschlag/Rückwurf dort, Rückflug) und Variante „Bögen vor den Karten“; Stand 17.10. mit der neuen Regel (Ausgleich fehlender Verteidigung, Rückwurf nur der Überverteidigung) und fünf Fall-Vorlagen; Rückwurf wahlweise „am Platz“ (Schild bleibt, Überschuss fliegt aus der Mitte zu ihm, dann zum Gegner) oder „in der Mitte“ (bisher)
- `ton-werkstatt.html` – Ton-Werkstatt: alle 34 Sounds mit Einsatz im Spiel anhören, dazu Synth-Alternativen (Regler, Würfeln, Entwurf von Claude über die `sample`-Funktion im Artifact). Rezepte lassen sich mit `tools/ton-rendern.js` zu mp3 rendern. Einzeldatei mit eingebetteten Sounds: `node tools/build-werkstatt.js` (→ `dist/ton-werkstatt.html`).
