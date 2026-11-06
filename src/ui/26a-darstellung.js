/* ---------- Darstellung: Kampfeffekt-Ton, Cursor, render, Menüs, Start- und Ergebnis-Bildschirm ---------- */
let leadPrev = null;
const fdSel = new Set();   // Zerrüttung: von mir gewählte Abwurfkarten (Handplätze)
const forcedMe = () => !!(G && G.phase === 'combat' && G.combat && G.combat.forced && G.combat.forced.pid === ME);
let curKey = null, curDown = false, mkSeen = null, dthSeen = null, hlSeen = null, rbSeen = null, fxFor = null, fxLast = 0;
// Sekundär ausgelöste Effekte (Spiegel wirft Schaden zurück, Todesfluss zehrt) kurz an der betroffenen Seite einblenden
// Ton zu einem Kampfeffekt (Angriff und Verteidigung bringen ihre Sounds im Ablauf der Animation selbst mit)
function fxSound(f) {
  if (f.kind === 'ultimate' && f.el === 'E') Snd.play('heal');
  else if (f.kind === 'ultimate' && f.el === 'W') Snd.play('shield_hit');
  else if (f.kind === 'ultimate' || (f.kind === 'aggro' && f.ult)) Snd.play('ultimate');
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
function comboSeconds(f) {   // Sekunden bis zur Ankunft einer Kombo-Animation (passend zu den Animationen in 22-lifeflow-aggro.js); 0 bei allem anderen
  if (f.kind === 'aggro') return .3 + (Math.max(1, f.n || 1) - 1) * .22 + .75;
  if (f.kind === 'ruin') return .12 + .55 + .05;
  if (f.kind === 'lifeflow') return (.1 + (Math.max(1, f.removed || 1) - 1) * .06 + .37) * 2.6;
  if (f.kind === 'mirrorcast') return .6;
  return 0;
}
function holdCombo(f, delay) {
  if (FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const dur = comboSeconds(f);
  if (!dur || f.kind === 'mirrorcast') return;
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
      if (f.removed > 0 || !(f.heal > 0)) sides.forEach((s, i) => { const p = i ? h.pre.b : h.pre.a; ['death', 'mirror', 'mirrorEl', 'freeDraws'].forEach(k => { if (p[k] === undefined) delete s.stats[k]; else s.stats[k] = p[k]; }); });
      const w = sides.find(s => s.ctrl === f.who); if (w && f.heal > 0) w.stats.hp = Math.max(0, w.stats.hp - f.heal);
    }
  }
  try { return fn(); } finally {
    c.forced = forced;
    sides.forEach((s, i) => { s.deck.discard = saved[i].disc; Object.keys(s.stats).forEach(k => { delete s.stats[k]; }); Object.assign(s.stats, saved[i].st); });
  }
}
// HP-Anzeige einer Seite für ms Millisekunden um add verschoben halten (Todesfluss: +, die Wolke ist noch unterwegs; Heilfluss: −, die Heilung ist noch unterwegs). Mehrere Wolken derselben Seite addieren sich.
function holdHp(who, ms, add) {
  const now = Date.now(), prev = curseHold[who] && now < curseHold[who].until ? curseHold[who] : null;
  curseHold[who] = { until: Math.max(now + ms, prev ? prev.until : 0), add: add + (prev ? prev.add : 0) };
}
function showFx() {
  if (fxFor !== G) { fxFor = G; fxLast = G.logN; FlowFx.resetEx(); return; }
  let k = 0, preMs = 0;   // preMs: Wartezeit der Verteidigungsanimation hinter einer Kombo-Animation derselben Aktion
  for (const e of G.log) {
    if (e.n <= fxLast) continue;
    const go = f => { if (!FAST) fxSound(f); if (f.kind === 'lifeflow') FlowFx.lifeflow(f); else if (f.kind === 'aggro') FlowFx.aggro(f); else if (f.kind === 'drain') FlowFx.drain(f); else if (f.kind === 'ruin') FlowFx.ruin(f); else if (f.kind === 'attack') FlowFx.attack(f); else if (f.kind === 'defense') FlowFx.defense(f); };
    [].concat(e.fx || []).forEach(f => {
      if (f.kind === 'healtick') {   // Heilfluss: statt einer Textzeile Wolken aus den Heilmarkern zur Lebensanzeige (seit 0.7.2.3); die HP zeigen bis zur Heilung noch den alten Stand
        const wait = FAST ? 0 : Math.round(1000 * FlowFx.wait()), fly = FlowFx.healMs(Math.max(1, Math.min(4, f.marks || 1)));
        if (!FAST) { Snd.play('heal', wait / 1000, 0.9); holdHp(f.who, wait + fly, -(f.n || 0)); setTimeout(() => FlowFx.heal(f), wait); setTimeout(() => { if (G) render(); }, 0); setTimeout(() => { if (G) render(); }, wait + fly + 60); }
        return;
      }
      if (f.late) { lateN++; setTimeout(() => { lateN--; go(f); }, Math.round(1000 * FlowFx.wait()) + 150); return; }
      if (f.first) preMs = Math.max(preMs, Math.round(1000 * comboSeconds(f)) + 100);   // seit 0.4: Kombo der Verteidigung zuerst
      if (f.kind === 'defense' && preMs > 0 && !FAST) {   // die Verteidigungsanimation beginnt erst, wenn die Kombo-Animation durch ist; bis dahin zeigen die HP-Balken den Stand vor dem Schaden
        const wait = preMs; preMs = 0;
        if (f.hpPre) { hpHold = { until: Date.now() + wait + 60, pre: f.hpPre, un: { [f.who]: Date.now() + wait, [f.to]: Date.now() + wait } }; setTimeout(() => { if (G) render(); }, wait + 80); }
        lateN++; setTimeout(() => { lateN--; go(f); }, wait);
      } else go(f);
    });
    const m = /^(Todesfluss): /.exec(e.txt); if (!m) continue;   // (der frühere Hinweistext zur Schildwirkung entfällt seit 0.7)
    {   // statt einer Textzeile: Wolke aus den Todesmarkern zur Lebensanzeige; die HP zeigen bis zum Einschlag noch den alten Stand
      const nd = +((/verliert (\d+) HP/.exec(e.txt) || [0, 1])[1]), victim = e.pid, wait = FAST ? 0 : Math.round(1000 * FlowFx.wait()), fly = FlowFx.curseMs(nd);
      Snd.play('curse', wait / 1000, 0.95);   // Fluch-Sound, wenn die Wolke losfliegt
      if (!FAST) {
        holdHp(victim, wait + fly, nd);
        setTimeout(() => FlowFx.curse({ who: victim, n: nd }), wait); setTimeout(() => { if (G) render(); }, 0); setTimeout(() => { if (G) render(); }, wait + fly + 60);
      }
      continue;
    }
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
    const hh = hpHold && Date.now() < hpHold.until, ch = G.phase === 'combat' && G.combat && Object.keys(curseHold).some(k => Date.now() < curseHold[k].until);
    if ((hh || ch) && G.phase === 'combat' && G.combat) {   // Schild- oder Fluch-Effekt läuft: die HP-Werte zeigen noch den Stand vor dem Schaden
      const sides = [G.combat.sides.a, G.combat.sides.b], keep = sides.map(s => s.stats.hp);
      sides.forEach(s => {
        const held = hh && hpHold.pre[s.ctrl] !== undefined && Date.now() < (hpHold.un[s.ctrl] || 0);
        if (held) s.stats.hp = hpHold.pre[s.ctrl];
        else if (curseHold[s.ctrl] && Date.now() < curseHold[s.ctrl].until) s.stats.hp = Math.max(0, Math.min(s.stats.maxHp, s.stats.hp + curseHold[s.ctrl].add));   // Todesfluss: Wolke noch unterwegs; Heilfluss: Heilung noch unterwegs (add negativ)
      });
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
    const dd = (sa.death || 0) + (sb.death || 0);   // Todesfluss-Marker hinzugekommen -> Fluch-Sound
    if (dthSeen && dthSeen.c === G.combat && dd > dthSeen.n) CurseFx.play();
    dthSeen = { c: G.combat, n: dd };
    const hl = (sa.heal || 0) + (sb.heal || 0), rb = (sa.rainbow || 0) + (sb.rainbow || 0);   // Heilfluss- bzw. Prisma-Marker hinzugekommen -> Ritual (seit 0.7.2.2)
    if (hlSeen && hlSeen.c === G.combat && hl > hlSeen.n) UltFx.play('E');
    if (rbSeen && rbSeen.c === G.combat && rb > rbSeen.n) UltFx.play('W');
    hlSeen = { c: G.combat, n: hl }; rbSeen = { c: G.combat, n: rb };
  } else { mkSeen = null; dthSeen = null; hlSeen = null; rbSeen = null; }
  if (manaPv > 0 && cx.combat) { const mv = panels.querySelector('.sbody[data-lead] [data-pv="mana"]'), st = cx.myStats; if (mv) { mv.innerHTML = '<span class="pvdn">' + Math.max(0, st.mana - manaPv) + '</span>/' + st.maxMana; ArcFx.mark(mv, st.mana + '/' + st.maxMana, null, true); } }   // Mana nach dem Ausspielen in Rot; der Anteil auf dem Mana-Bogen blinkt dazu (seit 0.5.6.5)
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
      '<div class="menufoot">' + menuTo('about', 'Neu in Version 0.7.2.3', 'link') + '</div>';
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
    h += '<p class="note intro" style="margin-top:-2px"><b>Danke, dass du Magus testest!</b> <b>Neu in Version 0.7.2.3:</b> Der <b>Heilfluss</b> hat jetzt auch am Ende der Angriffsphase einen Effekt: Aus jedem Heilmarker steigt eine grüne Wolke zur Lebensanzeige und heilt dort (wie die Wolke des Todesfluss). <b>Version 0.7.2.2:</b> Die Ultimates <b>Heilfluss</b> und <b>Prisma</b> haben jetzt ein eigenes Ritual auf dem Bildschirm (wie das Pentagramm des Todesfluss). Die <b>Stufen des Prisma verfallen</b> wie die eines Farbspiegels, verbraucht wird aber immer zuerst der Farbspiegel. <b>Version 0.7.2.1:</b> Keine Spieländerung: Die neue <b>Ultimate-Werkstatt</b> (Effektwerkstatt für die Kombos aus allen drei Elementen) zeigt Todesfluss, Prisma und Heilfluss als Ritual mit Markern und Wirkung; sie liegt im Projekt unter <b>werkstatt/</b>. <b>Version 0.7.1.2:</b> Umbenennung in den Kombos: Das Wasser-Ultimate heißt jetzt <b>Prisma</b> (vorher Regenbogenschild), die beiden Spiegel-Kombos heißen <b>Feuerspiegel</b> und <b>Erdspiegel</b>. <b>Version 0.7.1.1:</b> In der Kombo-Übersicht ist die Schrift größer und füllt das Fenster; die Farbgruppen (Feuer, Wasser, Erde) sind getönt und durch Abstand getrennt. <b>Version 0.7.0.3:</b> Die Kombo-Übersicht nutzt die volle Höhe ihres Fensters. <b>Version 0.7.0.2:</b> In der Kombo-Übersicht entfallen die Farbüberschriften und der Zusatz „(Ultimate)“; die Reihenfolge nach Farbe bleibt. <b>Version 0.7.0.1:</b> Die <b>Kombo-Übersicht</b> ordnet alle Kombos nach Farbe der ersten Karte; die Ultimate steht unter ihrer Farbe (Feuer <b>Todesfluss</b>, Wasser Regenbogenschild, Erde Heilfluss) und alles ist ohne Scrollen sichtbar. Der Todes-Fluch heißt jetzt Todesfluss. <b>Version 0.7:</b> <b>Ultimates nach Farbe der ersten Karte:</b> Feuer wirkt wie bisher als Todesfluss, Erde legt einen <b>Heilfluss</b> (grüne Marker mit Plus heilen dich am Ende jeder deiner Angriffsphasen), Wasser einen <b>Regenbogenschild</b> (wirkt gegen jede Farbe wie ein Spiegel, verbraucht sich aber nicht). Alle drei Marker entfernt nur die Läuterung. <b>Gold opfern</b> geht ohne Obergrenze. <b>Karten</b> lassen sich unabhängig von der entwickelten Magie kaufen. Die <b>Strafe des roten Nachziehmarkers</b> (Mana und Gold) wächst mit dem Abschnitt (1/2/3); vor dem Nachziehen warnt eine Abfrage. Der Hinweistext zur Schildwirkung entfällt. <b>Version 0.6.1.2:</b> Gegen endlose Patt-Schleifen im Zuschauermodus: Die KI flieht nur noch bei deutlichem Rückstand und nach 15 Runden ohne entschiedenen Kampf gar nicht mehr. <b>Version 0.6.0.3:</b> Die entwickelte Magie ist deutlicher hervorgehoben: erreichte Stufen haben einen hellen Rand und ein stärkeres Leuchten, die übrigen Steine sind dunkler und grau. <b>Version 0.6.0.2:</b> Das Magie-Board sitzt höher im Panel und ist etwas kleiner; die Kaufknöpfe für Magie liegen am äußeren Rand des Rings statt weiter innen. <b>Version 0.6.0.1:</b> Über den Siegpunkten in der Ringmitte steht kein Stern mehr. <b>Version 0.6:</b> Die Magie steht jetzt auf einem <b>dreifachen Ouroboros</b>: Feuer (rot) oben, Erde (grün) rechts unten, Wasser (blau) links unten; je Ring ein Edelstein, innen Stufe 1, außen Stufe 3. Erreichte Stufen leuchten, die übrigen sind abgedunkelt. Die <b>Siegpunkte</b> stehen in der Mitte des Rings. <b>Version 0.5.7.3:</b> Das Spiel heißt wieder <b>Magus</b> (der Name Trimagus ist zurückgenommen). <b>Version 0.5.7.2:</b> Der Opfern-Knopf steht immer da, solange du Gold opfern könntest. Er beginnt bei 0 Münzen und ist dann teiltransparent; mit ▶ stellst du die Anzahl ein. <b>Version 0.5.7.1:</b> Die Pfeile ◀ ▶ zum Opfern erscheinen nur, wenn sie nutzbar sind (◀ ab 1 Münze, ▶ solange Gold zum Aufstocken da ist, höchstens 4); sonst sind sie durchsichtig. <b>Version 0.5.7:</b> In der Verteidigung steht der <b>zu erwartende HP- und Mana-Verlust</b> schon vor dem Überfahren mit der Maus in den Werten und ändert sich mit den markierten Karten. <b>Neu in Version 0.5.6.6:</b> Beim Opfern zeigt der Münzknopf die Zahl der Münzen erst ab 2 als Plakette; bei 1 steht er ohne Zahl, bei 0 ist er durchsichtig. <b>Version 0.5.6.5:</b> Solange Karten markiert sind, blendet der Manapunkt, den sie kosten, auf dem Mana-Bogen aus und ein (zusammen mit dem roten Manawert). <b>Version 0.5.6.4:</b> Beim Überfahren eines Knopfes (Verteidigen, Passen, Erholen, Nachziehen, Plus-Knöpfe) blendet auf dem gebogenen HP- bzw. Mana-Balken der betroffene Anteil aus und ein, zum Beispiel der eine Manapunkt, den ein Angriff kostet. Die Werte erscheinen dabei weiter in Rot (weniger) oder Grün (mehr). <b>Version 0.5.5:</b> Die Würfelseite „Hand“ (mehr Handkarten) zeigt jetzt eine Hand statt dreier Karten. <b>Version 0.5.4.1:</b> Der Todesfluss zeigt keine Textzeile mehr: Aus jedem Todesmarker steigt eine violette Wolke auf, fliegt zur Lebensanzeige und zehrt dort die HP; bis zum Einschlag zeigt die Anzeige noch den alten Stand. <b>Version 0.5.4:</b> Die Heilung der Verteidigung wirkt wieder nach Angriff und Verteidigung: Sie gleicht den Schaden nachträglich aus (höchstens bis zu den maximalen HP). Die Zerrüttung und die übrigen Kombos wirken weiterhin davor. <b>Version 0.5.3.1:</b> Die Todesmarker stehen nicht mehr als kleine Symbole in der Limit-Zeile, sondern liegen als einzelne, größere Marker neben den Nachziehtokens auf dem Tisch (eigene über deinem Nachziehstapel, die des Gegners neben seinem). <b>Version 0.5.3:</b> Alle Knöpfe links (Opfern, HP, Mana, Limit) stehen jetzt auf einer Linie unter dem Münzknopf. HP und Mana stehen nicht mehr als Balken in den Zeilen, sondern als gebogene Linien links (HP) und rechts (Mana) neben der Magiescheibe. <b>Version 0.5.2.2:</b> Die Pfeile ◀ ▶ zum Opfern stehen jetzt links und rechts neben dem Münzknopf. <b>Version 0.5.2.1:</b> Die Versionsbeschreibung nennt nur noch die Versionen ab 0.4. <b>Version 0.5.2:</b> <b>Opfern wie die anderen Knöpfe:</b> Ein goldener Münzknopf steht links neben dem Gold, die Zahl der geopferten Münzen zeigt er als Plakette. Mit den Pfeilen ◀ ▶ daneben stellst du die Anzahl ein; die Schaltfläche „Opfern“ ist entfallen. <b>Version 0.5.1:</b> <b>Das Spiel hieß ab hier Trimagus.</b> Du startest mit <b>Ausspiellimit 1</b> (vorher 2). Jede Weiterentwicklung wird mit jedem Kauf teurer: die erste kostet 1 Gold, die zweite 2 Gold (gilt für Ausspiellimit, Handplätze, Nachziehlimit, max. HP und max. Mana; die Magie kostet wie bisher 1, 2, 3 … Upgrade-Punkte). Jede Entwicklung ist auf <b>Stufe 3</b> begrenzt, also auf zwei Ausbauten: Ausspiellimit 1 bis 3, Handplätze 3 bis 5, Nachziehlimit 1 bis 3, max. HP 4 bis 8, max. Mana 4 bis 6, Magie 1 bis 3. Die Monster behalten ihre Werte. Der Computer ist noch nicht neu abgestimmt. <b>Version 0.4.1:</b> Keine Spieländerung: Vier weitere Ideen sind als Notizen festgehalten (Umbenennung in Trimagus, Upgrades höchstens 3, Start mit 3 Siegpunkten, Siegpunkt-Belohnung 2 in Stufe 2 und 3 in Stufe 3). <b>Neu in Version 0.4:</b> Vier Regeländerungen. <b>Monster:</b> Die zweite Magie eines Monsters ist jetzt die <b>überlegene</b> (Feuer-Monster: Wasser, Erde-Monster: Feuer, Wasser-Monster: Erde). <b>Combo zuerst:</b> Auch in der Verteidigung wirkt der Combo-Effekt vor der Verteidigung selbst; die Heilung füllt die HP also auf, bevor der Schaden trifft, und ein Spiegel-Combo wirkt sofort gegen den laufenden Angriff. <b>Ausgleich:</b> Nach einer Niederlage gegen ein Monster erhält ihn nur noch der Verlierer. <b>Nur Gold:</b> Der Abschnittsbonus beträgt je Monster 1, 2 und 3 Gold (3, 6, 9 Gold je Abschnitt), der Ausgleich nach einer Niederlage 1, 2 und 3 Gold; es gibt keine Upgrade-Punkte mehr als Bonus. Computer neu abgestimmt.</p><div class="menulist">' + back + '</div>';
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
