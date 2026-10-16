# Soundliste Magus

Alle Soundeffekte des Spiels: die fünf vorhandenen und die geplanten. Jeder Eintrag hat einen Dateinamen, den Moment im Spiel, die gewünschte Länge, eine Beschreibung und einen **fertigen Prompt für eine KI** (Englisch, weil Sound-Generatoren damit am besten arbeiten).

## Empfohlene Werkzeuge
- **ElevenLabs Sound Effects** (Text zu Sound, Länge einstellbar, gut bei Zaubern und Impact-Sounds). Mein Favorit für diese Liste.
- Alternativen: Stable Audio (Open), Meta AudioGen, MMAudio. Oder CC0-Material von freesound.org / Kenney.nl nach den Stichworten in der Spalte „Suche“.
- Bitte pro Sound **3 bis 4 Varianten** erzeugen und die beste behalten.

## Gemeinsame Vorgaben für alle Sounds
- **Format:** mp3, 44,1 kHz, mono reicht (kleiner), Ziel unter 60 KB je Datei.
- **Stil:** dunkle Fantasy, ein Duell zweier Magier. Handgemacht und organisch, kein Synthie-Pop, keine Musik, keine Stimme (außer wo angegeben), kein Hall-Schwanz über die angegebene Länge hinaus.
- **Beginn:** Der Sound muss sofort einsetzen (keine Stille am Anfang), damit er zur Animation passt. Am Ende kurz ausblenden.
- **Lautstärke:** alle auf ähnlichen Pegel normalisieren (etwa −16 LUFS); die Wichtigkeit regelt das Spiel über die Lautstärke (Ultimate am lautesten, Karten am leisten).
- **Dateinamen** genau wie unten, damit ich sie ohne Umbenennen einbinden kann. Ablage: `assets/audio/<name>.mp3`.
- **Farben:** Feuer = rot-orange, Erde = grün, Wasser = blau. Die drei Element-Sounds sollen als Familie erkennbar sein, aber klar unterscheidbar.

---

## A. Bereits vorhanden (ersetzen oder behalten)

| Datei | Moment | Länge heute |
|---|---|---|
| `flip` | Karte wird umgedreht oder gezogen | 1,0 s |
| `play` | Karte wird ausgespielt oder abgelegt | 0,6 s |
| `shuffle` | Deck wird gemischt (ab zwei gemischten Stapeln) | 2,6 s |
| `break` | Spiegel zerbricht, oder Marker wird entfernt (Läuterung, Todesmarker) | 1,8 s |
| `curse` | Todes-Fluch zehrt am Ende einer Angriffsphase HP | 1,0 s |

**flip** (≈ 0,5–1 s): Eine dicke Spielkarte wird kurz umgeblättert; leises Papierknistern mit einem Hauch Magie.
Prompt: *“A single thick playing card being flipped over on a wooden table, soft paper snap, very subtle magical shimmer, close microphone, 0.6 seconds.”*

**play** (≈ 0,4–0,6 s): Eine Karte wird auf den Tisch gelegt; kurzer, weicher Aufschlag.
Prompt: *“A playing card placed down firmly on a leather table pad, short soft thud with a tiny arcane chime, dry, 0.4 seconds.”*

**shuffle** (≈ 1,5–2,5 s): Ein Kartenstapel wird gemischt.
Prompt: *“A deck of tarot-sized cards being riffle-shuffled, crisp cardboard sound, slight echo of a stone room, 2 seconds.”*

**break** (≈ 1,5–2 s): Ein magischer Spiegel aus Kristall zerspringt in Scherben.
Prompt: *“A large magical crystal mirror shattering, sharp glass crack followed by tinkling shards falling, a faint magical release at the start, 1.8 seconds.”*

**curse** (≈ 1 s): Dunkler Fluch frisst Lebenskraft.
Prompt: *“A dark curse draining life force, low ominous whoosh with a whispering rasp and a short heartbeat-like throb, 1 second.”*

---

## B. Neu: Kampf

**atk_fire** (≈ 1–1,5 s) – Feuer-Angriff: Funken fliegen vom Angreifer zum Ziel.
Prompt: *“A fireball spell launched and impacting: whooshing flames, crackling embers, ending in a short fiery thud, 1.2 seconds.”* Suche: fireball cast, flame whoosh.

**atk_earth** (≈ 1–1,5 s) – Erd-Angriff.
Prompt: *“A boulder hurled by magic: grinding stones, rumbling rock, ending in a heavy earthy impact with falling pebbles, 1.2 seconds.”* Suche: rock throw, stone impact.

**atk_water** (≈ 1–1,5 s) – Wasser-Angriff.
Prompt: *“A water spell: a rushing wave of magical water whooshing and crashing into a target with a splashing impact, 1.2 seconds.”* Suche: water splash spell, wave whoosh.

**hit** (≈ 0,3–0,5 s) – Treffer: Ungeblockter Schaden erreicht die HP-Leiste.
Prompt: *“A short dull magical impact on a body, like a punch with a soft arcane crackle, 0.4 seconds.”*

**block** (≈ 0,5–0,8 s) – Verteidigung: Angriff wird abgeblockt.
Prompt: *“A magical ward absorbing an attack: a bright metallic-glassy clang with a short shimmering decay, 0.7 seconds.”* Suche: shield block, magic barrier.

**mirror_reflect** (≈ 0,8–1,2 s) – Der Spiegel wirft Schaden zurück (der Bruch ist `break`).
Prompt: *“A magical mirror reflecting a spell: a sharp ping like a bell on glass followed by a rising whoosh flying back, 1 second.”*

**recover** (≈ 0,6–1 s) – Erholen: Mana kehrt zurück.
Prompt: *“Calm magical energy flowing back into a person: a soft rising airy chime and gentle exhale, relaxing, 0.8 seconds.”*

---

## C. Neu: Kombos

**aggro** (≈ 1–1,5 s) – Flüche werden auf den Ablagestapel des Gegners gelegt.
Prompt: *“Cursed cards being thrown onto a pile: dark whispers, low growl and a papery slap with a sinister magical hiss, 1.2 seconds.”*

**ruin** (≈ 0,8–1,2 s) – Zerrüttung: Gegner muss Handkarten abwerfen.
Prompt: *“Cards being torn and scattered by a malevolent force: ripping paper with a distorted dissonant sting, 1 second.”*

**purify** (≈ 1–1,5 s) – Läuterung: Marker werden vom Brett entfernt.
Prompt: *“A purifying spell: soft glass chimes rising upward with a bright airy sparkle sweep, clean and holy, 1.2 seconds.”*

**heal** (≈ 1–1,5 s) – Heilung: HP werden aufgefüllt.
Prompt: *“A warm healing spell: a gentle harp glissando with a soft choir-like pad swelling slightly, comforting, 1.2 seconds.”*

**mirror_cast** (≈ 0,8–1,2 s) – Ein Spiegel wird aufgebaut (Wasser+Feuer / Wasser+Erde).
Prompt: *“A magical mirror materializing: a glassy sparkle that sweeps upward and settles with a quiet crystalline ring, 1 second.”*

**ultimate** (≈ 3–4 s) – Ultimate (alle drei Farben): Todes-Fluch. Der größte Sound im Spiel.
Prompt: *“An epic dark ultimate spell: a deep rising drone and swirling elemental whooshes of fire, earth and water converging, a huge booming impact and a sinister low choir-like tail, 3.5 seconds, cinematic.”* Suche: ultimate spell, dark magic cast.

---

## D. Neu: Kampfende und Spielverlauf

**monster_defeated** (≈ 1–1,5 s) – Monster besiegt.
Prompt: *“A monster dying: a guttural roar fading into a deflating dissolve with a short magical sparkle, 1.3 seconds.”*

**win** (≈ 2–3 s) – Kampf gewonnen (Ergebnis-Bildschirm „Sieg“).
Prompt: *“A short heroic victory fanfare with warm brass and a shimmer of bells, triumphant but dark-fantasy, 2.5 seconds.”*

**lose** (≈ 2–3 s) – Kampf verloren („Niederlage“).
Prompt: *“A short somber defeat sting with low strings and a fading dull chime, 2.5 seconds.”*

**draw** (≈ 1,5–2 s) – Unentschieden.
Prompt: *“A neutral, uncertain sting: two soft low notes with a hollow fading chime, 1.7 seconds.”*

**showdown_start** (≈ 2–3 s) – Showdown beginnt (Einblendung vor dem Duell).
Prompt: *“An ominous duel announcement: a deep gong with a rising tension swell and a distant war drum hit, 2.5 seconds.”*

**stage_start** (≈ 1,5–2 s) – Neuer Abschnitt, die Monster erscheinen.
Prompt: *“New monsters emerging: a low rumbling swell with eerie whispers and a distant growl, 1.8 seconds.”*

**game_win / game_lose** (≈ 4–5 s) – Spielende. Länger und feierlicher als `win` bzw. trauriger als `lose`.
Prompt win: *“A grand victory theme sting, heroic brass and choir with bells, 4.5 seconds.”* Prompt lose: *“A slow mournful ending sting with low strings and a final deep bell, 4.5 seconds.”*

**turn_change** (≈ 0,6–1 s) – Zugwechsel (die Linie läuft zur anderen Seite).
Prompt: *“A soft magical swoosh sweeping from one side to the other with a faint glassy shimmer, subtle, 0.8 seconds.”*

---

## E. Neu: Weltphase

**coin_sacrifice** (≈ 0,6–1 s) – Gold im Tempel opfern.
Prompt: *“Gold coins dropped into a stone offering bowl, bright metallic clinks with a faint temple bell tone, 0.8 seconds.”*

**temple_level** (≈ 1–1,5 s) – Tempelstufe steigt (Upgrade-Punkt gewonnen).
Prompt: *“A magical level-up: a rising bell arpeggio with a glowing sparkle, uplifting, 1.2 seconds.”*

**spend_upgrade** (≈ 0,4–0,7 s) – Upgrade-Punkt ausgeben (HP, Mana, Limit, Handplatz).
Prompt: *“A short satisfying magical power-up tick: a bright pluck with a tiny shimmer, 0.5 seconds.”*

**magic_buy** (≈ 1–1,5 s) – Magiestufe im Tempel kaufen.
Prompt: *“A magical power being gained by a wizard: rising swirling energy that locks in with a resonant chime, 1.2 seconds.”*

**vendor_upgrade** (≈ 0,8–1,2 s) – Händler wertet eine Karte auf.
Prompt: *“A card being enchanted at a merchant’s table: a smithing-like tap, a coin clink and a glittering sparkle, 1 second.”*

**ui_click** (≈ 0,1–0,2 s) – Knopfklick (Menü, Statistik, Pfeile).
Prompt: *“A very short subtle UI click on a stone tablet with a tiny wooden tick, 0.12 seconds.”*

---

## Priorität (wenn nicht alles auf einmal)
1. `atk_fire`, `atk_earth`, `atk_water`, `block`, `hit`, `ultimate`
2. `win`, `lose`, `draw`, `monster_defeated`, `showdown_start`
3. `heal`, `purify`, `aggro`, `ruin`, `mirror_cast`, `mirror_reflect`, `recover`
4. Weltphase und Rest (`coin_sacrifice`, `temple_level`, `spend_upgrade`, `vendor_upgrade`, `turn_change`, `stage_start`, `game_win`, `game_lose`, `ui_click`)

Wenn du die mp3-Dateien in `assets/audio/` ablegst (oder mir schickst), binde ich sie ein und stimme die Zeitpunkte auf die Animationen ab.

---

## Stand der Einbindung
- **Eingebunden (21 neue):** `atk_fire`, `atk_earth`, `atk_water`, `hit`, `block`, `mirror_reflect`, `mirror_cast`, `recover`, `aggro`, `ruin`, `purify`, `heal`, `ultimate`, `monster_defeated`, `win`, `lose`, `draw`, `showdown_start`, `stage_start`, `turn_change`, `game_win` und `game_lose` (Spielende).
- **Weltphase eingebunden:** `coin_sacrifice` und `temple_level` (beim Opfern, wenn ein Upgrade-Punkt entsteht), `spend_upgrade`, `vendor_upgrade`, `ui_click` (Menü-, Statistik-, Pfeil- und Schließen-Knöpfe). Gespielt werden sie bei eigenen Aktionen.
- **Noch offen:** nichts.
- Die fünf alten Sounds (`flip`, `play`, `shuffle`, `break`, `curse`) sind durch die neu erzeugten, aufbereiteten Versionen ersetzt (die alten stehen in der Git-Historie, Commit vor dem Austausch).
- Neue Roh-Dateien aufbereiten (mono, Stille vorn weg, Lautstärke angleichen): `tools/sounds-aufbereiten.sh <Quellordner> <Zielordner>`. Der Dateiname muss mit dem Sound-Namen beginnen, der Rest hinter `_(` wird ignoriert.
- Alle neuen Dateien sind nur etwa 1 Sekunde lang (der Generator lieferte jeweils 1,03 s), auch `ultimate`, das als 3 bis 4 Sekunden geplant war.

Hinweis: Frühere Fassung der Aufbereitung hatte einen Fehler (Sounds waren fast stumm). Behoben; `tests/audio.test.js` prüft jetzt, dass jede Sounddatei hörbar ist.

## Quellen (nicht KI-generiert)
- `ultimate`: „Ultimate Cinematic Dark Braam Whoosh 8“ von sdanezis (Dateiname deutet auf Pixabay, ID 607326; Pixabay-Lizenz, keine Namensnennung nötig). Aufbereitet: mono, Pegel gesenkt, 0,2 s ausgeblendet. Länge 3 Sekunden.
- `block`: eigene Version des Spielers (hochgeladen).
- `magic_lv2`, `magic_lv3`: „Level Up 02“ und „Level Up 03“ von mokasza (Dateinamen deuten auf freesound.org, IDs 810753 und 810755; bitte Lizenz auf der Seite prüfen, bei CC-BY Namensnennung ergänzen). Sie spielen, wenn eine Magierichtung auf Stufe 2 bzw. 3 steigt und ersetzen dort `magic_buy`.

Hinweis: `magic_buy` wurde entfernt (ersetzt durch `magic_lv2` und `magic_lv3`). Im Repo gelöschte Altlasten (Migrationsskripte, Spiellog der alten Regeln, Regelwerk v6) stehen weiter in der Git-Historie.
- `spend_upgrade` („upgrade.wav“, 0,3 s) und `coin_sacrifice` („coins.wav“, 0,8 s): eigene Dateien des Spielers. `spend_upgrade` spielt einmal je angewendetem Upgrade, `coin_sacrifice` beim Opfern von Gold. Das Aufbereitungsskript nimmt jetzt auch wav, ogg, m4a und flac.
