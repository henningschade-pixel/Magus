/* Magus – Regelkern (Teil 5): Händler.
   Der Händler arbeitet mit den markierten Handkarten (Auswahl, begrenzt durch das Ausspiellimit):
   - Gratiskarte (F1/E1/W1): immer möglich; sie verlangt keine Markierung und verbraucht weder Karten noch Markierungen.
   - Aufwertung: zwei gleiche markierte Karten ergeben die nächste Stufe, oder eine markierte Karte des überlegenen
     Elements ergibt die nächste Stufe des Elements. Die bezahlten Karten werden aus dem Deck entfernt, die gekaufte Karte kommt auf den Ablagestapel.
   Der Kauf beendet den Zug. */

// Alle Angebote zu einer Kartenmenge ([{slot, id}], ohne Flüche). ‚limit‘ begrenzt, wie viele Karten bezahlt werden können.
// Jedes Angebot nennt die Handplätze, die dafür markiert sein müssen (slots).
function vendorChoices(cards, limit) {
  const out = [], by = {};
  cards.forEach(c => { (by[c.id] = by[c.id] || []).push(c.slot); });
  ELEMENTS.forEach(e => out.push({ result: e + '1', cost: [], free: true, slots: [] }));
  for (const level of [2, 3]) for (const e of ELEMENTS) {
    const same = e + (level - 1), sup = SUPERIOR[e] + (level - 1);
    if ((by[same] || []).length >= 2 && limit >= 2) out.push({ result: e + level, cost: [same, same], free: false, slots: by[same].slice(0, 2) });
    if ((by[sup] || []).length >= 1) out.push({ result: e + level, cost: [sup], free: false, slots: by[sup].slice(0, 1) });
  }
  return out;
}
function handCards(d) { const out = []; d.hand.forEach((c, slot) => { if (c && !parseCard(c.id).curse) out.push({ slot, id: c.id }); }); return out; }
function markedCards(d) { return handCards(d).filter(c => d.marks.includes(c.slot)); }

// Für die Oberfläche: Angebote zur aktuellen Auswahl. ‚available‘: Gratiskarten sind immer verfügbar.
function vendorOffers(state, pid) {
  const p = state.players[pid], sel = markedCards(p.deck);
  return vendorChoices(sel, p.stats.limit).map(o => Object.assign(o, { available: true }));
}
// Für die KI: alle Angebote, die mit beliebigen Handkarten möglich wären (slots sagen, was dafür zu markieren ist).
function vendorPlans(state, pid) {
  const p = state.players[pid];
  return vendorChoices(handCards(p.deck), p.stats.limit);
}
function execVendor(state, pid, a) {
  const p = state.players[pid], d = p.deck;
  if (!campAllowed(state, pid, 'vendor')) return fail('Händler in der Erholungsphase schon genutzt.');
  const sel = markedCards(d);
  const want = JSON.stringify(a.cost || []);
  const opt = vendorChoices(sel, p.stats.limit).find(o => o.result === a.result && JSON.stringify(o.cost) === want);
  if (!opt) return fail(sel.length ? 'Mit den markierten Karten ist dieses Angebot nicht möglich.' : 'Markiere zuerst Karten aus deiner Hand.');
  if (!opt.free) opt.slots.forEach(i => { removeFromHand(d, i); });   // bezahlte Karten werden aus dem Deck entfernt; nur die gekaufte Karte kommt auf den Ablagestapel
  if (!opt.free) d.marks = [];
  d.discard.push(mkCard(state, opt.result));
  log(state, p.name + ' tauscht beim Händler' + (opt.cost.length ? ' ' + opt.cost.join(' + ') + ' gegen ' : ' und erhält ') + opt.result + '.', pid);
  endTurn(state, pid, 'vendor');
  return { ok: true };
}
