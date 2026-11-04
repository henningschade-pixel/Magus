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
// Todes-Fluch (Ultimate): HP-Verlust am Ende jeder eigenen Angriffsphase, bis Kampfende.
// Spiegel: je Element ein Stein neben dem Handbrett, mit Stufenzähler ab 2.
function mirrorStack(s, x, y, who) {
  if (!(s.mirror > 0)) return '';
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
  return '<div class="mirstack" data-who="' + (who || '') + '" style="left:' + x + 'px;top:' + y + 'px">' + t + '</div>';
}
// Todesmarker: jeder Marker liegt als eigener, größerer Token auf dem Tisch (wie die Nachziehtokens), leicht verdreht und versetzt; im Läuterungs-Angriff anklickbar.
// Eigene Marker liegen rechts neben den Nachziehtokens über dem Nachziehstapel, die des Gegners rechts neben dessen Nachziehstapel (frei von den Panels).
function deathPos(who, i) {
  const L = who === 's' ? L_MY : L_OP, rot = [-7, 5, -3, 8][i % 4], dy = [0, -3, 2, -2][i % 4];
  return { x: L.draw.x + (who === 's' ? 58 : 100) + i * 52, y: (who === 's' ? L.draw.y - 62 : L.draw.y + CH * L.ps - 4) + dy, rot };
}
function deathTokens(s, who) {
  const n = Math.min(s.death || 0, 4), L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'd').length : 0; let t = '';
  for (let i = 0; i < n; i++) {
    const q = deathPos(who, i), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Todesmarker: ' + (s.death || 0) + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
    t += L ? '<button class="deathtok lf' + (i < sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'd" data-i="' + i + '" title="Läuterung: diesen Marker wählen oder abwählen" style="' + pos + '"><img src="' + IMG.curse + '"></button>'
      : '<div class="deathtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '"><img src="' + IMG.curse + '"></div>';
  }
  return t;
}
