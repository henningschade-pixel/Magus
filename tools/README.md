# Werkzeuge

- `tools/build-single.js` – `node tools/build-single.js` erzeugt `dist/magus-single.html` (alle `assets/` als data:-URIs eingebettet; läuft per Doppelklick/`file://`).
- `tools/build.js` – baut `index.html` aus `src/` (`--check` prüft nur).
- `tools/split-source.js` und `tools/extract-assets.py` – einmalige Migrationen (Quellen nach `src/`, Bilder/Sounds/Cursor nach `assets/`), bereits ausgeführt.
- `tools/balance/` – KI-gegen-KI-Simulationen (`node tools/balance/report.js N '{regeln}'`).

Assets liegen in `assets/img`, `assets/audio`, `assets/cursor`. Das Spiel muss über http(s) laufen (GitHub Pages, lokaler Server), weil Sounds per `fetch` geladen werden.
