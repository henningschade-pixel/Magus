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
// Schild (Blau + Grün, seit 0.8; Grafik des früheren Multischilds) und Falle (Blau + Rot): liegen am Ende der Markerreihe vor den Handkarten (wie Todes-, Heil- und Manamarker). Das Schild trägt einen Zähler (Ladungen) ab 2; die Falle ist eine verdeckte Karte (kein Marker), ich sehe meine eigene.
function shieldSvg(who) {
  const id = who || 'x';
  return '<svg viewBox="0 0 40 52"><defs><linearGradient id="rbw' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8352c"/><stop offset=".25" stop-color="#f2b61a"/><stop offset=".5" stop-color="#2fb844"/><stop offset=".75" stop-color="#2b84ec"/><stop offset="1" stop-color="#8d4fe0"/></linearGradient><clipPath id="rbi' + id + 'c"><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z"/></clipPath><filter id="rbi' + id + 'b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.3"/></filter></defs><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="url(#rbw' + id + ')"/><g clip-path="url(#rbi' + id + 'c)"><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="none" stroke="#000" stroke-width="5" stroke-opacity=".85" filter="url(#rbi' + id + 'b)"/></g><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 C11 46 3 38 3 26 V9 Z" fill="none" stroke="#b9c0cc" stroke-width="2.2" stroke-opacity=".6"/><path d="M20 2 L37 9 V26 C37 38 29 46 20 50 Z" fill="#000" fill-opacity=".3"/></svg>';
}
function mirrorStack(s, x, y, who) {
  if (!(s.rainbow > 0) && !s.trap) return '';
  const L = who ? lfCtx() : null;
  let t = '', idx = 0;
  const mc = markCounts(s);   // Schild und Falle bilden das Ende der Markerreihe vor den Handkarten (seit 0.7.2.10)
  const wrap = h => { const q = deathPos(who, mc.nd + mc.nh + mc.nm + idx, mc.total); idx++; return '<div class="mpos" style="left:' + (q.x + 5) + 'px;top:' + (q.y - 1) + 'px;--r:' + q.rot + 'deg">' + h + '</div>'; };
  if (s.rainbow > 0) {   // Schild: mindert eingehenden, nicht geblockten Schaden gegen jede Farbe; Läuterung entfernt Ladungen
    const n = s.rainbow, mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '', sel = L ? L.picks.filter(p => p === who + 'r').length : 0;
    const tip = 'Schild, ' + n + ' Ladung' + (n === 1 ? '' : 'en') + ': Mindert eingehenden, nicht geblockten Schaden gegen jede Farbe, je Schaden eine Ladung. Läuterung kann Ladungen entfernen. In der Verteidigung gestellt, gilt es erst nach ihr.';
    const svg = shieldSvg(who);
    t += wrap(L ? '<button class="msh R lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'r" title="Läuterung: Schildladungen wählen (Klick: eine mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + svg + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
      : '<div class="msh R" title="' + tip + '">' + svg + mul + '</div>');
  }
  if (s.trap) {   // Falle: verdeckte Karte; der Besitzer sieht seine Karte, der Gegner nur den Rücken. Sie ist kein Marker (die Läuterung erreicht sie nicht).
    const mine = who === 's', tr = s.trap, id = mine && tr.card && tr.card.id, lvl = tr.lvl || 1;
    const tip = mine ? 'Deine Falle (' + NAMES[tr.el] + ', Stufe ' + lvl + '): Wenn Schaden in ' + NAMES[tr.el] + ' eingeht, wirft sie ' + lvl + ' unblockbaren Schaden auf den Angreifer zurück (vor der Verteidigung, höchstens der eingehende Schaden). Sie wird bei jedem eingehenden Schaden aufgedeckt und danach abgelegt.' : 'Verdeckte Falle des Gegners: Sie wird aufgedeckt, sobald Schaden eingeht. Entspricht die Farbe des Schadens der Farbe der Karte, wirft sie Schaden zurück.';
    t += wrap('<div class="trapcard' + (mine ? ' mine' : '') + '" data-who="' + who + '" title="' + tip + '"><img src="' + (id && IMG[id] ? IMG[id] : IMG.back) + '"><b class="mul">×' + lvl + '</b></div>');   // Stufe als Zähler wie bei den Markern; für den Gegner liegt die Karte umgedreht (Rückseite)
  }
  return '<div class="mirstack" data-who="' + (who || '') + '">' + t + '</div>';
}
// Marker: einzelne Tokens, leicht verdreht und versetzt (Verteilung: deathPos).
const TOK = 50, TOK_ROT = [-11, 7, -4, 12, -8, 5, 10, -6], TOK_DX = [-4, 5, -2, 6, 3, -5, 4, -3], TOK_DY = [0, -5, 3, -3, 4, -2, 2, -4];
function markCounts(s) {   // dargestellte Marker je Art (Todes-, Heil- und Manamarker je ein Token mit Zähler; Schild und Falle) und Gesamtzahl für die Reihe vor den Handkarten
  const nd = s.death > 0 ? 1 : 0, nh = s.heal > 0 ? 1 : 0, nm = s.manaflow > 0 ? 1 : 0, ns = (s.rainbow > 0 ? 1 : 0) + (s.trap ? 1 : 0);
  return { nd, nh, nm, ns, total: nd + nh + nm + ns };
}
// seit 0.7.2.10 liegen alle Marker (Todes-, Heil-, Mana- und Schildmarker, seit 0.8 auch die Falle) in einer lockeren Reihe mittig direkt vor den Handkarten ihres Spielers (eigene oberhalb, die des Gegners unterhalb der Hand), jeder leicht verdreht und versetzt; so verdecken sie weder Karten noch Anzeigen. i: laufende Nummer in der Reihe (Todesmarker, Heil-, Mana-, dann Schildmarker und Falle), total: Anzahl aller Marker der Seite.
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
// Manamarker (Wasser-Ultimate Manafluss, seit 0.8): blaue Tokens mit Kristall; +1 Mana je Marker am Ende der eigenen Angriffsphase. Sie liegen in der Reihe hinter den Heilmarkern derselben Seite.
function manaTokens(s, who) {
  const N = s.manaflow || 0; if (N <= 0) return '';
  const L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'm').length : 0, mul = N > 1 ? '<b class="mul">×' + N + '</b>' : '';
  const img = '<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="25" fill="#1d3558" stroke="#6a98cf" stroke-width="2.5"/><circle cx="28" cy="28" r="20" fill="#25508a" stroke="#142c4d" stroke-width="1.5"/><path d="M28 13 L38 28 L28 43 L18 28 Z" fill="#cfe6ff" stroke="#eaf4ff" stroke-width="1.5" stroke-linejoin="round"/><path d="M28 13 L38 28 L28 43 Z" fill="#8fc0f5"/><path d="M18 28 H38" stroke="#5a8fd0" stroke-width="1.4"/></svg>';
  const mc = markCounts(s), q = deathPos(who, mc.nd + mc.nh, mc.total), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Manamarker ×' + N + ': ' + N + ' Mana Regeneration am Ende jeder eigenen Angriffsphase bis Kampfende (höchstens bis zum maximalen Mana). Nur Läuterung kann Marker entfernen.';
  return L ? '<button class="healtok manatok lf' + (sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'm" title="Läuterung: Manamarker wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + N + ' gewählt." style="' + pos + '">' + img + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
    : '<div class="healtok manatok" data-who="' + who + '" title="' + tip + '" style="' + pos + '">' + img + mul + '</div>';
}
// Echo (seit 0.9): Jeder Kombo hinterlässt ein Echo in der Farbe der ersten Karte; der nächste Kombo erneuert es. Enthält der nächste Kombo eine Sekundärkarte in dieser Farbe, steigt seine Stufe um 1 (höchstens 3). Kein Marker im Sinne der Läuterung (nicht läuterbar). Der Echo-Marker gehört zum analogen Spiel; digital leuchtet seit 0.9.4 die Schlange der Echo-Farbe auf dem Magie-Board und sendet Wellen aus (EchoWave in 12a-echo-welle.js, aufgerufen in boardHTML).
function deathTokens(s, who) {   // seit 0.7.2.11 ein Token mit Zähler statt mehrerer Tokens
  const N = s.death || 0; if (N <= 0) return '';
  const L = lfCtx(), sel = L ? L.picks.filter(p => p === who + 'd').length : 0, mul = N > 1 ? '<b class="mul">×' + N + '</b>' : '';
  const q = deathPos(who, 0, markCounts(s).total), pos = 'left:' + q.x + 'px;top:' + q.y + 'px;--r:' + q.rot + 'deg', tip = 'Todesmarker ×' + N + ': ' + N + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.';
  return L ? '<button class="deathtok lf' + (sel ? ' sel' : '') + '" data-who="' + who + '" data-act="lfm" data-k="' + who + 'd" title="Läuterung: Todesmarker wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + N + ' gewählt." style="' + pos + '"><img src="' + IMG.curse + '">' + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
    : '<div class="deathtok" data-who="' + who + '" title="' + tip + '" style="' + pos + '"><img src="' + IMG.curse + '">' + mul + '</div>';
}
