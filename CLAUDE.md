# Magus – Arbeitsregeln

Duellspiel für zwei Personen, gespielt im Browser: https://henningschade-pixel.github.io/Magus/
Will der Nutzer das Spiel starten, diese Adresse öffnen.

## Versionen und Branches

- Versionszählung: erste Stelle = volle Version, erste Nachkommastelle = großes Update, zweite = neue Sitzung innerhalb eines Updates, dritte = neuer Prompt innerhalb einer Sitzung (z. B. 0.13.1.2).
- Jeder Schritt bekommt einen Branch, der nur die Nummer trägt (`0.13.1`, kein Präfix).
- Keine parallelen Stände: Änderungen bauen immer auf dem neuesten Stand (`main`) auf.
- Nach jedem Schritt wird der Branch gepusht und `main` auf denselben Stand gebracht.

## Bei jedem Schritt

1. Quellen unter `src/` ändern. `index.html` wird gebaut und nie von Hand bearbeitet.
2. Versionsnummer und Versionsbeschreibung in `src/ui/01-versionen.js`: `MAGUS_VERSION` hochzählen und in `VERSIONEN` oben einen Eintrag `[Nummer, Text]` ergänzen.
3. `docs/regelwerk.md`: Abschnitt `## Änderung <Nummer> (TT.MM.)` vor dem bisher neuesten Eintrag einfügen (ein Test prüft, dass er da ist).
4. `npm run build`, dann `npm test` (158 Tests, rund zwei Minuten; die Browser-Tests brauchen Playwright mit Chromium und werden sonst übersprungen).
5. `src/` und `index.html` zusammen committen.

Der Test „Verhalten unverändert“ vergleicht 24 feste KI-Partien mit `tests/golden.json`. Bei einem reinen Umbau darf er sich nicht ändern. Nur nach einer gewollten Regel- oder KI-Änderung: `npm run golden`.

Werkstätten mit Code aus dem Spiel (`echo`, `kartendreh`, `runen`, `wuerfel`): nach Änderungen an ihren Bausteinen `npm run build:werkstatt`.

## Aufbau

- `src/manifest.json` legt die Reihenfolge fest, in der die Dateien zu `index.html` zusammengesetzt werden. Neue Dateien dort eintragen.
- `src/engine/` – Regelkern (läuft ohne Browser): Karten, Werte, Monster, Flüche, Nachziehmarker (abgeschaltet), Händler, Kampfberechnung, Kampfablauf (`61-kampfstart`, `62-kampfende`, `63-kampfeffekte`, `64-angriff`, `66-verteidigung`, `67-kampfaktionen`), Weltphase, Start.
- `src/ai/` – Computergegner: Stellschrauben, Weltphase, Kampfplan, Vorausschau.
- `src/ui/` – Oberfläche. Alle Dateien bilden einen gemeinsamen Funktionsblock (`00-start.js` öffnet ihn) und teilen sich dessen Variablen.
- `tests/` – einige Tests lesen Quelldateien unter ihrem Namen; beim Verschieben von Code die Dateilisten in `tests/engine.test.js` mitziehen.
- `tools/`, `werkstatt/`, `docs/` – siehe die jeweilige README bzw. `README.md`.

## Vorgaben zum Spiel

- Magus soll auch analog am Tisch spielbar sein. Regeln, die sich am Tisch kaum umsetzen lassen, kommen nicht ins Spiel.
- Abgeschaltete Regeln bleiben hinter ihrem Schalter in `DEFAULT_RULES` (`src/engine/80-start.js`) erhalten, solange sie nicht ausdrücklich gestrichen sind (z. B. Nachziehmarker `drawMarker`).
