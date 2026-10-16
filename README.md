# Magus

Duellspiel aus Magie, Monstern und Showdowns für zwei Personen (gegen den Computer oder zu zweit online). Gespielt wird im Browser: **https://henningschade-pixel.github.io/Magus/**

## Aufbau

- `index.html` – die spielbare Datei. **Wird gebaut, nicht von Hand bearbeitet.**
- `src/` – die Quellen: `engine/` (Regelkern), `ai/` (Computergegner), `ui/` (Oberfläche und Animationen), `style.css`, `head.html`, `body.html`, `assets-*.js`. Die Reihenfolge steht in `src/manifest.json`.
- `assets/` – Bilder, Sounds, Cursor.
- `docs/` – Regelwerk (`regelwerk.md`), QR-Code.
- `tools/` – Build, Einzeldatei-Version, Balance-Simulation und KI-Abstimmung (`tools/README.md`).
- `tests/` – automatische Tests.
- `werkstatt/` – Werkstätten zum Einstellen von Effekten.

## Arbeiten

    npm run build      # src/ -> index.html
    npm test           # prüft, dass index.html zu src/ passt, und führt alle Tests aus
    npm run golden     # nach absichtlichen Regel-/KI-Änderungen: Referenzpartien neu erzeugen
    npm run balance    # KI-Selbstspiel mit Auswertung

Ablauf einer Änderung: Datei unter `src/` ändern, `npm run build`, `npm test`, committen (`src/` und `index.html` zusammen). Der Test `Verhalten unverändert` vergleicht 24 feste KI-Partien mit `tests/golden.json`: Bei einem reinen Umbau darf er sich nicht ändern, bei einer Regeländerung wird `golden.json` bewusst neu erzeugt.

Der Browser-Test (`tests/ui.test.js`) braucht Playwright mit Chromium und wird sonst übersprungen.
