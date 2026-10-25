/* Magus – Regelkern (Teil 5): Bibliothek.
   Die Bibliothek arbeitet mit den markierten Handkarten (Auswahl, begrenzt durch das Ausspiellimit):
   - Gratiskarte (F1/E1/W1): immer möglich; sie verlangt keine Markierung und verbraucht weder Karten noch Markierungen.
   - Aufwertung: zwei gleiche markierte Karten ergeben die nächste Stufe, oder eine markierte Karte des überlegenen
     Elements ergibt die nächste Stufe des Elements. Die bezahlten Karten werden aus dem Deck entfernt, die gekaufte Karte kommt auf den Ablagestapel.
   Der Kauf beendet den Zug. */

// Alle Angebote zu einer Kartenmenge ([{slot, id}], ohne Flüche). ‚limit‘ begrenzt, wie viele Karten bezahlt werden können.
// Jedes Angebot nennt die Handplätze, die dafür markiert sein müssen (slots).
function vendorChoices(cards, limit) {   // (der Vorrat wird in vendorOffers/-Plans/execVendor geprüft)
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

// Vorrat: Wie viele Karten der Art im Vorrat der Bibliothek sind (ohne Begrenzung: unendlich).
function stockOf(state, id) { return state.supply ? (state.supply[id] || 0) : Infinity; }
// Für die Oberfläche: Angebote zur aktuellen Auswahl. ‚available‘: false, wenn die Karte vergriffen ist; ‚stock‘: Restbestand.
// Freischaltung: Eine Karte der Stufe t im Element e darf nur erwerben, wer die Magie e auf Stufe t hat.
function unlocked(p, id) { const c = parseCard(id); return (p.stats.mag[c.el] || 0) >= c.tier; }
function vendorOffers(state, pid) {
  const p = state.players[pid], sel = markedCards(p.deck);
  return vendorChoices(sel, p.stats.limit).map(o => Object.assign(o, { stock: stockOf(state, o.result), unlocked: unlocked(p, o.result), available: stockOf(state, o.result) > 0 && unlocked(p, o.result) }));
}
// Für die KI: alle Angebote, die mit beliebigen Handkarten möglich wären (slots sagen, was dafür zu markieren ist).
function vendorPlans(state, pid) {
  const p = state.players[pid];
  return vendorChoices(handCards(p.deck), p.stats.limit).filter(o => stockOf(state, o.result) > 0 && unlocked(p, o.result));
}
function execVendor(state, pid, a) {
  const p = state.players[pid], d = p.deck;
  const sel = markedCards(d);
  const want = JSON.stringify(a.cost || []);
  const opt = vendorChoices(sel, p.stats.limit).find(o => o.result === a.result && JSON.stringify(o.cost) === want);
  if (!opt) return fail(sel.length ? 'Mit den markierten Karten ist dieses Angebot nicht möglich.' : 'Markiere zuerst Karten aus deiner Hand.');
  if (stockOf(state, opt.result) <= 0) return fail(opt.result + ' ist vergriffen.');
  if (!unlocked(p, opt.result)) return fail(opt.result + ' ist noch nicht freigeschaltet: Du brauchst die Magie ' + NAMES[opt.result[0]] + ' auf Stufe ' + opt.result[1] + '.');
  if (!opt.free) opt.slots.forEach(i => { removeFromHand(d, i); });   // bezahlte Karten werden aus dem Deck entfernt; nur die gekaufte Karte kommt auf den Ablagestapel
  if (!opt.free) d.marks = [];
  if (state.supply) { opt.cost.forEach(id => { state.supply[id]++; }); state.supply[opt.result]--; }   // bezahlte Karten gehen zurück in den Vorrat, die gekaufte kommt heraus
  d.discard.push(mkCard(state, opt.result));
  log(state, p.name + ' tauscht in der Bibliothek' + (opt.cost.length ? ' ' + opt.cost.join(' + ') + ' gegen ' : ' und erhält ') + opt.result + '.', pid);
  endTurn(state, pid, 'vendor');
  return { ok: true };
}
