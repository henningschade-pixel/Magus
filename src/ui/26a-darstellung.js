// Aktuelle Versionsnummer: einzige Stelle, an der sie gesetzt wird (Menü-Link und Über-Seite lesen sie von hier; bei jedem Schritt hochzählen)
const MAGUS_VERSION = '0.9.0.1';
/* ---------- Darstellung: Kampfeffekt-Ton, Cursor, render, Menüs, Start- und Ergebnis-Bildschirm ---------- */
let leadPrev = null;
let sightSel = [];   // Hellsicht: meine Entscheidungen je gezogener Karte ('t' Hand, 'a' Ablage, 'd' Händler)
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
  else if (f.kind === 'sightcast') Snd.play('draw');
  else if (f.kind === 'shieldcast' || f.kind === 'trapcast') Snd.play('shield_hit');   // Schild bzw. Falle wird gelegt
  else if (f.kind === 'manatick') Snd.play('recover');
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
    const go = f => { if (!FAST) fxSound(f); if (f.kind === 'ultimate' && (f.el === 'E' || f.el === 'W')) UltFx.play(f.el); if (f.kind === 'trap') TrapFx.play(f); if (f.kind === 'lifeflow') FlowFx.lifeflow(f); else if (f.kind === 'aggro') FlowFx.aggro(f); else if (f.kind === 'drain') FlowFx.drain(f); else if (f.kind === 'ruin') FlowFx.ruin(f); else if (f.kind === 'attack') FlowFx.attack(f); else if (f.kind === 'defense') FlowFx.defense(f); };
    [].concat(e.fx || []).forEach(f => {
      if (f.kind === 'healtick') {   // Heilfluss: statt einer Textzeile Wolken aus den Heilmarkern zur Lebensanzeige (seit 0.7.2.3); die HP zeigen bis zur Heilung noch den alten Stand
        const wait = FAST ? 0 : Math.round(1000 * FlowFx.wait()), fly = FlowFx.healMs(Math.max(1, Math.min(4, f.marks || 1)));
        if (!FAST) { Snd.play('heal', wait / 1000, 0.9); holdHp(f.who, wait + fly, -(f.n || 0)); setTimeout(() => FlowFx.heal(f), wait); setTimeout(() => { if (G) render(); }, 0); setTimeout(() => { if (G) render(); }, wait + fly + 60); }
        return;
      }
      if (f.kind === 'manatick') {   // Manafluss: Wolke aus den Manamarkern zur Manaanzeige; das Mana zeigt bis dahin den alten Stand
        const wait = FAST ? 0 : Math.round(1000 * FlowFx.wait());
        if (!FAST) { Snd.play('recover', wait / 1000, 0.9); setTimeout(() => FlowFx.heal(Object.assign({ mana: true }, f)), wait); }
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
  { const sh = !endView && !modal ? sightOverlayHTML() : '', so = document.getElementById('sightov');   // Hellsicht-Auswahl im Vordergrund
    if (sh) { let o = so; if (!o) { o = document.createElement('div'); o.id = 'sightov'; stage.appendChild(o); } if (o.dataset.k !== sh) {
        const fo = G.combat.forced, sk = fo.cards.map(x => x.uid + x.id).join(',');
        if (o.dataset.s === sk) {   // gleiche Karten: nur Knöpfe und Hinweise nachziehen, die Karten blenden nicht neu ein
          const t = document.createElement('div'); t.innerHTML = sh;
          const nb = t.querySelectorAll('button'), ob = o.querySelectorAll('button'), ns = t.querySelector('.sightsub'), os = o.querySelector('.sightsub');
          ob.forEach((b, i) => { if (nb[i]) { b.className = nb[i].className; b.disabled = nb[i].disabled; } });
          if (ns && os) os.textContent = ns.textContent;
        } else { o.innerHTML = sh; o.dataset.s = sk; }
        o.dataset.k = sh;
      } }
    else if (so) so.remove(); }
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
    // Rituale von Heilfluss und Multispiegel laufen seit 0.7.2.5 bei jedem Wirken der Ultimate (showFx), nicht mehr nur bei steigender Stufe
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
// Spieleinstellungen (seit 0.8.1): Runden bis zum Erschöpfungsschaden und Siegpunktvorsprung für das vorzeitige Spielende (0 = aus); gelten für neue Partien, im Browser gespeichert
const RULE_OPTS = [
  { k: 'exhaustRounds', name: 'Runden bis Erschöpfung', min: 0, max: 30, tip: 'Nach so vielen Kampfrunden steigt die Erschöpfung um 1 (danach alle so viele Runden wieder): Beide Seiten verlieren am Ende ihres Angriffszugs entsprechend viele HP. 0 = keine Erschöpfung.' },
  { k: 'winLead', name: 'Siegpunkt-Vorsprung', min: 0, max: 10, tip: 'Hat ein Spieler nach einem Showdown mindestens so viele Siegpunkte Vorsprung, gewinnt er das Spiel sofort. 0 = das Spiel läuft immer bis zum dritten Showdown.' }
];
function gameRules() {
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const r = {};
  RULE_OPTS.forEach(o => { const v = Math.round(+sv[o.k]); r[o.k] = isFinite(v) && sv[o.k] !== undefined && sv[o.k] !== null ? Math.min(o.max, Math.max(o.min, v)) : M.DEFAULT_RULES[o.k]; });
  return r;
}
function setGameRule(k, d) {
  const o = RULE_OPTS.find(x => x.k === k); if (!o) return;
  const r = gameRules(); r[k] = d === 'def' ? M.DEFAULT_RULES[k] : Math.min(o.max, Math.max(o.min, r[k] + (+d || 0)));
  try { localStorage.setItem('magus_rules', JSON.stringify(r)); } catch (e) {}
}
function rulesHTML() {
  const r = gameRules(), std = RULE_OPTS.every(o => r[o.k] === M.DEFAULT_RULES[o.k]);
  const row = o => '<div class="rulerow" title="' + o.tip + '"><span>' + o.name + '</span><div class="stepper"><button class="btn" data-act="rule" data-k="' + o.k + '" data-d="-1" aria-label="weniger"' + (r[o.k] <= o.min ? ' disabled' : '') + '>−</button><output>' + (r[o.k] === 0 ? 'aus' : r[o.k]) + '</output><button class="btn" data-act="rule" data-k="' + o.k + '" data-d="1" aria-label="mehr"' + (r[o.k] >= o.max ? ' disabled' : '') + '>+</button></div></div>';
  return '<section class="setgrp"><div class="sethead"><h3>Spiel</h3>' + menuBtn('rule', 'Standardwerte', ' data-k="all" data-d="def" title="Beide Werte auf den Standard setzen (10 Runden, 4 Siegpunkte)"' + (std ? ' disabled' : ''), 'small') + '</div>' +
    '<div class="setbox">' + RULE_OPTS.map(row).join('') + '</div><p class="sethint">0 schaltet die Regel ab. Gilt für neue Spiele.</p></section>';
}
function settingsHTML() {   // Einstellungen (Hauptmenü und Spielmenü): Gruppe Ton (Schalter, zwei Regler) und Gruppe Spiel (seit 0.8.1.1; Aufbau seit 0.8.4)
  const si = Snd.info();
  return '<section class="setgrp"><div class="sethead"><h3>Ton</h3>' + menuBtn('sndtoggle', si.on ? '🔊 an' : '🔇 aus', ' title="Ton an oder aus"', 'small') + '</div>' + volHTML() + '</section>' + rulesHTML();
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
      '<div class="menufoot">' + menuTo('about', 'Neu in Version ' + MAGUS_VERSION, 'link') + '</div>';
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
    h += '<h2>Einstellungen</h2><div class="menulist setpage">' + settingsHTML() + back + '</div>';
  } else if (pg === 'about') {
    h += '<p class="note intro" style="margin-top:-2px"><b>Danke, dass du Magus testest!</b> <b>Neu in Version ' + MAGUS_VERSION + ':</b> <b>Echo-Marker farblos:</b> Der Marker hat keine Farbe mehr (Stein mit hellen Ringen, die Farbe steht als Buchstabe F, E oder W darin) und liegt mittig vor dem Statusfeld der jeweiligen Seite: deines unten, das des Gegners oben. <b>Version 0.9:</b> <b>Echo der Kombos:</b> Jeder Kombo (auch die Ultimate) hinterlässt bei seiner Seite ein Echo in der Farbe der ersten Karte. Das nächste Echo erneuert es. Enthält der nächste Kombo eine Sekundärkarte in der Farbe des Echos, steigt seine Stufe um 1 (höchstens 3). Das Echo ist als Marker sichtbar und lässt sich nicht läutern. <b>Version 0.8.7.3:</b> <b>Verteidigung bei vollem Rückwurf:</b> Wirft die Falle den gesamten Schaden zurück, entfällt die Verteidigung; die Gegenseite greift sofort an (Regel war schon so, jetzt durch einen Test abgesichert). <b>Version 0.8.7.2:</b> <b>Sinnlose Knöpfe inaktiv:</b> Im Angriffszug ist <b>Erholen</b> bei vollem Mana ausgegraut, <b>Nachziehen</b> bei rotem Nachziehmarker, wenn das Mana für die Kosten fehlt. <b>Version 0.8.7.1:</b> <b>Karten unter den Bildschirmen:</b> Zurückfliegende und verbrennende Karten liegen nicht mehr über dem Endbildschirm und den Menü- und Startbildschirmen, sondern dahinter. <b>Version 0.8.6.1:</b> <b>Siegbedingung:</b> Bei Gleichstand an Siegpunkten entscheidet jetzt zuerst die <b>Tempelstufe</b>, danach das <b>Gold</b> (vorher umgekehrt). <b>Version 0.8.6:</b> <b>Spielanleitung:</b> Zu Magus gibt es jetzt eine Anleitung als Präsentation im Stil eines analogen Spiels (Idee, Ablauf, Karten, Kampf, Kombos, Showdown, Spielende). Das Spiel selbst ist unverändert. <b>Version 0.8.4.1:</b> <b>Schild vor jeder Schadensquelle:</b> Das Schild mindert jetzt auch den <b>Rückwurf der Falle</b>, den <b>Todesfluss</b> und die <b>Erschöpfung</b> (je geminderten Schaden eine Ladung). <b>Version 0.8.4:</b> <b>Einstellungen aufgeräumt:</b> Die Gruppen Ton und Spiel haben je eine Kopfzeile mit Schalter beziehungsweise „Standardwerte“, die Werte stehen mit kompakten Knöpfen in einer Zeile. <b>Version 0.8.3.1:</b> <b>Reihenfolge bei der Niederlagenprüfung:</b> Fällt eine Seite auf 0 HP, wird in fester Reihenfolge geprüft: erst der <b>reflektierte Schaden</b> (Falle), dann der <b>Schaden nach der Verteidigung</b>, zuletzt die <b>Flusseffekte</b> (Todesfluss, Erschöpfung, Heil- und Manafluss). Die erste Stufe, in der jemand auf 0 HP fällt, entscheidet; spätere Stufen wirken dann nicht mehr. <b>Version 0.8.2.1:</b> <b>Neuer Endbildschirm:</b> Der Sieg wird groß gefeiert, die Niederlage würdig abgeschlossen; dazu ein Rückblick auf die Höhepunkte der Partie (mächtigster Angriff, stärkste Abwehr, knappster Sieg, Aufholjagd, letzter Hieb, beim Verlierer auch der Wendepunkt), der Siegpunktverlauf und eine Bilanz. Ein Klick überspringt die Animation, ein Klick auf eine Karte zeigt den Kampfverlauf. <b>Version 0.8.1.1:</b> <b>Spieleinstellungen in den Einstellungen:</b> Sie stehen jetzt in den Einstellungen im Abschnitt <b>Spiel</b>, getrennt vom Abschnitt <b>Ton</b>; dort lassen sich die <b>Runden bis zur Erschöpfung</b> (Standard 10) und der <b>Siegpunkt-Vorsprung</b> für das vorzeitige Spielende nach einem Showdown (Standard 4) einstellen; 0 schaltet die jeweilige Regel ab. Die Werte gelten für neue Spiele und bleiben im Browser gespeichert. <b>Version 0.8.0.8:</b> <b>Falle schwächer:</b> Sie wirft jetzt 1/2/3 statt 2/4/6 unblockbaren Schaden zurück. <b>Version 0.8.0.7:</b> <b>Fallenkarte schlichter:</b> Ohne blauen Rahmen, mit Stufenzähler; für den Gegner umgedreht. <b>Version 0.8.0.6:</b> <b>Mischen bei Falle und Hellsicht:</b> Reicht der Zugstapel nicht, wird der Ablagestapel gemischt und weitergezogen (Test ergänzt). <b>Version 0.8.0.5:</b> <b>Falle in der Mitte:</b> Die Falle zieht drei Karten vom Stapel (ohne die Hand zu ersetzen) und zeigt sie im Vordergrund; die nicht gewählten gehen auf den Ablagestapel. <b>Version 0.8.0.4:</b> <b>Hellsicht-Auswahl ruhiger:</b> Beim Wählen färben sich nur die Knöpfe ein, die Karten blenden nicht mehr neu ein. <b>Version 0.8.0.3:</b> <b>Hellsicht im Vordergrund:</b> Die gezogenen Karten liegen groß über dem Kampffeld, unter jeder stehen die drei Möglichkeiten. <b>Version 0.8.0.2:</b> <b>Hellsicht:</b> Blau + Rot zieht so viele Karten wie die Kombostufe; für jede entscheidest du, ob sie auf die Hand kommt (sofern Platz ist), auf den Ablagestapel oder zurück zum Händler. <b>Version 0.8.0.1:</b> <b>Falle statt Zerrüttung:</b> Auch Rot + Blau legt jetzt die Falle; die Zerrüttung entfällt. <b>Version 0.8:</b> <b>Blaue Kombos überarbeitet:</b> Blau + Rot legt eine <b>Falle</b> (drei Karten ziehen, eine verdeckt vor dich legen; bei Schaden aufgedeckt: passt die Farbe, werden 2/4/6 unblockbar vor der Verteidigung zurückgeworfen). Blau + Grün ist ein <b>Schild</b> (mindert nicht geblockten Schaden um 1/2/3 Ladungen). Blau + Rot + Grün ist der <b>Manafluss</b> (1/2/3 Mana am Ende deines Angriffszugs, mit neuer Animation). <b>Version 0.7.7.8:</b> <b>KI opfert nur mit Ergebnis:</b> Der Computergegner opfert im Tempel nur noch Gold, wenn die Punkte für eine Magiestufe wirklich herauskommen. Das galt für sein Überschussgold schon (alle 504 Opfer in 200 Partien endeten direkt in einem Magiekauf); jetzt gilt es auch in der Eröffnung. <b>Version 0.7.7.7:</b> <b>KI-Tempelopfer geprüft:</b> Die KI kann ihr Überschussgold jetzt auch gesammelt für mehrere Magiestufen auf einmal opfern (ein großes Opfer ergibt mehr Punkte als mehrere kleine). Die Messung zeigt, dass das Warten schlechter abschneidet als das sofortige Opfern; der Standard bleibt deshalb unverändert. <b>Version 0.7.7.6:</b> <b>KI nachtrainiert:</b> Der Computergegner opfert überschüssiges Gold jetzt sofort für Magie (Standard 1 statt 6) und baut seine HP etwas höher aus (7 statt 6). Gegen den Pool aus früh angreifenden Gegnern gewinnt er damit deutlich häufiger. <b>Version 0.7.7.5:</b> <b>KI setzt Überschussgold ein:</b> Kann der Computergegner nichts mehr für Gold verbessern, opfert er sein Gold im Tempel für die nächste Magiestufe. Vorher blieb seine Magie auf Stufe 1, und er sammelte über 100 Gold an. <b>Version 0.7.7.4:</b> Versionsnummer im Hauptmenü korrigiert. <b>Version 0.7.7.3:</b> <b>Vorzeitiges Spielende korrigiert:</b> Das Spiel endet nach einem Showdown, wenn ein Spieler mindestens <b>4 Siegpunkte Vorsprung</b> hat (4 : 0, 5 : 1). Bei 4 : 1 geht es weiter. <b>Version 0.7.7.2:</b> Die <b>Kampfrunden</b> sind nicht mehr begrenzt. Stattdessen gibt es die <b>Erschöpfung</b>: Nach je 10 Kampfrunden steigt sie um 1, und beide Seiten verlieren am Ende ihres Angriffszugs entsprechend viele HP (Runde 11–20: 1 HP, Runde 21–30: 2 HP …). <b>Version 0.7.6.8:</b> Die Farben des <b>Multischilds</b> sind kräftiger (Rot, Gelb, Grün, Blau, Violett). <b>Version 0.7.6.7:</b> Lösen <b>zwei Schilde</b> gleichzeitig aus (Farbspiegel und Multispiegel), laufen beide Schild-Effekte nebeneinander ab statt nur einer. <b>Version 0.7.6.6:</b> <b>Vorzeitiges Spielende:</b> Wer nach einem Showdown mit 4 oder mehr Siegpunkten führt, gewinnt das Spiel sofort; bei Gleichstand geht es weiter. <b>Version 0.7.6.5:</b> Die <b>Kampfrunden</b> werden gezählt (im Kampffenster: „Runde 3 von 10“) und sind auf 10 begrenzt. Eine Runde ist ein Angriffszug jeder Seite. Ist nach der 10. Runde keiner auf 0 HP gefallen, endet der Kampf unentschieden (Monster behält seine Verletzungen, im Showdown gibt es keine Siegpunkte). Die KI greift dafür früher an. <b>Version 0.7.6.4:</b> Das <b>Opfern von Gold im Tempel</b> ist kein Zug mehr: Du bleibst am Zug, kannst mehrmals opfern und danach in derselben Runde Magie kaufen; der Nachziehmarker bleibt dabei unverändert. Unter der Magiegrafik steht jetzt, was die <b>nächste Magiestufe</b> kostet. Die KI opfert und kauft entsprechend im selben Zug. <b>Version 0.7.6.3:</b> Das <b>Abwerfen nach einer Zerrüttung</b> ist kein Zug: Es zählt nicht für den Zugzähler und lässt den Nachziehmarker unverändert. <b>Version 0.7.6.2:</b> Die <b>Heilung</b> wirkt nach dem Schaden nur noch, wenn der Verteidiger ihn überlebt: Fällt er durch den Schaden auf 0 HP, ist er besiegt und die Heilung verfällt. <b>Version 0.7.6.1:</b> Die <b>Läuterung</b> lässt sich jetzt auch in der Verteidigung wählen: Eigene Nachziehtokens und Schilde (und alle anderen Marker) sind anklickbar, und die Vorschau sagt, dass die Läuterung <i>vor</i> der Verteidigung wirkt. <b>Version 0.7.5.1:</b> Der <b>Computergegner</b> wurde an die neuen Regeln angepasst: Er opfert kein Gold mehr für Magie, bewertet Heilfluss und Multispiegel neu, entfernt mit der Läuterung gezielt eigene Todesmarker und gegnerische Heilmarker und wartet mit der Eröffnung auf den ersten besiegten Monsterkampf statt auf zufälliges Gold; Angriffs- und Schadensgewichte sind neu abgestimmt. Die Regeln bleiben gleich. <b>Version 0.7.3.3:</b> Der Siegpunktestand sitzt mittig im innersten Ring des Magie-Boards. <b>Version 0.7.3.2:</b> Versatz am Magie-Board korrigiert: Die Leucht- und Abdunkelmarken der Stufen sitzen jetzt genau auf den Edelsteinen der neuen Grafik. <b>Version 0.7.3.1:</b> Das Magie-Board (unten rechts) hat eine neue Grafik: der dreifache Ouroboros mit roten, grünen und blauen Edelsteinen. <b>Version 0.7.2.24:</b> Jeder Spieler beginnt mit 3 statt 2 Siegpunkten. <b>Version 0.7.2.23:</b> Schilde (Farbspiegel und Multispiegel), die in der Verteidigung gestellt werden, wirken erst nach ihr, wie die Heilung: nicht mehr gegen den laufenden Angriff, aber ab dem nächsten. <b>Version 0.7.2.22:</b> Die Versionsliste zeigt nur noch die Updates der aktuellen Hauptversion 0.7 (ältere Einträge entfallen). <b>Version 0.7.2.21:</b> Der Innenschatten des Multispiegels ist etwas weicher. <b>Version 0.7.2.20:</b> Der Innenschatten am Rand des Multispiegels ist kleiner und härter. <b>Version 0.7.2.19:</b> Die Teilung des Multispiegels hat keine Trennlinie, nur die schattierte rechte Hälfte. <b>Version 0.7.2.18:</b> Der Multispiegel ist mittig von oben nach unten geteilt, die rechte Hälfte ist schattiert (wie bei den anderen Schildern). <b>Version 0.7.2.17:</b> Der Multispiegel wirft vom Rand einen Schatten nach innen. <b>Version 0.7.2.16:</b> Der Schatten der Marker liegt noch dichter am Marker. <b>Version 0.7.2.15:</b> Der Multispiegel ist dunkler und passt zu den übrigen Schildern. <b>Version 0.7.2.14:</b> Die Markerreihe liegt so, dass weder markierte Handkarten noch Zähler verdeckt werden. <b>Version 0.7.2.12:</b> Todes- und Heilmarker erscheinen nur noch als ein Token mit Zähler (×N), statt mehrfach abgebildet zu werden; der Multispiegel hatte den Zähler schon. <b>Version 0.7.2.11:</b> Alle Marker (Todes-, Heil- und Schildmarker) liegen in einer lockeren Reihe mittig direkt vor den Handkarten ihres Spielers und verdecken keine Anzeigen. <b>Version 0.7.2.10:</b> Der Schatten der Marker ist näher und härter; Schildmarker sind jetzt ebenfalls Pappmarker. <b>Version 0.7.2.9:</b> Todes- und Heilmarker haben eine dezente Tiefe und wirken wie ausgestanzte Pappmarker. <b>Version 0.7.2.8:</b> Der <b>Heilfluss</b> wirkt wie der Todesfluss erst am Ende der <b>nächsten</b> eigenen Angriffsphase, nicht schon in der Phase, in der die Ultimate gelegt wurde. <b>Version 0.7.2.7:</b> Das <b>Multischild</b> heißt jetzt <b>Multispiegel</b>. <b>Version 0.7.2.6:</b> Todes- und Heilmarker liegen als Haufen mittig vor dem Stapel ihres Spielers, leicht verdreht und versetzt (Todesmarker vorn, Heilmarker in einer zweiten Reihe); der Heilmarker ist kleiner und dezenter. <b>Version 0.7.2.5:</b> Das Ritual von <b>Heilfluss</b> und <b>Multischild</b> erscheint jetzt bei jedem Wirken der Ultimate, auch wenn die Stufe nicht steigt (vorher nur bei steigender Stufe). <b>Version 0.7.2.4:</b> Das <b>Prisma</b> heißt jetzt <b>Multischild</b>. Sein Ritual beginnt mit einem Kreis, aus dem die Schildkuppel wächst; Kristall und Lichtstrahl entfallen. <b>Version 0.7.2.3:</b> Der <b>Heilfluss</b> hat jetzt auch am Ende der Angriffsphase einen Effekt: Aus jedem Heilmarker steigt eine grüne Wolke zur Lebensanzeige und heilt dort (wie die Wolke des Todesfluss). <b>Version 0.7.2.2:</b> Die Ultimates <b>Heilfluss</b> und <b>Prisma</b> haben jetzt ein eigenes Ritual auf dem Bildschirm (wie das Pentagramm des Todesfluss). Die <b>Stufen des Prisma verfallen</b> wie die eines Farbspiegels, verbraucht wird aber immer zuerst der Farbspiegel. <b>Version 0.7.2.1:</b> Keine Spieländerung: Die neue <b>Ultimate-Werkstatt</b> (Effektwerkstatt für die Kombos aus allen drei Elementen) zeigt Todesfluss, Prisma und Heilfluss als Ritual mit Markern und Wirkung; sie liegt im Projekt unter <b>werkstatt/</b>. <b>Version 0.7.1.2:</b> Umbenennung in den Kombos: Das Wasser-Ultimate heißt jetzt <b>Prisma</b> (vorher Regenbogenschild), die beiden Spiegel-Kombos heißen <b>Feuerspiegel</b> und <b>Erdspiegel</b>. <b>Version 0.7.1.1:</b> In der Kombo-Übersicht ist die Schrift größer und füllt das Fenster; die Farbgruppen (Feuer, Wasser, Erde) sind getönt und durch Abstand getrennt. <b>Version 0.7.0.3:</b> Die Kombo-Übersicht nutzt die volle Höhe ihres Fensters. <b>Version 0.7.0.2:</b> In der Kombo-Übersicht entfallen die Farbüberschriften und der Zusatz „(Ultimate)“; die Reihenfolge nach Farbe bleibt. <b>Version 0.7.0.1:</b> Die <b>Kombo-Übersicht</b> ordnet alle Kombos nach Farbe der ersten Karte; die Ultimate steht unter ihrer Farbe (Feuer <b>Todesfluss</b>, Wasser Regenbogenschild, Erde Heilfluss) und alles ist ohne Scrollen sichtbar. Der Todes-Fluch heißt jetzt Todesfluss. <b>Version 0.7:</b> <b>Ultimates nach Farbe der ersten Karte:</b> Feuer wirkt wie bisher als Todesfluss, Erde legt einen <b>Heilfluss</b> (grüne Marker mit Plus heilen dich am Ende jeder deiner Angriffsphasen), Wasser einen <b>Regenbogenschild</b> (wirkt gegen jede Farbe wie ein Spiegel, verbraucht sich aber nicht). Alle drei Marker entfernt nur die Läuterung. <b>Gold opfern</b> geht ohne Obergrenze. <b>Karten</b> lassen sich unabhängig von der entwickelten Magie kaufen. Die <b>Strafe des roten Nachziehmarkers</b> (Mana und Gold) wächst mit dem Abschnitt (1/2/3); vor dem Nachziehen warnt eine Abfrage. Der Hinweistext zur Schildwirkung entfällt.</p><div class="menulist">' + back + '</div>';
  } else if (pg === 'quit') {
    h += '<p class="note" style="text-align:center;font-size:19px">Danke fürs Spielen!<br>Ein Browser-Tab lässt sich vom Spiel aus nicht immer schließen. Schließe diesen Tab oder dieses Fenster einfach selbst.</p><div class="menulist">' + back + '</div>';
  }
  overlay.innerHTML = h + '</div>';
  if (pg === 'multi') mpOffer();
}
function endBasicHTML() {
  const w = G.winner, a = G.players[ME].sp, b = G.players[OPP].sp;
  return '<div class="box"><h1>' + (SPEC ? (w === null ? 'Unentschieden' : esc(G.players[w].name) + ' gewinnt') : w === ME ? 'Gewonnen' : w === null ? 'Unentschieden' : 'Verloren') + '</h1><p style="font-size:26px">' + a + ' : ' + b + ' Siegpunkte</p><p>' + (w === null ? 'Bei Gleichstand an Siegpunkten, Gold und Tempelstufe gibt es keinen Sieger.' : esc(G.players[w].name) + (G.templeWin ? ' hat bei gleichem Gold die höhere Tempelstufe (' + G.players[ME].temple.level + ' : ' + G.players[OPP].temple.level + ').' : G.goldWin ? ' hat bei Punktgleichstand das meiste Gold (' + G.players[ME].stats.gold + ' : ' + G.players[OPP].stats.gold + ').' : ' hat die meisten Siegpunkte.')) + '</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" style="font-size:19px;padding:8px 18px" data-act="stend" title="Verlauf der Partie">📈 Statistik</button><button class="btn" style="font-size:19px;padding:8px 18px" data-act="logdl" title="Protokoll der Partie als Datei speichern">⬇ Protokoll</button></div><button class="btn primary" style="font-size:22px;padding:10px 28px" data-act="' + (MP ? 'mpexit' : SPEC ? 'leave' : 'newgame') + '">' + (MP ? 'Zum Startbildschirm' : SPEC ? 'Zum Hauptmenü' : 'Neues Spiel') + '</button></div>';
}

// Endbildschirm (Gestaltung und Rückblick in 26b); der Inhalt wird nur neu gesetzt, wenn er sich ändert, damit die Animation nicht bei jedem Zeichnen von vorn beginnt
function showEnd() {
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  let html; try { html = finaleHTML(); } catch (e) { html = endBasicHTML(); }   // Rückfall: schlichter Endbildschirm
  if (overlay.dataset.fin !== html || !overlay.querySelector('.box.finale')) { overlay.innerHTML = html; overlay.dataset.fin = html; }
}
