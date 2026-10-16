/* ---------- Weltphase: Händler, Monster, Lager ---------- */
function vendorPanel() {
  const p = G.players[ME];
  const offers = M.vendorOffers(G, ME);
  const can = myTurn() && M.campAllowed(G, ME, 'vendor');
  let h = '<h3>Händler</h3>';
  if (!offers.some(o => !o.free)) h += '<div class="note" style="margin-top:6px">Für Aufwertungen: Karten aus deiner Hand markieren.</div>';
  h += '<div class="row" style="margin-bottom:8px;margin-top:6px">';
  offers.forEach((o, i) => { if (o.free) h += '<div class="vrow ' + (can ? '' : 'off') + '" data-act="vendor" data-i="' + i + '" title="Gratis">' + thumb(o.result) + '<span class="note">gratis</span></div>'; });
  h += '</div>';
  offers.forEach((o, i) => {
    if (o.free) return;
    h += '<div class="vrow ' + (can ? '' : 'off') + '" data-act="vendor" data-i="' + i + '">' + o.cost.map((c, k) => (k ? '<span class="plus">+</span>' : '') + thumb(c)).join('') + '<img class="ar" src="' + IMG.arrow + '">' + thumb(o.result) + '<span class="note" style="margin-left:auto">' + (o.cost.length === 2 ? 'zwei gleiche' : 'überlegenes Element') + '</span></div>';
  });
  if (cardCurses()) {   // Fluchkarten-System: Flüche per Weltaktion abwerfen (siehe docs/fluchkarten.md)
    const marked = p.deck.marks.filter(i => p.deck.hand[i] && M.parseCard(p.deck.hand[i].id).curse).length;
    h += '<div style="position:absolute;left:14px;right:14px;bottom:10px"><button class="btn small" style="width:100%" data-act="discard" ' + (myTurn() && !G.camp && marked ? '' : 'disabled') + '>Fluch abwerfen (markierte Flüche)</button></div>';
  }
  return '<div class="panel" style="' + box(LAYOUT.vendor, 'overflow-y:auto') + '">' + h + '</div>';
}
function monsterCards() {
  let h = '';
  const my = myTurn(), R = LAYOUT.monsters;
  M.ELEMENTS.forEach((e, i) => {
    const m = G.monsters[e], alive = M.monsterAlive(m), st = m.stats;
    const curses = m.deckIds.filter(x => x[0] === 'C').length, mk = st.marks || 0;
    const img = alive ? IMG['m_' + e.toLowerCase() + m.stage] : IMG['d_' + e.toLowerCase()];
    h += '<div class="mon ' + (alive ? '' : 'dead') + '" style="left:' + (R.left + i * R.step) + 'px;top:' + R.top + 'px;width:' + R.w + 'px;height:' + R.h + 'px;padding:10px 8px"><img class="pic" src="' + img + '" style="width:172px;height:196px">' +
      '<div class="nm ' + e + '">' + esc(m.name) + '</div>' + (alive ? '<div class="sm mlabel" ' + (m.label ? 'title="' + esc((m.hints || []).join('\n')) + '" ' : '') + 'style="color:var(--gold);margin-top:-2px;height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.label ? esc(m.label) : '&nbsp;') + '</div>' : '');
    if (alive) {
      h += '<div class="sm">HP ' + st.hp + '/' + st.maxHp + '</div><div class="bar"><i style="width:' + st.hp / st.maxHp * 100 + '%"></i></div>' +
        '<div class="sm">Mana ' + st.mana + '/' + st.maxMana + ' · Limit ' + st.limit + '</div><div class="bar mana"><i style="width:' + st.mana / st.maxMana * 100 + '%"></i></div>' +
        '<div class="sm"><span class="dots F">' + dots(st.mag.F) + '</span> <span class="dots E">' + dots(st.mag.E) + '</span> <span class="dots W">' + dots(st.mag.W) + '</span></div>' +
        '<div class="loot">Beute ' + st.gold + (cardCurses() ? ' · ' + curses + ' Flüche' : (mk ? ' · <span class="mk">' + marks(mk) + '</span>' : '')) + '</div>' +
        '<button class="btn small" data-act="combat" data-e="' + e + '" ' + (my && !G.camp ? '' : 'disabled') + '>Kämpfen</button>';
    } else h += '<div class="sm" style="margin-top:12px">' + 'besiegt' + '</div>';
    h += '</div>';
  });
  return h;
}
function campPanel() {
  const c = G.camp, my = myTurn();
  const left = i => c.remaining[i];
  let h = '<h3>Erholungsphase</h3><div class="note" style="font-size:17px;margin:4px 0 10px">Alle Monster sind besiegt. Jeder Spieler hat zwei Aktionen: Händler, Erholen oder Passen, jede höchstens einmal. Tempel, Magie und Upgrade-Punkte sind Bonusaktionen. Danach beginnt der Showdown mit neu gemischter, voller Hand.</div>';
  h += '<div class="statrow"><b style="min-width:120px">Du</b>' + left(ME) + ' Aktion' + (left(ME) === 1 ? '' : 'en') + ' übrig</div><div class="statrow"><b style="min-width:120px">' + esc(G.players[OPP].name) + '</b>' + left(OPP) + ' Aktion' + (left(OPP) === 1 ? '' : 'en') + ' übrig</div>';
  h += '<div class="btnrow" style="margin-top:18px"><button class="btn primary" data-act="recover" ' + (my && M.campAllowed(G, ME, 'recover') ? '' : 'disabled') + '>Erholen (+' + M.regenGain(G) + ' HP, +' + M.regenGain(G) + ' Mana)</button><button class="btn" data-act="pass" ' + (my ? '' : 'disabled') + '>Passen</button></div>';
  return '<div class="panel" style="' + box(LAYOUT.camp) + '">' + h + '</div>';
}
