/* Magus – Regelkern (Teil 7b): Vorbereitung (seit 0.15).
   Die Spieler beginnen ohne Magie (alle drei Stufen 0). Vor dem ersten Zug liegt die Vorbereitung: Die Monster sind aufgedeckt und die Spielerdecks erzeugt, noch ist keine Hand gezogen.
   Beide Spieler wählen gleichzeitig und verdeckt EINE Karte aus ihrem ganzen Deck. Die Karte kommt auf den Ablagestapel, ihre Farbe ist der erste, kostenlose Magiepunkt (Stufe 1 in dieser Farbe).
   Erst wenn beide gewählt haben, wird aufgedeckt; danach werden die Starthände gezogen und der erste Zug beginnt. Magie kaufen ist weiterhin offen (in den eigenen Zügen, 1, 2, 3 … Gold); der Gratispunkt zählt dabei nicht mit.
   state.prep[pid] = uid der gewählten Karte (null = noch nicht gewählt); Aktion { pid, type: 'prepPick', uid }. Wer zuerst fragt, ist egal: die Reihenfolge der beiden Wahlen ändert nichts am Ergebnis. */
function startPrep(state) {
  state.players.forEach(p => {   // die Starthand geht zurück in den Stapel: gewählt wird aus dem ganzen Deck
    const d = p.deck;
    d.hand.forEach((c, i) => { if (c) { d.draw.push(c); d.hand[i] = null; } });
    state.rng.shuffle(d.draw);
  });
  state.phase = 'prep';
  state.prep = [null, null];
  log(state, 'Vorbereitung: Beide Spieler wählen gleichzeitig und verdeckt eine Karte aus ihrem Deck. Ihre Farbe wird der erste, kostenlose Magiepunkt.');
}
// Karten, aus denen pid wählen kann (das ganze Deck vor dem ersten Ziehen)
function prepChoices(state, pid) { const d = state.players[pid].deck; return [].concat(d.draw, d.discard, d.hand.filter(Boolean)); }
function applyPrep(state, a) {
  if (a.type !== 'prepPick') return fail('In der Vorbereitung wählt man eine Karte.');
  const pid = a.pid;
  if (pid !== 0 && pid !== 1) return fail('Unbekannter Spieler.');
  if (state.prep[pid]) return fail('Du hast schon gewählt.');
  const c = prepChoices(state, pid).find(x => x.uid === a.uid);
  if (!c) return fail('Diese Karte gibt es in deinem Deck nicht.');
  state.prep[pid] = c.uid;
  if (state.prep[0] && state.prep[1]) finishPrep(state);
  return { ok: true };
}
function finishPrep(state) {
  const picks = state.players.map((p, pid) => {
    const d = p.deck, i = d.draw.findIndex(x => x.uid === state.prep[pid]), c = d.draw.splice(i, 1)[0];
    d.discard.push(c);
    const e = c.id[0];
    p.stats.mag[e] = Math.max(p.stats.mag[e], 1);
    return e;
  });
  state.players.forEach((p, pid) => log(state, p.name + ' wählt ' + NAMES[picks[pid]] + ': ' + NAMES[picks[pid]] + ' beginnt auf Stufe 1.', pid));
  state.prepPicks = picks;
  state.players.forEach(p => fillHand(state, p.deck));
  state.phase = 'world';
  sample(state);
}
