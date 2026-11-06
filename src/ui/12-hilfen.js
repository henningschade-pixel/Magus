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
  if (s.rainbow > 0) {   // Prisma (Wasser-Ultimate): gegen jede Farbe, verbraucht sich nicht; nur Läuterung entfernt ihn
    const n = s.rainbow, mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '', sel = L ? L.picks.filter(p => p === who + 'r').length : 0;
    const tip = 'Prisma Stufe ' + n + ': Wie ein Spiegel, aber gegen jede Farbe: Er gleicht fehlende Verteidigung bis zu ' + n + ' Schaden aus oder wirft den Überschuss einer zu starken Verteidigung (höchstens ' + n + ') zurück. Er verbraucht sich nicht; nur Läuterung kann ihn entfernen. Gilt der höhere von Farbspiegel und Prisma.';
    const svg = '<svg viewBox="0 0 40 52"><defs><linearGradient id="rbw' + (who || 'x') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a4d"/><stop offset=".25" stop-color="#ffc83d"/><stop offset=".5" stop-color="#7bd36b"/><stop offset=".75" stop-color="#4aa6f5"/><stop offset="1" stop-color="#a06bff"/></linearGradient></defs><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="url(#rbw' + (who || 'x') + ')" stroke="#fff" stroke-width="2.2" stroke-opacity=".85"/><path d="M20 8 L31 12.5 V26 C31 34 26 40 20 43 Z" fill="#fff" fill-opacity=".22"/></svg>';
    t += L ? '<button class="msh R lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'r" title="Läuterung: Prisma wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + svg + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
      : '<div class="msh R" title="' + tip + '">' + svg + mul + '</div>';
  }
  return '<div class="mirstack" data-who="' + (who || '') + '" style="left:' + x + 'px;top:' + y + 'px">' + t + '</div>';
}
// Todesmarker: jeder Marker liegt als eigener, größerer Token auf dem Tisch (wie die Nachziehtokens), leicht verdreht und versetzt; im Läuterungs-Angriff anklickbar.
// Eigene Marker liegen rechts neben den Nachziehtokens über dem Nachziehstapel, die des Gegners rechts neben dessen Nachziehstapel (frei von den Panels).
function deathPos(who, i) {
  const L = who === 's' ? L_MY : L_OP, rot = [-7, 5, -3, 8][i % 4], dy = [0, -3, 2, -2][i % 4];
  return { x: L.draw.x + (who === 's' ? 58 : 100) + i * 52, y: (who === 's' ? L.draw.y - 62 : L.draw.y + CH * L.ps - 4) + dy, rot };
}
// Heilmarker (Erd-Ultimate): grüne Tokens mit Plus; +1 HP je Marker am Ende der eigenen Angriffsphase. Sie liegen hinter den Todesmarkern derselben Seite.
function healTokens(s, who) {
  const n = Math.min(s.heal || 0, 4), L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'h').length : 0, off = Math.min(s.death || 0, 4); let t = '';
  const img = '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="25" fill="#2f7a2f" stroke="#b9f08a" stroke-width="3"/><circle cx="28" cy="28" r="20" fill="#49a23d" stroke="#1e5a1e" stroke-width="1.5"/><path d="M28 14v28M14 28h28" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>';
  for (let i = 0; i < n; i++) {
    const q = deathPos(who, i + off), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Heilmarker: ' + (s.heal || 0) + ' HP Heilung am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
    t += L ? '<button class="healtok lf' + (i < sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'h" data-i="' + i + '" title="Läuterung: diesen Marker wählen oder abwählen" style="' + pos + '">' + img + '</button>'
      : '<div class="healtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '">' + img + '</div>';
  }
  return t;
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
