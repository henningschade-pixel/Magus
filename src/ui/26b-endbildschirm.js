/* ---------- Endbildschirm (seit 0.8.1.1): Sieg bzw. Niederlage hervorgehoben, dazu ein Rückblick auf die Höhepunkte der Partie ----------
   Die Zahlen kommen aus G.hist der Engine (Siegpunkte je Messpunkt, Kampfverlauf je Kampf in ev.trace). showEnd() in 26a ruft finaleHTML() auf. */
let finaleSeen = null;   // Partie, deren Endbildschirm schon einmal gezeigt wurde: Rückkehr aus der Statistik ohne erneute Animation

function finRng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
// Seite von pid in einem aufgezeichneten Kampf (0 = Angreifer, 1 = Gegenseite); -1, wenn pid nur das Monster steuert
function finSide(tr, pid) { if (tr.monster) return tr.ids[0] === pid ? 0 : -1; return tr.ids.indexOf(pid); }
function finLabel(ev) { return ev.type === 'showdown' ? 'Showdown ' + ev.n : M.NAMES[ev.elem] + 'monster Stufe ' + ev.stage; }

// Alle Kämpfe, in denen pid selbst gekämpft hat, mit den wichtigsten Kennzahlen
function finFights(pid) {
  const out = [];
  (G.hist || []).forEach((h, i) => {
    const ev = h.ev, tr = ev && ev.trace;
    if (!tr || !tr.steps || tr.steps.length < 2) return;
    const s = finSide(tr, pid); if (s < 0) return;
    const o = 1 - s, st = tr.steps;
    let dealt = 0, taken = 0, blocked = 0, hit = null, blk = null, lastA = -1;
    for (let k = 1; k < st.length; k++) {
      const p = st[k - 1], c = st[k];
      dealt += Math.max(0, p.hp[o] - c.hp[o]); taken += Math.max(0, p.hp[s] - c.hp[s]);
      if (c.k === 'A' && c.who === s) { lastA = k; if (!hit || c.v > hit.v) hit = { v: c.v }; }
      if (c.k === 'V' && c.who === s) { const bl = Math.min(c.v, c.b); blocked += bl; if (!blk || bl > blk.bl) blk = { bl, b: c.b, left: c.left }; }
    }
    const last = st[st.length - 1];
    out.push({ i, ev, s, o, st, lastA, label: finLabel(ev), steps: st.length - 1, won: ev.winner === pid, dealt, taken, blocked, hit, blk, hpEnd: last.hp[s], hpStart: st[0].hp[s], oppEnd: last.hp[o], maxHp: (h.p[pid] && h.p[pid].hp) || 0 });
  });
  return out;
}

// Die Höhepunkte von pid: Liste aus { ord, sc, ic, k, big, unit, tx, i } (ord = Reihenfolge im Spiel, sc = Gewicht für die Auswahl)
function finHighlights(pid, cap) {
  const q = 1 - pid, F = finFights(pid), H = G.hist || [], c = [];
  const won = F.filter(f => f.won), best = (arr, fn) => arr.reduce((a, x) => (!a || fn(x) > fn(a) ? x : a), null);
  // Letzter Hieb: der Angriff, der den letzten gewonnenen Showdown beendete
  const fin = best(F.filter(f => f.won && f.ev.type === 'showdown' && f.oppEnd <= 0 && f.lastA > 0), f => f.i);
  if (fin) { const before = fin.st[fin.lastA - 1].hp[fin.o]; c.push({ ord: fin.i, sc: 100, ic: '☠', k: 'Der letzte Hieb', big: before, unit: 'HP im letzten Zug', tx: fin.label + ': Der Gegner fiel von ' + before + ' HP auf 0', i: fin.i }); }
  // Mächtigster Angriff
  const hit = best(F.filter(f => f.hit && f.hit.v > 0), f => f.hit.v);
  if (hit) c.push({ ord: hit.i, sc: 60 + hit.hit.v, ic: '⚔', k: 'Mächtigster Angriff', big: hit.hit.v, unit: 'Schaden', tx: 'In einem einzigen Zug · ' + hit.label, i: hit.i });
  // Stärkste Abwehr
  const blk = best(F.filter(f => f.blk && f.blk.bl >= 2), f => f.blk.bl);
  if (blk) c.push({ ord: blk.i, sc: 50 + blk.blk.bl, ic: '🛡', k: 'Stärkste Abwehr', big: blk.blk.bl, unit: 'geblockt', tx: 'Von ' + blk.blk.b + ' eingehendem Schaden' + (blk.blk.left <= 0 ? ' – nichts kam durch' : ' – ' + blk.blk.left + ' gingen durch') + ' · ' + blk.label, i: blk.i });
  // Auf Messers Schneide: knappster gewonnener Kampf
  const close = best(won.filter(f => f.hpEnd > 0 && f.hpEnd <= Math.max(2, Math.round(f.maxHp * .25))), f => -f.hpEnd);
  if (close) c.push({ ord: close.i, sc: 80, ic: '❤', k: 'Auf Messers Schneide', big: close.hpEnd, unit: 'HP übrig', tx: close.label + ' gewonnen, am Ende mit ' + close.hpEnd + ' von ' + close.maxHp + ' HP', i: close.i });
  // Makellos: gewonnen, ohne Schaden zu nehmen
  const flaw = best(won.filter(f => f.taken === 0 && f.steps >= 3), f => f.dealt);
  if (flaw) c.push({ ord: flaw.i, sc: 55, ic: '✨', k: 'Makelloser Sieg', big: 0, unit: 'Schaden erhalten', tx: flaw.label + ' ohne einen Kratzer gewonnen', i: flaw.i });
  // Blitzsieg und zähes Ringen
  const fast = best(won.filter(f => f.steps <= 6), f => -f.steps);
  if (fast) c.push({ ord: fast.i, sc: 45, ic: '⚡', k: 'Blitzsieg', big: fast.steps, unit: 'Schritte', tx: fast.label + ' war nach ' + fast.steps + ' Schritten entschieden', i: fast.i });
  const long = best(won.filter(f => f.steps >= 24), f => f.steps);
  if (long) c.push({ ord: long.i, sc: 46, ic: '⌛', k: 'Zähes Ringen', big: long.steps, unit: 'Schritte', tx: long.label + ' – erst nach ' + long.steps + ' Schritten gewonnen', i: long.i });
  // Siegpunktverlauf: größter Rückstand bzw. größte Führung
  let lo = 0, loI = 0, hi = 0, hiI = 0;
  H.forEach((h, i) => { const d = h.p[pid].sp - h.p[q].sp; if (d < lo) { lo = d; loI = i; } if (d > hi) { hi = d; hiI = i; } });
  const win = G.winner === pid, lose = G.winner === q;
  if (win && lo <= -2) c.push({ ord: loI, sc: 90 + -lo, ic: '📈', k: 'Aufholjagd', big: -lo, unit: 'Siegpunkte Rückstand', tx: 'Zeitweise so weit zurück – und am Ende doch vorn', i: null });
  if (lose && hi >= 2) c.push({ ord: hiI, sc: 70 + hi, ic: '👑', k: 'Fast geschafft', big: hi, unit: 'Siegpunkte Vorsprung', tx: 'So weit lagst du zeitweise vorn', i: null });
  return c.sort((a, b) => b.sc - a.sc).slice(0, cap).sort((a, b) => a.ord - b.ord);
}

// Wendepunkt für den Verlierer: der Treffer des Gegners, der die Partie entschied
function finTurning(pid) {
  const q = 1 - pid, F = finFights(q).filter(f => f.ev.type === 'showdown');
  const fin = F.filter(f => f.won && f.oppEnd <= 0 && f.lastA > 0).pop();   // letzter vom Gegner gewonnener Showdown
  if (fin) { const before = fin.st[fin.lastA - 1].hp[fin.o]; return { ord: 1e9, ic: '⚑', k: 'Der Wendepunkt', big: before, unit: 'HP im letzten Zug', tx: fin.label + ': Du fielst von ' + before + ' HP auf 0 – damit war die Partie entschieden', i: fin.i, bad: true }; }
  const hit = F.filter(f => f.hit && f.hit.v > 0).sort((a, b) => b.hit.v - a.hit.v)[0];
  if (hit) return { ord: 1e9, ic: '⚑', k: 'Der härteste Treffer', big: hit.hit.v, unit: 'Schaden', tx: 'Gegen dich · ' + hit.label, i: hit.i, bad: true };
  return null;
}

// Siegpunkte beider Seiten über die Züge (durchgezogen: pid, gestrichelt: Gegner), Showdowns als Stern
function finSpark(pid, W) {
  const H = G.hist || [], q = 1 - pid, n = H.length; if (n < 2) return '';
  const Ht = 96, L = 20, R = 10, T = 10, B = 16, ymax = Math.max(4, ...H.map(h => Math.max(h.p[pid].sp, h.p[q].sp)));
  const xs = i => L + i / (n - 1) * (W - L - R), ys = v => T + (Ht - T - B) * (1 - v / ymax);
  const line = (seat, col, dash) => '<polyline points="' + H.map((h, i) => xs(i).toFixed(1) + ',' + ys(h.p[seat].sp).toFixed(1)).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="5 4" opacity=".75"' : '') + '/>';
  let s = '<svg viewBox="0 0 ' + W + ' ' + Ht + '" width="100%" style="display:block"><line x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(0) + '" y2="' + ys(0) + '" stroke="rgba(255,255,255,.3)"/><text x="' + (L - 5) + '" y="' + (ys(0) + 4) + '" text-anchor="end" fill="#9a97a6" font-size="11">0</text><text x="' + (L - 5) + '" y="' + (ys(ymax) + 4) + '" text-anchor="end" fill="#9a97a6" font-size="11">' + ymax + '</text>';
  H.forEach((h, i) => {
    if (h.ev && h.ev.type === 'showdown') s += '<line x1="' + xs(i) + '" x2="' + xs(i) + '" y1="' + T + '" y2="' + ys(0) + '" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 3"/><text x="' + xs(i) + '" y="' + (T - 1) + '" text-anchor="middle" fill="#e0b84a" font-size="12">★</text>';
  });
  const last = H[n - 1].p;
  return s + line(q, '#b9b4c4', true) + line(pid, '#f0c24a', false) + '<circle cx="' + xs(n - 1) + '" cy="' + ys(last[pid].sp) + '" r="4.5" fill="#f0c24a"/><circle cx="' + xs(n - 1) + '" cy="' + ys(last[q].sp) + '" r="3.5" fill="#b9b4c4"/></svg>';
}

function finSeal(cls) {
  if (cls === 'win') return '<svg class="fseal fpop fa" style="--dl:.05s" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="fsg" cx="50%" cy="35%"><stop offset="0" stop-color="#fff3b8"/><stop offset=".6" stop-color="#e8b93f"/><stop offset="1" stop-color="#9a6c1c"/></radialGradient></defs><circle cx="60" cy="60" r="55" fill="#2a2210" stroke="url(#fsg)" stroke-width="5"/><circle cx="60" cy="60" r="45" fill="none" stroke="#e8b93f" stroke-opacity=".5" stroke-dasharray="2 5" stroke-width="2"/><polygon points="60,22 70.6,48.6 99,50.5 77,68.7 84,96 60,81 36,96 43,68.7 21,50.5 49.4,48.6" fill="url(#fsg)"/></svg>';
  if (cls === 'lose') return '<svg class="fseal fpop fa" style="--dl:.05s" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="55" fill="#1e1415" stroke="#8a4a48" stroke-width="5" stroke-dasharray="150 20 90 12"/><polygon points="60,22 70.6,48.6 99,50.5 77,68.7 84,96 60,81 36,96 43,68.7 21,50.5 49.4,48.6" fill="none" stroke="#8a7f7a" stroke-width="3" stroke-linejoin="round"/><polyline class="fcrack fa" style="--dl:.9s" points="54,6 66,40 52,60 70,84 58,114" fill="none" stroke="#e0645c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<svg class="fseal fpop fa" style="--dl:.05s" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="55" fill="#232327" stroke="#d2ad4f" stroke-width="5"/><rect x="34" y="42" width="52" height="9" rx="3" fill="#e9d79a"/><rect x="34" y="69" width="52" height="9" rx="3" fill="#e9d79a"/></svg>';
}

function finaleHTML() {
  const w = G.winner, spec = SPEC, me = G.players[ME], opp = G.players[OPP];
  const cls = w === null ? 'draw' : spec || w === ME ? 'win' : 'lose';
  const pid = spec && w !== null ? w : ME, q = 1 - pid;
  const a = me.sp, b = opp.sp, seen = finaleSeen === G;
  const title = cls === 'lose' ? 'Niederlage' : cls === 'draw' ? 'Unentschieden' : 'Sieg';
  const tag = cls === 'draw' ? 'Kein Sieger' : spec ? G.players[w].name + ' gewinnt die Partie' : cls === 'win' ? 'Du hast ' + opp.name + ' bezwungen' : opp.name + ' gewinnt die Partie';
  const sbj = !spec && w === ME ? 'Du hast' : w === null ? '' : G.players[w].name + ' hat';
  const reason = w === null ? 'Bei Gleichstand an Siegpunkten, Tempelstufe und Gold gibt es keinen Sieger.' : sbj + (G.goldWin ? ' bei gleicher Tempelstufe das meiste Gold (' + me.stats.gold + ' : ' + opp.stats.gold + ').' : G.templeWin ? ' bei Punktgleichstand die höhere Tempelstufe (' + me.temple.level + ' : ' + opp.temple.level + ').' : ' die meisten Siegpunkte.');
  const cap = cls === 'lose' ? 4 : 5;
  let hl = []; try { hl = finHighlights(pid, cap); if (cls === 'lose') { const t = finTurning(pid); if (t) hl.push(t); } } catch (e) { hl = []; }   // ein Fehler im Rückblick darf den Endbildschirm nicht verhindern
  const F = finFights(pid), sd = F.filter(f => f.ev.type === 'showdown'), sum = k => F.reduce((n, f) => n + f[k], 0);
  const chips = F.length ? [['Monster besiegt', F.filter(f => f.ev.type === 'monster' && f.won).length], ['Showdowns', sd.filter(f => f.won).length + ' : ' + sd.filter(f => f.ev.winner === q).length], ['Schaden ausgeteilt', sum('dealt')], ['Schaden geblockt', sum('blocked')]] : [];
  const r = finRng((G.seed | 0) + 7), parts = []; for (let i = 0; i < 30; i++) parts.push('<i style="--x:' + (r() * 100).toFixed(1) + '%;--d:' + (r() * 6).toFixed(2) + 's;--t:' + (4.5 + r() * 4).toFixed(2) + 's;--s:' + (4 + r() * 7).toFixed(1) + 'px;--h:' + Math.round((r() - .5) * 90) + 'px"></i>');
  const nm = id => G.players[id].name;
  const heading = spec ? 'Die Höhepunkte von ' + nm(pid) : cls === 'lose' ? 'Die Höhepunkte – und was entschied' : 'Die Höhepunkte der Partie';
  const step = 2.0; let cards = '';
  hl.forEach((h, n) => {
    const tagA = h.i !== null && h.i !== undefined ? ' data-act="finfight" data-i="' + h.i + '" title="Kampfverlauf ansehen" style="--dl:' + (step + n * .42).toFixed(2) + 's;cursor:var(--cp)"' : ' style="--dl:' + (step + n * .42).toFixed(2) + 's"';
    cards += '<div class="fcard fa' + (h.bad ? ' bad' : '') + '"' + tagA + '><div class="fic">' + h.ic + '</div><div class="fk">' + esc(h.k) + '</div><div class="fbig"><b class="fst fa">' + esc(String(h.big)) + '</b><small>' + esc(h.unit) + '</small></div><div class="ftx">' + esc(h.tx) + '</div></div>';
  });
  const span = [1, 3, 2][(hl.length + 1) % 3], tEnd = step + hl.length * .42, spark = finSpark(pid, [300, 640, 960][span - 1]);   // Verlaufskarte füllt die letzte Zeile des Rasters (1, 2 oder 3 Spalten)
  if (spark) cards += '<div class="fcard fspark fa" style="--dl:' + tEnd.toFixed(2) + 's' + (span > 1 ? ';grid-column:span ' + span : '') + '"><div class="fk">Siegpunkte im Verlauf</div>' + spark + '<div class="ftx" style="margin-top:2px">' + (spec ? '' : 'Durchgezogen: du · gestrichelt: ' + esc(opp.name) + ' · ') + '★ Showdown</div></div>';
  const btn = (act, txt, extra) => '<button class="btn' + (extra ? ' ' + extra : '') + '" style="font-size:' + (extra ? 22 : 19) + 'px;padding:' + (extra ? '10px 28px' : '8px 18px') + '" data-act="' + act + '">' + txt + '</button>';
  return '<div class="box finale ' + cls + (seen ? ' seen' : '') + '" data-act="finskip"><div class="fbg"><div class="fray"><i></i></div><div class="fparts">' + parts.join('') + '</div></div>' +
    '<div class="fhint fa" style="--dl:.3s">Klick: Animation überspringen</div>' +
    '<div class="fhead">' + finSeal(cls) + '<div class="ftxt"><div class="ftitle fa" style="--dl:.25s">' + title + '</div><div class="ftag fa" style="--dl:.8s">' + esc(tag) + '</div><div class="fscore fa" style="--dl:1.05s"><b>' + a + '</b> : <b>' + b + '</b> <span>Siegpunkte</span></div></div></div>' +
    '<div class="freason fa" style="--dl:1.3s">' + esc(reason) + '</div>' +
    (hl.length || spark ? '<div class="fhl fa" style="--dl:1.7s">' + esc(heading) + '</div><div class="fcards">' + cards + '</div>' : '') +
    (chips.length ? '<div class="fstats fa" style="--dl:' + (tEnd + .35).toFixed(2) + 's">' + chips.map(c => '<span class="fchip">' + c[0] + ' <b>' + c[1] + '</b></span>').join('') + '</div>' : '') +
    '<div class="fbtns fa" style="--dl:' + (tEnd + .7).toFixed(2) + 's">' + btn('stend', '📈 Statistik') + btn('logdl', '⬇ Protokoll') + btn(MP ? 'mpexit' : spec ? 'leave' : 'newgame', MP ? 'Zum Startbildschirm' : spec ? 'Zum Hauptmenü' : 'Neues Spiel', 'primary') + '</div></div>';
}
