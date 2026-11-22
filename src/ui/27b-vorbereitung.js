/* ---------- Vorbereitung (seit 0.15) ---------- */
// Vor dem ersten Zug wählt jeder Spieler verdeckt eine Karte aus seinem ganzen Deck; ihre Farbe ist der erste, kostenlose Magiepunkt. Die Auswahl liegt als Leiste am unteren Rand (Mausrad blättert durch das Deck), die Monster bleiben sichtbar; der Gegner wählt gleichzeitig.
let prepSel = 0;   // uid der angewählten Karte
let prepPos = -1;   // Mitte der Kartenreihe (Index, kann zwischen zwei Karten liegen)
let prepSnap = 0;
let prepWas = false;   // die Vorbereitung lief bis eben
// Die Monster sind zu Beginn schon ausgelost und aufgedeckt; das Würfeln gehört zur Monsterauslosung (Phase 1); nach der Kartenwahl folgen Mischen und Austeilen.
function prepFlow() {
  if (G && G.phase === 'prep') prepWas = true;
  else if (prepWas) { prepWas = false; Intro.start(true); }
}
function prepOverlayHTML() {
  if (!G || G.phase !== 'prep' || G.over || Intro.on || SPEC) { prepSel = 0; return ''; }
  if (G.prep[ME]) {
    const e = (G.players[ME].deck.draw.find(c => c.uid === G.prep[ME]) || {}).id;
    return '<div class="prepbox"><div class="prephead"><div class="preptitle">Vorbereitung</div><div class="prepsub">Deine Wahl liegt verdeckt' + (e ? ' (' + M.NAMES[e[0]] + ')' : '') + '. Warte auf ' + esc(G.players[OPP].name) + ' …</div></div></div>';
  }
  const cs = M.prepChoices(G, ME).slice();   // Reihenfolge wie ausgeteilt (gemischt), nicht nach Farbe sortiert
  if (!cs.some(c => c.uid === prepSel)) prepSel = 0;
  const cnt = M.ELEMENTS.map(e => M.NAMES[e] + ' ' + cs.filter(c => c.id[0] === e).length).join(' · ');
  let h = '<div class="prepbox"><div class="prephead"><div class="preptitle">Erste Magie wählen</div>' +
    '<div class="prepsub">Lege eine Karte verdeckt vor dich: Ihre Farbe beginnt kostenlos auf Stufe 1. Mausrad: Deck durchblättern.</div>' +
    '<div class="prepcnt">' + cnt + '</div><button class="btn primary prepok" data-act="prepok" ' + (prepSel ? '' : 'disabled') + '>' + (prepSel ? 'Verdeckt wählen' : 'Karte antippen') + '</button></div><div class="prepgrid">';
  cs.forEach((c, i) => { h += '<div class="prepcard' + (c.uid === prepSel ? ' on' : '') + '" data-act="prepsel" data-uid="' + c.uid + '"><img src="' + (IMG[c.id] || IMG.back) + '"></div>'; });
  return h + '</div></div>';
}
// Fächer: Die Karte in der Mitte steht vorn, links und rechts davon liegen die übrigen Karten überlappend dahinter.
function prepLayout() {
  const g = document.querySelector('#prepov .prepgrid'); if (!g) return;
  const cs = [].slice.call(g.querySelectorAll('.prepcard')), n = cs.length; if (!n) return;
  if (prepPos < 0) prepPos = Math.floor((n - 1) / 2);
  prepPos = Math.max(0, Math.min(n - 1, prepPos));
  const w = cs[0].offsetWidth || 100, gap = w * 0.38;
  cs.forEach((c, i) => {
    const d = i - prepPos, a = Math.abs(d), sc = Math.max(.72, 1 - a * .06), x = d * gap + (d === 0 ? 0 : Math.sign(d) * w * .32 * Math.min(1, a));
    c.style.transform = 'translateX(calc(-50% + ' + x.toFixed(1) + 'px)) scale(' + sc.toFixed(3) + ')';
    c.style.zIndex = String(1000 - Math.round(a * 10));
    c.style.filter = a < .5 ? 'none' : 'brightness(' + Math.max(.45, .8 - a * .06).toFixed(2) + ')';
  });
}
function prepScroll(dy) {
  prepPos += dy / 90; prepLayout();
  clearTimeout(prepSnap); prepSnap = setTimeout(() => { prepPos = Math.round(prepPos); prepLayout(); }, 140);
}
function prepRender() {
  const html = prepOverlayHTML(); let o = document.getElementById('prepov');
  if (html && !o) {
    o = document.createElement('div'); o.id = 'prepov'; stage.appendChild(o);
    o.addEventListener('wheel', e => { if (!o.querySelector('.prepgrid')) return; e.preventDefault(); prepScroll(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); }, { passive: false });   // Mausrad blättert durch das Deck
  }
  if (o) { if (html) { if (o.dataset.k !== html) { o.innerHTML = html; o.dataset.k = html; prepLayout(); } o.style.display = 'flex'; } else { o.style.display = 'none'; o.dataset.k = ''; } }
}
function prepClick(d) {
  if (d.act === 'prepsel') { prepSel = +d.uid === prepSel ? 0 : +d.uid; const el = document.querySelector('#prepov .prepcard[data-uid="' + d.uid + '"]'); if (el && el.parentNode) prepPos = [].indexOf.call(el.parentNode.children, el); render(); }
  else if (d.act === 'prepok' && prepSel) { const u = prepSel; prepSel = 0; act({ type: 'prepPick', uid: u }); }
}
