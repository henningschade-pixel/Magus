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
function cardCurses() { return M.curses(G).cardCurses; }   // Fluchsystem „Karten“ (sonst Marker)
function marks(n, cls) { let t = ''; for (let i = 0; i < M.MAX_MARKS; i++) t += '<img class="mkimg' + (cls ? ' ' + cls : '') + (i < n ? '' : ' off') + '" src="' + IMG.curse + '">'; return t; }
// Todes-Fluch (Ultimate): HP-Verlust am Ende jeder eigenen Angriffsphase, bis Kampfende.
function deathBadge(s) { return s.death > 0 ? '<span class="mr" title="Todesmarker ×' + s.death + ': ' + s.death + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Lifeflow kann einzelne Marker entfernen.">' + '☠'.repeat(s.death) + '</span>' : ''; }
// Spiegelmarker (Control): je Element ein Stein neben dem Handbrett, mit Zähler ab 2 Stück.
function mirrorStack(s, x, y, who) {
  if (G.rules.controlMode !== 'mirror' || !(s.mirror > 0)) return '';
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
// (alt) Anzeige neben den Fluchmarkern, nicht mehr verwendet.
function mirrorBadge(s) {
  if (G.rules.controlMode !== 'mirror') return '';
  const n = s.mirror || 0, st = G.rules.mirrorStep || 0, mult = G.rules.mirrorMult || 1;
  const tip = 'Spiegel: ' + n + ' Marker. Gegen jeden Angriff in der Farbe eines Markers' + (G.rules.mirrorTrigger === 'any' ? '' : ' (verteidigt in dieser Farbe)') + (G.rules.mirrorFree ? ' (Angriffsfarbe ohne Mana, solange du den Spiegel ablegst)' : '') + ' legst du ' + (G.rules.mirrorChoice ? 'höchstens so viele Marker wie Schaden eingeht' : (st > 0 ? st + ' Marker' : 'alle Marker')) + ' ab: je ' + mult + ' Schaden je Marker auf den Angreifer' + (G.rules.mirrorHeal ? ', du heilst ' + G.rules.mirrorHeal + ' HP je Marker' : '') + (G.rules.mirrorMana ? ', +' + G.rules.mirrorMana + ' Mana je Marker für dich' : '') + (G.rules.mirrorDecay > 0 ? '. Ein Marker zerfällt je eigenem Zug.' : '.');
  return '<span class="mk mkm" title="' + tip + '">' + marks(n, 'mir') + '</span>';
}
// Marker untereinander: Fluchmarker (violett), Spiegelmarker (blau), Todes-Fluch als Text.
// Marker-Symbole (Totenköpfe/Flüche); im Lifeflow-Angriff anklickbar, gewählte leuchten
function markIcons(n, kind, L, cls) {
  const sel = L ? L.picks.filter(p => p === kind).length : 0; let t = '';
  for (let i = 0; i < M.MAX_MARKS; i++) {
    const img = '<img class="mkimg' + (cls ? ' ' + cls : '') + (i < n ? '' : ' off') + '" src="' + IMG.curse + '">';
    t += L && i < n ? '<button class="mkb lf' + (i < sel ? ' sel' : '') + '" data-act="lfm" data-k="' + kind[0] + kind[1] + '" data-i="' + i + '" title="Lifeflow: diesen Marker wählen oder abwählen">' + img + '</button>' : img;
  }
  return t;
}
function markCol(s, curseTip, who) {
  const L = who ? lfCtx() : null;
  if (G.rules.curses === 'deathcards') return '<span class="mkcol"><span class="mk" title="Todesmarker: ' + (s.death || 0) + ' HP Verlust am Ende jeder eigenen Angriffsphase bis Kampfende. Nur Lifeflow kann Marker entfernen.">' + (who ? markIcons(s.death || 0, who + 'd', L) : marks(s.death || 0)) + '</span></span>';
  return '<span class="mkcol"><span class="mk" title="' + curseTip + '">' + (who ? markIcons(s.marks || 0, who + 'c', L) : marks(s.marks || 0)) + '</span>' + deathBadge(s) + '</span>';
}
