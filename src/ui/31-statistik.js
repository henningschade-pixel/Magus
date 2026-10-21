/* ---------- Statistik: Verlaufskurven über die Züge (Messpunkte kommen aus G.hist der Engine) ---------- */
const ST_SERIES = [
  { k: 'sp', name: 'Siegpunkte', col: '#e0b84a' },
  { k: 'up', name: 'Upgrades (insgesamt)', col: '#c47fe0' },
  { k: 'lvl', name: 'Tempelstufe', col: '#e8e3d0' },
  { k: 'F', name: 'Magie Feuer', col: '#ff7a3d', chip: 'mag' },
  { k: 'E', name: 'Magie Erde', col: '#93c24f', chip: 'mag' },
  { k: 'W', name: 'Magie Wasser', col: '#52a6f5', chip: 'mag' },
  { k: 'slots', name: 'Handkarten', col: '#e58aa0' },
  { k: 'limit', name: 'Ausspiellimit', col: '#5fd0c4' },
  { k: 'hp', name: 'HP', col: '#ff5d6c' },
  { k: 'mana', name: 'Mana', col: '#6ea8ff' },
  { k: 'aF', name: 'Ø Karte Feuer', col: '#ffb48a', chip: 'avg', thin: true },
  { k: 'aE', name: 'Ø Karte Erde', col: '#c6e48f', chip: 'avg', thin: true },
  { k: 'aW', name: 'Ø Karte Wasser', col: '#9fd0ff', chip: 'avg', thin: true },
];
ST_SERIES.forEach(s => { s.chip = s.chip || s.k; });
// Filterknöpfe (immer genau ein Merkmal sichtbar): die drei Magierichtungen bzw. die drei Kartendurchschnitte teilen sich je einen Knopf, jede Farbe bleibt eine eigene Linie
const ST_CHIPS = [['sp', 'Siegpunkte', '#e0b84a'], ['up', 'Upgrades (insgesamt)', '#c47fe0'], ['lvl', 'Tempelstufe', '#e8e3d0'], ['mag', 'Magie (Feuer, Erde, Wasser)', '#ff7a3d'], ['avg', 'Ø Karten (Feuer, Erde, Wasser)', '#ffb48a'], ['slots', 'Handkarten', '#e58aa0'], ['limit', 'Ausspiellimit', '#5fd0c4'], ['hp', 'HP', '#ff5d6c'], ['mana', 'Mana', '#6ea8ff']];
const stOn = new Set(['sp']), stWho = { me: true, opp: true };
const stView = { auto: true, x0: 0, x1: 1, y0: 0, y1: 4 };   // sichtbarer Ausschnitt in Daten-Einheiten; auto = Ursprung links unten, Achsen dehnen sich mit dem Spiel
const ST = { W: 1000, T: 52, B: 40, L: 44, R: 16, PH: 330 };
function niceStep(span, n) { const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
function statsLimits() {   // Gesamtumfang der Daten: x 0..letzter Messpunkt, y 0..höchster sichtbarer Wert
  const H = G.hist || [], vals = [];
  ST_SERIES.forEach(s => { if (stOn.has(s.chip)) H.forEach(h => { if (stWho.me) vals.push(h.p[ME][s.k]); if (stWho.opp) vals.push(h.p[OPP][s.k]); }); });
  return { xmax: Math.max(1, H.length - 1), ymax: Math.max(4, Math.ceil(Math.max(0, ...vals) / 2) * 2) };
}
function statsFit(a, b, lo, hi, minSpan) { const span = Math.max(minSpan, Math.min(b - a, hi - lo)); a = Math.max(lo, Math.min(a, hi - span)); return [a, a + span]; }
function statsSvg() {
  const H = G.hist || [], N = H.length, { W, T, B, L, R, PH } = ST, ph = T + PH + B, pw = W - L - R, lim = statsLimits();
  if (stView.auto) { stView.x0 = 0; stView.x1 = lim.xmax; stView.y0 = 0; stView.y1 = lim.ymax; }
  else { [stView.x0, stView.x1] = statsFit(stView.x0, stView.x1, 0, lim.xmax, 3); [stView.y0, stView.y1] = statsFit(stView.y0, stView.y1, 0, lim.ymax, 1); }
  const { x0, x1, y0, y1 } = stView, xs = i => L + (i - x0) / (x1 - x0) * pw, ys = v => T + PH - (v - y0) / (y1 - y0) * PH;
  let svg = '<svg id="stsvg" viewBox="0 0 ' + W + ' ' + ph + '" width="' + W + '" height="' + ph + '" style="display:block;max-width:100%;touch-action:none;user-select:none"><defs><clipPath id="stclip"><rect x="' + L + '" y="' + (T - 40) + '" width="' + pw + '" height="' + (PH + 40) + '"/></clipPath></defs>';
  const ystep = niceStep(y1 - y0, 8), xstep = Math.max(1, niceStep(x1 - x0, 14));
  for (let g = Math.ceil(y0 / ystep) * ystep; g <= y1 + 1e-9; g += ystep) { const v = Math.round(g * 100) / 100; svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(v) + '" y2="' + ys(v) + '" stroke="rgba(255,255,255,' + (v === 0 ? .35 : .1) + ')"/><text x="' + (L - 8) + '" y="' + (ys(v) + 5) + '" text-anchor="end" fill="#9a97a6" font-size="14">' + v + '</text>'; }
  for (let g = Math.ceil(x0 / xstep) * xstep; g <= x1 + 1e-9; g += xstep) svg += '<text x="' + xs(g) + '" y="' + (T + PH + 22) + '" text-anchor="middle" fill="#9a97a6" font-size="14">' + Math.round(g) + '</text>';
  svg += '<text x="' + (L + pw / 2) + '" y="' + (ph - 4) + '" text-anchor="middle" fill="#9a97a6" font-size="14">Züge</text><g clip-path="url(#stclip)">';
  const inView = H.filter((h, i) => i >= x0 - 1 && i <= x1 + 1).length;
  H.forEach((h, i) => {   // Kampfereignisse als Zeichen am oberen Rand, mit Hilfslinie
    const e = h.ev; if (!e || i < x0 - 1 || i > x1 + 1) return;
    const x = xs(i), mine = e.winner === ME, res = e.winner === null ? 'ohne Sieger' : mine ? 'Sieg für dich' : 'Sieg für den Gegner';
    svg += '<line x1="' + x + '" x2="' + x + '" y1="' + (T - 8) + '" y2="' + (T + PH) + '" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 4"/>';
    const hit = e.trace ? ' data-act="stfight" data-i="' + i + '" style="cursor:pointer"' : '', tip = e.trace ? ' – anklicken für den Kampfverlauf' : '';   // Kampf anklicken: Verlauf des Kampfes
    if (e.type === 'showdown') svg += '<g' + hit + '><title>Showdown ' + e.n + ': ' + res + tip + '</title><text x="' + x + '" y="' + (T - 14) + '" text-anchor="middle" fill="#e0b84a" font-size="30">★</text><text x="' + x + '" y="' + (T + 4) + '" text-anchor="middle" fill="' + (e.winner === null ? '#9a97a6' : mine ? '#9be37a' : '#ff6b6b') + '" font-size="13">' + (e.winner === null ? '=' : mine ? 'Sieg' : 'Nied.') + '</text></g>';
    else svg += '<g' + hit + '><title>' + M.NAMES[e.elem] + 'monster Stufe ' + e.stage + ': ' + res + tip + '</title><circle cx="' + x + '" cy="' + (T - 12) + '" r="11" fill="' + ({ F: '#ff7a3d', E: '#93c24f', W: '#52a6f5' }[e.elem] || '#888') + '" stroke="#0a080e" stroke-width="2"/><text x="' + x + '" y="' + (T - 7) + '" text-anchor="middle" fill="#0a080e" font-size="15" font-weight="700">' + (e.winner === null ? '–' : mine ? '✓' : '✗') + '</text></g>';
  });
  ST_SERIES.forEach(s => {
    if (!stOn.has(s.chip)) return;
    [['me', ME, ''], ['opp', OPP, '7 5']].forEach(([key, seat, dash]) => {
      if (!stWho[key]) return;
      const pts = H.map((h, i) => xs(i).toFixed(1) + ',' + ys(h.p[seat][s.k]).toFixed(1));
      if (pts.length > 1) svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + s.col + '" stroke-width="' + (s.thin ? 1.8 : 3.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '" opacity=".75"' : '') + '/>';
      else if (pts.length === 1) { const q = pts[0].split(','); svg += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4" fill="' + s.col + '"/>'; }
      if (inView <= 60) H.forEach((h, i) => { if (i < x0 - 1 || i > x1 + 1) return; svg += '<circle cx="' + xs(i).toFixed(1) + '" cy="' + ys(h.p[seat][s.k]).toFixed(1) + '" r="3" fill="' + s.col + '"><title>' + s.name + ' (' + (key === 'me' ? 'du' : esc(G.players[OPP].name)) + ') nach Zug ' + i + ': ' + h.p[seat][s.k] + '</title></circle>'; });
    });
  });
  return svg + '</g></svg>';
}
function statsView() {
  const chip = (on, act, k, label, col) => '<button class="stchip' + (on ? ' on' : '') + '" data-act="' + act + '" data-k="' + k + '"' + (col ? ' style="--c:' + col + '"' : '') + '>' + (col ? '<i></i>' : '') + label + '</button>';
  return '<div class="box stats"><div class="sthead"><h1>Statistik</h1><div><button class="btn" data-act="stfit" title="Achsen wieder automatisch anpassen (Doppelklick ins Diagramm)">Ansicht zurücksetzen</button> <button class="btn" data-act="stclose">Schließen</button></div></div>' +
    '<div class="stchips">' + chip(stWho.me, 'stwho', 'me', 'Du (durchgezogen)') + chip(stWho.opp, 'stwho', 'opp', esc(G.players[OPP].name) + ' (gestrichelt)') + '</div>' +
    '<div class="stchips">' + ST_CHIPS.map(c => chip(stOn.has(c[0]), 'stser', c[0], c[1], c[2])).join('') + '</div><div id="stplot">' + statsSvg() + '</div>' +
    '<div class="note stkey"><span style="color:#e0b84a">★</span> Showdown · <b>●</b> Monsterkampf in der Farbe des Monsters (✓ du gewinnst, ✗ Gegner gewinnt, – ohne Sieger) · <b>Kampf anklicken</b>: Verlauf des Kampfes · dicke Linien: Magiestufe, dünne hellere: Ø Kartenstufe der Farbe · Mausrad: zoomen (über den Achsen nur diese Achse) · ziehen: Ausschnitt verschieben</div></div>';
}
function statsRedraw() { const el = document.getElementById('stplot'); if (el) el.innerHTML = statsSvg(); }
function statsFitView() { stView.auto = true; statsRedraw(); }
// Zoomen und Verschieben (Ereignisse am Overlay, nur solange die Statistik offen ist)
function statsPos(e) { const r = document.getElementById('stsvg').getBoundingClientRect(), k = ST.W / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k }; }
overlay.addEventListener('wheel', e => {
  const sv = document.getElementById('stsvg'); if (!sv || !sv.contains(e.target)) return;
  e.preventDefault();
  const q = statsPos(e), { L, R, T, PH, W } = ST, pw = W - L - R, f = e.deltaY < 0 ? 0.8 : 1.25, lim = statsLimits();
  const onX = q.y > T + PH, onY = q.x < L;
  if (stView.auto) stView.auto = false;
  if (!onY) { const c = stView.x0 + (Math.min(Math.max(q.x, L), W - R) - L) / pw * (stView.x1 - stView.x0); stView.x0 = c - (c - stView.x0) * f; stView.x1 = c + (stView.x1 - c) * f; }
  if (!onX) { const c = stView.y0 + (T + PH - Math.min(Math.max(q.y, T), T + PH)) / PH * (stView.y1 - stView.y0); stView.y0 = c - (c - stView.y0) * f; stView.y1 = c + (stView.y1 - c) * f; }
  statsRedraw();
}, { passive: false });
let stDrag = null;
overlay.addEventListener('pointerdown', e => { const sv = document.getElementById('stsvg'); if (!sv || !sv.contains(e.target) || e.button !== 0 || e.target.closest('[data-act="stfight"]')) return; const q = statsPos(e); stDrag = { x: e.clientX, y: e.clientY, k: q.k, v: Object.assign({}, stView) }; try { sv.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } });
overlay.addEventListener('pointermove', e => {
  if (!stDrag) return;
  const { L, R, PH, W } = ST, pw = W - L - R, dx = (e.clientX - stDrag.x) * stDrag.k, dy = (e.clientY - stDrag.y) * stDrag.k, v = stDrag.v;
  if (Math.abs(dx) + Math.abs(dy) < 3 && stView.auto) return;
  stView.auto = false; stView.x0 = v.x0 - dx / pw * (v.x1 - v.x0); stView.x1 = v.x1 - dx / pw * (v.x1 - v.x0); stView.y0 = v.y0 + dy / PH * (v.y1 - v.y0); stView.y1 = v.y1 + dy / PH * (v.y1 - v.y0);
  statsRedraw();
});
const stDragEnd = () => { stDrag = null; };
overlay.addEventListener('pointerup', stDragEnd); overlay.addEventListener('pointercancel', stDragEnd);
overlay.addEventListener('dblclick', e => { const sv = document.getElementById('stsvg'); if (sv && sv.contains(e.target)) statsFitView(); });
let stFromMenu = false, stFromEnd = false;   // woher die Statistik geöffnet wurde: Menü oder Endbildschirm (dorthin geht „Zurück“)
function statsOpen(fromMenu) {
  if (!G || !started || (overlay.style.display === 'flex' && !fromMenu)) return;
  stFromMenu = !!fromMenu;
  clearTimeout(aiTimer);   // das Spiel pausiert, solange die Statistik offen ist
  stView.auto = true; overlay.style.display = 'flex'; overlay.className = 'overlay soft'; overlay.innerHTML = statsView();
}
function statsToggle(act, k) {
  if (act === 'stwho') { stWho[k] = !stWho[k]; if (!stWho.me && !stWho.opp) stWho[k === 'me' ? 'opp' : 'me'] = true; }
  else { stOn.clear(); stOn.add(k); }
  overlay.innerHTML = statsView();
}

// Verlauf eines einzelnen Kampfes (HP und Mana beider Seiten nach jedem Schritt, Angriffe und Verteidigungen als Zeichen)
function fightView(i) {
  const h = (G.hist || [])[i], e = h && h.ev, tr = e && e.trace;
  if (!tr) return statsView();
  const lab = k => tr.monster && k === 1 ? tr.names[1] : tr.ids[k] === ME ? 'Du' : tr.names[k], st = tr.steps, n = Math.max(1, st.length - 1);
  const { W, T, B, L, R, PH } = ST, ph = T + PH + B, pw = W - L - R, ymax = Math.max(4, ...st.map(x => Math.max(x.hp[0], x.hp[1], x.mana[0], x.mana[1])));
  const xs = t => L + t / n * pw, ys = v => T + PH - v / ymax * PH;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + ph + '" width="' + W + '" height="' + ph + '" style="display:block;max-width:100%">';
  const ystep = niceStep(ymax, 8), xstep = Math.max(1, niceStep(n, 14));
  for (let g = 0; g <= ymax + 1e-9; g += ystep) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(g) + '" y2="' + ys(g) + '" stroke="rgba(255,255,255,' + (g === 0 ? .35 : .1) + ')"/><text x="' + (L - 8) + '" y="' + (ys(g) + 5) + '" text-anchor="end" fill="#9a97a6" font-size="14">' + g + '</text>';
  for (let g = 0; g <= n + 1e-9; g += xstep) svg += '<text x="' + xs(g) + '" y="' + (T + PH + 22) + '" text-anchor="middle" fill="#9a97a6" font-size="14">' + g + '</text>';
  svg += '<text x="' + (L + pw / 2) + '" y="' + (ph - 4) + '" text-anchor="middle" fill="#9a97a6" font-size="14">Schritte im Kampf</text>';
  st.forEach(x => {   // Kopfzeile: wer greift an (▲ Schaden) oder verteidigt (◆ Block)
    if (x.k === 'R') return; const c = x.who === 0 ? '#ffd27a' : '#9fd0ff';
    svg += '<text x="' + xs(x.t) + '" y="' + (T - 10) + '" text-anchor="middle" fill="' + c + '" font-size="15" font-weight="700"><title>' + lab(x.who) + (x.k === 'A' ? ' greift an: Schaden ' + x.v : ' verteidigt: Block ' + x.v + ' gegen ' + x.b + ', ' + x.left + ' gehen durch') + '</title>' + (x.k === 'A' ? '▲' + x.v : '◆' + x.v) + '</text>';
  });
  [['hp', 0, '#ff5d6c', '', 'HP'], ['hp', 1, '#ff5d6c', '7 5', 'HP'], ['mana', 0, '#6ea8ff', '', 'Mana'], ['mana', 1, '#6ea8ff', '7 5', 'Mana']].forEach(([k, side, col, dash, nm]) => {
    svg += '<polyline points="' + st.map(x => xs(x.t).toFixed(1) + ',' + ys(x[k][side]).toFixed(1)).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="3.4" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '" opacity=".75"' : '') + '/>';
    if (st.length <= 70) st.forEach(x => { svg += '<circle cx="' + xs(x.t).toFixed(1) + '" cy="' + ys(x[k][side]).toFixed(1) + '" r="3" fill="' + col + '"><title>' + nm + ' ' + lab(side) + ' nach Schritt ' + x.t + ': ' + x[k][side] + '</title></circle>'; });
  });
  svg += '</svg>';
  const sum = side => {
    const at = st.filter(x => x.k === 'A' && x.who === side), df = st.filter(x => x.k === 'V' && x.who === side), last = st[st.length - 1];
    return '<div><b>' + esc(lab(side)) + '</b>: ' + at.length + ' Angriff' + (at.length === 1 ? '' : 'e') + ' (Schaden ' + at.reduce((a, x) => a + x.v, 0) + ') · ' + df.length + ' Verteidigung' + (df.length === 1 ? '' : 'en') + ' (geblockt ' + df.reduce((a, x) => a + Math.min(x.v, x.b), 0) + ' von ' + df.reduce((a, x) => a + x.b, 0) + ', durchgegangen ' + df.reduce((a, x) => a + x.left, 0) + ') · am Ende ' + last.hp[side] + ' HP, ' + last.mana[side] + ' Mana</div>';
  };
  const res = e.winner === null ? 'ohne Sieger' : (e.winner === ME ? 'Sieg für dich' : 'Sieg für ' + esc(G.players[e.winner].name));
  const title = e.type === 'showdown' ? 'Showdown ' + e.n : M.NAMES[e.elem] + 'monster Stufe ' + e.stage;
  return '<div class="box stats"><div class="sthead"><h1>' + title + '</h1><div><button class="btn" data-act="stfightback">Zurück zur Statistik</button> <button class="btn" data-act="stclose">Schließen</button></div></div>' +
    '<div class="note" style="margin:4px 0 8px">' + res + ' · ' + (st.length - 1) + ' Schritte · Spielzug ' + i + ' der Partie</div><div id="stplot">' + svg + '</div>' +
    '<div class="note stkey">' + sum(0) + sum(1) + '<div style="margin-top:6px">Rot: HP, Blau: Mana (durchgezogen: ' + esc(lab(0)) + ', gestrichelt: ' + esc(lab(1)) + ') · ▲ Angriff mit Schaden, ◆ Verteidigung mit Block</div></div></div>';
}
