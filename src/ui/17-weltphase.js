/* ---------- Weltphase: Händler, Monster ---------- */
function vendorPanel() {
  const p = G.players[ME];
  const offers = M.vendorOffers(G, ME);
  const can = myTurn();
  let h = '<h3>Händler</h3>';
  if (G.supply) {   // Vorrat: wie viele Karten jeder Art der Händler noch hat; vergriffene sind abgedunkelt
    h += '<div class="stock" title="Vorrat des Händlers. Getauschte Karten gehen zurück in den Vorrat.">';
    ['F', 'E', 'W'].forEach(e => [1, 2, 3].forEach(t => { const n = G.supply[e + t]; h += '<div class="stk' + (n > 0 ? '' : ' out') + '" title="' + (n > 0 ? 'noch ' + n + ' im Vorrat' : 'vergriffen') + '">' + thumb(e + t) + '<b>' + e + t + ' ' + (n > 0 ? '×' + n : 'weg') + '</b></div>'; }));
    h += '</div>';
  }
  if (!offers.some(o => !o.free)) h += '<div class="note" style="margin-top:6px">Für Aufwertungen: Karten aus deiner Hand markieren.</div>';
  h += '<div class="row" style="margin-bottom:8px;margin-top:6px">';
  offers.forEach((o, i) => { if (o.free) h += '<div class="vrow ' + (can && o.available ? '' : 'off') + '" data-act="vendor" data-i="' + i + '" title="' + (o.available ? 'Gratis' : 'vergriffen') + '">' + thumb(o.result) + '<span class="note">' + (o.available ? 'gratis' : 'weg') + '</span></div>'; });
  h += '</div>';
  offers.forEach((o, i) => {
    if (o.free) return;
    h += '<div class="vrow ' + (can && o.available ? '' : 'off') + '" data-act="vendor" data-i="' + i + '" title="' + (o.available ? 'noch ' + o.stock + ' im Vorrat' : 'vergriffen') + '">' + o.cost.map((c, k) => (k ? '<span class="plus">+</span>' : '') + thumb(c)).join('') + '<img class="ar" src="' + IMG.arrow + '">' + thumb(o.result) + '<span class="note" style="margin-left:auto">' + (o.available ? (o.cost.length === 2 ? 'zwei gleiche' : 'überlegenes Element') + (G.supply ? ' · noch ' + o.stock : '') : 'vergriffen') + '</span></div>';
  });
  return '<div class="panel" style="' + box(LAYOUT.vendor, 'overflow-y:auto') + '">' + h + '</div>';
}
function monsterCards() {
  let h = '';
  const my = myTurn(), R = LAYOUT.monsters;
  M.ELEMENTS.forEach((e, i) => {
    const m = G.monsters[e], alive = M.monsterAlive(m), st = m.stats;
    const img = alive ? IMG['m_' + e.toLowerCase() + m.stage] : IMG['d_' + e.toLowerCase()];
    h += '<div class="mon ' + (alive ? '' : 'dead') + '" style="left:' + (R.left + i * R.step) + 'px;top:' + R.top + 'px;width:' + R.w + 'px;height:' + R.h + 'px;padding:10px 8px"><img class="pic" src="' + img + '" style="width:172px;height:196px">' +
      '<div class="nm ' + e + '">' + esc(m.name) + '</div>' + (alive ? '<div class="sm mlabel" ' + (m.label ? 'title="' + esc((m.hints || []).join('\n')) + '" ' : '') + 'style="color:var(--gold);margin-top:-2px;height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.label ? esc(m.label) : '&nbsp;') + '</div>' : '');
    if (alive) {
      h += '<div class="sm">HP ' + st.hp + '/' + st.maxHp + '</div><div class="bar"><i style="width:' + st.hp / st.maxHp * 100 + '%"></i></div>' +
        '<div class="sm">Mana ' + st.mana + '/' + st.maxMana + ' · Limit ' + st.limit + '</div><div class="bar mana"><i style="width:' + st.mana / st.maxMana * 100 + '%"></i></div>' +
        '<div class="sm"><span class="dots F">' + dots(st.mag.F) + '</span> <span class="dots E">' + dots(st.mag.E) + '</span> <span class="dots W">' + dots(st.mag.W) + '</span></div>' +
        '<div class="loot">Beute ' + st.gold + '' + '</div>' +
        '<button class="btn small" data-act="combat" data-e="' + e + '" ' + (my ? '' : 'disabled') + '>Kämpfen</button>';
    } else h += '<div class="sm" style="margin-top:12px">' + 'besiegt' + '</div>';
    h += '</div>';
  });
  return h;
}
