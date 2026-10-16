# Werkzeuge

- `tools/build-single.js` – `node tools/build-single.js` erzeugt `dist/magus-single.html` (alle `assets/` als data:-URIs eingebettet; läuft per Doppelklick/`file://`).
- `tools/build.js` – baut `index.html` aus `src/` (`--check` prüft nur).
- `tools/sounds-aufbereiten.sh` – bereitet neue Sounds auf (mono, Stille vorn weg, Pegel angleichen), siehe `docs/soundliste.md`.
- `tools/sounds-synth.py` – synthetisiert `ultimate` und `curse` (siehe `docs/soundliste.md`).
- `tools/build-werkstatt.js` – baut `dist/ton-werkstatt.html` (Ton-Werkstatt mit allen Sounds eingebettet).
- `tools/ton-rendern.js` – rendert ein Rezept der Ton-Werkstatt zu mp3 (Playwright, Pegel wie bei den anderen Sounds).
- `tools/balance/ – KI-gegen-KI-Simulationen (`node tools/balance/report.js N '{regeln}'`).

Assets liegen in `assets/img`, `assets/audio`, `assets/cursor`. Das Spiel muss über http(s) laufen (GitHub Pages, lokaler Server), weil Sounds per `fetch` geladen werden.
