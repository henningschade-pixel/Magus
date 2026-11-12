/* ---------- Darstellung: Kampfeffekt-Ton, Cursor, render und Ergebnis-Bildschirm (Menüs, Einstellungen und Startseite: 26c-startseite.js) ---------- */
let leadPrev = null;
let exSeen = null;   // Erschöpfungsstufe des Kampfes, wie zuletzt gezeichnet (für die Ankündigung beim Anstieg)
function exhaustBanner(lv) {   // Erschöpfung setzt ein / steigt: Schriftzug mitten im Bild, dazu ein dunkler Ton
  const b = document.createElement('div'); b.className = 'exhbanner'; b.innerHTML = lv === 1 ? 'Erschöpfung setzt ein<small>Beide Seiten verlieren am Ende ihres Angriffszugs 1 HP</small>' : 'Erschöpfung ' + lv + '<small>Beide Seiten verlieren am Ende ihres Angriffszugs ' + lv + ' HP</small>';
  stage.appendChild(b); Snd.play('ruin', 0, 0.8); setTimeout(() => b.remove(), 3200);
}
let zermSeen = null;   // Zermürbung der Weltphase (seit 0.9.7): war sie beim letzten Zeichnen aktiv? (null = keine Weltphase; für die Ankündigung beim Einsetzen)
function zermBanner(g) {   // Zermürbung setzt ein: Schriftzug mitten im Bild (wie bei der Erschöpfung), dazu ein dunkler Ton
  const b = document.createElement('div'); b.className = 'exhbanner zerm'; b.innerHTML = 'Zermürbung setzt ein<small>Wer seinen Zug beendet, ohne ein Monster anzugreifen, schenkt dem Gegner ' + g + ' Gold</small>';
  stage.appendChild(b); Snd.play('ruin', 0, 0.8); setTimeout(() => b.remove(), 3200);
}
function worldRoundNote() {   // Rundenzähler der Weltphase (seit 0.9.7), derselbe wie im Kampf; seit 0.9.7.1 setzt ihn ein Monsterkampf nicht zurück
  const ex = G.rules.exhaustRounds || 0, rd = M.worldRound(G), wear = M.worldWear(G), g = M.worldWearGold(G);
  const tip = 'Eine Runde ist ein Zug jedes Spielers; ein Monsterkampf setzt ihn nicht zurück, erst ein Showdown.' + (ex > 0 ? ' Ab Runde ' + (ex + 1) + ' setzt die Zermürbung ein: Wer seinen Zug beendet, ohne ein Monster anzugreifen, schenkt dem Gegner Gold in Höhe der Spielstufe (' + g + ').' : '');
  return '<div class="worldround" style="left:' + LAYOUT.turnflag.left + 'px;top:' + (LAYOUT.turnflag.top + 36) + 'px;width:' + LAYOUT.turnflag.w + 'px" title="' + tip + '">Runde <b>' + rd + '</b>' + (wear ? ' · <b class="zermtx">Zermürbung: ohne Monsterangriff erhält der Gegner ' + g + ' Gold</b>' : ex > 0 ? ' · Zermürbung ab Runde ' + (ex + 1) : '') + '</div>';
}
let sightSel = [];   // Hellsicht: meine Entscheidungen je gezogener Karte ('k' offen vor mich legen, 'a' Ablage)
const fdSel = new Set();   // Zerrüttung: von mir gewählte Abwurfkarten (Handplätze)
const forcedMe = () => !!(G && G.phase === 'combat' && G.combat && G.combat.forced && G.combat.forced.pid === ME);
let curKey = null, curDown = false, mkSeen = null, dthSeen = null, hlSeen = null, rbSeen = null, fxFor = null, fxLast = 0;
// Sekundär ausgelöste Effekte (Spiegel wirft Schaden zurück, Todesfluch zehrt) kurz an der betroffenen Seite einblenden
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
// HP-Anzeige einer Seite für ms Millisekunden um add verschoben halten (Todesfluch: +, die Wolke ist noch unterwegs; Meditation: −, die Heilung ist noch unterwegs). Mehrere Wolken derselben Seite addieren sich.
function holdHp(who, ms, add) {
  const now = Date.now(), prev = curseHold[who] && now < curseHold[who].until ? curseHold[who] : null;
  curseHold[who] = { until: Math.max(now + ms, prev ? prev.until : 0), add: add + (prev ? prev.add : 0) };
}
function showFx() {
  if (fxFor !== G) { fxFor = G; fxLast = G.logN; FlowFx.resetEx(); return; }
  const tickEnd = {};   // je Seite: Zeit (ms), bis der Todesfluch dieser Phase eingeschlagen ist; die Erschöpfung folgt danach
  let k = 0, preMs = 0;   // preMs: Wartezeit der Verteidigungsanimation hinter einer Kombo-Animation derselben Aktion
  for (const e of G.log) {
    if (e.n <= fxLast) continue;
    const go = f => {
      if (!FAST) fxSound(f);
      if (f.kind === 'ultimate' && (f.el === 'E' || f.el === 'W')) UltFx.play(f.el);
      if (f.kind === 'lifeflow') FlowFx.lifeflow(f); else if (f.kind === 'aggro') FlowFx.aggro(f); else if (f.kind === 'drain') FlowFx.drain(f); else if (f.kind === 'ruin') FlowFx.ruin(f); else if (f.kind === 'attack') FlowFx.attack(f); else if (f.kind === 'defense') FlowFx.defense(f);
    };
    let pendTrap = null;   // Falle (seit 0.9.5): Sie löst erst aus, wenn der Angriff in der Mitte liegt; sie läuft deshalb als Teil der Angriffsanimation (KampfFx) mit dem vollen Angriff vor dem Rückwurf
    [].concat(e.fx || []).forEach(f => {
      if (f.kind === 'trap') { pendTrap = f; return; }
      if (f.kind === 'attack' && pendTrap && pendTrap.to === f.who) { const tp = pendTrap; pendTrap = null; go(Object.assign({}, f, { n: tp.dmg0 || f.n + tp.refl, trap: tp })); return; }
      if (f.kind === 'healtick') {   // Meditation: statt einer Textzeile Wolken aus den Heilmarkern zur Lebensanzeige (seit 0.7.2.3); die HP zeigen bis zur Heilung noch den alten Stand
        const wait = FAST ? 0 : Math.round(1000 * FlowFx.wait()), fly = FlowFx.healMs(Math.max(1, Math.min(4, f.marks || 1)));
        if (!FAST) { Snd.play('heal', wait / 1000, 0.9); holdHp(f.who, wait + fly, -(f.n || 0)); setTimeout(() => FlowFx.heal(f), wait); setTimeout(() => { if (G) render(); }, 0); setTimeout(() => { if (G) render(); }, wait + fly + 60); }
        return;
      }
      if (f.kind === 'manatick') {   // Erleuchtung: Wolke aus den Manamarkern zur Manaanzeige; das Mana zeigt bis dahin den alten Stand
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
    if (pendTrap) { const tp = pendTrap; pendTrap = null; go({ kind: 'attack', who: tp.to, to: tp.who, elem: tp.attElem, n: tp.dmg0 || tp.refl, trap: tp }); }   // der Rückwurf hat den ganzen Angriff aufgehoben: es gibt keinen Schaden-Angriff, aber der Angriff liegt trotzdem erst in der Mitte
    const mx = /^Erschöpfung \d+: .* verliert (\d+) HP/.exec(e.txt);
    if (mx) {   // Erschöpfung (seit 0.9.6.1): Schwaden aus der Rundenanzeige zur Lebensanzeige, die HP zeigen bis zum Einschlag den alten Stand
      const nd = +mx[1], victim = e.pid;
      if (nd > 0 && !FAST) {
        const wait = Math.max(Math.round(1000 * FlowFx.wait()), tickEnd[victim] || 0), fly = FlowFx.curseMs(Math.min(nd, 4));
        Snd.play('curse', wait / 1000, 0.7); holdHp(victim, wait + fly, nd); tickEnd[victim] = wait + fly + 120;
        setTimeout(() => FlowFx.exhaust({ who: victim, n: nd }), wait); setTimeout(() => { if (G) render(); }, 0); setTimeout(() => { if (G) render(); }, wait + fly + 60);
      }
      continue;
    }
    const m = /^(Todesfluch): /.exec(e.txt); if (!m) continue;   // (der frühere Hinweistext zur Schildwirkung entfällt seit 0.7)
    {   // statt einer Textzeile: Wolke aus den Todesmarkern zur Lebensanzeige; die HP zeigen bis zum Einschlag noch den alten Stand
      const nd = +((/verliert (\d+) HP/.exec(e.txt) || [0, 1])[1]), victim = e.pid, wait = FAST ? 0 : Math.round(1000 * FlowFx.wait()), fly = FlowFx.curseMs(nd);
      Snd.play('curse', wait / 1000, 0.95);   // Fluch-Sound, wenn die Wolke losfliegt
      if (!FAST) {
        holdHp(victim, wait + fly, nd); tickEnd[victim] = wait + fly + 120;
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
        else if (curseHold[s.ctrl] && Date.now() < curseHold[s.ctrl].until) s.stats.hp = Math.max(0, Math.min(s.stats.maxHp, s.stats.hp + curseHold[s.ctrl].add));   // Todesfluch: Wolke noch unterwegs; Meditation: Heilung noch unterwegs (add negativ)
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
          const nb = t.querySelectorAll('button, .sightbig'), ob = o.querySelectorAll('button, .sightbig');
          ob.forEach((b, i) => { if (nb[i]) { b.className = nb[i].className; if (b.tagName === 'BUTTON') b.disabled = nb[i].disabled; } });
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
  else h += libraryPanel() + templePanel() + monsterCards() + (G.over ? '' : worldRoundNote());
  glideSet(panels, '.tboard .mk', e => e.classList.contains('me') ? 'me' : e.classList.contains('op') ? 'op' : 'gh', () => { panels.innerHTML = h; });   // Tempelsteine gleiten (0.11.1)
  const lg0 = logEl.querySelector('.logl'), lgKeep = lg0 && lg0.scrollHeight - lg0.scrollTop - lg0.clientHeight > 24 ? lg0.scrollTop : null;   // nicht am Ende: Leseposition merken
  const logLines = from => G.log.filter(e => e.n > from).slice(-300).map(e => '<div class="' + (e.pid === ME ? 'me' : e.pid === null ? '' : 'op') + '">' + esc(e.txt) + '</div>').join('');
  if (cx.combat) {   // links: nur der Kampflog (Einträge seit Kampfbeginn)
    const from = cx.c.logFrom || 0;
    logEl.className = 'logpanel'; logEl.style.cssText = box(LAYOUT.combo);
    logEl.innerHTML = '<h3><button class="logdl" title="Spiellog exportieren (Alt-Klick: in die Zwischenablage)">⤓</button>Kampflog</h3><div class="logl">' + logLines(from) + '</div>';
  } else { logEl.className = ''; logEl.style.cssText = 'display:none'; logEl.innerHTML = ''; }   // Weltphase: kein festes Protokoll mehr, es steht hinter dem runden Knopf oben links (seit 0.11)
  { const lp0 = logPop.querySelector('.logl'), lpKeep = lp0 && lp0.scrollHeight - lp0.scrollTop - lp0.clientHeight > 24 ? lp0.scrollTop : null;
    logBtn.classList.toggle('on', logOpen);
    if (logOpen) {   // Protokoll-Fenster (ganze Partie, beide Phasen)
      logPop.className = 'open'; logPop.style.cssText = box(LAYOUT.logPop);
      logPop.innerHTML = '<h3><button class="logdl" title="Spiellog exportieren (Alt-Klick: in die Zwischenablage)">⤓</button>Protokoll</h3><div class="logst">Abschnitt ' + G.stage + '/3 · Showdowns ' + G.showdown + '/3<br>Siegpunkte ' + G.players[ME].sp + ' : ' + G.players[OPP].sp + '</div><div class="logl">' + logLines(0) + '</div>';
      const lp = logPop.querySelector('.logl'); if (lp) lp.scrollTop = lpKeep === null ? lp.scrollHeight : lpKeep;
    } else { logPop.className = ''; logPop.style.cssText = ''; logPop.innerHTML = ''; } }
  { const lg = logEl.querySelector('.logl'); if (lg) lg.scrollTop = lgKeep === null ? lg.scrollHeight : lgKeep; }
  { const mc = cx.combat && G.combat.mode === 'monster' ? G.combat : null, side = mc ? (G.combat.sides.b.ctrl === ME ? 'bot' : 'top') : '';   // Farbe auf der Seite dessen, der das Monster steuert
    stage.dataset.top = side === 'top' ? mc.elem : ''; stage.dataset.bot = side === 'bot' ? mc.elem : ''; }
  { const cc = cx.combat ? G.combat : null, ex = G.rules.exhaustRounds || 0, lv = cc && ex > 0 ? Math.floor(Math.floor((cc.atkTurns || 0) / 2) / ex) : 0;   // Erschöpfung (seit 0.9.6.1): ab Runde ex + 1 dunkelt der Hintergrund ab (stärker mit jeder Stufe) und die Ankündigung erscheint
    stage.dataset.exh = lv > 0 ? String(Math.min(3, lv)) : '';
    if (exSeen && exSeen.c === cc && lv > exSeen.lv && !endView && !FAST) exhaustBanner(lv);
    exSeen = cc ? { c: cc, lv } : null; }
  { const wear = !cx.combat && !G.over && G.phase === 'world' && M.worldWear(G);   // Zermürbung der Weltphase (seit 0.9.7): der Hintergrund dunkelt bernsteinfarben ab, beim Einsetzen erscheint die Ankündigung
    stage.dataset.zerm = wear ? '1' : '';
    if (zermSeen === false && wear && !endView && !FAST) zermBanner(M.worldWearGold(G));
    zermSeen = !cx.combat && !G.over && G.phase === 'world' ? wear : null; }
  if (cx.combat) {   // Marker (Schwäche, Spiegel, Tod) weg -> Sound
    const sa = G.combat.sides.a.stats, sb = G.combat.sides.b.stats, n = x => (x.mirror || 0) + (x.death || 0);
    const mirNew = G.log.some(e => e.n > fxLast && [].concat(e.fx || []).some(f => f.kind === 'mirror'));   // beim Spiegelbruch spielt die Animation den Sound selbst, zum Einschlag
    if (mkSeen && mkSeen.c === G.combat && (n(sa) < mkSeen.a || n(sb) < mkSeen.b) && !mirNew) Snd.play('break', 0, 0.7);
    mkSeen = { c: G.combat, a: n(sa), b: n(sb) };
    const dd = (sa.death || 0) + (sb.death || 0);   // Todesfluch-Marker hinzugekommen -> Fluch-Sound
    if (dthSeen && dthSeen.c === G.combat && dd > dthSeen.n) CurseFx.play();
    dthSeen = { c: G.combat, n: dd };
    // Rituale von Meditation und Multispiegel laufen seit 0.7.2.5 bei jedem Wirken der Ultimate (showFx), nicht mehr nur bei steigender Stufe
  } else { mkSeen = null; dthSeen = null; hlSeen = null; rbSeen = null; }
  // Mana nach dem Ausspielen in Rot; der Anteil auf dem Mana-Bogen blinkt dazu (seit 0.5.6.5)
  if (manaPv > 0 && cx.combat) {
    const mv = panels.querySelector('.sbody[data-lead] [data-pv="mana"]'), st = cx.myStats;
    if (mv) { mv.innerHTML = '<span class="pvdn">' + Math.max(0, st.mana - manaPv) + '</span>/' + st.maxMana; ArcFx.mark(mv, st.mana + '/' + st.maxMana, null, true); }
  }
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
