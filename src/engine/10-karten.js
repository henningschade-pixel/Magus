/* Magus – Regelkern (Teil 1): Konstanten, Zufall, Karten, Decks.
   Der Regelkern ist eine reine Zustandsmaschine ohne Darstellung. Alle Regelprüfungen liegen hier,
   die Oberfläche und die KI senden nur Aktionen und lesen den Zustand. Regeln: docs/regelwerk.md */

const ELEMENTS = ['F', 'E', 'W'];
const SUPERIOR = { F: 'W', W: 'E', E: 'F' };     // überlegenes Element gegen X
const NAMES = { F: 'Feuer', E: 'Erde', W: 'Wasser' };
const START_DECK = ['F1','F1','F1','E1','E1','E1','W1','W1','W1'];
const MAX_MARKS = 3;                               // Fluchmarker (Fluchsystem „markers“)
const MAX_MAGIC = 3, MAX_SLOTS = 5, MIN_SLOTS = 3, MAX_LIMIT = 5;
const MAX_COMBAT_TURNS = 400;                      // Sicherung gegen Endlosschleifen, keine Spielregel

/* ---------- Zufall (deterministisch über den Seed) ---------- */
function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random: next,
    randint: (a, b) => a + Math.floor(next() * (b - a + 1)),
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    choice(arr) { return arr[Math.floor(next() * arr.length)]; },
  };
}

/* ---------- Hilfen ---------- */
function other(pid) { return 1 - pid; }
function fail(error) { return { ok: false, error }; }
function log(state, txt, pid, fx) { const e = { n: ++state.logN, txt, pid: pid === undefined ? null : pid }; if (fx) e.fx = fx; state.log.push(e); }

/* ---------- Karten ---------- */
// Karten-IDs: Element + Stufe („F2“), Fluchkarten „C1“ (nur im Fluchsystem „cards“).
function parseCard(id) {
  const raw = String(id || '').toUpperCase().trim();
  const el = raw[0];
  const tier = parseInt(raw.slice(1), 10) || 1;
  return { el, tier, curse: el === 'C' };
}
function mkCard(state, id) { return { id, uid: state.uid++, locked: false }; }

/* ---------- Deck (Zugstapel, Hand, Ablage) ---------- */
function newDeck(state, ids, slots) {
  const d = { draw: ids.map(i => mkCard(state, i)), hand: Array(slots).fill(null), discard: [], marks: [] };
  state.rng.shuffle(d.draw);
  fillHand(state, d);
  return d;
}
function fillHand(state, d) {
  for (let i = 0; i < d.hand.length; i++) {
    if (d.hand[i]) continue;
    if (!d.draw.length && d.discard.length) { d.draw = d.discard.splice(0); state.rng.shuffle(d.draw); }
    if (!d.draw.length) break;
    d.hand[i] = d.draw.pop();
  }
}
// Alles mischen und neu austeilen (Beginn eines Kampfes).
function dealFresh(state, d, slots) {
  const all = [...d.draw, ...d.hand.filter(Boolean), ...d.discard];
  all.forEach(c => { c.locked = false; });
  d.draw = all; d.discard = []; d.hand = Array(slots).fill(null); d.marks = [];
  state.rng.shuffle(d.draw);
  fillHand(state, d);
}
// Nachziehen: alle nicht gesperrten Handkarten ablegen, freie Plätze neu füllen.
// Fluchkarten, die schon auf der Hand liegen, werden dabei dauerhaft verworfen (sie kommen nicht auf den Ablagestapel); neu gezogene Fluchkarten bleiben auf der Hand.
function drawPhase(state, d) {
  d.marks = [];
  const old = [];   // Fluchkarten, die schon vor dem Nachziehen auf der Hand lagen: sie werden dauerhaft verworfen
  for (let i = 0; i < d.hand.length; i++) {
    const c = d.hand[i];
    if (!c) continue;
    if (parseCard(c.id).curse) { c.locked = false; old.push(c); d.hand[i] = null; }
    else if (!c.locked) { d.discard.push(c); d.hand[i] = null; }
  }
  // Fluchkarten liegen zunächst auf dem Ablagestapel der Gegenseite. Sie kommen erst auf die Hand, wenn der Zugstapel leer ist und der Ablagestapel in den Zugstapel gemischt wird (fillHand).
  const replaced = d.hand.some(c => !c);
  if (replaced) fillHand(state, d);   // frisch gezogene Fluchkarten bleiben auf der Hand und belegen einen Platz
  // die alten Fluchkarten sind damit endgültig aus dem Spiel (nicht auf dem Ablagestapel)
  return replaced || old.length > 0;
}
// Alle Fluchkarten aus Zugstapel, Hand und Ablage entfernen (Kampfende im Fluchsystem „deathcards“).
function stripCurseCards(state, d) {
  const keep = c => !parseCard(c.id).curse;
  d.draw = d.draw.filter(keep); d.discard = d.discard.filter(keep);
  d.hand = d.hand.map(c => (c && !keep(c) ? null : c)); d.marks = [];
  fillHand(state, d);
}
function removeFromHand(d, idx) { const c = d.hand[idx]; d.hand[idx] = null; d.marks = d.marks.filter(i => i !== idx); return c; }

/* ---------- Auswahl (markierte Handkarten) ---------- */
function selection(d) {
  return d.marks.filter(i => d.hand[i]).map(i => Object.assign({ slot: i, card: d.hand[i] }, parseCard(d.hand[i].id)));
}
function consumeSelection(d, sel) {
  sel.forEach(s => { const c = d.hand[s.slot]; if (c) c.locked = false; d.discard.push(c); d.hand[s.slot] = null; });   // eine gespielte Karte verliert ihre Sperre
  d.marks = [];
}
// Markieren ist durch das Ausspiellimit begrenzt (bei Limit 1 ersetzt die neue Markierung die alte).
function toggleMark(d, slot, limit, noCurse) {
  if (!d.hand[slot]) return 'Hier liegt keine Karte.';
  if (parseCard(d.hand[slot].id).curse && noCurse) return 'Fluchkarten lassen sich nicht ausspielen. Sie werden nur durch Nachziehen abgeworfen.';
  const at = d.marks.indexOf(slot);
  if (at >= 0) { d.marks.splice(at, 1); return null; }
  if (d.marks.length >= limit) {
    if (limit <= 1) { d.marks = [slot]; return null; }
    return 'Ausspiellimit erreicht (' + limit + ').';
  }
  d.marks.push(slot);
  return null;
}
function toggleLock(d, slot) {
  const c = d.hand[slot]; if (!c) return 'Hier liegt keine Karte.';
  if (d.marks.includes(slot)) return 'Markierte Karten lassen sich nicht sperren.';
  c.locked = !c.locked; return null;
}
