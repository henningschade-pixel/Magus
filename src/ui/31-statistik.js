/* ---------- Statistik: Verlaufskurven über die Züge (Messpunkte kommen aus G.hist der Engine) ---------- */
const ST_SERIES = [
  { k: 'gold', name: 'Gold (insgesamt)', col: '#e0b84a' },
  { k: 'up', name: 'Upgrades (insgesamt)', col: '#c47fe0' },
  { k: 'lvl', name: 'Tempelstufe', col: '#e8e3d0' },
  { k: 'F', name: 'Magie Feuer', col: '#ff7a3d' },
  { k: 'E', name: 'Magie Erde', col: '#93c24f' },
  { k: 'W', name: 'Magie Wasser', col: '#52a6f5' },
  { k: 'slots', name: 'Handkarten', col: '#e58aa0' },
  { k: 'limit', name: 'Ausspiellimit', col: '#5fd0c4' },
];
const stOn = new Set(['gold', 'up', 'lvl']), stWho = { me: true, opp: true };
function statsView() {
  const H = G.hist || [], N = H.length, W = 1000, T = 52, B = 40, L = 44, R = 16, PH = 330, ph = T + PH + B, pw = W - L - R;
  const xs = i => L + (N < 2 ? pw / 2 : i / (N - 1) * pw);
  const vals = [];
  ST_SERIES.forEach(s => { if (stOn.has(s.k)) H.forEach(h => { if (stWho.me) vals.push(h.p[ME][s.k]); if (stWho.opp) vals.push(h.p[OPP][s.k]); }); });
  const top = Math.max(4, Math.ceil(Math.max(0, ...vals) / 2) * 2), ys = v => T + PH - v / top * PH;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + ph + '" width="' + W + '" height="' + ph + '" style="display:block;max-width:100%">';
  for (let g = 0; g <= top; g += top <= 10 ? 1 : 2) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(g) + '" y2="' + ys(g) + '" stroke="rgba(255,255,255,.1)"/><text x="' + (L - 8) + '" y="' + (ys(g) + 5) + '" text-anchor="end" fill="#9a97a6" font-size="14">' + g + '</text>';
  const step = Math.max(1, Math.ceil(N / 16));
  for (let i = 0; i < N; i += step) svg += '<text x="' + xs(i) + '" y="' + (T + PH + 22) + '" text-anchor="middle" fill="#9a97a6" font-size="14">' + i + '</text>';
  svg += '<text x="' + (L + pw / 2) + '" y="' + (ph - 4) + '" text-anchor="middle" fill="#9a97a6" font-size="14">Züge</text>';
  H.forEach((h, i) => {   // Kampfereignisse als Zeichen am oberen Rand, mit Hilfslinie
    const e = h.ev; if (!e) return;
    const x = xs(i), mine = e.winner === ME, res = e.winner === null ? 'ohne Sieger' : mine ? 'Sieg für dich' : 'Sieg für den Gegner';
    svg += '<line x1="' + x + '" x2="' + x + '" y1="' + (T - 8) + '" y2="' + (T + PH) + '" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 4"/>';
    if (e.type === 'showdown') svg += '<g><title>Showdown ' + e.n + ': ' + res + '</title><text x="' + x + '" y="' + (T - 14) + '" text-anchor="middle" fill="#e0b84a" font-size="30">★</text><text x="' + x + '" y="' + (T + 4) + '" text-anchor="middle" fill="' + (e.winner === null ? '#9a97a6' : mine ? '#9be37a' : '#ff6b6b') + '" font-size="13">' + (e.winner === null ? '=' : mine ? 'Sieg' : 'Nied.') + '</text></g>';
    else svg += '<g><title>' + M.NAMES[e.elem] + 'monster Stufe ' + e.stage + ': ' + res + '</title><circle cx="' + x + '" cy="' + (T - 12) + '" r="11" fill="' + ({ F: '#ff7a3d', E: '#93c24f', W: '#52a6f5' }[e.elem] || '#888') + '" stroke="#0a080e" stroke-width="2"/><text x="' + x + '" y="' + (T - 7) + '" text-anchor="middle" fill="#0a080e" font-size="15" font-weight="700">' + (e.winner === null ? '–' : mine ? '✓' : '✗') + '</text></g>';
  });
  ST_SERIES.forEach(s => {
    if (!stOn.has(s.k)) return;
    [['me', ME, ''], ['opp', OPP, '7 5']].forEach(([key, seat, dash]) => {
      if (!stWho[key]) return;
      const pts = H.map((h, i) => xs(i).toFixed(1) + ',' + ys(h.p[seat][s.k]).toFixed(1));
      if (pts.length > 1) svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + s.col + '" stroke-width="3" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '" opacity=".75"' : '') + '/>';
      else if (pts.length === 1) { const q = pts[0].split(','); svg += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4" fill="' + s.col + '"/>'; }
      H.forEach((h, i) => { svg += '<circle cx="' + xs(i).toFixed(1) + '" cy="' + ys(h.p[seat][s.k]).toFixed(1) + '" r="' + (N > 60 ? 0 : 3) + '" fill="' + s.col + '"><title>' + s.name + ' (' + (key === 'me' ? 'du' : esc(G.players[OPP].name)) + ') nach Zug ' + i + ': ' + h.p[seat][s.k] + '</title></circle>'; });
    });
  });
  svg += '</svg>';
  const chip = (on, act, k, label, col) => '<button class="stchip' + (on ? ' on' : '') + '" data-act="' + act + '" data-k="' + k + '"' + (col ? ' style="--c:' + col + '"' : '') + '>' + (col ? '<i></i>' : '') + label + '</button>';
  return '<div class="box stats"><div class="sthead"><h1>Statistik</h1><button class="btn" data-act="stclose">Schließen</button></div>' +
    '<div class="stchips">' + chip(stWho.me, 'stwho', 'me', 'Du (durchgezogen)') + chip(stWho.opp, 'stwho', 'opp', esc(G.players[OPP].name) + ' (gestrichelt)') + '</div>' +
    '<div class="stchips">' + ST_SERIES.map(s => chip(stOn.has(s.k), 'stser', s.k, s.name, s.col)).join('') + '</div>' + svg +
    '<div class="note stkey"><span style="color:#e0b84a">★</span> Showdown · <b>●</b> Monsterkampf in der Farbe des Monsters (✓ du gewinnst, ✗ Gegner gewinnt, – ohne Sieger) · x-Achse: Messpunkte nach jedem Zug und jedem Kampf</div></div>';
}
function statsOpen() {
  if (!G || !started || overlay.style.display === 'flex') return;
  clearTimeout(aiTimer);   // das Spiel pausiert, solange die Statistik offen ist
  overlay.style.display = 'flex'; overlay.innerHTML = statsView();
}
function statsToggle(act, k) {
  if (act === 'stwho') { stWho[k] = !stWho[k]; if (!stWho.me && !stWho.opp) stWho[k === 'me' ? 'opp' : 'me'] = true; }
  else if (stOn.has(k)) { if (stOn.size > 1) stOn.delete(k); } else stOn.add(k);
  overlay.innerHTML = statsView();
}
const statBtn = document.createElement('button');
statBtn.id = 'statbtn'; statBtn.title = 'Statistik: Verlauf über die Züge'; statBtn.textContent = '📈';
statBtn.addEventListener('click', e => { e.stopPropagation(); statsOpen(); });
stage.appendChild(statBtn);
