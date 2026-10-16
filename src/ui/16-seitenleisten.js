/* ---------- Seitenleisten ---------- */
function boardHTML(mag, size) {
  const dr = size * 0.036, orbit = size * 0.11, gap = size * 0.079;
  let h = '<div class="bd" style="width:' + size + 'px;height:' + size + 'px" title="Magie: Feuer oben, Erde rechts unten, Wasser links unten"><img src="' + IMG.board + '">';
  [['F', 0], ['E', 120], ['W', 240]].forEach(([e, a]) => {
    const ang = (a - 90) * Math.PI / 180;
    for (let lv = 1; lv <= 3; lv++) {
      const r = orbit + lv * gap, x = size / 2 + Math.cos(ang) * r, y = size / 2 + Math.sin(ang) * r;
      h += '<i class="rg' + (lv <= mag[e] ? ' on' : '') + '" data-e="' + e + '" data-lv="' + lv + '" style="left:' + (x - dr - 1) + 'px;top:' + (y - dr - 1) + 'px;width:' + (2 * dr + 2) + 'px;height:' + (2 * dr + 2) + 'px"></i>';
    }
  });
  return h + '</div>';
}
function statsBlock(name, s, p, size, up, full) {
  const img = k => '<img src="' + IMG[k] + '">', compact = !full;
  const lfc = lfCtx(), who = lfc ? (s === lfc.cx.myStats ? 's' : s === lfc.cx.oppStats ? 'o' : null) : null;
  const mk = markCol(s, who), mr = '';
  const my = myTurn(), anyT = my, pend = up ? s.pending : 0, lc = up ? M.limitStepCost(G, s) : 1, mc = up ? M.manaStepCost(G, s) : 1;
  const pl = (ok, w, title, attr) => ok ? '<button class="up pt" data-act="' + (attr || 'spend') + '" ' + (attr ? 'data-e' : 'data-w') + '="' + w + '" title="' + title + '"></button>' : '';
  const hpPl = pl(up && anyT && pend > 0, 'hp', '+' + (G.rules.hpPerPoint || 1) + ' max. HP (1 Upgrade-Punkt)');
  // Schritte, die mehr als 1 Upgrade-Punkt kosten, bleiben sichtbar (abgedunkelt, solange die Punkte fehlen) und tragen eine Kostenzahl.
  const plc = (show, afford, w, label, c) => !show ? '' : '<button class="up pt' + (c > 1 ? ' costly' : '') + (afford ? '' : ' off') + '" data-act="spend" data-w="' + w + '"' + (c > 1 ? ' data-c="' + c + '"' : '') + (afford ? '' : ' disabled') + ' title="' + label + ' (' + c + ' Upgrade-Punkt' + (c > 1 ? 'e' : '') + (afford ? '' : ', dir fehlen Punkte') + ')"></button>';
  const manaPl = mc > 1 ? plc(up && anyT && pend > 0, pend >= mc, 'mana', '+1 max. Mana', mc) : pl(up && anyT && pend > 0, 'mana', '+1 max. Mana (1 Upgrade-Punkt)');
  const limPl = lc > 1 ? plc(up && anyT && pend > 0 && s.limit < M.MAX_LIMIT, pend >= lc, 'limit', '+1 Ausspiellimit', lc) : pl(up && anyT && pend >= lc && s.limit < M.MAX_LIMIT, 'limit', '+1 Ausspiellimit (1 Upgrade-Punkt)');
  const sbar = (v, mx, cls) => '<div class="bar sb ' + cls + '"><i style="width:' + Math.max(0, v) / mx * 100 + '%"></i></div>';
  const lead = b => compact ? '' : '<span class="lead">' + (b || '') + '</span>';   // Upgrade-Knöpfe stehen links neben dem Symbol; ohne Knöpfe schrumpft die Spalte auf 0 (Ausrichtung wie beim Gegner)
  const hasUp = !compact && !!(hpPl || manaPl || limPl);
  const hp = '<div class="statrow">' + lead(hpPl) + img('hp') + '<b data-pv="hp">' + Math.max(0, s.hp) + '/' + s.maxHp + '</b>' + sbar(s.hp, s.maxHp, '') + '</div>';
  const mana = '<div class="statrow">' + lead(manaPl) + img('mana') + '<b data-pv="mana">' + s.mana + '/' + s.maxMana + '</b>' + sbar(s.mana, s.maxMana, 'mana') + '</div>';
  let h = '<h3><span class="hdr"><span class="hn">' + name + '</span>@@T@@@@G@@' + (p ? '<span class="hsp" title="Siegpunkte">★ <b>' + p.sp + '</b></span>' : '') + '</span></h3><div class="sbody' + (hasUp ? ' hasup' : '') + '"' + (compact ? '' : ' data-lead="1"') + '><div class="scol">';
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
    let sac = '', sacBtn = '';
    if (up && s.gold >= 1) {
      const can = my;
      const n = Math.max(0, Math.min(sacN, s.gold, 4)), pv = M.previewTemple(p, n);
      sacBtn = '<button class="btn small sacbtn" data-act="temple" data-n="' + n + '" ' + (can && n > 0 ? '' : 'disabled') + ' title="Tempel: Punkte ' + p.temple.points + ', Stufe ' + p.temple.level + ', nächste Stufe kostet ' + M.nextLevelCost(p.temple.level) + '">Opfern</button>';
      const stp = '<div class="stepper"><button class="arr" data-act="sacdn" ' + (n > 0 ? '' : 'disabled') + '>◀</button><b title="+' + pv.points + ' Punkte → ' + (pv.gained ? '+' + pv.gained + ' Upgrade' : 'kein Upgrade') + '">' + n + '</b><button class="arr" data-act="sacup" ' + (n < Math.min(s.gold, 4) ? '' : 'disabled') + '>▶</button></div>';
      sac = '<div class="sacbox">' + stp + sacBtn + '</div>';
    }
    const ph = '<span class="up ph"></span>';
    const tempRow = '';
    h = h.replace('@@T@@', tempRow);
    h += '<div class="statrow">' + lead('') + img('gold') + '<b data-pv="gold">' + s.gold + '</b>' + sac + '</div>' + hp + mana;
    h += '<div class="statrow">' + lead(limPl) + img('limit') + '<b data-pv="limit">' + s.limit + '</b>' + mk + mr + '</div>';
  }
  h = h.replace('@@G@@', '').replace('@@T@@', '');
  const bsz = size || 140;
  let bd = boardHTML(s.mag, bsz);
  if (up && my) {
    const dir = { F: -90, E: 30, W: 150 }, d = 26;
    let btn = '';
    for (const e of M.ELEMENTS) {
      const lv = s.mag[e], mc = M.magicCost(G, lv); if (lv >= M.MAX_MAGIC || s.gold < mc) continue;
      const ang = dir[e] * Math.PI / 180, r = bsz * 0.507;
      const x = bsz / 2 + Math.cos(ang) * r - d / 2, y = bsz / 2 + Math.sin(ang) * r - d / 2;
      btn += '<button class="up mg gd" style="left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;width:' + d + 'px;height:' + d + 'px" data-act="magic" data-e="' + e + '" title="' + NAMES[e] + ' Stufe ' + (lv + 1) + ' kaufen (' + mc + ' Gold)"></button>';
    }
    bd = bd.replace(/<\/div>$/, btn + '</div>');
  }
  h += '</div><div class="bcol">' + bd + '</div></div>';
  return h;
}
// Monstername mit Besonderheit; die Beschreibung erscheint beim Darüberfahren, für beide Spieler.
function monLabel(m) {
  return m && m.label ? ' <span class="mlabel" title="' + esc((m.hints || []).join('\n')) + '" style="font-size:15px;color:var(--gold);font-weight:400">' + esc(m.label) + '</span>' : '';
}
function sideName(sd, suffix) {
  return esc(sd.name) + (sd.kind === 'monster' ? monLabel(sd.monster) + esc(suffix) : '');
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
