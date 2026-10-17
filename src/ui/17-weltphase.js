/* ---------- Weltphase: Händler, Monster ---------- */
function vendorPanel() {
  const p = G.players[ME];
  const offers = M.vendorOffers(G, ME);
  const can = myTurn();
  let h = '<h3>Händler</h3>';
  if (G.supply) {   // Vorrat: wie viele Karten jeder Art der Händler noch hat; vergriffene sind abgedunkelt
    h += '<div class="stock" title="Vorrat des Händlers. Getauschte Karten gehen zurück in den Vorrat. Golden gerahmt: mit deinen markierten Karten kaufbar (Klick).">';
    ['F', 'E', 'W'].forEach(e => [1, 2, 3].forEach(t => {
      const id = e + t, n = G.supply[id], buy = offers.filter(o => !o.free && o.available && o.result === id), canBuy = can && buy.length > 0;
      const tip = n <= 0 ? 'vergriffen' : canBuy ? buy.map(o => o.cost.join(' + ') + ' → ' + id).join(' oder ') + ' (noch ' + n + ')' : 'noch ' + n + ' im Vorrat';
      h += '<div class="stk' + (n > 0 ? '' : ' out') + (canBuy ? ' buy' : '') + '"' + (canBuy ? ' data-act="vendorres" data-r="' + id + '"' : '') + ' title="' + tip + '">' + thumb(id) + '<b>' + id + ' ' + (n > 0 ? '×' + n : 'weg') + '</b></div>';
    }));
    h += '</div>';
  }
  if (!offers.some(o => !o.free)) h += '<div class="note" style="margin-top:6px">Für Aufwertungen: Karten aus deiner Hand markieren, kaufbare Karten leuchten golden.</div>';
  h += '<div class="row" style="margin-bottom:8px;margin-top:6px">';
  offers.forEach((o, i) => { if (o.free) h += '<div class="vrow ' + (can && o.available ? '' : 'off') + '" data-act="vendor" data-i="' + i + '" title="' + (o.available ? 'Gratis' : 'vergriffen') + '">' + thumb(o.result) + '<span class="note">' + (o.available ? 'gratis' : 'weg') + '</span></div>'; });
  h += '</div>';
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
