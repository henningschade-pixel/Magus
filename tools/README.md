# Werkzeuge

- `tools/build-single.js` – `node tools/build-single.js` erzeugt `dist/magus-single.html` (alle `assets/` als data:-URIs eingebettet; läuft per Doppelklick/`file://`).
- `tools/extract-assets.py` – einmalige Migration (Bilder/Sounds/Cursor aus index.html nach `assets/`), bereits ausgeführt.
- `tools/balance/` – KI-gegen-KI-Simulationen (`node tools/balance/report.js N '{regeln}'`).

Assets liegen in `assets/img`, `assets/audio`, `assets/cursor`. Das Spiel muss über http(s) laufen (GitHub Pages, lokaler Server), weil Sounds per `fetch` geladen werden.
