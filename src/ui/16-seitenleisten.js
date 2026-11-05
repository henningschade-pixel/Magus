/* ---------- Seitenleisten ---------- */
// Knopf so setzen, dass die MITTE SEINER SCHEIBE auf (cx, cy) liegt (Durchmesser diam). Die Grafiken haben die Scheibe nicht in der Bildmitte:
// goldene Münz-Scheibe (goldup, 128 × 128): Scheibe Ø 106 in der Mitte; Plus-Scheibe (plusg, 64 × 71): Ø 61, Mitte bei (32,5 | 31), darunter Schatten.
function discBox(gold, cx, cy, diam) {
  if (gold) { const s = diam * 128 / 106; return 'left:' + (cx - s / 2).toFixed(1) + 'px;top:' + (cy - s / 2).toFixed(1) + 'px;width:' + s.toFixed(1) + 'px;height:' + s.toFixed(1) + 'px'; }
  const bz = diam * 64 / 61, bh = bz * 71 / 64;
  return 'left:' + (cx - bz * 32.5 / 64).toFixed(1) + 'px;top:' + (cy - bz * 31 / 64).toFixed(1) + 'px;width:' + bz.toFixed(1) + 'px;height:' + bh.toFixed(1) + 'px';
}
// Magie-Board (seit 0.6: dreifacher Ouroboros). Die Grafik ist 1254 × 1254 mit der Ringmitte in der Bildmitte; die Edelsteine (Stufe 1 innen, Stufe 3 außen) liegen bei diesen Bildpunkten, Radius 31. Erreichte Stufen leuchten, die übrigen sind abgedunkelt; die Siegpunkte stehen in der freien Mitte.
const BOARD_GEMS = { F: [[628, 397], [628, 311], [628, 222]], E: [[828.6, 750.5], [909.5, 789.3], [987.3, 834.6]], W: [[422, 750], [342, 786.4], [267.8, 832]] };
const BOARD_PX = 1254, BOARD_GEM_R = 33;
function boardHTML(mag, size, sp) {
  const k = size / BOARD_PX, dr = BOARD_GEM_R * k;
  let h = '<div class="bd" style="width:' + size + 'px;height:' + size + 'px" title="Magie: Feuer oben, Erde rechts unten, Wasser links unten"><img src="' + IMG.board + '">';
  for (const e of ['F', 'E', 'W']) BOARD_GEMS[e].forEach(([gx, gy], i) => {
    const lv = i + 1;
    h += '<i class="rg ' + (lv <= mag[e] ? 'on' : 'off') + '" data-e="' + e + '" data-lv="' + lv + '" style="left:' + (gx * k - dr).toFixed(1) + 'px;top:' + (gy * k - dr).toFixed(1) + 'px;width:' + (2 * dr).toFixed(1) + 'px;height:' + (2 * dr).toFixed(1) + 'px"></i>';
  });
  if (sp != null) h += '<div class="bsp" title="Siegpunkte" style="font-size:' + (size * 0.17).toFixed(1) + 'px"><span>★</span><b>' + sp + '</b></div>';
  return h + '</div>';
}
// HP (links, rot) und Mana (rechts, blau) als gebogene Linien neben der Magiescheibe: je ein Bogen von 90 Grad, von unten nach oben gefüllt; feine Kerben trennen die einzelnen Punkte.
function arcsHTML(s, bsz, pad, R) {
  const W = bsz + 2 * pad, cx = W / 2, cy = bsz / 2, sw = 6;
  const pt = deg => { const t = deg * Math.PI / 180; return (cx + R * Math.cos(t)).toFixed(1) + ' ' + (cy + R * Math.sin(t)).toFixed(1); };
  const arc = (a1, a2, sweep, v, mx, cls, title) => {
    const d = 'M' + pt(a1) + ' A' + R + ' ' + R + ' 0 0 ' + sweep + ' ' + pt(a2), L = 100 / Math.max(1, mx), g = 1.4, pct = Math.max(0, Math.min(1, v / Math.max(1, mx))) * 100;
    return '<path class="arcbg" d="' + d + '" pathLength="100" stroke-width="' + sw + '"><title>' + title + '</title></path>' +
      '<path class="arcv ' + cls + '" d="' + d + '" pathLength="100" stroke-width="' + sw + '" stroke-dasharray="' + pct.toFixed(2) + ' 100"/>' +
      '<path class="arcsep" d="' + d + '" pathLength="100" stroke-width="' + (sw + 2) + '" stroke-dasharray="' + g + ' ' + (L - g).toFixed(3) + '" stroke-dashoffset="' + (g / 2).toFixed(2) + '"/>';
  };
  return '<svg class="arcs" width="' + W + '" height="' + bsz + '" viewBox="0 0 ' + W + ' ' + bsz + '">' +
    arc(135, 225, 1, Math.max(0, s.hp), s.maxHp, 'hp', 'HP ' + Math.max(0, s.hp) + '/' + s.maxHp) +
    arc(45, -45, 0, s.mana, s.maxMana, 'mana', 'Mana ' + s.mana + '/' + s.maxMana) + '</svg>';
}
function statsBlock(name, s, p, size, up, full) {
  const img = k => '<img src="' + IMG[k] + '">', compact = !full;
  const mk = '', mr = '';
  const my = myTurn(), anyT = my, UF = M.upField(G), UC = UF === 'gold' ? 'gc' : 'pt', one = M.payTxt(G, UF, 1), pend = up ? s[UF] : 0, lc = up ? M.limitStepCost(G, s) : 1, mc = up ? M.manaStepCost(G, s) : 1, hc = up ? M.hpStepCost(G, s) : 1;
  const pl = (ok, w, title, attr) => ok ? '<button class="up ' + UC + '" data-act="' + (attr || 'spend') + '" ' + (attr ? 'data-e' : 'data-w') + '="' + w + '" title="' + title + '"></button>' : '';
  // Schritte, die mehr als 1 Upgrade-Punkt kosten, bleiben sichtbar (abgedunkelt, solange die Punkte fehlen) und tragen eine Kostenzahl.
  const plc = (show, afford, w, label, c) => !show ? '' : '<button class="up ' + UC + (c > 1 ? ' costly' : '') + (afford ? '' : ' off') + '" data-act="spend" data-w="' + w + '"' + (c > 1 ? ' data-c="' + c + '"' : '') + (afford ? '' : ' disabled') + ' title="' + label + ' (' + M.payTxt(G, UF, c) + (afford ? '' : UF === 'gold' ? ', dir fehlt Gold' : ', dir fehlen Punkte') + ')"></button>';
  const hpPl = M.maxed(s, 'hp') ? '' : hc > 1 ? plc(up && anyT && pend > 0, pend >= hc, 'hp', '+' + (G.rules.hpPerPoint || 1) + ' max. HP', hc) : pl(up && anyT && pend > 0, 'hp', '+' + (G.rules.hpPerPoint || 1) + ' max. HP (' + one + ')');
  const manaPl = M.maxed(s, 'mana') ? '' : mc > 1 ? plc(up && anyT && pend > 0, pend >= mc, 'mana', '+1 max. Mana', mc) : pl(up && anyT && pend > 0, 'mana', '+1 max. Mana (' + one + ')');
  const limPl = lc > 1 ? plc(up && anyT && pend > 0 && s.limit < M.MAX_LIMIT, pend >= lc, 'limit', '+1 Ausspiellimit', lc) : pl(up && anyT && pend >= lc && s.limit < M.MAX_LIMIT, 'limit', '+1 Ausspiellimit (' + one + ')');
  const lead = b => compact ? '' : '<span class="lead">' + (b || '') + '</span>';   // Upgrade-Knöpfe stehen links neben dem Symbol; ohne Knöpfe schrumpft die Spalte auf 0 (Ausrichtung wie beim Gegner)
  // Opfern: goldener Münzknopf links neben dem Gold (wie die Upgrade-Knöpfe, die Zahl als Plakette erst ab 2; bei 0 transparent, seit 0.5.6.6); die Pfeile ◀ ▶ daneben stellen die Anzahl ein
  let sacCoin = '', sacArr = '', sacArr2 = '';
  if (!compact && p && up && s.gold >= 1) {
    const n = Math.max(0, Math.min(sacN, s.gold, 4)), pv = M.previewTemple(p, n), okS = my && n > 0;
    sacCoin = '<button class="up gc sacbtn' + (n > 1 ? ' costly' : '') + (n === 0 ? ' sac0' : '') + (okS ? '' : ' off') + '" data-act="temple" data-n="' + n + '"' + (n > 1 ? ' data-c="' + n + '"' : '') + (okS ? '' : ' disabled') + ' title="Opfern: ' + n + ' Gold im Tempel (+' + pv.points + ' Punkte → ' + (pv.gained ? '+' + pv.gained + ' Upgrade' : 'kein Upgrade') + '). Tempel: Punkte ' + p.temple.points + ', Stufe ' + p.temple.level + ', nächste Stufe kostet ' + M.nextLevelCost(p.temple.level) + '"></button>';
    sacArr = '<button class="arr" data-act="sacdn" title="Weniger opfern"' + (n > 0 ? '' : ' disabled') + '>◀</button>';
    sacArr2 = '<button class="arr" data-act="sacup" title="Mehr opfern"' + (n < Math.min(s.gold, 4) ? '' : ' disabled') + '>▶</button>';
  }
  const hasUp = !compact && !!(hpPl || manaPl || limPl || sacCoin);
  const hp = '<div class="statrow">' + lead(hpPl) + img('hp') + '<b data-pv="hp">' + Math.max(0, s.hp) + '/' + s.maxHp + '</b></div>';
  const mana = '<div class="statrow">' + lead(manaPl) + img('mana') + '<b data-pv="mana">' + s.mana + '/' + s.maxMana + '</b></div>';
  let h = '<h3><span class="hdr"><span class="hn">' + name + '</span>@@T@@@@G@@</span></h3><div class="sbody' + (hasUp ? ' hasup' : '') + (sacCoin ? ' hassac' : '') + '"' + (compact ? '' : ' data-lead="1"') + '><div class="scol">';
  let ptsHdr = '';
  if (p) {   // offene Upgrade-Punkte, dahinter als Bruch der Fortschritt zur nächsten Tempelstufe; das Ergebnis eines Opfers zeigt die Vorschau beim Überfahren des Opfern-Knopfes
    const lvl = p.temple.level;
    const tip = 'Offene Upgrade-Punkte (aufgespart). Der Bruch ist der Fortschritt zur nächsten Tempelstufe: ' + p.temple.points + ' von ' + M.nextLevelCost(lvl) + ' Punkten (Tempelstufe ' + lvl + ').';
    ptsHdr = '<span class="pendhdr" title="' + tip + '">Punkte <b data-pv="pts">' + s.pending + '</b> <span class="mx" data-pv="frac">' + fracHTML(p.temple.points, lvl) + '</span></span>';
  }
  h = h.replace('@@G@@', ptsHdr);
  if (compact) {
    h += '<div class="statrow">' + img('gold') + '<b data-pv="gold">' + s.gold + '</b></div>' + hp + mana;   // gleiche Reihenfolge wie beim Spieler: Gold, HP, Mana, Limit
    h += '<div class="statrow">' + img('limit') + '<b data-pv="limit">' + s.limit + '</b>' + mk + mr + '</div>';
  } else {
    const ph = '<span class="up ph"></span>';
    const tempRow = '';
    h = h.replace('@@T@@', tempRow);
    h += '<div class="statrow">' + lead(sacArr + sacCoin + sacArr2) + img('gold') + '<b data-pv="gold">' + s.gold + '</b></div>' + hp + mana;
    h += '<div class="statrow">' + lead(limPl) + img('limit') + '<b data-pv="limit">' + s.limit + '</b>' + mk + mr + '</div>';
  }
  h = h.replace('@@G@@', '').replace('@@T@@', '');
  const bsz = size || 140;
  let bd = boardHTML(s.mag, bsz, p ? p.sp : null);
  if (up && my) {
    const dir = { F: -90, E: 30, W: 150 }, diam = 26;   // Richtung wie die Ringe auf dem Brett (Linie von der Mitte durch die Magie); die Scheibe misst 26 px und liegt ganz auf dem äußeren Randband des Bretts (Band von 0,431 bis 0,475 der Bildgröße)
    let btn = '';
    for (const e of M.ELEMENTS) {
      const MF = M.magicField(G), lv = s.mag[e], mc = M.magicCost(G, lv, s), ok = s[MF] >= mc; if (lv >= M.MAX_MAGIC || s[MF] <= 0) continue;   // wie die Upgrade-Knöpfe: sichtbar, sobald die Währung (Gold, mit swapCosts Upgrade-Punkte) da ist; zu teure Stufen durchscheinend und gesperrt
      const ang = dir[e] * Math.PI / 180, r = bsz * 0.405;   // seit 0.6: Mitte der Scheibe auf dem Drachenkörper in Richtung der Magie, knapp außerhalb des äußeren Kupferrings (Radius 0,32 der Bildgröße)
      const x = bsz / 2 + Math.cos(ang) * r, y = bsz / 2 + Math.sin(ang) * r;
      btn += '<button class="up mg ' + (MF === 'gold' ? 'gd' : 'pt') + (mc > 1 ? ' costly' : '') + (ok ? '' : ' off') + '"' + (mc > 1 ? ' data-c="' + mc + '"' : '') + (ok ? '' : ' disabled') + ' style="' + discBox(MF === 'gold', x, y, diam) + '" data-act="magic" data-e="' + e + '" title="' + NAMES[e] + ' Stufe ' + (lv + 1) + ' kaufen (' + M.payTxt(G, MF, mc) + (ok ? '' : ', du hast ' + s[MF]) + ')"></button>';
    }
    bd = bd.replace(/<\/div>$/, btn + '</div>');
  }
  const aR = bsz / 2 + 11, aPad = Math.ceil(aR - bsz / 2 + 4);   // Bögen: beim Spieler außerhalb der Magie-Knöpfe, beim Gegner dicht am Brett
  h += '</div><div class="bcol"><div class="bwrap" style="width:' + (bsz + 2 * aPad) + 'px;height:' + bsz + 'px">' + arcsHTML(s, bsz, aPad, aR) + bd.replace('<div class="bd" style="', '<div class="bd" style="left:' + aPad + 'px;') + '</div></div></div>';
  return h;
}
// Monstername mit Besonderheit; die Beschreibung erscheint beim Darüberfahren, für beide Spieler.
function monLabel(m) {
  return m && m.label ? ' <span class="mlabel" title="' + esc((m.hints || []).join('\n')) + '" style="font-size:15px;color:var(--gold);font-weight:400">' + esc(m.label) + '</span>' : '';
}
function sideName(sd, suffix) {
  if (sd.kind !== 'monster') return esc(sd.name);
  const m = sd.monster, tip = m && m.hints && m.hints.length ? ' title="' + esc(m.hints.join('\n')) + '"' : '';   // Besonderheiten nur als Hinweis beim Darüberfahren, nicht im Namen (spart Platz)
  return '<span' + tip + '>' + esc(sd.name) + '</span>' + esc(suffix);
}
function sidePanels(cx) {
  let me, op;
  if (cx.combat) {
    const a = cx.mine, b = cx.theirs;
    me = statsBlock(sideName(a, ' (du führst es)'), a.stats, a.kind === 'player' ? G.players[a.ctrl] : null, LAYOUT.boardMe, false, true);
    op = statsBlock(sideName(b, ''), b.stats, b.kind === 'player' ? G.players[b.ctrl] : null, LAYOUT.boardOpp);
  } else {
    me = statsBlock(esc(G.players[ME].name), G.players[ME].stats, G.players[ME], LAYOUT.boardMe, true, true);
    op = statsBlock(esc(G.players[OPP].name), G.players[OPP].stats, G.players[OPP], LAYOUT.boardOpp);
  }
  return '<div class="panel" style="' + box(LAYOUT.mePanel, 'padding:6px 12px') + '">' + me + '</div>' +
    '<div class="panel" style="' + box(LAYOUT.oppPanel, 'padding:6px 12px;font-size:16px') + '">' + op.replace(/<h3>/, '<h3 style="font-size:17px;margin-bottom:2px">') + '</div>';
}
