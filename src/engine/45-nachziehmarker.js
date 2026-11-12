/* ---------- Nachziehmarker ---------- */
// Seit 0.12 abgeschaltet (Regelschalter rules.drawMarker, Standard aus): Nachziehen ist vorerst eine uneingeschränkte Aktion.
// Die Mechanik bleibt hier gebündelt erhalten, damit sie sich über den Schalter wieder einschalten lässt.
// Aufrufer: applyCore (80-start.js) zählt den Marker nach jeder Aktion, drawManaCost/drawGoldPenalty liefern die Strafen an Kampf, Weltphase, KI und Oberfläche.
// Weitere Stellen, die den Marker lesen (alle hinter rules.drawMarker bzw. drawRed/drawN/drawLimit): engine/70-weltphase.js (Upgrade Nachziehlimit), engine/30-monster.js (Stufe „Ziehen“), ai/10-stellschrauben.js, ai/20-weltphase.js, ai/30-kampf.js, ui/15-karten.js (Anzeige), ui/17-weltphase.js, ui/30-eingaben.js (Warnabfrage drawAsk).
// Nachziehmarker (je Spieler, grün/rot): Nachziehen dreht ihn auf rot, jede andere Zugaktion zurück auf grün (Weltphase: Bibliothek, Kampf beginnen; Magie, Upgrades und Opfern sind keine Aktion); wer bei rotem Marker nachzieht, zahlt eine Strafe (Weltphase: der Gegner erhält drawPenaltyGold Gold; Kampf: der Nachziehende verliert drawPenaltyMana Mana, ohne Mana ist das Nachziehen nicht möglich). Markieren, Sperren, Läuterungswahl, das Gratis-Nachziehen (Token) und das Opfern im Tempel (seit 0.7.6.4) zählen nicht als Aktion.
function markerKind(state, a) {
  if (state.phase === 'world') return a.type === 'draw' ? 'draw' : ['vendor', 'combat'].includes(a.type) ? 'other' : null;   // Magie, Upgrades und Opfern sind seit 0.9.3 keine Aktion mehr und lassen den Marker unverändert
  if (state.phase === 'combat') return a.type === 'draw' ? 'draw' : ['attack', 'defend', 'pass', 'recover', 'flee'].includes(a.type) ? 'other' : null;
  return null;
}
// Wem gehört der Nachziehmarker, wenn pid handelt? Dem Spieler, im Monsterkampf aber für die Seite des Monsters dem Monster (Limit: seine Stufe ‚Ziehen‘ = stats.drawLimit). { h: Halter von drawN/drawRed, lim: Limit }
function markerOf(state, pid) {
  const c = state.phase === 'combat' ? state.combat : null;
  if (c && c.mode === 'monster' && c.sides.b.ctrl === pid) { const m = c.sides.b.monster; return { h: m, lim: m.stats.drawLimit || 1 }; }
  const p = state.players[pid];
  return { h: p, lim: p.stats.drawLimit || 1 };
}
function drawMarkerAfter(state, pid, kind, wasRed) {
  const p = state.players[pid], mk = markerOf(state, pid), h = mk.h;
  if (kind === 'other') { h.drawRed = false; h.drawN = 0; return; }
  h.drawN = Math.min((h.drawN || 0) + 1, mk.lim); h.drawRed = h.drawN >= mk.lim;   // Nachziehlimit: so viele Nachziehvorgänge hintereinander sind frei, danach springt der Marker auf Rot
  if (!wasRed) return;
  if (state.phase === 'combat' && state.combat) return;   // Kampf: die Strafe (drawPenaltyMana Mana) wird schon in der Aktion „Nachziehen“ bezahlt, der Gegner bekommt nichts
  const q = state.players[other(pid)];
  const g = drawPenaltyAmount(state, 'Gold');
  q.stats.gold += g; q.stats.goldGot += g;
  log(state, p.name + ' zog bei rotem Nachziehmarker nach: ' + q.name + ' erhält ' + g + ' Gold.', pid);
}
// Strafe für das Nachziehen bei rotem Marker (seit 0.7 nach der Spielstufe): Grundwert (drawPenaltyMana bzw. drawPenaltyGold) mal Abschnitt 1/2/3.
function drawPenaltyAmount(state, kind) { const base = kind === 'Mana' ? (state.rules.drawPenaltyMana ?? 1) : (state.rules.drawPenaltyGold || 0); return base * Math.max(1, Math.min(3, state.stage || 1)); }
// Kampf: Mana, das Nachziehen bei rotem Marker kostet (0, wenn der Marker grün ist oder die Regel fehlt).
function drawManaCost(state, pid) {
  if (!state.rules.drawMarker || state.phase !== 'combat') return 0;
  return markerOf(state, pid).h.drawRed ? drawPenaltyAmount(state, 'Mana') : 0;
}
// Weltphase: Gold, das der Gegner bekommt, wenn pid bei rotem Nachziehmarker nachzieht (0, wenn der Marker grün ist oder die Regel fehlt).
function drawGoldPenalty(state, pid) {
  if (!state.rules.drawMarker || state.phase !== 'world') return 0;
  return markerOf(state, pid).h.drawRed ? drawPenaltyAmount(state, 'Gold') : 0;
}
