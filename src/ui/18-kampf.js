/* ---------- Kampf ---------- */
const ORD_ROWS = [['ra', 'Aggro', 'F', 'E'], ['rm', 'Zerrüttung', 'F', 'W'], ['bm', 'Spiegel', 'W', 'F'], ['bg', 'Spiegel', 'W', 'E'], ['gh', 'Heilung', 'E', 'W'], ['gr', 'Läuterung', 'E', 'F']];
function ordText(k, lv, short) {
  if (k === 'ra' && lv === 'S') return 'Lege 2·S Fluchkarten (2/4/6) auf den Ablagestapel der Gegenseite; sie kommen beim nächsten Nachziehen des Gegners zuerst auf seine Hand und werden beim darauffolgenden Nachziehen dauerhaft vernichtet';
  if (k === 'ra') return short && G.rules.curses === 'deathcards' ? 2 * lv + ' Flüche' + ' auf den Ablagestapel der Gegenseite' : comboText('fe', lv);
  if (k === 'rm') return G.rules.rmMode === 'drain' ? 'Der Gegner verliert ' + lv + ' Mana (nie unter 0)' : 'Der Gegner muss ' + (lv === 'S' ? 'S' : lv) + ' Handkarte' + (lv === 1 ? '' : 'n') + ' seiner Wahl abwerfen';
  if (k === 'bm' || k === 'bg') return 'Dein ' + (k === 'bm' ? 'roter' : 'grüner') + ' Spiegel steht danach auf ' + lv + ' Marker (nicht addiert, höchstens 3 insgesamt)';
  if (k === 'gh') return 'Heile um ' + lv + ' HP';
  return 'Entferne ' + lv + ' beliebige Marker vom Brett (anklicken, auch eigene, Spiegelmarker und gegnerische Nachziehtokens, die dann nur zerstört werden) und erhalte für jeden einen Nachziehtoken';
}
function comboText(k, lv) {
  if (lv <= 0) return 'kein Effekt';
  if (k === 'fw' && G.rules.controlMode === 'mirror') return 'Bringe deinen Spiegel gegen eine Magie deiner Wahl auf ' + lv + ' Marker (nicht addiert, höchstens 3)';
  if (!cardCurses() && k === 'ew' && G.rules.lifeflowMode === 'plain') return '+' + lv + ' HP und ' + lv * (G.rules.lifeflowDraw || 0) + ' Gratis-Nachziehen';
  if (!cardCurses() && k === 'ew' && G.rules.lifeflowMode === 'any') return (G.rules.lifeflowHealMode === 'flat' ? 'Heile um ' + lv + ', entferne ' + lv + ' Marker' : 'Entferne ' + lv + ' Marker: je 1 HP') + (G.rules.lifeflowDraw ? ' und erhalte für jeden einen Nachziehtoken' : '');
  if (!cardCurses() && k === 'ew' && G.rules.lifeflowMode === 'choice') return '+' + lv + ' HP, ' + lv + ' Marker weg (eigene Fluchmarker oder Spiegel des Gegners)';
  if (G.rules.curses === 'deathcards' && k === 'fe') return 'Lege ' + (G.rules.comboMode === 'ordered' ? 2 * lv : lv) + ' Flüche' + ' auf den Ablagestapel der Gegenseite; sie kommen beim nächsten Nachziehen des Gegners zuerst auf seine Hand und werden beim darauffolgenden Nachziehen dauerhaft vernichtet';
  if (G.rules.curses === 'weak' && k === 'fe') return (lv + 1) + ' Schwäche-Marker für die Gegenseite nach diesem Zug (S+1, höchstens 3): doppelter Schaden, solange einer liegt';
  if (!cardCurses()) return k === 'fw' ? lv + ' Gratis-Nachziehen' : k === 'fe' ? lv + ' Fluchmarker für die Gegenseite' : '+' + lv + ' HP, ' + lv + ' Marker weniger';
  return k === 'fw' ? lv + ' Gratis-Nachziehen' : k === 'fe' ? lv + ' Fluch' + (lv > 1 ? 'e' : '') + ' für die Gegenseite' : '+' + lv + ' HP';
}
// Lifeflow 'any': gewählte Marker (sc/oc/sm/om) als Zähler-Knöpfe
function lfPicks(cx, lvl) {
  const c = cx.c;
  if (Array.isArray(c.lfp)) return c.lfp.slice(0, lvl);
  const out = []; let sc = cx.myStats.marks || 0, om = cx.theirs.stats.mirror || 0, sd = cx.myStats.death || 0;
  while (out.length < lvl && sc-- > 0) out.push('sc');
  while (out.length < lvl && sd-- > 0) out.push('sd');
  while (out.length < lvl && om-- > 0) out.push('om');
  return out;
}
// Lifeflow: Marker direkt auf dem Brett anklicken. lfCtx liefert die Wahl, solange ich einen Lifeflow-Angriff vorbereite.
function lfCtx() {
  if (!G || G.phase !== 'combat' || (G.rules.lifeflowMode !== 'any' && G.rules.comboMode !== 'ordered') || cardCurses() || !myTurn()) return null;
  const cx = ctx(), c = cx.c; if (c.action !== 'attack') return null;
  const ev = M.evalAttack(cx.myStats, M.selection(cx.mine.deck));
  const lw = ev.valid ? M.levelsFor(G.rules, ev).ew : 0;
  if (!ev.valid || !(lw > 0) || (ev.levels.ulti > 0 && G.rules.ultiMode === 'death')) return null;
  return { cx, c, lvl: lw, picks: lfExpand(lfPicks(cx, lw), cx) };
}
// Spiegelmarker einer Wahl auf konkrete Farben abbilden (in der Reihenfolge, in der die Engine sie wegnimmt)
function lfExpand(picks, cx) {
  const out = [], left = { s: Object.assign({ F: 0, E: 0, W: 0 }, cx.myStats.mirrorEl || {}), o: Object.assign({ F: 0, E: 0, W: 0 }, cx.oppStats.mirrorEl || {}) };
  picks.forEach(p => { const [k, e] = p.split(':'); if (e && (k === 'sm' || k === 'om')) left[k[0]][e]--; });
  picks.forEach(p => { const [k, e] = p.split(':'); if ((k === 'sm' || k === 'om') && !e) { const el = M.ELEMENTS.find(x => left[k[0]][x] > 0); if (el) { left[k[0]][el]--; out.push(k + ':' + el); } } else out.push(p); });
  return out;
}
function lfHave(cx, k, e) {
  const w = k[0] === 's' ? cx.myStats : cx.oppStats, t = k[1];
  return t === 'c' ? (w.marks || 0) : t === 'd' ? (w.death || 0) : t === 't' ? (w.freeDraws || 0) : (e ? M.mirrorOf(w, e) : (w.mirror || 0));
}
function lfSummary(cx, lvl) {
  const L = lfCtx(), picks = L ? L.picks : lfExpand(lfPicks(cx, lvl), cx), cnt = {};
  picks.forEach(p => { cnt[p] = (cnt[p] || 0) + 1; });
  const nm = { sd: 'eigener Todesmarker', od: 'Todesmarker des Gegners', sc: 'eigener Fluch', oc: 'Fluch des Gegners', sm: 'eigener Spiegel', om: 'Spiegel des Gegners', ot: 'Nachziehtoken des Gegners' };
  const chips = Object.keys(cnt).map(p => { const [k, e] = p.split(':'); return '<span class="lfchip">' + nm[k] + (e ? ' ' + NAMES[e] : '') + (cnt[p] > 1 ? ' ×' + cnt[p] : '') + '</span>'; }).join('');
  return '<div class="lfsum"><div class="note">Klicke beliebige Marker auf dem Brett (Totenköpfe und Spiegelsteine, auch deine eigenen). Gewählt: <b>' + picks.length + '/' + lvl + '</b></div><div class="lfchips">' + (chips || '<span class="note">kein Marker gewählt (nur Heilung)</span>') + '</div><button class="mini" data-act="lfauto" title="Wieder die automatische Auswahl verwenden">Automatisch</button></div>';
}
function comboPanel(cx) {
  const c = cx.c, my = myTurn() && c.action === 'attack';
  let h = '<h3>Kombos</h3>';
  const ordP = G.rules.comboMode === 'ordered';
  const defs = ordP ? ORD_ROWS.map(r => [r[0], r[1], NAMES[r[2]] + ' + ' + NAMES[r[3]]]) : [['fw', 'Control', 'Feuer + Wasser'], ['fe', 'Aggro', 'Feuer + Erde'], ['ew', 'Lifeflow', 'Erde + Wasser']];
  if (c.action === 'defense' || !my) {
    h += '<div class="note">Kombos wirken nur im eigenen Angriff.</div>';
    defs.forEach(d => { h += '<div class="combo"><div>' + d[1] + '<small>' + d[2] + '</small></div><span class="note">nicht zulässig</span></div>'; });
  } else {
    const ev = M.evalAttack(cx.myStats, M.selection(cx.mine.deck));
    const lv = ev.valid ? ev.levels : { fw: 0, fe: 0, ew: 0, ulti: 0 };
    if (ordP) {
      const dth = lv.ulti > 0, o = ev.valid && ev.ord && !dth ? ev.ord : null;
      h += '<div class="note" style="margin-bottom:8px">' + (dth ? 'Ultimate Stufe ' + lv.ulti + ': Todes-Fluch – der Gegner verliert ' + lv.ulti + ' HP am Ende jeder eigenen Angriffsphase bis Kampfende. Die Einzel-Kombos entfallen.' : 'Die erste markierte Karte bestimmt Angriffsfarbe und Rolle, die zweite Farbe die Wirkung.') + '</div>';
      defs.forEach(d => {
        const l = o && o.key === d[0] ? o.lvl : 0;
        h += '<div class="combo ' + (l > 0 ? 'on' : '') + '"><div>' + d[1] + '<small>' + d[2] + ' · ' + (l > 0 ? ordText(d[0], l) : 'kein Effekt') + '</small></div></div>';
      });
      return '<div class="panel" style="' + box(LAYOUT.combo) + '">' + h + '</div>';
    }
    h += '<div class="note" style="margin-bottom:8px">' + (lv.ulti && G.rules.ultiMode === 'death' ? 'Ultimate Stufe ' + lv.ulti + ': Todes-Fluch – der Gegner verliert ' + lv.ulti + ' HP am Ende jeder eigenen Angriffsphase bis Kampfende (je ein Todesmarker pro HP; nur Lifeflow kann Marker entfernen). Die Einzel-Kombos entfallen.' : lv.ulti ? 'Ultimate Stufe ' + lv.ulti + ': wähle genau zwei Kombos.' : 'Markiere Karten zweier Elemente für einen Kombo.') + '</div>';
    defs.forEach(d => {
      const dth = lv.ulti && G.rules.ultiMode === 'death', l = dth ? 0 : lv.ulti ? lv.ulti : lv[d[0]], on = l > 0 && (!lv.ulti || c.ult.includes(d[0]));
      h += '<div class="combo ' + (on ? 'on' : '') + '"><div>' + d[1] + '<small>' + d[2] + ' · ' + comboText(d[0], l) + '</small></div>' +
        
        (d[0] === 'ew' && G.rules.lifeflowMode === 'choice' && l > 0 ? '<div class="lfsel"><button class="mini' + (c.lf === 'opp' ? '' : ' on') + '" data-act="lf" data-t="self" title="Eigene Fluchmarker herunternehmen">von dir</button><button class="mini' + (c.lf === 'opp' ? ' on' : '') + '" data-act="lf" data-t="opp" title="Spiegelmarker des Gegners wegnehmen">vom Gegner</button></div>' : '') +
        (lv.ulti && !dth ? '<input type="checkbox" data-act="ult" data-k="' + d[0] + '" ' + (c.ult.includes(d[0]) ? 'checked' : '') + '>' : '') + '</div>';
    });
  }
  return '<div class="panel" style="' + box(LAYOUT.combo) + '">' + h + '</div>';
}
// Gold, das im Tempel eingesetzt werden müsste, um die nächste Tempelstufe zu erreichen (n Gold ergeben n(n+1)/2 Punkte)
function goldForNext(pool, level) { const need = M.nextLevelCost(level) - pool; let n = 1; while (M.pointsForGold(n) < need && n < 20) n++; return need <= 0 ? 0 : n; }
const fracHTML = (pool, level) => pool + '/' + M.nextLevelCost(level) + ' <span class="gneed" title="Gold, das im Tempel eingesetzt werden müsste, um die nächste Stufe zu erreichen">(' + goldForNext(pool, level) + ' Gold)</span>';
let manaPv = 0;   // Manakosten der markierten Karten, als rote Vorschau am Mana-Wert
function combatCenter(cx) {
  manaPv = 0;
  const c = cx.c, my = myTurn(), atk = c.action === 'attack';
  const actorSide = c.sides[c.turn];
  const icon = !my ? 'wait' : atk ? 'attack' : 'defense';
  let h = '<div class="combatcenter"><div class="sc" style="font-size:22px;color:var(--gold)">' + (c.mode === 'showdown' ? 'Showdown' : 'Kampf gegen ' + esc(c.sides.b.name)) + '</div>';
  if (c.forced) {   // Zerrüttung: Abwurf wählen (ich) bzw. warten (Gegner)
    const vs = c.sides.a.ctrl === c.forced.pid ? c.sides.a : c.sides.b, need = Math.min(c.forced.n, vs.deck.hand.filter(Boolean).length);
    h += c.forced.pid === ME
      ? '<div class="preview"><b>Zerrüttung:</b> Wähle ' + need + ' Handkarte' + (need === 1 ? '' : 'n') + ', die du abwerfen musst (' + fdSel.size + '/' + need + '). Klicke die Karten an.</div><div class="btnrow"><button class="btn primary" data-act="fd" ' + (fdSel.size === need ? '' : 'disabled') + '>Abwerfen</button></div>'
      : '<div class="preview"><b>Zerrüttung:</b> ' + esc(vs.name) + ' wählt ' + need + ' Handkarte' + (need === 1 ? '' : 'n') + ' zum Abwerfen …</div>';
    h += '</div>';
    return '<div class="panel" style="' + box(LAYOUT.combat, 'padding:10px 14px') + '">' + h + '</div>';
  }
  let prev = '', canExec = false;
  if (my) {
    const sel = M.selection(cx.mine.deck);
    if (atk) {
      if (!sel.length) prev = '';
      else {
        const ev = M.evalAttack(cx.myStats, sel);
        if (ev.valid) manaPv = ev.cost;
        prev = '';
        const pick2 = ev.levels.ulti > 0 && !(G.rules.ultiMode === 'death');
        canExec = ev.valid && ev.affordable && !(pick2 && c.ult.length !== 2);
        const lvC = ev.valid ? M.levelsFor(G.rules, ev) : ev.levels, ordC = G.rules.comboMode === 'ordered';
        if ((G.rules.lifeflowMode === 'any' || ordC) && !cardCurses() && ev.valid && lvC.ew > 0 && !(ev.levels.ulti > 0 && G.rules.ultiMode === 'death')) prev += lfSummary(cx, lvC.ew);
        if (!ordC && G.rules.controlMode === 'mirror' && ev.valid && ev.levels.fw > 0 && !(ev.levels.ulti > 0 && G.rules.ultiMode === 'death')) { const cur = (c.mel && c.melTurn === c.turns && c.mel) || M.defaultMirrorEl(cx.theirs); prev += '<div class="mrsel">Spiegel gegen: ' + M.ELEMENTS.map(e => '<button class="mini ' + e + (e === cur ? ' on' : '') + '" data-act="mel" data-e="' + e + '">' + M.NAMES[e] + '</button>').join(' ') + '</div>'; }
        if (!ev.affordable) prev += '<div class="bad">Zu wenig Mana.</div>'; else if (pick2 && c.ult.length !== 2) prev += '<div class="bad">Wähle zwei Kombos links.</div>';
      }
    } else {
      const ev = M.evalDefense(cx.myStats, sel, c.color, c.mr, G.rules);
      if (!sel.length) prev = '';
      else if (!ev.valid) prev = '<span class="bad">' + esc(ev.reason) + '</span>';
      else { if (ev.cost > 0) manaPv = ev.cost; prev = ''; canExec = ev.affordable; if (ev.ord) { const r = ORD_ROWS.find(x => x[0] === ev.ord.key); prev += '<div class="note"><b>' + r[1] + '</b> Stufe ' + ev.ord.lvl + ' nach der Verteidigung: ' + ordText(r[0], ev.ord.lvl) + '</div>'; } if (!ev.affordable) prev += '<div class="bad">Zu wenig Mana.</div>'; }
    }
  }
  if (my && !atk && G.rules.mirrorChoice && (cx.myStats.mirror || 0) > 0) { const cap = Math.min(M.mirrorOf(cx.myStats, c.color), c.pending, M.mirrorCap(cx.myStats, M.selection(cx.mine.deck), c.color)), n = Math.min(cap, c.mr == null ? 1 : c.mr); prev += '<div class="mrsel">Spiegel ablegen: <button class="mini" data-act="mr" data-n="' + Math.max(0, n - 1) + '">−</button> <b>' + n + '</b> von ' + cap + ' <button class="mini" data-act="mr" data-n="' + Math.min(cap, n + 1) + '">+</button></div>'; }
  h += '<div class="preview">' + prev + '</div><div class="btnrow">';
  if (atk) h += '<button class="btn primary" data-act="attack" ' + (my && canExec ? '' : 'disabled') + '>Angriff ausführen</button><button class="btn" data-act="recover" ' + (my ? '' : 'disabled') + ' title="Nur du erhältst +' + M.recoverGain(G) + ' Mana">Erholen (+' + M.recoverGain(G) + ')</button><button class="btn" data-act="draw" ' + (my ? '' : 'disabled') + ' title="Hand tauschen, ersetzt den Angriff">Nachziehen</button><button class="btn" data-act="pass" ' + (my ? '' : 'disabled') + '>Passen</button>';
  else h += '<button class="btn primary" data-act="defend" ' + (my && canExec ? '' : 'disabled') + '>Verteidigung ausführen</button><button class="btn" data-act="pass" ' + (my ? '' : 'disabled') + ' title="Keine Verteidigung ausführen: Schaden hinnehmen, +' + M.recoverGain(G) + ' Mana">Erholen (+' + M.recoverGain(G) + ')</button>';
  h += '</div></div>';
  return '<div class="panel" style="' + box(LAYOUT.combat, 'padding:10px 14px') + '">' + h + '</div>';
}
// Rechte Kampfseite: Übersicht der Kombos (statt einer Doppelanzeige des Gegners, der steht schon oben rechts).
function comboRef(cx) {
  const mag = cx.myStats.mag, def = G.rules.controlMode === 'mirror' && (G.rules.curses === 'weak' || G.rules.curses === 'deathcards') && G.rules.ultiMode === 'death';
  const sel = M.selection(cx.mine.deck), ev = sel.length ? M.evalAttack(cx.myStats, sel) : null, lv = ev && ev.valid ? ev.levels : { fw: 0, fe: 0, ew: 0, ulti: 0 };
  const el = e => '<span class="' + e + '">' + NAMES[e] + '</span>';
  const rows = [
    ['fw', 'Control', 'F', 'W', n => 'Bringe deinen Spiegel gegen eine Magie deiner Wahl auf ' + n + ' Marker (nicht addiert, höchstens 3).'],
    ['fe', 'Aggro', 'F', 'E', n => G.rules.curses === 'deathcards' ? 'Lege ' + n + (n === 1 ? ' Fluch' : ' Flüche') + ' auf den Ablagestapel deines Gegners. Beim nächsten Nachziehen kommen sie zuerst auf seine Hand und belegen Plätze, beim darauffolgenden Nachziehen sind sie dauerhaft vernichtet.' : 'Nach dem Zug ' + (n + 1) + ' Schwäche-Marker: Gegner erleidet doppelten Schaden; −1 nach jedem seiner Angriffszüge.'],
    ['ew', 'Lifeflow', 'E', 'W', n => G.rules.lifeflowMode === 'plain' ? 'Heile um ' + n + ' und erhalte ' + n + ' Nachziehtoken.' : (G.rules.lifeflowHealMode === 'flat' ? 'Heile um ' + n + ', entferne ' + n + ' Marker und erhalte für jeden einen Nachziehtoken.' : 'Entferne ' + n + ' Marker: je Marker 1 HP und 1 Nachziehtoken.')],
  ];
  let h = '<h3 style="margin-bottom:3px" title="S = die kleinere der beiden Kartensummen (Kartenstufe, je Karte höchstens deine Magiestufe), höchstens 3. Jede gespielte Karte kostet 1 Mana, auch Kombokarten.">Kombo-Übersicht <span class="note" style="font-size:13px">S = Kombostufe</span></h3>';
  if (G.rules.comboMode === 'ordered') {
    const normals = sel.filter(c => !c.curse), cols = [...new Set(normals.map(c => c.el))], prim = normals.length ? normals[0].el : null;
    const o = ev && ev.valid && ev.ord && !(ev.levels.ulti > 0) ? ev.ord : null, uS0 = Math.min(3, mag.F, mag.E, mag.W);
    const row = (name, els, lvl, text, on) => '<div class="cref' + (on ? ' on' : '') + '" style="padding:3px 8px;margin-bottom:3px"><b>' + name + '</b> ' + els.map(el).join(' + ') + (lvl ? ' <span class="note">· Stufe ' + lvl + '</span>' : '') + (text ? '<small>' + text + '</small>' : '') + '</div>';
    if (cols.length === 0) {   // noch nichts markiert: alle Möglichkeiten, Wirkung als Tooltip
      h += '<div class="note" style="margin-bottom:4px;font-size:13px">Die erste markierte Karte bestimmt die Rolle: Feuer aggressiv, Wasser defensiv, Erde heilend. Markiere eine Karte, dann siehst du die Möglichkeiten.</div>';
      ORD_ROWS.forEach(r => { h += row(r[1], [r[2], r[3]], 0, '', false).replace('<div class="cref"', '<div class="cref" title="' + esc(ordText(r[0], 'S', true)) + '"'); });
      h += row('Ultimate', ['F', 'E', 'W'], 0, '', false);
    } else if (cols.length === 1) {   // eine Farbe: nur die Kombos dieser Rolle, genauer erklärt
      h += '<div class="note" style="margin-bottom:4px;font-size:13px">Erste Karte: ' + el(prim) + '. Markiere eine zweite Farbe:</div>';
      ORD_ROWS.filter(r => r[2] === prim).forEach(r => { h += row(r[1], [r[2], r[3]], 0, 'Mit ' + el(r[3]) + ': ' + ordText(r[0], 'S'), false); });
      h += row('Ultimate', ['F', 'E', 'W'], 0, 'Mit allen drei Farben: Todes-Fluch, ersetzt die Kombo.', false);
    } else if (cols.length === 2 && o) {   // zwei Farben: genau eine Kombo, mit erreichter Stufe
      const r = ORD_ROWS.find(x => x[0] === o.key);
      h += row(r[1], [r[2], r[3]], o.lvl, ordText(r[0], o.lvl), true);
      h += '<div class="note" style="margin-top:4px;font-size:13px">Stufe = die kleinere der beiden Kartensummen (je Karte höchstens deine Magiestufe), höchstens 3. Mehrere Karten einer Farbe zählen zusammen. Eine dritte Farbe (' + el(M.ELEMENTS.find(x => !cols.includes(x))) + ') würde daraus die Ultimate machen.</div>';
    } else {   // alle drei Farben: Ultimate
      h += row('Ultimate', ['F', 'E', 'W'], lv.ulti, 'Todes-Fluch: Der Gegner bekommt ' + (lv.ulti || 'S') + ' Todesmarker und verliert ' + (lv.ulti || 'S') + ' HP am Ende jeder seiner Angriffsphasen bis Kampfende. Die Kombos entfallen.', lv.ulti > 0);
    }
    return '<div class="panel" style="' + box(LAYOUT.oppInfo, 'overflow-y:auto;padding:10px 12px') + '">' + h + '</div>';
  }
  rows.forEach(r => {
    const maxS = Math.min(3, mag[r[2]], mag[r[3]]), on = lv[r[0]] > 0 || (lv.ulti > 0 && def);
    h += '<div class="cref' + (lv[r[0]] > 0 && !(lv.ulti && def) ? ' on' : '') + '"><b>' + r[1] + '</b> ' + el(r[2]) + ' + ' + el(r[3]) + ' <span class="note">· Magie: bis S ' + maxS + (lv[r[0]] > 0 && !(lv.ulti && def) ? ' · markiert: S ' + lv[r[0]] : '') + '</span><small>' + (def ? r[4](lv[r[0]] > 0 ? lv[r[0]] : Math.max(1, maxS)) : comboText(r[0], Math.max(1, maxS))) + '</small></div>';
  });
  const uS = Math.min(3, mag.F, mag.E, mag.W);
  h += '<div class="cref' + (lv.ulti > 0 ? ' on' : '') + '"><b>Ultimate</b> ' + el('F') + ' + ' + el('E') + ' + ' + el('W') + ' <span class="note">· Magie: bis S ' + uS + (lv.ulti > 0 ? ' · markiert: S ' + lv.ulti : '') + '</span><small>' + (def ? (u => 'Gib dem Gegner ' + u + (u === 1 ? ' Todesfluch' : ' Todesflüche') + ': Er verliert ' + u + ' HP am Ende seiner Angriffsphase.')(lv.ulti > 0 ? lv.ulti : Math.max(1, uS)) : 'Alle drei Elemente markiert: zwei der drei Kombos wählen.') + '</small></div>';
  return '<div class="panel" style="' + box(LAYOUT.oppInfo) + '">' + h + '</div>';
}
