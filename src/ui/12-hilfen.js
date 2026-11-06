/* ---------- Hilfen ---------- */
const FAST_URL = /[?&]fast/.test(location.search);
let FAST = FAST_URL;   // ohne Animationen, Töne und Wartezeiten (Testlauf per ?fast, beim Zuschauen ab Tempo ×3)
const setFast = () => { FAST = FAST_URL || (typeof SPEC !== 'undefined' && SPEC && specSpeed > 1); };
const sleep = ms => new Promise(r => setTimeout(r, FAST_URL ? 4 : ms));
function toast(t) { toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function dots(n, max) { max = Math.max(max || 3, n); let s = ''; for (let i = 0; i < max; i++) s += i < n ? '●' : '○'; return s; }
function thumb(id) { return '<span class="thumb" style="background-image:url(' + IMG[id] + ')"></span>'; }
function ctx() {
  if (G.phase === 'combat') {
    const c = G.combat, mine = c.sides.a.ctrl === ME ? c.sides.a : c.sides.b, theirs = mine === c.sides.a ? c.sides.b : c.sides.a;
    return { combat: true, c, mine, theirs, myDeck: mine.deck, oppDeck: theirs.deck, myStats: mine.stats, oppStats: theirs.stats };
  }
  return { combat: false, myDeck: G.players[ME].deck, oppDeck: G.players[OPP].deck, myStats: G.players[ME].stats, oppStats: G.players[OPP].stats };
}
// Todesfluss (Ultimate): HP-Verlust am Ende jeder eigenen Angriffsphase, bis Kampfende.
// Spiegel: je Element ein Schildmarker, mit Stufenzähler ab 2; seit 0.7.2.10 liegen sie am Ende der Markerreihe vor den Handkarten (wie Todes- und Heilmarker).
function mirrorStack(s, x, y, who) {
  if (!(s.mirror > 0) && !(s.rainbow > 0)) return '';
  const L = who ? lfCtx() : null;
  let t = '', idx = 0;
  const mc = markCounts(s);   // Schildmarker bilden das Ende der Markerreihe vor den Handkarten (seit 0.7.2.10)
  const wrap = h => { const q = deathPos(who, mc.nd + mc.nh + idx, mc.total); idx++; return '<div class="mpos" style="left:' + (q.x + 5) + 'px;top:' + (q.y - 1) + 'px;--r:' + q.rot + 'deg">' + h + '</div>'; };
  for (const e of M.ELEMENTS) {
    const n = (s.mirrorEl && s.mirrorEl[e]) || 0; if (n <= 0) continue;
    const tip = 'Spiegel ' + M.NAMES[e] + ' Stufe ' + n + ': Dauerhaft. Gegen einen ' + M.NAMES[e] + '-Angriff gleicht er fehlende Verteidigung bis zu ' + n + ' Schaden aus und verliert dabei je eine Stufe. Verteidigst du mehr als nötig, wirft er den Überschuss (höchstens ' + n + ', und nie mehr als der eingehende Schaden) auf den Angreifer zurück und verliert dabei ebenfalls je eine Stufe.';
    const shield = IMG['shield_' + e], mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '';   // Schildbild je Farbe, bei mehreren Markern mit Multiplikator
    if (L) {
      const sel = L.picks.filter(p => p === who + 'm:' + e).length;
      t += wrap(shield ? '<button class="msh ' + e + ' lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'm" data-e="' + e + '" title="Lifeflow: Spiegelmarker ' + M.NAMES[e] + ' wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt."><img src="' + shield + '">' + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
        : '<button class="mtok ' + e + ' lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'm" data-e="' + e + '" title="Lifeflow: Spiegelmarker ' + M.NAMES[e] + ' wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + n + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>');
    } else t += wrap(shield ? '<div class="msh ' + e + '" title="' + tip + '"><img src="' + shield + '">' + mul + '</div>' : '<div class="mtok ' + e + '" title="' + tip + '">' + n + '</div>');
  }
  if (s.rainbow > 0) {   // Multispiegel (Wasser-Ultimate): gegen jede Farbe; verliert Stufen wie ein Farbspiegel (erst nach dem Farbspiegel); Läuterung entfernt ihn
    const n = s.rainbow, mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '', sel = L ? L.picks.filter(p => p === who + 'r').length : 0;
    const tip = 'Multispiegel Stufe ' + n + ': Wie ein Spiegel, aber gegen jede Farbe: Er gleicht fehlende Verteidigung bis zu ' + n + ' Schaden aus oder wirft den Überschuss einer zu starken Verteidigung (höchstens ' + n + ') zurück. Dabei verliert er je eine Stufe, aber erst, nachdem die Stufen des Farbspiegels aufgebraucht sind. Läuterung kann ihn ebenfalls entfernen. Es gilt der höhere von Farbspiegel und Multispiegel.';
    const svg = '<svg viewBox="0 0 40 52"><defs><linearGradient id="rbw' + (who || 'x') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8352f"/><stop offset=".25" stop-color="#a98424"/><stop offset=".5" stop-color="#478a40"/><stop offset=".75" stop-color="#2a6aa8"/><stop offset="1" stop-color="#63449f"/></linearGradient><clipPath id="' + 'rbi' + (who || 'x') + 'c"><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z"/></clipPath><filter id="' + 'rbi' + (who || 'x') + 'b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".7"/></filter></defs><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="url(#rbw' + (who || 'x') + ')"/><g clip-path="url(#' + 'rbi' + (who || 'x') + 'c)"><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="none" stroke="#000" stroke-width="5" stroke-opacity=".85" filter="url(#' + 'rbi' + (who || 'x') + 'b)"/></g><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="none" stroke="#b9c0cc" stroke-width="2.2" stroke-opacity=".6"/><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 Z" fill="#000" fill-opacity=".3"/></svg>';
    t += wrap(L ? '<button class="msh R lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'r" title="Läuterung: Multispiegel wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + svg + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
      : '<div class="msh R" title="' + tip + '">' + svg + mul + '</div>');
  }
  return '<div class="mirstack" data-who="' + (who || '') + '">' + t + '</div>';
}
// Marker: einzelne Tokens, leicht verdreht und versetzt (Verteilung: deathPos).
const TOK = 50, TOK_ROT = [-11, 7, -4, 12, -8, 5, 10, -6], TOK_DX = [-4, 5, -2, 6, 3, -5, 4, -3], TOK_DY = [0, -5, 3, -3, 4, -2, 2, -4];
function markCounts(s) {   // dargestellte Marker je Art (Todes- und Heilmarker je ein Token mit Zähler) und Gesamtzahl für die Reihe vor den Handkarten
  const nd = s.death > 0 ? 1 : 0, nh = s.heal > 0 ? 1 : 0, ns = M.ELEMENTS.filter(e => ((s.mirrorEl && s.mirrorEl[e]) || 0) > 0).length + (s.rainbow > 0 ? 1 : 0);
  return { nd, nh, ns, total: nd + nh + ns };
}
// seit 0.7.2.10 liegen alle Marker (Todes-, Heil- und Schildmarker) in einer lockeren Reihe mittig direkt vor den Handkarten ihres Spielers (eigene oberhalb, die des Gegners unterhalb der Hand), jeder leicht verdreht und versetzt; so verdecken sie weder Karten noch Anzeigen. i: laufende Nummer in der Reihe (Todesmarker, dann Heil-, dann Schildmarker), total: Anzahl aller Marker der Seite.
function deathPos(who, i, total) {
  const L = who === 's' ? L_MY : L_OP, T = Math.max(1, total || 1, i + 1), sx = Math.min(62, 400 / T), k = i % 8;
  const cy = who === 's' ? L.y - 80 : L.y + CH * L.s + 51;   // so hoch bzw. tief, dass auch die angehobenen (markierten) Karten (L.raise) und der Zähler (ragt unten ca. 10 px über den Token) frei bleiben
  const x = Math.max(4, L.cx - ((T - 1) * sx) / 2 - TOK / 2 + i * sx + TOK_DX[k]);
  return { x, y: cy - TOK / 2 + TOK_DY[k] * 1.4, rot: TOK_ROT[k] };
}
// Heilmarker (Erd-Ultimate): grüne Tokens mit Plus; +1 HP je Marker am Ende der eigenen Angriffsphase. Sie liegen in der Reihe hinter den Todesmarkern derselben Seite.
function healTokens(s, who) {   // seit 0.7.2.11 ein Token mit Zähler statt mehrerer Tokens
  const N = s.heal || 0; if (N <= 0) return '';
  const L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'h').length : 0, mul = N > 1 ? '<b class="mul">×' + N + '</b>' : '';
  const img = '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="25" fill="#24472a" stroke="#6e9a58" stroke-width="2.5"/><circle cx="28" cy="28" r="20" fill="#2f6030" stroke="#173a1b" stroke-width="1.5"/><path d="M28 19v18M19 28h18" stroke="#cfe3bd" stroke-width="4" stroke-linecap="round"/></svg>';
  const q = deathPos(who, markCounts(s).nd, markCounts(s).total), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Heilmarker ×' + N + ': ' + N + ' HP Heilung am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
  return L ? '<button class="healtok lf' + (sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'h" title="Läuterung: Heilmarker wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + N + ' gewählt." style="' + pos + '">' + img + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
    : '<div class="healtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '">' + img + mul + '</div>';
}
function deathTokens(s, who) {   // seit 0.7.2.11 ein Token mit Zähler statt mehrerer Tokens
  const N = s.death || 0; if (N <= 0) return '';
  const L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'd').length : 0, mul = N > 1 ? '<b class="mul">×' + N + '</b>' : '';
  const q = deathPos(who, 0, markCounts(s).total), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Todesmarker ×' + N + ': ' + N + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
  return L ? '<button class="deathtok lf' + (sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'd" title="Läuterung: Todesmarker wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + N + ' gewählt." style="' + pos + '"><img src="' + IMG.curse + '">' + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
    : '<div class="deathtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '"><img src="' + IMG.curse + '">' + mul + '</div>';
}
