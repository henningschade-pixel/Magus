/* ---------- Weltphase: Bibliothek, Monster ---------- */
function vendorPanel() {
  const p = G.players[ME];
  const offers = M.vendorOffers(G, ME);
  const can = myTurn();
  let h = '<h3>Bibliothek</h3>';
  {   // Vorrat: wie viele Karten jeder Art die Bibliothek noch hat; vergriffene sind abgedunkelt, kaufbare golden gerahmt (die Stufe-1-Karten immer, solange der Vorrat reicht)
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
    const m = G.monsters[e], alive = M.monsterAlive(m), st = m.stats, b = m.base || { maxHp: st.maxHp, maxMana: st.maxMana, limit: st.limit, drawLimit: st.drawLimit || 1, hand: M.monsterHand(m) };   // Weltphase: unveränderte Standardwerte, die Würfel liegen darüber; im Kampf gelten die veränderten Werte
    const gone = !alive && m.retreated, img = alive || gone ? IMG['m_' + m.el.toLowerCase() + m.stage] : IMG['d_' + m.el.toLowerCase()];   // zurückgezogenes Monster: eigenes Bild, durchscheinend
    h += '<div class="mon ' + (alive ? '' : gone ? 'dead gone' : 'dead') + '" data-i="' + i + '" style="left:' + (R.left + i * R.step) + 'px;top:' + R.top + 'px;width:' + R.w + 'px;height:' + R.h + 'px;padding:4px 8px 10px"><img class="pic" src="' + img + '" style="width:156px;height:178px">' +
      '<div class="nm ' + m.el + '"' + (m.hints && m.hints.length ? ' title="' + esc(m.hints.join('\n')) + '"' : '') + '>' + esc(m.name) + '</div>';   // die Würfel liegen über dem Kämpfen-Knopf (DiceBoard, LAYOUT.monsters.diceY)
    if (alive) {
      const hpNow = Math.max(1, b.maxHp - (st.maxHp - st.hp)), manaNow = Math.max(0, b.maxMana - (st.maxMana - st.mana));   // Würfel ändern die Höchstwerte; ein erlittener Verlust (Höchstwert minus Stand) wird auf die Standardwerte übertragen, ein unversehrtes Monster zeigt also volle Standardwerte
      h += '<div class="sm">HP ' + hpNow + '/' + b.maxHp + '</div><div class="bar"><i style="width:' + hpNow / b.maxHp * 100 + '%"></i></div>' +
        '<div class="sm">Mana ' + manaNow + '/' + b.maxMana + '</div><div class="bar mana"><i style="width:' + manaNow / b.maxMana * 100 + '%"></i></div>' +
        '<div class="sm"><span class="dots F">' + dots(b.mag ? b.mag.F : st.mag.F) + '</span> <span class="dots E">' + dots(b.mag ? b.mag.E : st.mag.E) + '</span> <span class="dots W">' + dots(b.mag ? b.mag.W : st.mag.W) + '</span></div>' +
        '<div class="sm vals" style="font-size:15px;white-space:nowrap" title="Standardwerte ohne Würfel: Ausspiellimit, Handkarten, Nachziehlimit. Im Kampf gelten die Werte mit den Würfeln.">Limit ' + b.limit + ' · Hand ' + b.hand + ' · Ziehen ' + b.drawLimit + '</div>' +
        '<button class="btn small" data-act="combat" data-e="' + e + '" ' + (my ? '' : 'disabled') + '>Kämpfen</button>';
    } else h += '<div class="sm" style="margin-top:12px">' + (gone ? 'hat gewonnen und sich zurückgezogen' : 'besiegt') + '</div>';
    h += '</div>';
  });
  return h;
}
