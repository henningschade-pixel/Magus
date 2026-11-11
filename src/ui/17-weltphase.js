/* ---------- Weltphase: Bibliothek (links), Tempel (rechts), Monster ---------- */
function libraryPanel() {
  const p = G.players[ME];
  const offers = M.vendorOffers(G, ME);
  const can = myTurn();
  let h = '<h3>Bibliothek</h3>';
  {   // Vorrat: wie viele Karten jeder Art die Bibliothek noch hat; vergriffene sind abgedunkelt, kaufbare golden gerahmt (die Stufe-1-Karten immer, solange der Vorrat reicht)
    h += '<div class="stock">';
    ['F', 'E', 'W'].forEach(e => [1, 2, 3].forEach(t => {
      const id = e + t, n = G.supply ? G.supply[id] : Infinity, freeI = offers.findIndex(o => o.free && o.result === id), buy = offers.filter(o => !o.free && o.available && o.result === id);
      const canBuy = can && n > 0 && (t === 1 ? freeI >= 0 : buy.length > 0);
      const tip = n <= 0 ? 'vergriffen' : t === 1 ? 'gratis, noch ' + n : canBuy ? buy.map(o => o.cost.join(' + ') + ' → ' + id).join(' oder ') + ' (noch ' + n + ')' : 'noch ' + n;
      const act = !canBuy ? '' : t === 1 ? ' data-act="vendor" data-i="' + freeI + '"' : ' data-act="vendorres" data-r="' + id + '"';
      h += '<div class="stk' + (n > 0 ? '' : ' out') + (canBuy || (t === 1 && n > 0) ? ' buy' : '') + '" data-stk="' + id + '"' + act + ' title="' + tip + '">' + thumb(id) + '<b>' + (n === Infinity ? '∞' : n > 0 ? '×' + n : 'weg') + '</b></div>';
    }));
    h += '</div>';
  }
  return '<div class="panel libpanel" style="' + box(LAYOUT.library, 'overflow-y:auto') + '">' + h + '</div>';
}
// Tempel (seit 0.11): Punktefortschritt beider Spieler auf einem Raster aus Feldern 0, 1, 2, 3 … (zeilenweise gezählt). Die Punktzahlen, bei denen eine neue Tempelstufe beginnt
// (1, 3, 6, 10, 15, 21 … = k(k+1)/2), sind golden hervorgehoben. Runde Marker zeigen, wo die Spieler stehen (eigener golden, Gegner grau); der durchscheinende grüne Marker und die grün gestrichelten Felder
// zeigen, wohin das eingestellte Opfer (Pfeile am Gold, sacN) den eigenen Stein bringen würde. Die Magie ganz auszubauen kostet 6 Käufe zu 1 + 2 + … + 6 = 21 Upgrade-Punkte,
// also Tempelstufe 21 = 231 Punkte (weitere Upgrade-Punkte werden zu Siegpunkten); das Raster reicht deshalb bis Feld 231 und zeigt immer nur so viele Felder, wie die Steine brauchen (die Felder werden mit dem Fortschritt kleiner).
const TEMPLE_FULL = 21;   // Tempelstufe, die für den vollen Magieausbau nötig ist (6 Käufe zu 1 bis 6 Upgrade-Punkten)
const templeTotal = p => p.temple.level * (p.temple.level + 1) / 2 + p.temple.points;   // alle Tempelpunkte bisher (Stufe k hat k Punkte gekostet, die Schwelle der Stufe k liegt bei k(k+1)/2)
const templeRow = t => { let r = 0; while ((r + 1) * (r + 2) / 2 <= t) r++; return r; };   // Tempelstufe, in der die Punktzahl t liegt
function markerHTML(cls, d, x, y, tip) {   // einfacher runder Marker; (x, y) = Mitte
  return '<div class="mk ' + cls + '" style="width:' + d + 'px;height:' + d + 'px;left:' + (x - d / 2).toFixed(1) + 'px;top:' + (y - d / 2).toFixed(1) + 'px" title="' + esc(tip) + '"></div>';
}
function templePanel() {
  const me = G.players[ME], op = G.players[OPP], s = me.stats;
  const n = Math.max(0, Math.min(sacN, s.gold)), pv = M.previewTemple(me, n);   // eingestelltes Opfer (wie am Opfern-Knopf, höchstens so viel wie Gold da ist)
  const tMe = templeTotal(me), tOp = templeTotal(op), tNew = tMe + pv.points;
  const lastLv = Math.max(templeRow(tMe), templeRow(tOp), templeRow(tNew));
  const maxLv = Math.min(TEMPLE_FULL, Math.max(10, lastLv + 3)), K = maxLv * (maxLv + 1) / 2 + 1;   // Felder 0 bis zur Schwelle der Stufe maxLv (mindestens Stufe 10 = 55, höchstens Stufe 21 = 231)
  let cols = 6, cs = 0;   // Spaltenzahl mit den größten Feldern in den Rahmen (306 × 296 px)
  for (let c = 6; c <= 24; c++) { const z = Math.floor(Math.min(46, 306 / c, 296 / Math.ceil(K / c))); if (z > cs) { cs = z; cols = c; } }
  const rows = Math.ceil(K / cols), pos = t => { t = Math.min(t, K - 1); return { r: Math.floor(t / cols), c: t % cols }; };
  let cells = '';
  for (let t = 0; t < K; t++) {
    const r = templeRow(t), lv = t > 0 && t === r * (r + 1) / 2, gain = n > 0 && t > tMe && t <= Math.min(tNew, K - 1), q = pos(t);
    const tip = t === 0 ? 'Start (0 Punkte)' : lv ? 'Tempelstufe ' + r + ' ab ' + t + ' Punkten' : t + ' Punkte (Tempelstufe ' + r + ')';
    cells += '<div class="tcell' + (lv ? ' lv' : '') + (t === 0 ? ' z' : '') + (gain ? ' gain' : '') + '" title="' + tip + '" style="left:' + q.c * cs + 'px;top:' + q.r * cs + 'px;width:' + cs + 'px;height:' + cs + 'px"><i style="font-size:' + Math.max(8, Math.round(cs * 0.3)) + 'px">' + t + '</i></div>';
  }
  const marks = [{ cls: 'op', t: tOp, tip: op.name + ': ' + tOp + ' Tempelpunkte (Stufe ' + op.temple.level + ')' }, { cls: 'me', t: tMe, tip: me.name + ': ' + tMe + ' Tempelpunkte (Stufe ' + me.temple.level + ')' }];
  if (n > 0) marks.push({ cls: 'gh', t: tNew, tip: 'Opfer von ' + n + ' Gold: ' + tNew + ' Tempelpunkte (Stufe ' + pv.level + ')' });
  const groups = {}; marks.forEach(m => { const q = pos(m.t); (groups[q.r + ',' + q.c] = groups[q.r + ',' + q.c] || []).push(Object.assign(m, q)); });
  const md = Math.max(10, Math.round(cs * 0.58));   // Markerdurchmesser (bei kleinen Feldern ragt der Marker über die Zahl)
  let stones = '';
  Object.values(groups).forEach(g => g.forEach((m, i) => {   // mehrere Marker auf demselben Feld stehen nebeneinander
    const off = g.length === 1 ? 0 : (i - (g.length - 1) / 2) * md * 0.7;
    stones += markerHTML(m.cls, md, m.c * cs + cs / 2 + off, m.r * cs + cs * 0.6, m.tip);
  }));
  const need = M.nextLevelCost(pv.level) - pv.pool;
  const info = n === 0 ? '' : '<b>' + n + ' Gold</b> opfern: <b class="pg">+' + pv.points + ' Punkt' + (pv.points === 1 ? '' : 'e') + '</b> (gesamt ' + tNew + ')<br>' +
    (pv.gained > 0 ? 'Stufe ' + me.temple.level + ' → <b class="pg">' + pv.level + '</b> (+' + pv.gained + ' Upgrade-Punkt' + (pv.gained === 1 ? '' : 'e') + ')' : 'Keine neue Stufe, noch ' + need + ' Punkt' + (need === 1 ? '' : 'e') + ' bis Stufe ' + (pv.level + 1));
  const tip = 'Tempel: Die goldenen Zahlen (1, 3, 6, 10, 15, 21 …) sind der Eintritt in die nächste Tempelstufe und geben je einen Upgrade-Punkt. Opfern von n Gold ergibt n(n+1)/2 Punkte. Die Magie ganz auszubauen kostet 21 Upgrade-Punkte (1 + 2 + … + 6), also Tempelstufe 21 = 231 Punkte.';
  return '<div class="panel tpanel" title="' + tip + '" style="' + box(LAYOUT.temple) + '"><h3>Tempel</h3>' +
    '<div class="tboard" style="width:' + cols * cs + 'px;height:' + rows * cs + 'px">' + cells + stones + '</div><div class="tinfo">' + info + '</div><div class="tup" title="Verfügbare Upgrade-Punkte je Spieler"><div class="me"><span>' + me.name + '</span><b>' + (me.stats.pending || 0) + '</b> Upgrade-Punkte</div><div class="op"><span>' + op.name + '</span><b>' + (op.stats.pending || 0) + '</b> Upgrade-Punkte</div></div></div>';
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
