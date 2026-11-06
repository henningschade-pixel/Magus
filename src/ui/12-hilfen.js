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
// Spiegel: je Element ein Stein neben dem Handbrett, mit Stufenzähler ab 2.
function mirrorStack(s, x, y, who) {
  if (!(s.mirror > 0) && !(s.rainbow > 0)) return '';
  const L = who ? lfCtx() : null;
  let t = '';
  for (const e of M.ELEMENTS) {
    const n = (s.mirrorEl && s.mirrorEl[e]) || 0; if (n <= 0) continue;
    const tip = 'Spiegel ' + M.NAMES[e] + ' Stufe ' + n + ': Dauerhaft. Gegen einen ' + M.NAMES[e] + '-Angriff gleicht er fehlende Verteidigung bis zu ' + n + ' Schaden aus und verliert dabei je eine Stufe. Verteidigst du mehr als nötig, wirft er den Überschuss (höchstens ' + n + ', und nie mehr als der eingehende Schaden) auf den Angreifer zurück und verliert dabei ebenfalls je eine Stufe.';
    const shield = IMG['shield_' + e], mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '';   // Schildbild je Farbe, bei mehreren Markern mit Multiplikator
    if (L) {
      const sel = L.picks.filter(p => p === who + 'm:' + e).length;
      t += shield ? '<button class="msh ' + e + ' lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'm" data-e="' + e + '" title="Lifeflow: Spiegelmarker ' + M.NAMES[e] + ' wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt."><img src="' + shield + '">' + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
        : '<button class="mtok ' + e + ' lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'm" data-e="' + e + '" title="Lifeflow: Spiegelmarker ' + M.NAMES[e] + ' wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + n + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>';
    } else t += shield ? '<div class="msh ' + e + '" title="' + tip + '"><img src="' + shield + '">' + mul + '</div>' : '<div class="mtok ' + e + '" title="' + tip + '">' + n + '</div>';
  }
  if (s.rainbow > 0) {   // Multispiegel (Wasser-Ultimate): gegen jede Farbe; verliert Stufen wie ein Farbspiegel (erst nach dem Farbspiegel); Läuterung entfernt ihn
    const n = s.rainbow, mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '', sel = L ? L.picks.filter(p => p === who + 'r').length : 0;
    const tip = 'Multispiegel Stufe ' + n + ': Wie ein Spiegel, aber gegen jede Farbe: Er gleicht fehlende Verteidigung bis zu ' + n + ' Schaden aus oder wirft den Überschuss einer zu starken Verteidigung (höchstens ' + n + ') zurück. Dabei verliert er je eine Stufe, aber erst, nachdem die Stufen des Farbspiegels aufgebraucht sind. Läuterung kann ihn ebenfalls entfernen. Es gilt der höhere von Farbspiegel und Multispiegel.';
    const svg = '<svg viewBox="0 0 40 52"><defs><linearGradient id="rbw' + (who || 'x') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a4d"/><stop offset=".25" stop-color="#ffc83d"/><stop offset=".5" stop-color="#7bd36b"/><stop offset=".75" stop-color="#4aa6f5"/><stop offset="1" stop-color="#a06bff"/></linearGradient></defs><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="url(#rbw' + (who || 'x') + ')" stroke="#fff" stroke-width="2.2" stroke-opacity=".85"/><path d="M20 8 L31 12.5 V26 C31 34 26 40 20 43 Z" fill="#fff" fill-opacity=".22"/></svg>';
    t += L ? '<button class="msh R lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'r" title="Läuterung: Multispiegel wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + svg + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
      : '<div class="msh R" title="' + tip + '">' + svg + mul + '</div>';
  }
  return '<div class="mirstack" data-who="' + (who || '') + '" style="left:' + x + 'px;top:' + y + 'px">' + t + '</div>';
}
// Marker (Todes- und Heilmarker): Sie liegen als einzelne Tokens in einem kleinen Haufen zentral vor dem Nachziehstapel ihres Spielers (eigene oberhalb, die des Gegners unterhalb des Stapels), jeder leicht verdreht und versetzt (seit 0.7.2.6). Todesmarker zuerst, dann die Heilmarker; max. 4 je Art, 4 Marker pro Reihe.
const TOK = 50, TOK_ROT = [-11, 7, -4, 12, -8, 5, 10, -6], TOK_DX = [-4, 5, -2, 6, 3, -5, 4, -3], TOK_DY = [0, -5, 3, -3, 4, -2, 2, -4];
function deathPos(who, i, count, row, kOff) {   // i: Nummer in der Reihe, count: Anzahl in der Reihe, row: 0 = Todesmarker bzw. erste vorhandene Art, 1 = zweite Art
  const L = who === 's' ? L_MY : L_OP, sx = 44, sy = 40, dir = who === 's' ? -1 : 1, k = (i + (kOff || 0)) % 8;
  const cx = L.draw.x + CW * L.ps / 2, cy = who === 's' ? L.draw.y - 34 : L.draw.y + CH * L.ps + 14;
  const x = Math.max(4, cx - ((Math.max(1, count || 1) - 1) * sx) / 2 - TOK / 2) + i * sx + TOK_DX[k];   // jede Reihe wird um die Stapelmitte zentriert
  return { x, y: cy - TOK / 2 + dir * (row || 0) * sy + TOK_DY[k], rot: TOK_ROT[k] };
}
// Heilmarker (Erd-Ultimate): grüne Tokens mit Plus; +1 HP je Marker am Ende der eigenen Angriffsphase. Sie liegen in einer eigenen Reihe hinter den Todesmarkern derselben Seite.
function healTokens(s, who) {
  const n = Math.min(s.heal || 0, 4), L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'h').length : 0, off = Math.min(s.death || 0, 4); let t = '';
  const img = '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="25" fill="#24472a" stroke="#6e9a58" stroke-width="2.5"/><circle cx="28" cy="28" r="20" fill="#2f6030" stroke="#173a1b" stroke-width="1.5"/><path d="M28 19v18M19 28h18" stroke="#cfe3bd" stroke-width="4" stroke-linecap="round"/></svg>';
  for (let i = 0; i < n; i++) {
    const q = deathPos(who, i, n, off > 0 ? 1 : 0, 4), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Heilmarker: ' + (s.heal || 0) + ' HP Heilung am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
    t += L ? '<button class="healtok lf' + (i < sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'h" data-i="' + i + '" title="Läuterung: diesen Marker wählen oder abwählen" style="' + pos + '">' + img + '</button>'
      : '<div class="healtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '">' + img + '</div>';
  }
  return t;
}
function deathTokens(s, who) {
  const n = Math.min(s.death || 0, 4), L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'd').length : 0; let t = '';
  for (let i = 0; i < n; i++) {
    const q = deathPos(who, i, n, 0, 0), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Todesmarker: ' + (s.death || 0) + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
    t += L ? '<button class="deathtok lf' + (i < sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'd" data-i="' + i + '" title="Läuterung: diesen Marker wählen oder abwählen" style="' + pos + '"><img src="' + IMG.curse + '"></button>'
      : '<div class="deathtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '"><img src="' + IMG.curse + '"></div>';
  }
  return t;
}
