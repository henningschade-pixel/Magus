/* ---------- Darstellung: Kampfeffekt-Ton, Cursor, render, Menüs, Start- und Ergebnis-Bildschirm ---------- */
let leadPrev = null;
const fdSel = new Set();   // Zerrüttung: von mir gewählte Abwurfkarten (Handplätze)
const forcedMe = () => !!(G && G.phase === 'combat' && G.combat && G.combat.forced && G.combat.forced.pid === ME);
let curKey = null, curDown = false, mkSeen = null, dthSeen = null, fxFor = null, fxLast = 0;
// Sekundär ausgelöste Effekte (Spiegel wirft Schaden zurück, Todes-Fluch zehrt) kurz an der betroffenen Seite einblenden
// Ton zu einem Kampfeffekt (Angriff und Verteidigung bringen ihre Sounds im Ablauf der Animation selbst mit)
function fxSound(f) {
  if (f.kind === 'ultimate' || (f.kind === 'aggro' && f.ult)) Snd.play('ultimate');
  else if (f.kind === 'aggro') Snd.play('aggro');
  else if (f.kind === 'ruin') Snd.play('ruin');
  else if (f.kind === 'lifeflow') Snd.play(f.removed > 0 || !(f.heal > 0) ? 'purify' : 'heal');
  else if (f.kind === 'mirrorcast') Snd.play('shield_hit');   // Spiegelmarker wird gelegt: Schildsound
  else if (f.kind === 'recover') Snd.play('recover');
  if (f.kind === 'lifeflow') for (let i = 0; i < Math.min(f.removed || 0, 6); i++) Snd.play('break', .15 + i * .12, .8);   // Läuterung: für jeden zerstörten Marker/Token der Splitter-Sound
}
// Kombo-Effekte: Die Animation läuft zuerst, die Wirkung (Flüche im Ablagestapel, Zerrüttungs-Abfrage, Heilung und entfernte Marker) wird erst angezeigt, wenn sie ankommt – wie beim Angriff.
// Die Engine hat die Wirkung schon angewendet; bis ‚until‘ zeigt die Oberfläche den Stand davor. pre: Werte vor der Aktion (preStats).
let comboHold = [];
function holdCombo(f, delay) {
  if (FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  let dur;   // Sekunden bis zur Ankunft (passend zu den Animationen in 22-lifeflow-aggro.js)
  if (f.kind === 'aggro') dur = .3 + (Math.max(1, f.n || 1) - 1) * .22 + .75;
  else if (f.kind === 'ruin') dur = .12 + .55 + .05;
  else if (f.kind === 'lifeflow') dur = (.1 + (Math.max(1, f.removed || 1) - 1) * .06 + .37) * 2.6;
  else return;
  const ms = delay + Math.round(dur * 1000) + 40;
  comboHold.push({ f, from: Date.now() + delay * 0, until: Date.now() + ms, pre: preStats ? JSON.parse(JSON.stringify(preStats)) : null });
  setTimeout(render, ms + 30);
}
let holdFor = null, holdSeen = 0;
function withComboHold(fn) {
  if (G && holdFor !== G) { holdFor = G; holdSeen = G.logN; comboHold = []; }
  else if (G && G.logN > holdSeen) {   // neue Kombo-Effekte vor dem Zeichnen vormerken (showFx läuft erst mitten im Zeichnen)
    for (const e of G.log) if (e.n > holdSeen) [].concat(e.fx || []).forEach(f => holdCombo(f, f.late ? Math.round(1000 * FlowFx.wait()) + 150 : 0));
    holdSeen = G.logN;
  }
  comboHold = comboHold.filter(h => Date.now() < h.until);
  if (!comboHold.length || !G || G.phase !== 'combat' || !G.combat) return fn();
  const c = G.combat, sides = [c.sides.a, c.sides.b], saved = sides.map(s => ({ disc: s.deck.discard, st: Object.assign({}, s.stats) })), forced = c.forced;
  for (const h of comboHold) {
    const f = h.f;
    if (f.kind === 'aggro') { const v = sides.find(s => s.ctrl === f.to); if (v) v.deck.discard = v.deck.discard.slice(0, Math.max(0, v.deck.discard.length - 2 * Math.max(1, Math.min(3, f.n || 1)))); }   // Lähmung S legt 2 S Flüche
    else if (f.kind === 'ruin') c.forced = null;
    else if (f.kind === 'lifeflow' && h.pre) {
      sides.forEach((s, i) => { const p = i ? h.pre.b : h.pre.a; ['death', 'mirror', 'mirrorEl', 'freeDraws'].forEach(k => { if (p[k] === undefined) delete s.stats[k]; else s.stats[k] = p[k]; }); });
      const w = sides.find(s => s.ctrl === f.who); if (w && f.heal > 0) w.stats.hp = Math.max(0, w.stats.hp - f.heal);
    }
  }
  try { return fn(); } finally {
    c.forced = forced;
    sides.forEach((s, i) => { s.deck.discard = saved[i].disc; Object.keys(s.stats).forEach(k => { delete s.stats[k]; }); Object.assign(s.stats, saved[i].st); });
  }
}
function showFx() {
  if (fxFor !== G) { fxFor = G; fxLast = G.logN; FlowFx.resetEx(); return; }
  let k = 0;
  for (const e of G.log) {
    if (e.n <= fxLast) continue;
    const go = f => { if (!FAST) fxSound(f); if (f.kind === 'lifeflow') FlowFx.lifeflow(f); else if (f.kind === 'aggro') FlowFx.aggro(f); else if (f.kind === 'drain') FlowFx.drain(f); else if (f.kind === 'ruin') FlowFx.ruin(f); else if (f.kind === 'attack') FlowFx.attack(f); else if (f.kind === 'defense') FlowFx.defense(f); };
    [].concat(e.fx || []).forEach(f => { if (f.late) { lateN++; setTimeout(() => { lateN--; go(f); }, Math.round(1000 * FlowFx.wait()) + 150); } else go(f); });   // Kombo der Verteidigung erst nach der Kampfanimation
    const m = /^(Spiegel|Todes-Fluch): /.exec(e.txt); if (!m) continue;
    if (m[1] === 'Todes-Fluch') Snd.play('curse', 0, 0.95);   // Fluch-Sound, wenn der Todes-Fluch Schaden macht
    const mirror = m[1] === 'Spiegel', victimMe = mirror ? e.pid !== ME : e.pid === ME;
    const d = document.createElement('div'); d.className = 'fxnote ' + (mirror ? 'mirror' : 'death');
    d.style.top = (victimMe ? 546 - k * 54 : 172 + k * 54) + 'px';
    d.innerHTML = '<i>' + (mirror ? '⟲' : '☠') + '</i><span>' + esc(e.txt) + '</span>';
    setTimeout(() => { stage.appendChild(d); setTimeout(() => d.remove(), 3300); }, mirror ? Math.round(1000 * FlowFx.wait()) : 0); k++;   // Spiegel-Hinweis erst nach dem Schild-Effekt
  }
  fxLast = G.logN;
}
function applyCursor() {
  const c = (CURSORS[curKey] || {})[curDown ? 'pressed' : 'normal'] || (CURSORS[curKey] || {}).normal, st = document.documentElement.style;
  const v = c ? 'url(' + c[0] + ') ' + c[1] + ' ' + c[2] + ', ' : '';
  st.setProperty('--cd', v + 'default'); st.setProperty('--cp', v + 'pointer');
}
function setCursor(k) { if (k === curKey) return; curKey = k; applyCursor(); }
document.addEventListener('pointerdown', () => { curDown = true; applyCursor(); }, true);
document.addEventListener('pointerup', () => { curDown = false; applyCursor(); }, true);
function render() {   // läuft der Ergebnis-Bildschirm, wird der Endstand des Kampfes gezeigt (die Engine ist schon in der Weltphase)
  specBtnSync();
  if (!G) return;
  if (!endView && !modal) {   // neue Upgrade-Punkte (Abschnittsbonus, Trostpreis): Ton, sobald sie sichtbar werden
    const up = G.players[ME].stats.upGot;
    if (upSeen !== null && up > upSeen && !FAST) Snd.play('upgrade_gain');
    upSeen = up;
  }
  if (!endView) {
    if (hpHold && Date.now() < hpHold.until && G.phase === 'combat' && G.combat) {   // Schild-Effekt läuft: die HP-Werte zeigen noch den Stand vor dem Schaden
      const sides = [G.combat.sides.a, G.combat.sides.b], keep = sides.map(s => s.stats.hp);
      sides.forEach(s => { if (hpHold.pre[s.ctrl] !== undefined && Date.now() < (hpHold.un[s.ctrl] || 0)) s.stats.hp = hpHold.pre[s.ctrl]; });
      try { withComboHold(renderInner); } finally { sides.forEach((s, i) => { s.stats.hp = keep[i]; }); }
    } else withComboHold(renderInner);
  }
  else {
    const sp = G.phase, sc = G.combat, cur = endView.cur, keep = [cur.sides.a.stats.hp, cur.sides.b.stats.hp];
    if (endView.stage === 'anim' && hpHold && Date.now() >= hpHold.until) { cur.sides.a.stats.hp = endView.snap.sides.a.stats.hp; cur.sides.b.stats.hp = endView.snap.sides.b.stats.hp; }   // der Schaden steht sofort da, wenn die Geschosse einschlagen
    G.phase = 'combat'; G.combat = cur;
    try { renderInner(); } finally { G.phase = sp; G.combat = sc; cur.sides.a.stats.hp = keep[0]; cur.sides.b.stats.hp = keep[1]; }
  }
  let ov = document.getElementById('endov');
  const html = overlayHTML();
  if (html && !ov) { ov = document.createElement('div'); ov.id = 'endov'; stage.appendChild(ov); }
  if (ov) { if (html) { if (ov.dataset.k !== html) { ov.innerHTML = html; ov.dataset.k = html; } ov.style.display = 'block'; } else { ov.style.display = 'none'; ov.dataset.k = ''; } }
}
function renderInner() {
  if (!G) return;
  const cx = ctx();
  let h = sidePanels(cx);
  if (cx.combat) h += combatCenter(cx) + comboRef(cx);
  else h += vendorPanel() + monsterCards();
  panels.innerHTML = h;
  const lg0 = logEl.querySelector('.logl'), lgKeep = lg0 && lg0.scrollHeight - lg0.scrollTop - lg0.clientHeight > 24 ? lg0.scrollTop : null;   // nicht am Ende: Leseposition merken
  if (cx.combat) {   // links: nur der Kampflog (Einträge seit Kampfbeginn)
    const from = cx.c.logFrom || 0;
    logEl.className = 'logpanel'; logEl.style.cssText = box(LAYOUT.combo);
    logEl.innerHTML = '<h3><button class="logdl" title="Spiellog exportieren (Alt-Klick: in die Zwischenablage)">⤓</button>Kampflog</h3><div class="logl">' + G.log.filter(e => e.n > from).slice(-300).map(e => '<div class="' + (e.pid === ME ? 'me' : e.pid === null ? '' : 'op') + '">' + esc(e.txt) + '</div>').join('') + '</div>';
  } else {
    logEl.className = 'logpanel'; logEl.style.cssText = box(LAYOUT.logPanel);
    logEl.innerHTML = '<h3><button class="logdl" title="Spiellog exportieren (Alt-Klick: in die Zwischenablage)">⤓</button>Protokoll</h3><div class="logst">Abschnitt ' + G.stage + '/3 · Showdowns ' + G.showdown + '/3<br>Siegpunkte ' + G.players[ME].sp + ' : ' + G.players[OPP].sp + '</div><div class="logl">' + G.log.slice(-300).map(e => '<div class="' + (e.pid === ME ? 'me' : e.pid === null ? '' : 'op') + '">' + esc(e.txt) + '</div>').join('') + '</div>';
  }
  { const lg = logEl.querySelector('.logl'); if (lg) lg.scrollTop = lgKeep === null ? lg.scrollHeight : lgKeep; }
  { const mc = cx.combat && G.combat.mode === 'monster' ? G.combat : null, side = mc ? (G.combat.sides.b.ctrl === ME ? 'bot' : 'top') : '';   // Farbe auf der Seite dessen, der das Monster steuert
    stage.dataset.top = side === 'top' ? mc.elem : ''; stage.dataset.bot = side === 'bot' ? mc.elem : ''; }
  if (cx.combat) {   // Marker (Schwäche, Spiegel, Tod) weg -> Sound
    const sa = G.combat.sides.a.stats, sb = G.combat.sides.b.stats, n = x => (x.mirror || 0) + (x.death || 0);
    const mirNew = G.log.some(e => e.n > fxLast && [].concat(e.fx || []).some(f => f.kind === 'mirror'));   // beim Spiegelbruch spielt die Animation den Sound selbst, zum Einschlag
    if (mkSeen && mkSeen.c === G.combat && (n(sa) < mkSeen.a || n(sb) < mkSeen.b) && !mirNew) Snd.play('break', 0, 0.7);
    mkSeen = { c: G.combat, a: n(sa), b: n(sb) };
    const dd = (sa.death || 0) + (sb.death || 0);   // Todes-Fluch-Marker hinzugekommen -> Fluch-Sound
    if (dthSeen && dthSeen.c === G.combat && dd > dthSeen.n) CurseFx.play();
    dthSeen = { c: G.combat, n: dd };
  } else { mkSeen = null; dthSeen = null; }
  if (manaPv > 0 && cx.combat) { const mv = panels.querySelector('.sbody[data-lead] [data-pv="mana"]'), st = cx.myStats; if (mv) mv.innerHTML = '<span class="pvdn">' + Math.max(0, st.mana - manaPv) + '</span>/' + st.maxMana; }   // Mana nach dem Ausspielen in Rot
  { const mine = panels.querySelector('.sbody[data-lead]');   // Knopfspalte weich ein- und ausfahren
    if (mine) { const now = mine.classList.contains('hasup'); if (leadPrev !== null && leadPrev !== now) { mine.classList.toggle('hasup', leadPrev); void mine.offsetWidth; mine.classList.toggle('hasup', now); } leadPrev = now; } }
  showFx();
  DiceBoard.sync();   // Monsterwürfel (31a-wuerfel.js)
  setCursor(cx.combat && cx.mine.kind === 'monster' ? 'monster' : 'human');
  renderCards(); MirrorFx.track();
  turnSync();   // nach den Karten, damit deren Flüge schon bekannt sind
  pvSticky();
  if (G.over && !endView && !modal) { if (endSnd !== G) { endSnd = G; Snd.play(G.winner === ME ? 'win' : G.winner === null ? 'draw' : 'lose'); } showEnd(); }
  endTick(); specAdvance();
}
let menuView = null;   // zeichnet das gerade offene Menü neu (Ton-Schalter, Regler)
const menuBtn = (act, txt, extra, cls) => '<button class="btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (extra || '') + '>' + txt + '</button>';
const menuTo = (pg, txt, cls) => menuBtn('menu', txt, ' data-p="' + pg + '"', cls);
function settingsHTML() {   // Einstellungen: Ton an/aus und die beiden Regler (Hauptmenü und Spielmenü)
  const si = Snd.info();
  return menuBtn('sndtoggle', (si.on ? '🔊 Ton: an' : '🔇 Ton: aus'), ' title="Ton an oder aus"') + volHTML();
}
function showStart(pg) {
  pg = pg || 'main'; setCursor('human');
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  menuView = () => showStart(pg);
  const run = G && !G.over && !MP && started;
  const back = menuTo('main', 'Zurück');
  let h = '<div class="box start"><h1>Magus</h1>';
  if (pg === 'main') {
    h += '<img class="logo" alt="" src="assets/img/logo.webp"><div class="menulist">' +
      (run ? menuBtn('resume', 'Spiel fortsetzen', '', 'primary') : '') +
      menuTo('single', 'Einzelspieler', run ? '' : 'primary') + menuTo('multi', 'Mehrspieler') + menuTo('settings', 'Einstellungen') + menuBtn('quit', 'Beenden') + '</div>' +
      '<div class="menufoot">' + menuTo('about', 'Neu in Version 0.11', 'link') + '</div>';
  } else if (pg === 'single') {
    h += '<h2>Einzelspieler</h2><div class="menulist">' +
      menuBtn('newgame', run ? 'Neues Spiel gegen den Computer' : 'Gegen den Computer spielen', '', run ? '' : 'primary') +
      menuBtn('newspec', 'Zwei Computern zuschauen', ' title="Zwei Computerspieler spielen gegeneinander, du schaust zu (für Spielablauf und Statistik)"') + back + '</div>';
  } else if (pg === 'multi') {
    offerTries = 0;
    h += '<h2>Mehrspieler</h2><p class="note" style="text-align:center">Zwei Geräte, ein Raum</p><div class="menulist">' +
      '<p id="mpna" class="note" style="text-align:center">Verbindung wird geprüft …</p>' +
      '<div id="mpbox" class="mpbox" style="display:none"><div class="mprow">' + menuBtn('mphost', 'Raum erstellen') + '<input id="mpcode" maxlength="5" placeholder="Code" autocomplete="off" spellcheck="false">' + menuBtn('mpjoin', 'Beitreten') + '</div><div id="mpmsg" class="note"></div></div>' + back + '</div>';
  } else if (pg === 'settings') {
    h += '<h2>Einstellungen</h2><div class="menulist">' + settingsHTML() + back + '</div>';
  } else if (pg === 'about') {
    h += '<p class="note intro" style="margin-top:-2px"><b>Danke, dass du Magus testest!</b> <b>Neu in Version 0.11:</b> Der <b>Computer</b> entscheidet sich in festgefahrenen Kämpfen schneller zum Angriff; lange Pattphasen, vor allem im ersten Abschnitt, werden dadurch seltener. Beim Spielstart <b>drehen sich die Monsterkarten</b> jetzt richtig um und die <b>Handkarten</b> drehen sich beim Austeilen und Aufdecken mit Schwung um. <b>Neu in Version 0.10:</b> Das <b>Haus-Symbol</b> im Spiel führt jetzt direkt ins <b>Hauptmenü</b>; dort setzt du die Partie mit <b>Spiel fortsetzen</b> fort. Die <b>Statistik</b> hat einen eigenen Knopf neben dem Haus. Die Würfel haben wieder ihre alten Farben: der <b>Pluswürfel ist grün</b>, der <b>Minuswürfel rot</b>. Im <b>Vollbild</b> bleiben die Würfel jetzt auf den Monsterkarten.</p><div class="menulist">' + back + '</div>';
  } else if (pg === 'quit') {
    h += '<p class="note" style="text-align:center;font-size:19px">Danke fürs Spielen!<br>Ein Browser-Tab lässt sich vom Spiel aus nicht immer schließen. Schließe diesen Tab oder dieses Fenster einfach selbst.</p><div class="menulist">' + back + '</div>';
  }
  overlay.innerHTML = h + '</div>';
  if (pg === 'multi') mpOffer();
}
function showEnd() {
  const w = G.winner, a = G.players[ME].sp, b = G.players[OPP].sp;
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  overlay.innerHTML = '<div class="box"><h1>' + (SPEC ? (w === null ? 'Unentschieden' : esc(G.players[w].name) + ' gewinnt') : w === ME ? 'Gewonnen' : w === null ? 'Unentschieden' : 'Verloren') + '</h1><p style="font-size:26px">' + a + ' : ' + b + ' Siegpunkte</p><p>' + (w === null ? 'Bei Gleichstand an Siegpunkten, Gold und Tempelstufe gibt es keinen Sieger.' : esc(G.players[w].name) + (G.templeWin ? ' hat bei gleichem Gold die höhere Tempelstufe (' + G.players[ME].temple.level + ' : ' + G.players[OPP].temple.level + ').' : G.goldWin ? ' hat bei Punktgleichstand das meiste Gold (' + G.players[ME].stats.gold + ' : ' + G.players[OPP].stats.gold + ').' : ' hat die meisten Siegpunkte.')) + '</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" style="font-size:19px;padding:8px 18px" data-act="stend" title="Verlauf der Partie">📈 Statistik</button><button class="btn" style="font-size:19px;padding:8px 18px" data-act="logdl" title="Protokoll der Partie als Datei speichern">⬇ Protokoll</button></div><button class="btn primary" style="font-size:22px;padding:10px 28px" data-act="' + (MP ? 'mpexit' : SPEC ? 'leave' : 'newgame') + '">' + (MP ? 'Zum Startbildschirm' : SPEC ? 'Zum Hauptmenü' : 'Neues Spiel') + '</button></div>';
}
