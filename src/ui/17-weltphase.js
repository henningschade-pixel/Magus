/* ---------- Weltphase: Händler, Monster ---------- */
function vendorPanel() {
  const p = G.players[ME];
  const offers = M.vendorOffers(G, ME);
  const can = myTurn();
  let h = '<h3>Händler</h3>';
  {   // Vorrat: wie viele Karten jeder Art der Händler noch hat; vergriffene sind abgedunkelt, kaufbare golden gerahmt (die Stufe-1-Karten immer, solange der Vorrat reicht)
    h += '<div class="stock">';
    ['F', 'E', 'W'].forEach(e => [1, 2, 3].forEach(t => {
      const id = e + t, n = G.supply ? G.supply[id] : Infinity, freeI = offers.findIndex(o => o.free && o.result === id), buy = offers.filter(o => !o.free && o.available && o.result === id);
      const canBuy = can && n > 0 && (t === 1 ? freeI >= 0 : buy.length > 0), locked = n > 0 && (G.players[ME].stats.mag[e] || 0) < t;
      const tip = n <= 0 ? 'vergriffen' : locked ? 'gesperrt: Magie ' + M.NAMES[e] + ' Stufe ' + t + ' nötig (noch ' + n + ')' : t === 1 ? 'gratis, noch ' + n : canBuy ? buy.map(o => o.cost.join(' + ') + ' → ' + id).join(' oder ') + ' (noch ' + n + ')' : 'noch ' + n;
      const act = !canBuy ? '' : t === 1 ? ' data-act="vendor" data-i="' + freeI + '"' : ' data-act="vendorres" data-r="' + id + '"';
      h += '<div class="stk' + (n > 0 ? '' : ' out') + (locked ? ' lock' : '') + (canBuy || (t === 1 && n > 0) ? ' buy' : '') + '" data-stk="' + id + '"' + act + ' title="' + tip + '">' + thumb(id) + '<b>' + (n === Infinity ? '∞' : n > 0 ? '×' + n : 'weg') + '</b></div>';
    }));
    h += '</div>';
  }
  return '<div class="panel" style="' + box(LAYOUT.vendor, 'overflow-y:auto') + '">' + h + '</div>';
}
function monsterCards() {
  let h = '';
  const my = myTurn(), R = LAYOUT.monsters;
  M.ELEMENTS.forEach((e, i) => {
    const m = G.monsters[e], alive = M.monsterAlive(m), st = m.stats;
    const gone = !alive && m.retreated, img = alive || gone ? IMG['m_' + m.el.toLowerCase() + m.stage] : IMG['d_' + m.el.toLowerCase()];   // zurückgezogenes Monster: eigenes Bild, durchscheinend
    h += '<div class="mon ' + (alive ? '' : gone ? 'dead gone' : 'dead') + '" style="left:' + (R.left + i * R.step) + 'px;top:' + R.top + 'px;width:' + R.w + 'px;height:' + R.h + 'px;padding:10px 8px"><img class="pic" src="' + img + '" style="width:172px;height:196px">' +
      '<div class="nm ' + m.el + '">' + esc(m.name) + '</div>' + (alive ? '<div class="sm' + (m.hints && m.hints.length ? ' mlabel' : '') + '" ' + (m.hints && m.hints.length ? 'title="' + esc((m.hints || []).join('\n')) + '" ' : '') + 'style="color:var(--gold);margin-top:-2px;height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.label ? esc(m.label) : '&nbsp;') + '</div>' : '');
    if (alive) {
      h += '<div class="sm">HP ' + st.hp + '/' + st.maxHp + '</div><div class="bar"><i style="width:' + st.hp / st.maxHp * 100 + '%"></i></div>' +
        '<div class="sm">Mana ' + st.mana + '/' + st.maxMana + '</div><div class="bar mana"><i style="width:' + st.mana / st.maxMana * 100 + '%"></i></div>' +
        '<div class="sm"><span class="dots F">' + dots(st.mag.F) + '</span> <span class="dots E">' + dots(st.mag.E) + '</span> <span class="dots W">' + dots(st.mag.W) + '</span></div>' +
        '<div class="sm vals" style="font-size:15px;white-space:nowrap" title="Die tatsächlichen Werte dieses Monsters: Ausspiellimit, Handkarten, Gratis-Nachziehen">Limit ' + st.limit + ' · Hand ' + M.monsterHand(m) + ' · Ziehen ' + (st.draws || 0) + '</div>' +
        '<button class="btn small" data-act="combat" data-e="' + e + '" ' + (my ? '' : 'disabled') + '>Kämpfen</button>';
    } else h += '<div class="sm" style="margin-top:12px">' + (gone ? 'hat gewonnen und sich zurückgezogen' : 'besiegt') + '</div>';
    h += '</div>';
  });
  return h;
}
