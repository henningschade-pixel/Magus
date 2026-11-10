// Aktuelle Versionsnummer: einzige Stelle, an der sie gesetzt wird (Menü-Link und Über-Seite lesen sie von hier; bei jedem Schritt hochzählen)
const MAGUS_VERSION = '0.9.9.13';
/* ---------- Darstellung: Kampfeffekt-Ton, Cursor, render, Menüs, Start- und Ergebnis-Bildschirm ---------- */
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
  const tickEnd = {};   // je Seite: Zeit (ms), bis der Todesfluss dieser Phase eingeschlagen ist; die Erschöpfung folgt danach
  let k = 0, preMs = 0;   // preMs: Wartezeit der Verteidigungsanimation hinter einer Kombo-Animation derselben Aktion
  for (const e of G.log) {
    if (e.n <= fxLast) continue;
    const go = f => { if (!FAST) fxSound(f); if (f.kind === 'ultimate' && (f.el === 'E' || f.el === 'W')) UltFx.play(f.el); if (f.kind === 'lifeflow') FlowFx.lifeflow(f); else if (f.kind === 'aggro') FlowFx.aggro(f); else if (f.kind === 'drain') FlowFx.drain(f); else if (f.kind === 'ruin') FlowFx.ruin(f); else if (f.kind === 'attack') FlowFx.attack(f); else if (f.kind === 'defense') FlowFx.defense(f); };
    let pendTrap = null;   // Falle (seit 0.9.5): Sie löst erst aus, wenn der Angriff in der Mitte liegt; sie läuft deshalb als Teil der Angriffsanimation (KampfFx) mit dem vollen Angriff vor dem Rückwurf
    [].concat(e.fx || []).forEach(f => {
      if (f.kind === 'trap') { pendTrap = f; return; }
      if (f.kind === 'attack' && pendTrap && pendTrap.to === f.who) { const tp = pendTrap; pendTrap = null; go(Object.assign({}, f, { n: tp.dmg0 || f.n + tp.refl, trap: tp })); return; }
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
    const m = /^(Todesfluss): /.exec(e.txt); if (!m) continue;   // (der frühere Hinweistext zur Schildwirkung entfällt seit 0.7)
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
  else h += vendorPanel() + monsterCards() + (G.over ? '' : worldRoundNote());
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
function menuRedraw() {   // Menü neu zeichnen und die Scrollposition behalten (seit 0.9.9.8)
  if (!menuView) return;
  const b = overlay.querySelector('.box'), t = b ? b.scrollTop : 0;
  menuView();
  const n = overlay.querySelector('.box'); if (n) n.scrollTop = t;
}
const menuBtn = (act, txt, extra, cls) => '<button class="btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (extra || '') + '>' + txt + '</button>';
const menuTo = (pg, txt, cls) => menuBtn('menu', txt, ' data-p="' + pg + '"', cls);
// Spieleinstellungen (seit 0.8.1): Runden bis zum Erschöpfungsschaden und Siegpunktvorsprung für das vorzeitige Spielende (0 = aus); gelten für neue Partien, im Browser gespeichert
const RULE_OPTS = [
  { k: 'exhaustRounds', name: 'Runden bis Erschöpfung', min: 0, max: 30, tip: 'Nach so vielen Kampfrunden steigt die Erschöpfung um 1 (danach alle so viele Runden wieder): Beide Seiten verlieren am Ende ihres Angriffszugs entsprechend viele HP. Derselbe Wert gilt für die Zermürbung in der Weltphase: Nach so vielen Runden ohne Monsterkampf schenkt jeder, der seinen Zug ohne Monsterangriff beendet, dem Gegner Gold in Höhe der Spielstufe. 0 = beides aus.' },
  { k: 'winLead', name: 'Siegpunkt-Vorsprung', min: 0, max: 10, tip: 'Hat ein Spieler nach einem Showdown mindestens so viele Siegpunkte Vorsprung, gewinnt er das Spiel sofort. 0 = das Spiel läuft immer bis zum dritten Showdown.' }
];
// Erlaubte Aktionen je Phase (seit 0.9.9.5): Schalter an/aus; Erholen oder Passen bleibt immer erlaubt (die Engine gibt Passen frei, wenn beide aus sind)
const PHASE_OPTS = [
  { ph: 'allowAtk', name: 'Angriffsphase', acts: [['attack', 'Angreifen', 'Magie als Angriff ausspielen'], ['recover', 'Erholen', 'Mana gewinnen statt anzugreifen'], ['draw', 'Nachziehen', 'Hand tauschen statt anzugreifen'], ['pass', 'Passen', 'Zug aussetzen'], ['echo', 'Echo setzen', 'Die Primärmagie des Angriffs hinterlässt ein Echo, das den nächsten Kombo verstärkt'], ['combo', 'Kombo wirken', 'Karten einer zweiten Farbe lösen einen Kombo aus (aus: nur Karten einer Farbe)']] },
  { ph: 'allowDef', name: 'Verteidigungsphase', acts: [['defend', 'Verteidigen', 'Den eingehenden Schaden mit Magie blocken'], ['recover', 'Erholen', 'Mana gewinnen; der Schaden wird ohne Block hingenommen'], ['draw', 'Nachziehen', 'Hand tauschen; der Schaden wird ohne Block hingenommen'], ['pass', 'Passen', 'Den Schaden ohne Verteidigung hinnehmen'], ['echo', 'Echo setzen', 'Die Primärmagie der Verteidigung hinterlässt ein Echo'], ['combo', 'Kombo wirken', 'Karten einer zweiten Farbe lösen in der Verteidigung einen Kombo aus (aus: nur Karten einer Farbe)']] }
];
function phaseRules() {
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const out = {};
  PHASE_OPTS.forEach(po => { const o = {}; po.acts.forEach(([k]) => { const v = sv[po.ph] && sv[po.ph][k]; o[k] = v === undefined || v === null ? M.DEFAULT_RULES[po.ph][k] : (po.ph === 'allowDef' && [2, 3].includes(+v) ? +v : (+v ? 1 : 0)); }); out[po.ph] = o; });
  return out;
}
function setPhaseRule(ph, k) {   // schaltet eine Aktion um; Erholen und Passen dürfen nicht gemeinsam ausgeschaltet werden
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const pr = phaseRules(), o = pr[ph]; if (!o || o[k] === undefined) return;
  let nv = o[k];
  if (ph === 'allowDef') { const seq = [1, 0, 2, 3]; nv = seq[(seq.indexOf(nv) + 1) % 4]; }   // an, aus, nach Angriff, ohne Angriff
  else nv = nv ? 0 : 1;
  o[k] = nv; PHASE_OPTS.forEach(po => { sv[po.ph] = pr[po.ph]; });
  try { localStorage.setItem('magus_rules', JSON.stringify(sv)); } catch (e) {}
}
function resetPhaseRules() { let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; } PHASE_OPTS.forEach(po => { delete sv[po.ph]; }); try { localStorage.setItem('magus_rules', JSON.stringify(sv)); } catch (e) {} }
function gameRules() {
  let sv = {}; try { sv = JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { sv = {}; }
  const r = Object.assign({}, phaseRules());
  RULE_OPTS.forEach(o => { const v = Math.round(+sv[o.k]); r[o.k] = isFinite(v) && sv[o.k] !== undefined && sv[o.k] !== null ? Math.min(o.max, Math.max(o.min, v)) : M.DEFAULT_RULES[o.k]; });
  return r;
}
function setGameRule(k, d) {
  const o = RULE_OPTS.find(x => x.k === k); if (!o) return;
  const r = gameRules(); r[k] = d === 'def' ? M.DEFAULT_RULES[k] : Math.min(o.max, Math.max(o.min, r[k] + (+d || 0)));
  const sv = (() => { try { return JSON.parse(localStorage.getItem('magus_rules') || '{}') || {}; } catch (e) { return {}; } })(); RULE_OPTS.forEach(x => { sv[x.k] = r[x.k]; });
  try { localStorage.setItem('magus_rules', JSON.stringify(sv)); } catch (e) {}
}
function rulesHTML() {
  const r = gameRules(), std = RULE_OPTS.every(o => r[o.k] === M.DEFAULT_RULES[o.k]) && PHASE_OPTS.every(po => po.acts.every(([k]) => r[po.ph][k] === M.DEFAULT_RULES[po.ph][k]));
  const row = o => '<div class="rulerow" title="' + o.tip + '"><span>' + o.name + '</span><div class="stepper"><button class="btn" data-act="rule" data-k="' + o.k + '" data-d="-1" aria-label="weniger"' + (r[o.k] <= o.min ? ' disabled' : '') + '>−</button><output>' + (r[o.k] === 0 ? 'aus' : r[o.k]) + '</output><button class="btn" data-act="rule" data-k="' + o.k + '" data-d="1" aria-label="mehr"' + (r[o.k] >= o.max ? ' disabled' : '') + '>+</button></div></div>';
  return '<section class="setgrp"><div class="sethead"><h3>Spiel</h3>' + menuBtn('rule', 'Standardwerte', ' data-k="all" data-d="def" title="Beide Werte auf den Standard setzen (10 Runden, 4 Siegpunkte)"' + (std ? ' disabled' : ''), 'small') + '</div>' +
    '<div class="setbox">' + RULE_OPTS.map(row).join('') + '</div><p class="sethint">0 schaltet die Regel ab. Gilt für neue Spiele.</p></section>' +
    '<section class="setgrp"><div class="sethead"><h3>Erlaubte Aktionen</h3></div>' + PHASE_OPTS.map(po => '<div class="setbox"><div class="phasehead">' + po.name + '</div>' + po.acts.map(([k, nm, tip]) => '<div class="rulerow" title="' + tip + '"><span>' + nm + '</span><button class="btn small tgl' + (r[po.ph][k] ? ' on' : '') + '" data-act="rulephase" data-ph="' + po.ph + '" data-k="' + k + '"' + (po.ph === 'allowDef' ? ' title="an: immer · aus: nie · nach Angriff: nur wenn ein Angriff vorausging · ohne Angriff: nur wenn kein Angriff vorausging"' : '') + '>' + ['aus', 'an', 'nach Angriff', 'ohne Angriff'][r[po.ph][k]] + '</button></div>').join('') + '</div>').join('') + '<p class="sethint">Sind Erholen und Passen beide aus, bleibt Passen als Notausgang erlaubt. In der Verteidigungsphase schaltet ein Klick weiter: an, aus, nach Angriff (Reaktion auf einen Angriff mit Schaden), ohne Angriff (Reaktion nach einer Aktion ohne Angriff). Gilt für neue Spiele.</p></section>';
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
      menuTo('single', 'Einzelspieler', run ? '' : 'primary') + menuTo('multi', 'Mehrspieler') + menuTo('settings', 'Einstellungen') + menuTo('credits', 'Credits') + menuBtn('quit', 'Beenden') + '</div>' +
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
    h += '<p class="note intro" style="margin-top:-2px"><b>Danke, dass du Magus testest!</b> <b>Neu in Version ' + MAGUS_VERSION + ':</b> <b>Reaktion ohne Angriff:</b> Entscheidet sich ein Spieler in seiner Aktion gegen einen Angriff (Erholen, Nachziehen, Passen oder Angriff ohne Schaden), reagiert der andere Spieler trotzdem. Dort gelten die Verteidigungs-Einstellungen mit „an“ und „ohne Angriff“ (standardmäßig Erholen und Nachziehen); Verteidigen gibt es ohne Angriff nicht. Danach folgt seine eigene Aktion. Sind dort weder Erholen noch Nachziehen sinnvoll möglich, entfällt die Reaktion. <b>Version 0.9.9.12:</b> <b>Heilung und Läuterung getauscht:</b> Heilung ist jetzt Blau + Grün, Läuterung Rot + Grün. <b>Kombo-Übersicht nach Primärfarbe:</b> Die Liste ist nach der ersten Karte sortiert (Rot, Blau, Grün); der Hintergrund bleibt nach der Sekundärfarbe getönt. <b>Version 0.9.9.11:</b> <b>Aktion und Reaktion sichtbar:</b> Eine Plakette in der Kampfmitte zeigt, wer gerade in der Aktion (Angriffsphase, Gold) oder in der Reaktion (Verteidigungsphase, Blau, mit dem eingehenden Schaden) ist. Der Zugrahmen färbt sich bei der Reaktion blau. <b>Version 0.9.9.10:</b> <b>Standardwerte der Verteidigung:</b> Verteidigen „nach Angriff“, Erholen und Nachziehen „ohne Angriff“, Passen, Echo und Kombo „an“. <b>Version 0.9.9.9:</b> <b>Neue Standardwerte der Verteidigung:</b> Verteidigen „nach Angriff“, Erholen und Nachziehen aus, Passen, Echo und Kombo an. Passen lässt sich jetzt ebenfalls ausschalten (sind Erholen und Passen beide aus, bleibt Passen als Notausgang). <b>Version 0.9.9.8:</b> <b>Menü behält die Scrollposition:</b> Beim Umschalten einer Einstellung springt das Fenster nicht mehr nach oben. <b>Version 0.9.9.7:</b> <b>Vier Stufen in der Verteidigung:</b> Jede Aktion der Verteidigungsphase lässt sich in den Einstellungen auf an (immer), aus (nie), nach Angriff (nur wenn ein Angriff vorausging) oder ohne Angriff (nur wenn kein Angriff vorausging) stellen. <b>Version 0.9.9.6:</b> <b>Scrollbare Menüs:</b> Menüfenster, die höher sind als der Bildschirm (z. B. die Einstellungen), lassen sich jetzt scrollen. <b>Version 0.9.9.5:</b> <b>Erlaubte Aktionen je Phase:</b> In den Einstellungen lässt sich für die Angriffsphase und die Verteidigungsphase festlegen, welche Aktionen erlaubt sind: Angreifen bzw. Verteidigen, Erholen, Nachziehen, Passen, Echo setzen und Kombo wirken. Standard: in der Angriffsphase alles, in der Verteidigung Verteidigen, Passen, Echo und Kombo (Erholen und Nachziehen dort aus). Erholen oder Passen bleibt je Phase immer erlaubt. Erholen und Nachziehen in der Verteidigung nehmen den Schaden ohne Block hin. <b>Version 0.9.9:</b> <b>Kombos nach Sekundärfarbe:</b> Die zweite Farbe (Sekundärfarbe) bestimmt jetzt den Charakter einer Kombo: <b>Rot</b> bringt Schaden (Falle: Blau + Rot, Lähmung: Grün + Rot), <b>Blau</b> ist variabel (Hellsicht: Rot + Blau, Schild: Grün + Blau), <b>Grün</b> heilt und verbessert die eigene Seite (Heilung: Rot + Grün, Läuterung: Blau + Grün). Die Primärfarbe (erste Karte) wählt unter den zwei Kombos der Sekundärfarbe und liefert weiter den Schaden. Die Ultimate bestimmt die <b>zuletzt markierte Karte</b>: Rot Todesfluss, Blau Manafluss, Grün Heilfluss; die beiden anderen Farben bilden die Basis, ihre Reihenfolge ist gleichgültig. Bei der Ultimate verstärkt das Echo, wenn es die Farbe der Schlusskarte hat. Die Kombo-Übersicht im Kampf ist nach Sekundärfarbe sortiert, gleiche Sekundärfarben sind gleich getönt, die Primärfarbe steht in jeder Zeile vorn. <b>Version 0.9.8:</b> <b>Credits im Hauptmenü:</b> Das Hauptmenü hat einen neuen Punkt <b>Credits</b>. Dort steht der Dank an alle, die Magus testgespielt haben: DarkParladin, Deekixx, H5, Leon aka Tim und Zockerboy. Das Spiel selbst ist unverändert. <b>Version 0.9.7.1:</b> <b>Standard wieder 10, Zähler läuft durch:</b> Der Standard der Runden bis Erschöpfung (und damit der Zermürbung) steht wieder auf 10. Der Rundenzähler der Weltphase wird nach einem Monsterkampf nicht mehr zurückgesetzt, er zählt alle Züge der Weltphase und beginnt erst nach einem Showdown neu. <b>Version 0.9.7:</b> <b>Rundenzähler und Zermürbung in der Weltphase:</b> Die Weltphase zeigt jetzt denselben Rundenzähler wie der Kampf (eine Runde = ein Zug jedes Spielers); in 0.9.7 begann er nach jedem Monsterkampf neu (seit 0.9.7.1 nicht mehr). Hat er den kritischen Wert erreicht (derselbe Regler wie bei der Erschöpfung, in 0.9.7 kurz auf 8 gesenkt), setzt die <b>Zermürbung</b> ein: Wer seinen Zug beendet, ohne ein Monster angegriffen zu haben, schenkt dem Gegner Gold in Höhe der Spielstufe (1/2/3). Wie bei der Erschöpfung dunkelt der Hintergrund ab (bernsteinfarben), ein Schriftzug kündigt sie an und der Zähler wird hervorgehoben. <b>Version 0.9.6.1:</b> <b>Erschöpfung deutlicher:</b> Sobald die Erschöpfung einsetzt (standardmäßig nach 10 Kampfrunden, danach alle 10 Runden eine Stufe mehr), dunkelt der Hintergrund ab (mit jeder Stufe stärker und röter) und ein Schriftzug kündigt sie an. Der HP-Abzug am Ende des Angriffszugs ist jetzt animiert: Das Bild dunkelt kurz ab, dunkelrote Schwaden ziehen von der Rundenanzeige zur Lebensanzeige der betroffenen Seite, und der Abzug erscheint als Zahl. Die Regeln bleiben unverändert; die Engine wurde geprüft (Abzug im Angriffs- wie im Verteidigungspfad). <b>Version 0.9.6:</b> <b>Echo bei jeder Nutzung von Primärmagie:</b> Nicht nur Kombos, sondern jeder Angriff und jede Verteidigung hinterlässt bei dir ein Echo in der Farbe der ersten Karte (die nächste Nutzung erneuert es). Die Wirkung auf Kombos bleibt gleich: Enthält ein Kombo eine Sekundärkarte in der Farbe des Echos, steigt seine Stufe um 1 (höchstens 3). <b>Version 0.9.5.1:</b> <b>Kein Upgrade-Knopf mehr bei der Falle:</b> Wenn die Falle zerbrach (und beim Umdrehen der Karte), erschien ein großes Plus-Symbol des Upgrade-Knopfs mitten im Kampf. Die Falle trägt dieses Symbol nicht mehr. <b>Version 0.9.5:</b> <b>Falle löst nach dem Angriff aus:</b> Zuerst erscheint der Angriff in der Mitte, dann fliegt die verdeckte Falle neben die Geschosse und dreht sich um. Passt ihre Farbe, löst sich ein Teil der Geschosse und fliegt als unblockbarer Schaden zum Angreifer zurück. Passt sie nicht, zerbricht die Karte. Erst danach folgt die Verteidigung. Die Regeln bleiben unverändert. <b>Version 0.9.4.1:</b> <b>Echo-Effekt schmaler:</b> Das Leuchten und die Wellen der Echo-Schlange decken auf dem Magie-Brett einen kleineren Ausschnitt ab (100° statt 130°), die übrigen Werte stammen unverändert aus der Echo-Werkstatt. <b>Version 0.9.4:</b> <b>Echo auf dem Magie-Brett:</b> Der Echo-Marker entfällt in der digitalen Version (er bleibt dem analogen Spiel vorbehalten). Stattdessen leuchtet die Schlange der Echo-Farbe auf dem Magie-Brett pulsierend auf und sendet Wellen nach außen, bei dir und beim Gegner. Dazu gibt es die neue <b>Echo-Werkstatt</b> (Ordner werkstatt) zum Einstellen des Effekts. <b>Version 0.9.3:</b> <b>Weniger Aktionen in der Weltphase:</b> <b>Gold opfern</b>, <b>Magie kaufen</b> und jedes <b>Upgrade</b> (HP, Mana, Limit, Handplätze, Nachziehlimit) sind keine Aktion mehr: Du bleibst am Zug und kannst davon beliebig viele hintereinander ausführen. Eine Aktion, die den Zug beendet, bleibt es nur beim <b>Nachziehen</b>, beim <b>Händler</b> (Bibliothek) und beim <b>Angriff</b>. Der Nachziehmarker ändert sich durch Opfern, Magie und Upgrades nicht. Der Computergegner kauft entsprechend mehrere Dinge in einem Zug. <b>Version 0.9.2:</b> <b>Auswahl bei Falle und Hellsicht schlichter:</b> Im Vordergrund liegen nur noch die drei gezogenen Karten; ein Klick wählt eine Karte an oder wieder ab, darunter steht ein Knopf <b>Bestätigen</b>. Gewählte Karten sind hervorgehoben, Fluchkarten lassen sich nicht wählen. <b>Version 0.9.1.2:</b> <b>Echo-Marker neu platziert:</b> Der Marker ist ein neutrales Symbol ohne Farbe und liegt mittig neben dem Farbbereich der Kombo-Übersicht, zu dem das Echo gehört: dein Echo links, das des Gegners rechts und etwas kleiner. Ohne Echo gibt es keinen Marker. <b>Hellsicht ohne Umrandung:</b> Die offen liegenden Hellsichtkarten haben keine goldene Umrandung mehr. <b>Version 0.9.1:</b> <b>Fliehen abgeschaltet:</b> Jetzt, da die <b>Erschöpfung</b> festgefahrene Kämpfe beendet, gibt es die Aktion <b>Fliehen</b> im Monsterkampf und im Showdown nicht mehr; der Knopf entfällt. Ein Kampf endet durch Sieg, Niederlage oder Erschöpfung. Die Regel bleibt als Schalter <code>fleeAllowed</code> in der Engine erhalten (Standard 0 = aus). <b>Version 0.9.0.1:</b> <b>Hellsicht neu:</b> Du ziehst drei Karten und wählst S davon aus; sie liegen offen vor dir, sind wie Handkarten ohne Manakosten nutzbar und werden danach abgelegt. Die übrigen kommen auf den Ablagestapel. <b>Version 0.9:</b> <b>Echo der Kombos:</b> Jeder Kombo (auch die Ultimate) hinterlässt bei seiner Seite ein Echo in der Farbe der ersten Karte. Das nächste Echo erneuert es. Enthält der nächste Kombo eine Sekundärkarte in der Farbe des Echos, steigt seine Stufe um 1 (höchstens 3). Das Echo ist als Marker sichtbar und lässt sich nicht läutern. <b>Version 0.8.7.3:</b> <b>Verteidigung bei vollem Rückwurf:</b> Wirft die Falle den gesamten Schaden zurück, entfällt die Verteidigung; die Gegenseite greift sofort an (Regel war schon so, jetzt durch einen Test abgesichert). <b>Version 0.8.7.2:</b> <b>Sinnlose Knöpfe inaktiv:</b> Im Angriffszug ist <b>Erholen</b> bei vollem Mana ausgegraut, <b>Nachziehen</b> bei rotem Nachziehmarker, wenn das Mana für die Kosten fehlt. <b>Version 0.8.7.1:</b> <b>Karten unter den Bildschirmen:</b> Zurückfliegende und verbrennende Karten liegen nicht mehr über dem Endbildschirm und den Menü- und Startbildschirmen, sondern dahinter. <b>Version 0.8.6.1:</b> <b>Siegbedingung:</b> Bei Gleichstand an Siegpunkten entscheidet jetzt zuerst die <b>Tempelstufe</b>, danach das <b>Gold</b> (vorher umgekehrt). <b>Version 0.8.6:</b> <b>Spielanleitung:</b> Zu Magus gibt es jetzt eine Anleitung als Präsentation im Stil eines analogen Spiels (Idee, Ablauf, Karten, Kampf, Kombos, Showdown, Spielende). Das Spiel selbst ist unverändert. <b>Version 0.8.4.1:</b> <b>Schild vor jeder Schadensquelle:</b> Das Schild mindert jetzt auch den <b>Rückwurf der Falle</b>, den <b>Todesfluss</b> und die <b>Erschöpfung</b> (je geminderten Schaden eine Ladung). <b>Version 0.8.4:</b> <b>Einstellungen aufgeräumt:</b> Die Gruppen Ton und Spiel haben je eine Kopfzeile mit Schalter beziehungsweise „Standardwerte“, die Werte stehen mit kompakten Knöpfen in einer Zeile. <b>Version 0.8.3.1:</b> <b>Reihenfolge bei der Niederlagenprüfung:</b> Fällt eine Seite auf 0 HP, wird in fester Reihenfolge geprüft: erst der <b>reflektierte Schaden</b> (Falle), dann der <b>Schaden nach der Verteidigung</b>, zuletzt die <b>Flusseffekte</b> (Todesfluss, Erschöpfung, Heil- und Manafluss). Die erste Stufe, in der jemand auf 0 HP fällt, entscheidet; spätere Stufen wirken dann nicht mehr. <b>Version 0.8.2.1:</b> <b>Neuer Endbildschirm:</b> Der Sieg wird groß gefeiert, die Niederlage würdig abgeschlossen; dazu ein Rückblick auf die Höhepunkte der Partie (mächtigster Angriff, stärkste Abwehr, knappster Sieg, Aufholjagd, letzter Hieb, beim Verlierer auch der Wendepunkt), der Siegpunktverlauf und eine Bilanz. Ein Klick überspringt die Animation, ein Klick auf eine Karte zeigt den Kampfverlauf. <b>Version 0.8.1.1:</b> <b>Spieleinstellungen in den Einstellungen:</b> Sie stehen jetzt in den Einstellungen im Abschnitt <b>Spiel</b>, getrennt vom Abschnitt <b>Ton</b>; dort lassen sich die <b>Runden bis zur Erschöpfung</b> (Standard 10) und der <b>Siegpunkt-Vorsprung</b> für das vorzeitige Spielende nach einem Showdown (Standard 4) einstellen; 0 schaltet die jeweilige Regel ab. Die Werte gelten für neue Spiele und bleiben im Browser gespeichert. <b>Version 0.8.0.8:</b> <b>Falle schwächer:</b> Sie wirft jetzt 1/2/3 statt 2/4/6 unblockbaren Schaden zurück. <b>Version 0.8.0.7:</b> <b>Fallenkarte schlichter:</b> Ohne blauen Rahmen, mit Stufenzähler; für den Gegner umgedreht. <b>Version 0.8.0.6:</b> <b>Mischen bei Falle und Hellsicht:</b> Reicht der Zugstapel nicht, wird der Ablagestapel gemischt und weitergezogen (Test ergänzt). <b>Version 0.8.0.5:</b> <b>Falle in der Mitte:</b> Die Falle zieht drei Karten vom Stapel (ohne die Hand zu ersetzen) und zeigt sie im Vordergrund; die nicht gewählten gehen auf den Ablagestapel. <b>Version 0.8.0.4:</b> <b>Hellsicht-Auswahl ruhiger:</b> Beim Wählen färben sich nur die Knöpfe ein, die Karten blenden nicht mehr neu ein. <b>Version 0.8.0.3:</b> <b>Hellsicht im Vordergrund:</b> Die gezogenen Karten liegen groß über dem Kampffeld, unter jeder stehen die drei Möglichkeiten. <b>Version 0.8.0.2:</b> <b>Hellsicht:</b> Blau + Rot zieht so viele Karten wie die Kombostufe; für jede entscheidest du, ob sie auf die Hand kommt (sofern Platz ist), auf den Ablagestapel oder zurück zum Händler. <b>Version 0.8.0.1:</b> <b>Falle statt Zerrüttung:</b> Auch Rot + Blau legt jetzt die Falle; die Zerrüttung entfällt. <b>Version 0.8:</b> <b>Blaue Kombos überarbeitet:</b> Blau + Rot legt eine <b>Falle</b> (drei Karten ziehen, eine verdeckt vor dich legen; bei Schaden aufgedeckt: passt die Farbe, werden 2/4/6 unblockbar vor der Verteidigung zurückgeworfen). Blau + Grün ist ein <b>Schild</b> (mindert nicht geblockten Schaden um 1/2/3 Ladungen). Blau + Rot + Grün ist der <b>Manafluss</b> (1/2/3 Mana am Ende deines Angriffszugs, mit neuer Animation). <b>Version 0.7.7.8:</b> <b>KI opfert nur mit Ergebnis:</b> Der Computergegner opfert im Tempel nur noch Gold, wenn die Punkte für eine Magiestufe wirklich herauskommen. Das galt für sein Überschussgold schon (alle 504 Opfer in 200 Partien endeten direkt in einem Magiekauf); jetzt gilt es auch in der Eröffnung. <b>Version 0.7.7.7:</b> <b>KI-Tempelopfer geprüft:</b> Die KI kann ihr Überschussgold jetzt auch gesammelt für mehrere Magiestufen auf einmal opfern (ein großes Opfer ergibt mehr Punkte als mehrere kleine). Die Messung zeigt, dass das Warten schlechter abschneidet als das sofortige Opfern; der Standard bleibt deshalb unverändert. <b>Version 0.7.7.6:</b> <b>KI nachtrainiert:</b> Der Computergegner opfert überschüssiges Gold jetzt sofort für Magie (Standard 1 statt 6) und baut seine HP etwas höher aus (7 statt 6). Gegen den Pool aus früh angreifenden Gegnern gewinnt er damit deutlich häufiger. <b>Version 0.7.7.5:</b> <b>KI setzt Überschussgold ein:</b> Kann der Computergegner nichts mehr für Gold verbessern, opfert er sein Gold im Tempel für die nächste Magiestufe. Vorher blieb seine Magie auf Stufe 1, und er sammelte über 100 Gold an. <b>Version 0.7.7.4:</b> Versionsnummer im Hauptmenü korrigiert. <b>Version 0.7.7.3:</b> <b>Vorzeitiges Spielende korrigiert:</b> Das Spiel endet nach einem Showdown, wenn ein Spieler mindestens <b>4 Siegpunkte Vorsprung</b> hat (4 : 0, 5 : 1). Bei 4 : 1 geht es weiter. <b>Version 0.7.7.2:</b> Die <b>Kampfrunden</b> sind nicht mehr begrenzt. Stattdessen gibt es die <b>Erschöpfung</b>: Nach je 10 Kampfrunden steigt sie um 1, und beide Seiten verlieren am Ende ihres Angriffszugs entsprechend viele HP (Runde 11–20: 1 HP, Runde 21–30: 2 HP …). <b>Version 0.7.6.8:</b> Die Farben des <b>Multischilds</b> sind kräftiger (Rot, Gelb, Grün, Blau, Violett). <b>Version 0.7.6.7:</b> Lösen <b>zwei Schilde</b> gleichzeitig aus (Farbspiegel und Multispiegel), laufen beide Schild-Effekte nebeneinander ab statt nur einer. <b>Version 0.7.6.6:</b> <b>Vorzeitiges Spielende:</b> Wer nach einem Showdown mit 4 oder mehr Siegpunkten führt, gewinnt das Spiel sofort; bei Gleichstand geht es weiter. <b>Version 0.7.6.5:</b> Die <b>Kampfrunden</b> werden gezählt (im Kampffenster: „Runde 3 von 10“) und sind auf 10 begrenzt. Eine Runde ist ein Angriffszug jeder Seite. Ist nach der 10. Runde keiner auf 0 HP gefallen, endet der Kampf unentschieden (Monster behält seine Verletzungen, im Showdown gibt es keine Siegpunkte). Die KI greift dafür früher an. <b>Version 0.7.6.4:</b> Das <b>Opfern von Gold im Tempel</b> ist kein Zug mehr: Du bleibst am Zug, kannst mehrmals opfern und danach in derselben Runde Magie kaufen; der Nachziehmarker bleibt dabei unverändert. Unter der Magiegrafik steht jetzt, was die <b>nächste Magiestufe</b> kostet. Die KI opfert und kauft entsprechend im selben Zug. <b>Version 0.7.6.3:</b> Das <b>Abwerfen nach einer Zerrüttung</b> ist kein Zug: Es zählt nicht für den Zugzähler und lässt den Nachziehmarker unverändert. <b>Version 0.7.6.2:</b> Die <b>Heilung</b> wirkt nach dem Schaden nur noch, wenn der Verteidiger ihn überlebt: Fällt er durch den Schaden auf 0 HP, ist er besiegt und die Heilung verfällt. <b>Version 0.7.6.1:</b> Die <b>Läuterung</b> lässt sich jetzt auch in der Verteidigung wählen: Eigene Nachziehtokens und Schilde (und alle anderen Marker) sind anklickbar, und die Vorschau sagt, dass die Läuterung <i>vor</i> der Verteidigung wirkt. <b>Version 0.7.5.1:</b> Der <b>Computergegner</b> wurde an die neuen Regeln angepasst: Er opfert kein Gold mehr für Magie, bewertet Heilfluss und Multispiegel neu, entfernt mit der Läuterung gezielt eigene Todesmarker und gegnerische Heilmarker und wartet mit der Eröffnung auf den ersten besiegten Monsterkampf statt auf zufälliges Gold; Angriffs- und Schadensgewichte sind neu abgestimmt. Die Regeln bleiben gleich. <b>Version 0.7.3.3:</b> Der Siegpunktestand sitzt mittig im innersten Ring des Magie-Boards. <b>Version 0.7.3.2:</b> Versatz am Magie-Board korrigiert: Die Leucht- und Abdunkelmarken der Stufen sitzen jetzt genau auf den Edelsteinen der neuen Grafik. <b>Version 0.7.3.1:</b> Das Magie-Board (unten rechts) hat eine neue Grafik: der dreifache Ouroboros mit roten, grünen und blauen Edelsteinen. <b>Version 0.7.2.24:</b> Jeder Spieler beginnt mit 3 statt 2 Siegpunkten. <b>Version 0.7.2.23:</b> Schilde (Farbspiegel und Multispiegel), die in der Verteidigung gestellt werden, wirken erst nach ihr, wie die Heilung: nicht mehr gegen den laufenden Angriff, aber ab dem nächsten. <b>Version 0.7.2.22:</b> Die Versionsliste zeigt nur noch die Updates der aktuellen Hauptversion 0.7 (ältere Einträge entfallen). <b>Version 0.7.2.21:</b> Der Innenschatten des Multispiegels ist etwas weicher. <b>Version 0.7.2.20:</b> Der Innenschatten am Rand des Multispiegels ist kleiner und härter. <b>Version 0.7.2.19:</b> Die Teilung des Multispiegels hat keine Trennlinie, nur die schattierte rechte Hälfte. <b>Version 0.7.2.18:</b> Der Multispiegel ist mittig von oben nach unten geteilt, die rechte Hälfte ist schattiert (wie bei den anderen Schildern). <b>Version 0.7.2.17:</b> Der Multispiegel wirft vom Rand einen Schatten nach innen. <b>Version 0.7.2.16:</b> Der Schatten der Marker liegt noch dichter am Marker. <b>Version 0.7.2.15:</b> Der Multispiegel ist dunkler und passt zu den übrigen Schildern. <b>Version 0.7.2.14:</b> Die Markerreihe liegt so, dass weder markierte Handkarten noch Zähler verdeckt werden. <b>Version 0.7.2.12:</b> Todes- und Heilmarker erscheinen nur noch als ein Token mit Zähler (×N), statt mehrfach abgebildet zu werden; der Multispiegel hatte den Zähler schon. <b>Version 0.7.2.11:</b> Alle Marker (Todes-, Heil- und Schildmarker) liegen in einer lockeren Reihe mittig direkt vor den Handkarten ihres Spielers und verdecken keine Anzeigen. <b>Version 0.7.2.10:</b> Der Schatten der Marker ist näher und härter; Schildmarker sind jetzt ebenfalls Pappmarker. <b>Version 0.7.2.9:</b> Todes- und Heilmarker haben eine dezente Tiefe und wirken wie ausgestanzte Pappmarker. <b>Version 0.7.2.8:</b> Der <b>Heilfluss</b> wirkt wie der Todesfluss erst am Ende der <b>nächsten</b> eigenen Angriffsphase, nicht schon in der Phase, in der die Ultimate gelegt wurde. <b>Version 0.7.2.7:</b> Das <b>Multischild</b> heißt jetzt <b>Multispiegel</b>. <b>Version 0.7.2.6:</b> Todes- und Heilmarker liegen als Haufen mittig vor dem Stapel ihres Spielers, leicht verdreht und versetzt (Todesmarker vorn, Heilmarker in einer zweiten Reihe); der Heilmarker ist kleiner und dezenter. <b>Version 0.7.2.5:</b> Das Ritual von <b>Heilfluss</b> und <b>Multischild</b> erscheint jetzt bei jedem Wirken der Ultimate, auch wenn die Stufe nicht steigt (vorher nur bei steigender Stufe). <b>Version 0.7.2.4:</b> Das <b>Prisma</b> heißt jetzt <b>Multischild</b>. Sein Ritual beginnt mit einem Kreis, aus dem die Schildkuppel wächst; Kristall und Lichtstrahl entfallen. <b>Version 0.7.2.3:</b> Der <b>Heilfluss</b> hat jetzt auch am Ende der Angriffsphase einen Effekt: Aus jedem Heilmarker steigt eine grüne Wolke zur Lebensanzeige und heilt dort (wie die Wolke des Todesfluss). <b>Version 0.7.2.2:</b> Die Ultimates <b>Heilfluss</b> und <b>Prisma</b> haben jetzt ein eigenes Ritual auf dem Bildschirm (wie das Pentagramm des Todesfluss). Die <b>Stufen des Prisma verfallen</b> wie die eines Farbspiegels, verbraucht wird aber immer zuerst der Farbspiegel. <b>Version 0.7.2.1:</b> Keine Spieländerung: Die neue <b>Ultimate-Werkstatt</b> (Effektwerkstatt für die Kombos aus allen drei Elementen) zeigt Todesfluss, Prisma und Heilfluss als Ritual mit Markern und Wirkung; sie liegt im Projekt unter <b>werkstatt/</b>. <b>Version 0.7.1.2:</b> Umbenennung in den Kombos: Das Wasser-Ultimate heißt jetzt <b>Prisma</b> (vorher Regenbogenschild), die beiden Spiegel-Kombos heißen <b>Feuerspiegel</b> und <b>Erdspiegel</b>. <b>Version 0.7.1.1:</b> In der Kombo-Übersicht ist die Schrift größer und füllt das Fenster; die Farbgruppen (Feuer, Wasser, Erde) sind getönt und durch Abstand getrennt. <b>Version 0.7.0.3:</b> Die Kombo-Übersicht nutzt die volle Höhe ihres Fensters. <b>Version 0.7.0.2:</b> In der Kombo-Übersicht entfallen die Farbüberschriften und der Zusatz „(Ultimate)“; die Reihenfolge nach Farbe bleibt. <b>Version 0.7.0.1:</b> Die <b>Kombo-Übersicht</b> ordnet alle Kombos nach Farbe der ersten Karte; die Ultimate steht unter ihrer Farbe (Feuer <b>Todesfluss</b>, Wasser Regenbogenschild, Erde Heilfluss) und alles ist ohne Scrollen sichtbar. Der Todes-Fluch heißt jetzt Todesfluss. <b>Version 0.7:</b> <b>Ultimates nach Farbe der ersten Karte:</b> Feuer wirkt wie bisher als Todesfluss, Erde legt einen <b>Heilfluss</b> (grüne Marker mit Plus heilen dich am Ende jeder deiner Angriffsphasen), Wasser einen <b>Regenbogenschild</b> (wirkt gegen jede Farbe wie ein Spiegel, verbraucht sich aber nicht). Alle drei Marker entfernt nur die Läuterung. <b>Gold opfern</b> geht ohne Obergrenze. <b>Karten</b> lassen sich unabhängig von der entwickelten Magie kaufen. Die <b>Strafe des roten Nachziehmarkers</b> (Mana und Gold) wächst mit dem Abschnitt (1/2/3); vor dem Nachziehen warnt eine Abfrage. Der Hinweistext zur Schildwirkung entfällt.</p><div class="menulist">' + back + '</div>';
  } else if (pg === 'credits') {
    h += '<h2>Credits</h2><p class="note" style="text-align:center">Danke fürs Testspielen an</p><div class="menulist"><p class="note" style="text-align:center;font-size:21px;line-height:1.7"><b>DarkParladin</b><br><b>Deekixx</b><br><b>H5</b><br><b>Leon aka Tim</b><br><b>Zockerboy</b></p>' + back + '</div>';
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
