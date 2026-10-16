/* ---------- Hilfen ---------- */
const FAST = /[?&]fast/.test(location.search);
const sleep = ms => new Promise(r => setTimeout(r, FAST ? 4 : ms));
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
const MAX_MARKS = 3;   // Anzahl der Totenkopf-Plätze neben dem Limit
function marks(n, cls) { let t = ''; for (let i = 0; i < MAX_MARKS; i++) t += '<img class="mkimg' + (cls ? ' ' + cls : '') + (i < n ? '' : ' off') + '" src="' + IMG.curse + '">'; return t; }
// Todes-Fluch (Ultimate): HP-Verlust am Ende jeder eigenen Angriffsphase, bis Kampfende.
function deathBadge(s) { return s.death > 0 ? '<span class="mr" title="Todesmarker ×' + s.death + ': ' + s.death + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Lifeflow kann einzelne Marker entfernen.">' + '☠'.repeat(s.death) + '</span>' : ''; }
// Spiegelmarker (Control): je Element ein Stein neben dem Handbrett, mit Zähler ab 2 Stück.
function mirrorStack(s, x, y, who) {
  if (!(s.mirror > 0)) return '';
  const L = who ? lfCtx() : null;
  let t = '';
  for (const e of M.ELEMENTS) {
    const n = (s.mirrorEl && s.mirrorEl[e]) || 0; if (n <= 0) continue;
    const tip = 'Spiegel ' + M.NAMES[e] + ' ×' + n + ': Gegen einen ' + M.NAMES[e] + '-Angriff wirkt automatisch ein Marker, sobald du dich verteidigst (mit mindestens einer Elementkarte, egal in welcher Farbe; die Kosten bleiben wie ohne Spiegel): Er wirft 1 Schaden auf den Angreifer zurück und wird verbraucht. Wer keine Verteidigung ausführt (Erholen), löst den Spiegel nicht aus.';
    const shield = IMG['shield_' + e], mul = n > 1 ? '<b class="mul">×' + n + '</b>' : '';   // Schildbild je Farbe, bei mehreren Markern mit Multiplikator
    if (L) {
      const sel = L.picks.filter(p => p === who + 'm:' + e).length;
      t += shield ? '<button class="msh ' + e + ' lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'm" data-e="' + e + '" title="Lifeflow: Spiegelmarker ' + M.NAMES[e] + ' wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt."><img src="' + shield + '">' + mul + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>'
        : '<button class="mtok ' + e + ' lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="' + who + 'm" data-e="' + e + '" title="Lifeflow: Spiegelmarker ' + M.NAMES[e] + ' wählen (Klick: einen mehr, nach dem Maximum wieder alle weg). ' + sel + ' von ' + n + ' gewählt.">' + n + (sel ? '<i class="lfb">✓' + sel + '</i>' : '') + '</button>';
    } else t += shield ? '<div class="msh ' + e + '" title="' + tip + '"><img src="' + shield + '">' + mul + '</div>' : '<div class="mtok ' + e + '" title="' + tip + '">' + n + '</div>';
  }
  return '<div class="mirstack" style="left:' + x + 'px;top:' + y + 'px">' + t + '</div>';
}
// Marker-Symbole (Totenköpfe/Flüche); im Lifeflow-Angriff anklickbar, gewählte leuchten
function markIcons(n, kind, L, cls) {
  const sel = L ? L.picks.filter(p => p === kind).length : 0; let t = '';
  for (let i = 0; i < MAX_MARKS; i++) {
    const img = '<img class="mkimg' + (cls ? ' ' + cls : '') + (i < n ? '' : ' off') + '" src="' + IMG.curse + '">';
    t += L && i < n ? '<button class="mkb lf' + (i < sel ? ' sel' : '') + '" data-act="lfm" data-k="' + kind[0] + kind[1] + '" data-i="' + i + '" title="Lifeflow: diesen Marker wählen oder abwählen">' + img + '</button>' : img;
  }
  return t;
}
function markCol(s, who) {   // Todesmarker neben dem Limit; im Läuterungs-Angriff anklickbar
  const L = who ? lfCtx() : null;
  return '<span class="mkcol"><span class="mk" title="Todesmarker: ' + (s.death || 0) + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Läuterung kann Marker entfernen.">' + (who ? markIcons(s.death || 0, who + 'd', L) : marks(s.death || 0)) + '</span></span>';
}
