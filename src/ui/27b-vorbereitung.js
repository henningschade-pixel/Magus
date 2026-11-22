/* ---------- Vorbereitung (seit 0.15) ---------- */
// Vor dem ersten Zug wählt jeder Spieler verdeckt eine Karte aus seinem ganzen Deck; ihre Farbe ist der erste, kostenlose Magiepunkt. Die Auswahl liegt im Vordergrund (wie die Hellsicht-Auswahl); der Gegner wählt gleichzeitig.
let prepSel = 0;   // uid der angewählten Karte
let prepWas = false;   // die Vorbereitung lief bis eben
// Während der Vorbereitung bleiben die Monsterkarten verdeckt; danach beginnt der Spielstart (Monster aufdecken und würfeln, mischen, austeilen).
function prepFlow() {
  if (G && G.phase === 'prep') { stage.dataset.hm = '0 1 2'; prepWas = true; }
  else if (prepWas) { prepWas = false; delete stage.dataset.hm; Intro.start(); }
}
function prepOverlayHTML() {
  if (!G || G.phase !== 'prep' || G.over || Intro.on || SPEC) { prepSel = 0; return ''; }
  if (G.prep[ME]) {
    const e = (G.players[ME].deck.draw.find(c => c.uid === G.prep[ME]) || {}).id;
    return '<div class="prepbox"><div class="preptitle">Vorbereitung</div><div class="prepsub">Deine Wahl liegt verdeckt' + (e ? ' (' + M.NAMES[e[0]] + ')' : '') + '. Warte auf ' + esc(G.players[OPP].name) + ' …</div></div>';
  }
  const cs = M.prepChoices(G, ME).slice().sort((a, b) => M.ELEMENTS.indexOf(a.id[0]) - M.ELEMENTS.indexOf(b.id[0]) || a.id.localeCompare(b.id) || a.uid - b.uid);
  if (!cs.some(c => c.uid === prepSel)) prepSel = 0;
  const cnt = M.ELEMENTS.map(e => M.NAMES[e] + ' ' + cs.filter(c => c.id[0] === e).length).join(' · ');
  let h = '<div class="prepbox"><div class="preptitle">Vorbereitung: Erste Magie wählen</div>' +
    '<div class="prepsub">Alle Magiestufen beginnen bei 0. Schau dir deine Karten an und lege eine verdeckt vor dich: Ihre Farbe beginnt kostenlos auf Stufe 1. Dein Gegner wählt gleichzeitig und verdeckt; danach werden beide Wahlen aufgedeckt, die Karten kommen zurück ins Deck, das neu gemischt wird. Dann werden die Monster aufgedeckt.</div>' +
    '<div class="prepcnt">Dein Deck: ' + cnt + '</div><div class="prepgrid">';
  cs.forEach((c, i) => { h += '<div class="prepcard' + (c.uid === prepSel ? ' on' : '') + '" data-act="prepsel" data-uid="' + c.uid + '"><img src="' + (IMG[c.id] || IMG.back) + '"></div>'; });
  return h + '</div><button class="btn primary prepok" data-act="prepok" ' + (prepSel ? '' : 'disabled') + '>' + (prepSel ? 'Verdeckt wählen' : 'Karte antippen') + '</button></div>';
}
function prepRender() {
  const html = prepOverlayHTML(); let o = document.getElementById('prepov');
  if (html && !o) { o = document.createElement('div'); o.id = 'prepov'; stage.appendChild(o); }
  if (o) { if (html) { if (o.dataset.k !== html) { o.innerHTML = html; o.dataset.k = html; } o.style.display = 'flex'; } else { o.style.display = 'none'; o.dataset.k = ''; } }
}
function prepClick(d) {
  if (d.act === 'prepsel') { prepSel = +d.uid === prepSel ? 0 : +d.uid; render(); }
  else if (d.act === 'prepok' && prepSel) { const u = prepSel; prepSel = 0; act({ type: 'prepPick', uid: u }); }
}
