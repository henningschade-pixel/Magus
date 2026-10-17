/* ---------- Kampf ---------- */
const ORD_ROWS = [['ra', 'Lähmung', 'F', 'E'], ['rm', 'Zerrüttung', 'F', 'W'], ['bm', 'Spiegel', 'W', 'F'], ['bg', 'Spiegel', 'W', 'E'], ['gh', 'Heilung', 'E', 'W'], ['gr', 'Läuterung', 'E', 'F']];
function ordText(k, lv, short) {
  if (k === 'ra' && lv === 'S') return 'Lege 2·S Fluchkarten (2/4/6) auf den Ablagestapel der Gegenseite; sie kommen beim nächsten Nachziehen des Gegners zuerst auf seine Hand und werden beim darauffolgenden Nachziehen dauerhaft vernichtet';
  if (k === 'ra') return short ? 2 * lv + ' Flüche auf den Ablagestapel der Gegenseite' : 'Lege ' + 2 * lv + ' Flüche auf den Ablagestapel der Gegenseite; sie kommen beim nächsten Nachziehen des Gegners zuerst auf seine Hand und werden beim darauffolgenden Nachziehen dauerhaft vernichtet';
  if (k === 'rm') return 'Der Gegner muss ' + (lv === 'S' ? 'S' : lv) + ' Handkarte' + (lv === 1 ? '' : 'n') + ' seiner Wahl abwerfen';
  if (k === 'bm' || k === 'bg') return 'Dein ' + (k === 'bm' ? 'roter' : 'grüner') + ' Spiegel steht danach auf Stufe ' + lv + ' (nicht addiert, höchstens 3 Stufen insgesamt). Er ist dauerhaft, gleicht fehlende Verteidigung gegen Angriffe dieser Farbe bis zur Stufe aus und wirft den Überschuss einer zu starken Verteidigung zurück (ebenfalls höchstens bis zur Stufe und höchstens so viel wie der eingehende Schaden). Jeder ausgeglichene oder zurückgeworfene Schaden kostet ihn eine Stufe';
  if (k === 'gh') return 'Heile um ' + lv + ' HP';
  return 'Entferne ' + lv + ' beliebige Marker vom Brett (anklicken, auch eigene, Spiegelmarker und gegnerische Nachziehtokens, die dann nur zerstört werden) und erhalte für jeden einen Nachziehtoken';
}
// Lifeflow: gewählte Marker (sd/om) als Zähler-Knöpfe
function lfPicks(cx, lvl) {
  const c = cx.c;
  if (Array.isArray(c.lfp)) return c.lfp.slice(0, lvl);
  const out = []; let om = cx.theirs.stats.mirror || 0, sd = cx.myStats.death || 0;
  while (out.length < lvl && sd-- > 0) out.push('sd');
  while (out.length < lvl && om-- > 0) out.push('om');
  return out;
}
// Lifeflow: Marker direkt auf dem Brett anklicken. lfCtx liefert die Wahl, solange ich einen Lifeflow-Angriff vorbereite.
function lfCtx() {
  if (!G || G.phase !== 'combat' || !myTurn()) return null;
  const cx = ctx(), c = cx.c; if (c.action !== 'attack') return null;
  const ev = M.evalAttack(cx.myStats, M.selection(cx.mine.deck));
  const lw = ev.valid ? M.levelsFor(ev).ew : 0;
  if (!ev.valid || !(lw > 0) || ev.levels.ulti > 0) return null;
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
// Gold, das im Tempel eingesetzt werden müsste, um die nächste Tempelstufe zu erreichen (n Gold ergeben n(n+1)/2 Punkte)
function goldForNext(pool, level) { const need = M.nextLevelCost(level) - pool; let n = 1; while (M.pointsForGold(n) < need && n < 20) n++; return need <= 0 ? 0 : n; }
const fracHTML = (pool, level) => pool + '/' + M.nextLevelCost(level) + ' <span class="gneed" title="Gold, das im Tempel eingesetzt werden müsste, um die nächste Stufe zu erreichen">(' + goldForNext(pool, level) + ' Gold)</span>';
let manaPv = 0;   // Manakosten der markierten Karten, als rote Vorschau am Mana-Wert
function combatCenter(cx) {
  manaPv = 0;
  const c = cx.c, my = myTurn(), atk = c.action === 'attack';
  let h = '<div class="combatcenter"><div class="sc" style="font-size:22px;color:var(--gold)">' + (c.mode === 'showdown' ? 'Showdown' : 'Kampf gegen ' + esc(c.sides.b.name)) + '</div>';
  if (c.forced) {   // Zerrüttung: Abwurf wählen (ich) bzw. warten (Gegner)
    const vs = c.sides.a.ctrl === c.forced.pid ? c.sides.a : c.sides.b, need = Math.min(c.forced.n, vs.deck.hand.filter(Boolean).length);
    h += c.forced.pid === ME
      ? '<div class="preview"><b>Zerrüttung:</b> Wähle ' + need + ' Handkarte' + (need === 1 ? '' : 'n') + ', die du abwerfen musst (' + fdSel.size + '/' + need + '). Klicke die Karten an.</div><div class="btnrow"><button class="btn primary" data-act="fd" ' + (fdSel.size === need ? '' : 'disabled') + '>Abwerfen</button></div>'
      : '<div class="preview"><b>Zerrüttung:</b> ' + esc(vs.name) + ' wählt ' + need + ' Handkarte' + (need === 1 ? '' : 'n') + ' zum Abwerfen …</div>';
    h += '</div>';
    return '<div class="panel" style="' + box(LAYOUT.combat, 'padding:10px 14px') + '">' + h + '</div>';
  }
  let prev = '', canExec = false, val = 0;   // val: Wert der markierten Karten (Schaden bzw. Block) für den Knopf
  if (my) {
    const sel = M.selection(cx.mine.deck);
    if (atk) {
      if (!sel.length) prev = '';
      else {
        const ev = M.evalAttack(cx.myStats, sel);
        if (ev.valid) manaPv = ev.cost;
        prev = '';
        canExec = ev.valid && ev.affordable; val = ev.valid && ev.prim ? ev.damage : 0;
        const lvC = ev.valid ? M.levelsFor(ev) : ev.levels;
        if (ev.valid && lvC.ew > 0 && !(ev.levels.ulti > 0)) prev += lfSummary(cx, lvC.ew);
        if (!ev.affordable) prev += '<div class="bad">Zu wenig Mana.</div>';
      }
    } else {
      const ev = M.evalDefense(cx.myStats, sel, c.color);
      if (!sel.length) prev = '';
      else if (!ev.valid) prev = '<span class="bad">' + esc(ev.reason) + '</span>';
      else { if (ev.cost > 0) manaPv = ev.cost; prev = ''; canExec = ev.affordable; val = ev.block || 0; if (ev.ord) { const r = ORD_ROWS.find(x => x[0] === ev.ord.key); prev += '<div class="note"><b>' + r[1] + '</b> Stufe ' + ev.ord.lvl + ' nach der Verteidigung: ' + ordText(r[0], ev.ord.lvl) + '</div>'; } if (!ev.affordable) prev += '<div class="bad">Zu wenig Mana.</div>'; }
    }
  }
  h += '<div class="preview">' + prev + '</div><div class="btnrow">';
  const canFlee = c.mode === 'monster' && my && M.canFlee(G, ME), rg = M.recoverGain(G);
  if (!canFlee) fleeAsk = false;
  if (atk) h += '<button class="btn danger" data-act="attack" ' + (my && canExec ? '' : 'disabled') + ' title="Angriff ausführen: Schaden der markierten Karten">Angriff (' + val + ')</button><button class="btn blue" data-act="recover" ' + (my ? '' : 'disabled') + ' title="Nur du erhältst +' + rg + ' Mana">Erholen (+' + rg + ')</button><button class="btn" data-act="draw" ' + (my ? '' : 'disabled') + ' title="Hand tauschen, ersetzt den Angriff">Nachziehen</button><button class="btn" data-act="pass" ' + (my ? '' : 'disabled') + '>Passen</button>' + (c.mode === 'monster' ? '<button class="btn" data-act="fleeask" ' + (canFlee ? '' : 'disabled') + ' title="Den Kampf abbrechen: kein Sieger, keine Beute. Geht nur im eigenen Angriffszug, wenn der Gegner kein Mana mehr hat und du nicht unter einem Todes-Fluch stehst.">Fliehen</button>' : '');
  else h += '<button class="btn primary" data-act="defend" ' + (my && canExec ? '' : 'disabled') + ' title="Verteidigung ausführen: Block der markierten Karten">Verteidigen (' + val + ')</button><button class="btn blue" data-act="pass" ' + (my ? '' : 'disabled') + ' title="Keine Verteidigung ausführen: Schaden hinnehmen, +' + rg + ' Mana">Erholen (+' + rg + ')</button>';
  h += '</div>';
  if (fleeAsk && canFlee) {   // Warnung: Fliehen muss bestätigt werden
    const nextMe = c.def === ME;
    h += '<div class="fleewarn"><b>Wirklich fliehen?</b> Der Kampf endet ohne Sieger und ohne Beute. ' + esc(c.sides.b.name) + ' behält seine Verletzungen. ' + (nextMe ? 'Du bist danach am Zug und kannst das Monster selbst angreifen.' : esc(G.players[c.def].name) + ' ist danach am Zug und kann das Monster angreifen und die Beute holen.') + '<div class="btnrow" style="margin-top:6px"><button class="btn danger" data-act="flee">Fliehen</button><button class="btn" data-act="fleeno">Bleiben</button></div></div>';
  }
  h += '</div>';
  return '<div class="panel" style="' + box(LAYOUT.combat, 'padding:10px 14px') + '">' + h + '</div>';
}
// Rechte Kampfseite: Übersicht der Kombos (statt einer Doppelanzeige des Gegners, der steht schon oben rechts).
function comboRef(cx) {
  const mag = cx.myStats.mag;
  const sel = M.selection(cx.mine.deck), ev = sel.length ? M.evalAttack(cx.myStats, sel) : null, lv = ev && ev.valid ? ev.levels : { fw: 0, fe: 0, ew: 0, ulti: 0 };
  const el = e => '<span class="' + e + '">' + NAMES[e] + '</span>';
  let h = '<h3 style="margin-bottom:3px" title="S = die kleinere der beiden Kartensummen (Kartenstufe, je Karte höchstens deine Magiestufe), höchstens 3. Jede gespielte Karte kostet 1 Mana, auch Kombokarten.">Kombo-Übersicht <span class="note" style="font-size:13px">S = Kombostufe</span></h3>';
  {
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
    return '<div class="panel" style="' + box(LAYOUT.oppInfo, 'overflow-y:auto;padding:10px 12px;scrollbar-width:none') + '">' + h + '</div>';
  }
}
