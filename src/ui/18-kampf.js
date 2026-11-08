/* ---------- Kampf ---------- */
const ORD_ROWS = [['ra', 'Lähmung', 'F', 'E'], ['wt', 'Falle', 'F', 'W'], ['hs', 'Hellsicht', 'W', 'F'], ['ws', 'Schild', 'W', 'E'], ['gh', 'Heilung', 'E', 'W'], ['gr', 'Läuterung', 'E', 'F']];
// Wirkung der Ultimate nach der Farbe der ersten Karte (seit 0.7)
function ultiText(el, lv) {
  if (el === 'E') return 'Heilfluss (Erde): Du bekommst ' + lv + ' Heilmarker und heilst ' + lv + ' HP am Ende jeder deiner Angriffsphasen bis Kampfende (höchstens bis zu den max. HP).';
  if (el === 'W') return 'Manafluss (Wasser): Du bekommst ' + lv + ' Manamarker und regenerierst ' + lv + ' Mana am Ende jeder deiner Angriffsphasen bis Kampfende (höchstens bis zum maximalen Mana).';
  return 'Todesfluss (Feuer): Der Gegner bekommt ' + lv + ' Todesmarker und verliert ' + lv + ' HP am Ende jeder seiner Angriffsphasen bis Kampfende.';
}
// Kurzfassungen für die Kombo-Übersicht (die ausführliche Wirkung steht im Tooltip)
const ORD_SHORT = { hs: 'Zieht S Karten: je Karte Hand, Ablage oder zurück zum Händler', ra: '2·S Flüche auf den Ablagestapel des Gegners', wt: 'Zieht 3 Karten vom Stapel, eine davon verdeckt als Falle (Rest auf den Ablagestapel): wirft S (1/2/3) unblockbaren Schaden zurück', ws: 'Schild mit S Ladungen: mindert nicht geblockten Schaden', gh: 'Heilt S HP', gr: 'Entfernt S Marker, je Marker 1 Nachziehtoken' };
const ULTI_SHORT = { F: 'Gegner verliert S HP am Ende jeder seiner Angriffsphasen', E: 'Du heilst S HP am Ende jeder deiner Angriffsphasen', W: 'Du regenerierst S Mana am Ende jeder deiner Angriffsphasen' };
function ordText(k, lv, short) {
  if (k === 'ra' && lv === 'S') return 'Lege 2·S Fluchkarten (2/4/6) auf den Ablagestapel der Gegenseite; sie kommen beim nächsten Nachziehen des Gegners zuerst auf seine Hand und werden beim darauffolgenden Nachziehen dauerhaft vernichtet';
  if (k === 'ra') return short ? 2 * lv + ' Flüche auf den Ablagestapel der Gegenseite' : 'Lege ' + 2 * lv + ' Flüche auf den Ablagestapel der Gegenseite; sie kommen beim nächsten Nachziehen des Gegners zuerst auf seine Hand und werden beim darauffolgenden Nachziehen dauerhaft vernichtet';
  if (k === 'hs') return 'Ziehe ' + (lv === 'S' ? 'S' : lv) + ' Karte' + (lv === 1 ? '' : 'n') + ' vom Zugstapel und entscheide für jede einzeln: auf die Hand nehmen (sofern Platz ist), auf den Ablagestapel legen oder abwerfen (zurück zum Händler, dauerhaft aus deinem Deck)';
  if (k === 'wt') return 'Ziehe drei Karten vom Stapel (sie ersetzen keine Handkarten), lege eine davon verdeckt vor dich; die übrigen kommen auf den Ablagestapel. Sie wird aufgedeckt, sobald Schaden eingeht: Entspricht die Farbe des Schadens ihrer Farbe, wirft sie ' + (lv === 'S' ? 'S (1/2/3)' : lv) + ' unblockbaren Schaden auf den Angreifer zurück, vor der Verteidigung (der eingehende Schaden sinkt entsprechend, höchstens um den ganzen Schaden). Danach wird die Karte abgelegt, auch ohne Rückwurf. Sie ist kein Marker';
  if (k === 'ws') return 'Dein Schild hat danach ' + (lv === 'S' ? 'S' : lv) + ' Ladung' + (lv === 1 ? '' : 'en') + ' (nicht addiert, höchstens 3). Es mindert eingehenden, nicht geblockten Schaden gegen jede Farbe, je Schaden eine Ladung';
  if (k === 'gh') return 'Heile um ' + lv + ' HP';
  return 'Entferne ' + lv + ' beliebige Marker vom Brett (anklicken, auch eigene, Schild- und Manamarker und Nachziehtokens, die dann nur zerstört werden) und erhalte für jeden einen Nachziehtoken';
}
// Läuterung: gewählte Marker (sd/or/om/oh) als Zähler-Knöpfe
function lfPicks(cx, lvl) {
  const c = cx.c;
  if (Array.isArray(c.lfp)) return c.lfp.slice(0, lvl);
  const out = []; let om = cx.theirs.stats.manaflow || 0, sd = cx.myStats.death || 0, orb = cx.theirs.stats.rainbow || 0, oh = cx.theirs.stats.heal || 0;
  while (out.length < lvl && sd-- > 0) out.push('sd');
  while (out.length < lvl && orb-- > 0) out.push('or');
  while (out.length < lvl && om-- > 0) out.push('om');
  while (out.length < lvl && oh-- > 0) out.push('oh');
  return out;
}
// Lifeflow: Marker direkt auf dem Brett anklicken. lfCtx liefert die Wahl, solange ich einen Lifeflow-Angriff vorbereite.
function lfCtx() {
  if (!G || G.phase !== 'combat' || !myTurn()) return null;
  const cx = ctx(), c = cx.c;
  let lw = 0;
  if (c.action === 'attack') {
    const ev = M.evalAttack(cx.myStats, M.selection(cx.mine.deck));
    lw = ev.valid ? M.levelsFor(ev).ew : 0;
    if (!ev.valid || ev.levels.ulti > 0) return null;
  } else if (c.action === 'defense') {   // seit 0.7.6.1 auch in der Verteidigung (die Läuterung wirkt dort vor der Verteidigung)
    const sel = M.selection(cx.mine.deck); if (!sel.length) return null;
    const ev = M.evalDefense(cx.myStats, sel, c.color);
    lw = ev.valid && ev.ord && !(ev.levels && ev.levels.ulti > 0) ? M.levelsFor(ev).ew : 0;
  } else return null;
  if (!(lw > 0)) return null;
  return { cx, c, lvl: lw, picks: lfExpand(lfPicks(cx, lw), cx) };
}
// (Seit 0.8 gibt es keine Farbspiegel mehr: die Wahl gilt unverändert.)
function lfExpand(picks, cx) { return picks.slice(); }
function lfHave(cx, k, e) {
  const w = k[0] === 's' ? cx.myStats : cx.oppStats, t = k[1];
  return t === 'c' ? (w.marks || 0) : t === 'd' ? (w.death || 0) : t === 'h' ? (w.heal || 0) : t === 'r' ? (w.rainbow || 0) : t === 't' ? (w.freeDraws || 0) : (w.manaflow || 0);
}
function lfSummary(cx, lvl) {
  const L = lfCtx(), picks = L ? L.picks : lfExpand(lfPicks(cx, lvl), cx), cnt = {};
  picks.forEach(p => { cnt[p] = (cnt[p] || 0) + 1; });
  const nm = { sd: 'eigener Todesmarker', od: 'Todesmarker des Gegners', sc: 'eigener Fluch', oc: 'Fluch des Gegners', sm: 'eigener Manamarker', om: 'Manamarker des Gegners', sh: 'eigener Heilmarker', oh: 'Heilmarker des Gegners', sr: 'eigene Schildladung', or: 'Schildladung des Gegners', st: 'eigener Nachziehtoken', ot: 'Nachziehtoken des Gegners' };
  const chips = Object.keys(cnt).map(p => { const [k, e] = p.split(':'); return '<span class="lfchip">' + nm[k] + (e ? ' ' + NAMES[e] : '') + (cnt[p] > 1 ? ' ×' + cnt[p] : '') + '</span>'; }).join('');
  return '<div class="lfsum"><div class="note">Klicke beliebige Marker auf dem Brett (Totenköpfe, Heil- und Manamarker, Schilde, auch deine eigenen). Gewählt: <b>' + picks.length + '/' + lvl + '</b></div><div class="lfchips">' + (chips || '<span class="note">kein Marker gewählt (nur Heilung)</span>') + '</div><button class="mini" data-act="lfauto" title="Wieder die automatische Auswahl verwenden">Automatisch</button></div>';
}
// Gold, das im Tempel eingesetzt werden müsste, um die nächste Tempelstufe zu erreichen (n Gold ergeben n(n+1)/2 Punkte)
function goldForNext(pool, level) { const need = M.nextLevelCost(level) - pool; let n = 1; while (M.pointsForGold(n) < need && n < 20) n++; return need <= 0 ? 0 : n; }
const fracHTML = (pool, level) => pool + '/' + M.nextLevelCost(level) + ' <span class="gneed" title="Gold, das im Tempel eingesetzt werden müsste, um die nächste Stufe zu erreichen">(' + goldForNext(pool, level) + ' Gold)</span>';
let manaPv = 0;   // Manakosten der markierten Karten, als rote Vorschau am Mana-Wert
function combatCenter(cx) {
  manaPv = 0;
  const c = cx.c, my = myTurn(), atk = c.action === 'attack';
  let h = '<div class="combatcenter"><div class="sc" style="font-size:22px;color:var(--gold)">' + (c.mode === 'showdown' ? 'Showdown' : 'Kampf gegen ' + esc(c.sides.b.name)) + '</div>' + (function () {   // Rundenzähler; mit Erschöpfung (seit 0.7.7.2) und optionalem Rundenlimit maxRounds (Standard aus)
    const rd = Math.floor((c.atkTurns || 0) / 2) + 1, mr = G.rules.maxRounds, ex = G.rules.exhaustRounds || 0, lv = ex > 0 ? Math.floor((rd - 1) / ex) : 0;
    const tip = 'Eine Kampfrunde ist ein Angriffszug jeder Seite.' + (ex > 0 ? ' Nach je ' + ex + ' Runden steigt die Erschöpfung um 1: Beide Seiten verlieren am Ende ihres Angriffszugs so viele HP, wie die Erschöpfung hoch ist.' : '') + (mr > 0 ? ' Nach ' + mr + ' Runden endet der Kampf unentschieden.' : '');
    return '<div class="note" style="margin-top:-2px" title="' + tip + '">Runde <b>' + (mr > 0 ? Math.min(mr, rd) : rd) + '</b>' + (mr > 0 ? ' von ' + mr : '') + (lv > 0 ? ' · <b style="color:#e0605a">Erschöpfung ' + lv + '</b>' : (ex > 0 ? ' · Erschöpfung ab Runde ' + (ex + 1) : '')) + '</div>';
  })();
  if (c.forced && c.forced.kind === 'trap') {   // Falle: eine der gezogenen Karten wählen (ich, im Vordergrund) bzw. warten (Gegner)
    const vs = c.sides.a.ctrl === c.forced.pid ? c.sides.a : c.sides.b;
    h += c.forced.pid === ME
      ? '<div class="preview"><b>Falle:</b> Wähle eine der gezogenen Karten, die du verdeckt vor dich legst (die Karten liegen im Vordergrund). Die übrigen kommen auf den Ablagestapel.</div>'
      : '<div class="preview"><b>Falle:</b> ' + esc(vs.name) + ' wählt eine Karte für die Falle …</div>';
    h += '</div>';
    return '<div class="panel" style="' + box(LAYOUT.combat, 'padding:10px 14px') + '">' + h + '</div>';
  }
  if (c.forced && c.forced.kind === 'sight') {   // Hellsicht: je gezogener Karte Hand, Ablage oder Händler wählen (ich) bzw. warten (Gegner)
    const vs = c.sides.a.ctrl === c.forced.pid ? c.sides.a : c.sides.b, cards = c.forced.cards, free = vs.deck.hand.filter(x => !x).length;
    if (c.forced.pid === ME) h += '<div class="preview"><b>Hellsicht:</b> Entscheide für jede gezogene Karte (die Karten liegen im Vordergrund).</div>';
    else h += '<div class="preview"><b>Hellsicht:</b> ' + esc(vs.name) + ' entscheidet über ' + cards.length + ' gezogene Karte' + (cards.length === 1 ? '' : 'n') + ' …</div>';
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
        if (ev.valid && ev.levels.echo) prev += '<div class="note">Echo (' + NAMES[cx.myStats.echo] + '): Kombo +1 Stufe</div>';
        if (ev.valid && lvC.ew > 0 && !(ev.levels.ulti > 0)) prev += lfSummary(cx, lvC.ew);
        if (!ev.affordable) prev += '<div class="bad">Zu wenig Mana.</div>';
      }
    } else {
      const ev = M.evalDefense(cx.myStats, sel, c.color);
      if (!sel.length) prev = '';
      else if (!ev.valid) prev = '<span class="bad">' + esc(ev.reason) + '</span>';
      else { if (ev.cost > 0) manaPv = ev.cost; prev = ''; canExec = ev.affordable; val = ev.block || 0; if (ev.ord) { const r = ORD_ROWS.find(x => x[0] === ev.ord.key), late = ev.ord.key === 'gh' || ev.ord.key === 'wt' || ev.ord.key === 'ws'; prev += '<div class="note"><b>' + r[1] + '</b> Stufe ' + ev.ord.lvl + (late ? ' nach' : ' vor') + ' der Verteidigung: ' + ordText(r[0], ev.ord.lvl) + '</div>'; if (ev.ord.key === 'gr') prev += lfSummary(cx, ev.ord.lvl); } if (!ev.affordable) prev += '<div class="bad">Zu wenig Mana.</div>'; }
    }
  }
  h += '<div class="preview">' + prev + '</div><div class="btnrow">';
  const canFlee = my && M.canFlee(G, ME), rg = M.recoverGain(G), manaFull = cx.myStats.mana >= cx.myStats.maxMana, drawNoMana = cx.myStats.mana < M.drawManaCost(G, ME);   // Erholen bei vollem Mana und Nachziehen ohne das Mana für den roten Marker sind sinnlos: Knöpfe inaktiv
  if (!canFlee) fleeAsk = false;
  if (atk) h += '<button class="btn danger" data-act="attack" ' + (my && canExec ? '' : 'disabled') + ' title="Angriff ausführen: Schaden der markierten Karten">Angriff (' + val + ')</button><button class="btn blue" data-act="recover" ' + (my && !manaFull ? '' : 'disabled') + ' title="' + (my && manaFull ? 'Dein Mana ist bereits voll' : 'Nur du erhältst +' + rg + ' Mana') + '">Erholen (+' + rg + ')</button><button class="btn" data-act="draw" ' + (my && !drawNoMana ? '' : 'disabled') + ' title="' + (my && drawNoMana ? 'Zu wenig Mana: Bei rotem Nachziehmarker kostet Nachziehen Mana' : 'Hand tauschen, ersetzt den Angriff') + '">Nachziehen</button><button class="btn" data-act="pass" ' + (my ? '' : 'disabled') + '>Passen</button>' + '<button class="btn" data-act="fleeask" ' + (canFlee ? '' : 'disabled') + ' title="Den Kampf abbrechen: kein Sieger, keine Siegpunkte. Geht nur im eigenen Angriffszug, wenn der Gegner kein Mana mehr hat und du nicht unter einem Todesfluss stehst.">Fliehen</button>';
  else if (my) h += '<button class="btn primary" data-act="defend" ' + (canExec ? '' : 'disabled') + ' title="Verteidigung ausführen: Block der markierten Karten">Verteidigen (' + val + ')</button><button class="btn" data-act="pass" title="Passen: keine Verteidigung, den Schaden hinnehmen (kein Mana)">Passen</button>';   // Verteidigung ist rein reaktiv: nur bei eingehendem Schaden, nur Verteidigen und Passen
  h += '</div>';
  if (fleeAsk && canFlee) {   // Warnung: Fliehen muss bestätigt werden
    const nextMe = c.def === ME;
    h += '<div class="fleewarn"><b>Wirklich fliehen?</b> ' + (c.mode === 'showdown' ? 'Der Showdown endet ohne Sieger und ohne Siegpunkte.' : 'Der Kampf endet ohne Sieger. ' + esc(c.sides.b.name) + ' behält seine Verletzungen. ' + (nextMe ? 'Du bist danach am Zug und kannst das Monster selbst angreifen.' : esc(G.players[c.def].name) + ' ist danach am Zug und kann das Monster angreifen.')) + '<div class="btnrow" style="margin-top:6px"><button class="btn danger" data-act="flee">Fliehen</button><button class="btn" data-act="fleeno">Bleiben</button></div></div>';
  }
  h += '</div>';
  return '<div class="panel" style="' + box(LAYOUT.combat, 'padding:10px 14px') + '">' + h + '</div>';
}
// Rechte Kampfseite: Übersicht der Kombos (statt einer Doppelanzeige des Gegners, der steht schon oben rechts).
function comboRef(cx) {
  const mag = cx.myStats.mag;
  const sel = M.selection(cx.mine.deck), ev = sel.length ? M.evalAttack(cx.myStats, sel) : null, lv = ev && ev.valid ? ev.levels : { fw: 0, fe: 0, ew: 0, ulti: 0 };
  const el = e => '<span class="' + e + '">' + NAMES[e] + '</span>';
  let h = '<h3 style="margin-bottom:3px" title="Die erste markierte Karte bestimmt die Farbe der Kombo; mit allen drei Farben wird daraus die Ultimate dieser Farbe. S = die kleinere der beiden Kartensummen (Kartenstufe, je Karte höchstens deine Magiestufe), höchstens 3. Jede gespielte Karte kostet 1 Mana, auch Kombokarten.">Kombo-Übersicht <span class="note" style="font-size:13px">S = Kombostufe</span></h3>';
  {
    const normals = sel.filter(c => !c.curse), cols = [...new Set(normals.map(c => c.el))], prim = normals.length ? normals[0].el : null;
    const o = ev && ev.valid && ev.ord && !(ev.levels.ulti > 0) ? ev.ord : null, uS0 = Math.min(3, mag.F, mag.E, mag.W);
    let fs = 20;   // Schriftgrad der Zeilen: füllt die Höhe des Fensters (seit 0.7.1.1); Texte und Hinweise skalieren mit
    const row = (name, els, lvl, text, on, tip) => '<div' + (tip ? ' title="' + esc(tip) + '"' : '') + ' class="cref p' + els[0] + (on ? ' on' : '') + '" style="padding:1px 8px;margin-bottom:0;font-size:' + fs + 'px;flex:1 1 0;display:flex;flex-direction:column;justify-content:center;gap:0"><div style="line-height:1.15"><b>' + name + '</b> ' + els.map(el).join(' + ') + (lvl ? ' <span class="note" style="font-size:.8em">· Stufe ' + lvl + '</span>' : '') + (text ? '<small style="font-size:' + Math.round(fs * 0.72) + 'px">' + text + '</small>' : '') + '</div></div>';
    // Die Ultimate (alle drei Farben) steht seit 0.7 unter der Farbe ihrer ersten Karte: Feuer Todesfluss, Wasser Manafluss (seit 0.8), Erde Heilfluss.
    const ULTI_NAME = { F: 'Todesfluss', W: 'Manafluss', E: 'Heilfluss' }, ROLE = { F: 'Feuer', W: 'Wasser', E: 'Erde' };
    const ultiRow = (p, lvl, text, on, tip) => row(ULTI_NAME[p], [p, ...M.ELEMENTS.filter(x => x !== p)], lvl, text, on, tip);
    if (cols.length === 0) {   // noch nichts markiert: alle Kombos nach Farbe der ersten Karte, Wirkung als Tooltip
      fs = 18;
      ['F', 'W', 'E'].forEach(p => {
        ORD_ROWS.filter(r => r[2] === p).forEach(r => { h += row(r[1], [r[2], r[3]], 0, '', false, ordText(r[0], 'S', true)); });
        h += ultiRow(p, 0, '', false, ultiText(p, 'S'));
      });
    } else if (cols.length === 1) {   // eine Farbe: die Kombos dieser Farbe samt Ultimate, genauer erklärt
      fs = 20;
      h += '<div class="note" style="margin-bottom:3px;font-size:14px">Erste Karte: ' + el(prim) + '. Markiere eine zweite Farbe:</div>';
      ORD_ROWS.filter(r => r[2] === prim).forEach(r => { h += row(r[1], [r[2], r[3]], 0, ORD_SHORT[r[0]], false, ordText(r[0], 'S')); });
      h += ultiRow(prim, 0, ULTI_SHORT[prim], false, 'Mit allen drei Farben, ersetzt die Kombo. ' + ultiText(prim, 'S'));
    } else if (cols.length === 2 && o) {   // zwei Farben: genau eine Kombo, mit erreichter Stufe
      const r = ORD_ROWS.find(x => x[0] === o.key);
      h += row(r[1], [r[2], r[3]], o.lvl, ordText(r[0], o.lvl), true);
      if (o.echo) h += '<div class="note" style="margin-top:2px;font-size:13px">Echo ' + el(o.other) + ': +1 Stufe</div>';
      h += '<div class="note" style="margin-top:4px;font-size:12px">Stufe = die kleinere der beiden Kartensummen (je Karte höchstens deine Magiestufe), höchstens 3. Mehrere Karten einer Farbe zählen zusammen. Mit ' + el(M.ELEMENTS.find(x => !cols.includes(x))) + ' als dritter Farbe wird daraus die Ultimate ' + ULTI_NAME[prim] + '.</div>';
    } else {   // alle drei Farben: Ultimate
      h += ultiRow(prim, lv.ulti, ultiText(prim, lv.ulti || 'S') + ' Die Kombos entfallen.', lv.ulti > 0);
      if (lv.echo) h += '<div class="note" style="margin-top:2px;font-size:13px">Echo ' + el(cx.myStats.echo) + ': +1 Stufe</div>';
    }
    const R = LAYOUT.oppInfo, ty = R.top + Math.round(R.h / 2) - 19;   // Echo-Marker (seit 0.9) links (eigenes Echo) und rechts (Echo des Gegners) neben der Kombo-Übersicht, auf halber Höhe, halb über dem Rand
    return '<div class="panel" style="' + box(R, 'overflow:hidden;padding:8px 12px;display:flex;flex-direction:column') + '">' + h + '</div>' + echoToken(cx.myStats, true, { left: R.left - 20, top: ty }) + echoToken(cx.oppStats, false, { left: R.left + R.w - 18, top: ty });
  }
}

// Hellsicht: Die gezogenen Karten liegen im Vordergrund, unter jeder die drei Möglichkeiten (Hand, Ablage, Händler)
function sightOverlayHTML() {
  const c = G && G.phase === 'combat' && G.combat; if (!c || !c.forced || (c.forced.kind !== 'sight' && c.forced.kind !== 'trap') || c.forced.pid !== ME) { sightSel = []; return ''; }
  if (c.forced.kind === 'trap') {   // Falle: gezogene Karten im Vordergrund, unter jeder Nicht-Fluchkarte „Als Falle legen“
    let t = '<div class="sighttitle">Falle</div><div class="sightsub">Wähle die Karte, die du verdeckt vor dich legst. Die übrigen kommen auf den Ablagestapel.</div><div class="sightfront">';
    c.forced.cards.forEach((cd, i) => { const cu = M.parseCard(cd.id).curse; t += '<div class="sightbig" style="animation-delay:' + i * 0.12 + 's"><img src="' + (IMG[cd.id] || IMG.back) + '"><button class="btn primary" data-act="trapok" data-i="' + i + '"' + (cu ? ' disabled' : '') + '>Als Falle legen</button></div>'; });
    return t + '</div>';
  }
  const vs = c.sides.a.ctrl === ME ? c.sides.a : c.sides.b, cards = c.forced.cards, free = vs.deck.hand.filter(x => !x).length;
  if (sightSel.length !== cards.length) sightSel = cards.map(() => '');
  const taken = sightSel.filter(k => k === 't').length, done = sightSel.every(k => k);
  let h = '<div class="sighttitle">Hellsicht</div><div class="sightsub">Freie Handplätze: ' + Math.max(0, free - taken) + '</div><div class="sightfront">';
  cards.forEach((cd, i) => {
    const full = free - taken <= 0 && sightSel[i] !== 't', btn = (k, t, tip) => '<button class="btn' + (sightSel[i] === k ? ' primary' : '') + '" title="' + tip + '" data-act="sight" data-i="' + i + '" data-v="' + k + '"' + (k === 't' && full ? ' disabled' : '') + '>' + t + '</button>';
    h += '<div class="sightbig" style="animation-delay:' + i * 0.12 + 's"><img src="' + (IMG[cd.id] || IMG.back) + '">' + btn('t', 'Auf die Hand', 'Die Karte kommt auf einen freien Handplatz') + btn('a', 'Ablegen', 'Die Karte kommt auf den Ablagestapel') + btn('d', 'Abwerfen', 'Zurück zum Händler: die Karte verlässt dein Deck') + '</div>';
  });
  return h + '</div><button class="btn primary sightok" data-act="sightok" ' + (done ? '' : 'disabled') + '>Bestätigen</button>';
}
