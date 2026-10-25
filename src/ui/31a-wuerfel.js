/* ---------- Monster-Würfel (seit 0.4): ein roter Pluswürfel (stärkt das Monster, Nachteil für den Spieler) und ein grüner Minuswürfel (schwächt es, Vorteil) je Monster ----------
   Sie werden zu Beginn jedes Abschnitts auf die Monsterkarten geworfen und bleiben dort liegen (statt der benannten Effekte unter dem Namen).
   DiceKit (zwischen den Markierungen) steht unverändert auch in werkstatt/wuerfel-werkstatt.html; dort lassen sich alle Werte einstellen,
   der Export (JSON) wird in DiceKit.P übernommen. Ein Test prüft, dass beide Fassungen gleich sind. */
/* DICEKIT BEGIN */
const DiceKit = (() => {
  const KINDS = ['hp', 'mana', 'limit', 'draws', 'hand', 'none'];   // Standardreihenfolge der Seiten 0 bis 5 (der Pluswürfel trägt seit 0.5 an Stelle 2 „mag“ statt „limit“, siehe MONSTER.variants.dice)
  const NAMES = { hp: 'HP', mana: 'Mana', limit: 'Limit', mag: 'Magie', draws: 'Ziehen', hand: 'Hand', none: 'leer' };
  // Einstellungen (Werkstatt: Export einfügen). tiltX/tiltY: Kippung im Flug, restTiltX/restTiltY: Kippung in Ruhe (0 = die Symbole stehen gerade); vary: Stärke der Abweichung je Monster (0 = keine)
  const P = { size: 41, duration: 1.45, spins: 2, bounces: 3, hop: 38, fromX: -300, fromY: -230, tiltX: -24, tiltY: 20, restTiltX: 0, restTiltY: 0, vary: 1, stagger: 0.16, monsterStagger: 0.5, glyph: 0.6, numbers: 0, shadow: 0.5, plus: '#c0392b', minus: '#3f9d4d', gap: 8, y: 6 };
  const GLYPH = {   // Symbole (48 × 48), Farbe über currentColor
    hp: '<path d="M24 42C11 31 6 23 6 16.5A9.5 9.5 0 0 1 24 12a9.5 9.5 0 0 1 18 4.5C42 23 37 31 24 42Z" fill="currentColor"/>',
    mana: '<path d="M24 5C32 16 38 23.5 38 30.5a14 14 0 0 1-28 0C10 23.5 16 16 24 5Z" fill="currentColor"/><path d="M17.5 31a6.5 6.5 0 0 0 5 6.2" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="3" stroke-linecap="round"/>',
    limit: '<rect x="6" y="10" width="20" height="28" rx="3.5" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M30 24h13m-5.5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    draws: '<path d="M35.5 13.6 A15.5 15.5 0 1 0 37 32.4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M40.9 25.7L42 36.1L31.3 29.9Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    hand: '<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M24 7.8A2.8 2.8 0 0 0 21.2 5H10.8 A2.8 2.8 0 0 0 8 7.8V24.2 A2.8 2.8 0 0 0 10.8 27"/><path d="M32 15.8A2.8 2.8 0 0 0 29.2 13H18.8 A2.8 2.8 0 0 0 16 15.8V32.2 A2.8 2.8 0 0 0 18.8 35"/><rect x="24" y="21" width="16" height="22" rx="2.8"/></g>',
    mag: '<path d="M24 42V11M11 24 24 11 37 24" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>',   // Magiestufe: Pfeil nach oben
    none: '',   // leere Seite: keine Grafik
  };
  // Welche Würfelseite zeigt zum Betrachter? [rotateX, rotateY] des Würfels in Ruhe
  const REST = [[0, 0], [0, 180], [0, -90], [0, 90], [-90, 0], [90, 0]];
  const FACE_T = ['rotateY(0deg)', 'rotateY(180deg)', 'rotateY(90deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style');
    st.textContent = '.dk-die{position:absolute;perspective:420px;will-change:transform}' +
      '.dk-cube{position:absolute;left:0;top:0;transform-style:preserve-3d}' +
      '.dk-f{position:absolute;left:0;top:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff6df;border:2px solid rgba(255,255,255,.32);background:linear-gradient(145deg,var(--c2),var(--c1));box-shadow:inset 0 0 10px rgba(0,0,0,.4);backface-visibility:hidden}' +
      '.dk-f svg{display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}' +
      '.dk-f .dk-s{position:absolute;left:3px;top:3px;width:10px;height:10px;opacity:.9}' +
      '.dk-f .dk-g{position:relative;left:3px;top:3px}' +
      '.dk-f b{position:absolute;right:4px;bottom:1px;font:700 15px/1 "Alegreya SC",Georgia,serif;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.8)}' +
      '.dk-sh{position:absolute;left:12%;right:12%;bottom:-5px;height:10px;border-radius:50%;background:#000;filter:blur(3px);pointer-events:none}' +
      '.dk-die.dk-off{opacity:.5;filter:saturate(.45)}';
    document.head.appendChild(st);
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.max(0, Math.min(255, Math.round(c + (k > 0 ? (255 - c) * k : c * k)))); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; }
  // Würfel bauen: sign +1 (Pluswürfel, rot) / −1 (Minuswürfel, grün), amounts: Betrag je Seite (0 = keiner) für die Beschriftung
  function make(sign, amounts, o) {
    css(); o = Object.assign({}, P, o || {});
    const S = o.size, col = o.color || (sign > 0 ? o.plus : o.minus), el = document.createElement('div');
    el.className = 'dk-die'; el.style.cssText = 'width:' + S + 'px;height:' + S + 'px;--c1:' + col + ';--c2:' + shade(col, .32);
    const sh = document.createElement('div'); sh.className = 'dk-sh'; sh.style.opacity = o.shadow; el.appendChild(sh);
    const cube = document.createElement('div'); cube.className = 'dk-cube'; cube.style.cssText = 'width:' + S + 'px;height:' + S + 'px'; el.appendChild(cube);
    FACE_T.forEach(t => {   // Kern: sechs volle Quadrate knapp unter den Seiten, damit an den Ecken und Kanten nichts durchscheint
      const c = document.createElement('div'); c.style.cssText = 'position:absolute;left:0;top:0;width:' + S + 'px;height:' + S + 'px;background:' + shade(col, -.25) + ';backface-visibility:hidden;transform:' + t + ' translateZ(' + (S / 2 - 2) + 'px)';
      cube.appendChild(c);
    });
    (o.kinds || KINDS).forEach((k, i) => {   // o.kinds: Seiten dieses Würfels (der Pluswürfel trägt „mag“ statt „limit“)
      const f = document.createElement('div'); f.className = 'dk-f'; f.style.cssText = 'width:' + S + 'px;height:' + S + 'px;border-radius:' + Math.round(S * .12) + 'px;transform:' + FACE_T[i] + ' translateZ(' + (S / 2) + 'px)';
      const g = Math.round(S * o.glyph * (k === 'none' ? 1 : .86)), n = amounts && amounts[i];
      const sgn = k === 'none' ? '' : '<svg class="dk-s" viewBox="0 0 12 12"><path d="' + (sign > 0 ? 'M6 1.5v9M1.5 6h9' : 'M1.5 6h9') + '" fill="none" stroke="#fff6df" stroke-width="2.2" stroke-linecap="round"/></svg>';   // Plus auf dem roten, Minus auf dem grünen Würfel; die leere Seite trägt nur einen Strich
      f.innerHTML = sgn + '<svg class="dk-g" width="' + g + '" height="' + g + '" viewBox="0 0 48 48">' + GLYPH[k] + '</svg>' + (o.numbers && n ? '<b style="font-size:' + Math.round(S * .3) + 'px">' + (sign > 0 ? '+' : '−') + n + '</b>' : '');
      cube.appendChild(f);
    });
    el._k = 0; el._cube = cube; el._o = o; el._sh = sh; el._sign = sign;
    return el;
  }
  const rot = (tx, ty, rx, ry, rz) => 'rotateX(' + tx + 'deg) rotateY(' + ty + 'deg) rotateZ(' + (rz || 0) + 'deg) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
  function setRest(el, k) { el._k = k; const r = REST[k]; el._cube.style.transform = rot(el._o.restTiltX, el._o.restTiltY, r[0], r[1], el._o.restRz || 0); }
  // Wurf: Der Würfel fliegt von (fromX, fromY) relativ zu seinem Platz heran, hüpft, dreht sich und bleibt mit Seite k nach oben liegen. cb nach der Landung.
  function roll(el, k, delay, cb, o2) {
    const o = Object.assign({}, el._o, o2 || {}), r = REST[k], rnd = () => Math.random() * 2 - 1, dir = () => (Math.random() < .5 ? -1 : 1);
    const sm = o.spinMul || 1, sx = o.spins * sm * 360 * dir() + rnd() * 90, sy = o.spins * sm * 360 * dir() + rnd() * 90, sz = rnd() * 70, rz0 = o.restRz || 0, dur = Math.max(.2, o.duration) * 1000;
    el._k = k; el.style.visibility = 'hidden'; el._cube.style.transform = rot(o.tiltX, o.tiltY, r[0] + sx, r[1] + sy, sz + rz0);
    let t0 = 0, landed = false;
    const step = ts => {
      if (!el.isConnected && t0) return;
      if (!t0) t0 = ts;
      const u = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - u, 3), spin = 1 - Math.pow(1 - u, 2.2);
      const hopA = o.hop * Math.pow(1 - u, 1.4) * Math.abs(Math.sin(Math.PI * o.bounces * Math.pow(u, .85)));   // Hüpfer mit abnehmender Höhe
      const x = o.fromX * (1 - e), y = o.fromY * (1 - e) - (o.bounces > 0 ? hopA : 0);
      el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      const tl = Math.pow(u, 1.6); el._cube.style.transform = rot(o.tiltX + (o.restTiltX - o.tiltX) * tl, o.tiltY + (o.restTiltY - o.tiltY) * tl, r[0] + sx * (1 - spin), r[1] + sy * (1 - spin), sz * (1 - spin) + rz0);   // die Kippung läuft bis zur Landung auf den Ruhewert aus
      el._sh.style.transform = 'scale(' + (1 - Math.min(.5, Math.abs(y) / 260)) + ')'; el._sh.style.opacity = o.shadow * (1 - Math.min(.7, Math.abs(y) / 300));
      if (u < 1) requestAnimationFrame(step); else if (!landed) { landed = true; el.style.transform = ''; setRest(el, k); if (cb) cb(); }
    };
    setTimeout(() => { el.style.visibility = ''; requestAnimationFrame(step); }, Math.max(0, delay || 0));
  }
  // Farbton und Helligkeit leicht verschieben
  function tint(hex, dh, dl) {
    const n = parseInt(hex.slice(1), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    h = (h + dh + 360) % 360; l = Math.max(.12, Math.min(.85, l + dl));
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 360) % 360 / 360; return Math.round(255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p)); };
    const to = x => ('0' + x.toString(16)).slice(-2);
    return '#' + to(f(h + 120)) + to(f(h)) + to(f(h - 120));
  }
  // Abweichung je Monster aus einer Zahl (seed): Farbton, Lage, Endlage und Wurf der beiden Würfel unterscheiden sich leicht (die Größe bleibt gleich). Rückgabe: Überschreibungen für make() und roll() sowie Versatz der Würfel.
  function vary(seed, k) {
    k = (k === undefined ? P.vary : k);
    let a = (seed * 2654435761 + 1013904223) >>> 0; const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; };
    const one = sign => ({ size: P.size, color: tint(sign > 0 ? P.plus : P.minus, 7 * k * r(), .05 * k * r()), dx: Math.round(5 * k * r()), dy: Math.round(5 * k * r()),
      restRz: +(7 * k * r()).toFixed(1), restTiltX: P.restTiltX + 4 * k * r(), restTiltY: P.restTiltY + 4 * k * r(),   // Endlage: leicht verdreht und gekippt (die Symbole bleiben lesbar)
      roll: { duration: P.duration * (1 + .14 * k * r()), spins: Math.max(0, P.spins + Math.round(k * r())), spinMul: 1 + .3 * k * r(), fromX: P.fromX * (1 + .18 * k * r()), fromY: P.fromY * (1 + .18 * k * r()), hop: P.hop * (1 + .2 * k * r()), bounces: Math.max(0, P.bounces + Math.round(.6 * k * r())) } });
    return { plus: one(1), minus: one(-1) };
  }
  return { P, KINDS, NAMES, make, setRest, roll, REST, shade, tint, vary };
})();
/* DICEKIT END */

// Spielbrett: legt die Würfel der drei Monster auf die Monsterkarten, direkt über den Kämpfen-Knopf der Weltphase. Die Würfel liegen in einer eigenen Ebene (die Karten werden bei jedem Zeichnen neu gebaut).
const DiceBoard = (() => {
  const MIN_DICE_SEP = 12;   // Mindestabstand der beiden Würfel einer Karte (px), größer als der Überstand der verdrehten Würfel
  let layer = null, mons = null, items = [], thrown = false;
  const V = () => M.MONSTER.variants;
  function ensure() { if (!layer) { layer = document.createElement('div'); layer.id = 'dicelayer'; layer.style.cssText = 'position:absolute;left:0;top:0;width:' + SW + 'px;height:800px;z-index:45;pointer-events:none'; stage.appendChild(layer); } return layer; }
  function tip(sign, face, n, same) {
    const k = face.k, nm = V().diceNames[k];
    if (k === 'none') return (sign > 0 ? 'Pluswürfel' : 'Minuswürfel') + ': leere Seite, keine Wirkung.';
    return (sign > 0 ? 'Pluswürfel: +' : 'Minuswürfel: −') + n + ' ' + nm + ' (' + (sign > 0 ? 'mehr ' : 'weniger ') + V().diceHints[k] + ').' + (same ? ' Beide Würfel zeigen denselben Wert: die Wirkungen heben sich auf.' : '');
  }
  function build() {
    items.forEach(it => { it.pl.remove(); it.mi.remove(); }); items = [];
    const R = LAYOUT.monsters, D = V().dice, amounts = (die, stage) => DiceKit.KINDS.map((k, i) => (k === 'none' ? 0 : die[i].n[stage - 1]));
    M.ELEMENTS.forEach((slot, i) => {
      const m = G.monsters[slot], v = m && m.variant;
      if (!v || !(v.pl >= 0) || !(v.mi >= 0)) { items.push(null); return; }
      const P = DiceKit.P, cx = R.left + i * R.step + R.w / 2, same = D.plus[v.pl].k === D.minus[v.mi].k, vr = DiceKit.vary((G.seed || 0) * 7 + G.stage * 131 + i * 17 + 1);   // je Monster leicht andere Würfel, bei allen Spielern gleich (aus dem Spielzufall)
      const pl = DiceKit.make(1, amounts(D.plus, m.stage), Object.assign({ kinds: D.plus.map(f => f.k) }, vr.plus)), mi = DiceKit.make(-1, amounts(D.minus, m.stage), Object.assign({ kinds: D.minus.map(f => f.k) }, vr.minus));
      pl.style.left = (cx - P.gap / 2 - vr.plus.size + vr.plus.dx) + 'px'; mi.style.left = Math.max(cx + P.gap / 2 + vr.minus.dx, cx - P.gap / 2 + vr.plus.dx + MIN_DICE_SEP) + 'px';   // Mindestabstand: auch bei Versatz und Verdrehung überlappen die Würfel nicht
       pl.style.top = (R.top + R.diceY + P.y + vr.plus.dy) + 'px'; mi.style.top = (R.top + R.diceY + P.y + vr.minus.dy) + 'px';
      pl.style.pointerEvents = mi.style.pointerEvents = 'auto';
      pl.title = tip(1, D.plus[v.pl], D.plus[v.pl].n[m.stage - 1], same); mi.title = tip(-1, D.minus[v.mi], D.minus[v.mi].n[m.stage - 1], same);
      if (same || D.plus[v.pl].k === 'none') pl.classList.add('dk-off'); if (same || D.minus[v.mi].k === 'none') mi.classList.add('dk-off');   // aufgehobene und leere Würfel durchscheinend
      DiceKit.setRest(pl, v.pl); DiceKit.setRest(mi, v.mi); pl.style.visibility = mi.style.visibility = 'hidden';
      layer.appendChild(pl); layer.appendChild(mi); items.push({ slot, pl, mi, v, vr });
    });
    thrown = false;
  }
  function throwItem(i, d0) {   // Wurf der beiden Würfel einer Monsterkarte (einmal je Karte)
    const it = items[i]; if (!it || it.thrown) return; it.thrown = true;
    const P = DiceKit.P; d0 = d0 || 0;
    if (!FAST) Snd.play('dice', d0 / 1000, .6);   // Würfelrollen auf dem Tisch, je Monsterkarte einmal beim Wurf
    [it.pl, it.mi].forEach((el, j) => { const k = j ? it.v.mi : it.v.pl; DiceKit.roll(el, k, d0 + j * P.stagger * 1000, null, (j ? it.vr.minus : it.vr.plus).roll); });
  }
  function throwAll() { thrown = true; items.forEach((it, i) => throwItem(i, i * DiceKit.P.monsterStagger * 1000)); }
  function throwRest() { if (!FAST && items.length) { thrown = true; items.forEach((it, i) => throwItem(i, 0)); } }   // Spielstart beendet oder übersprungen: alle noch nicht geworfenen Würfel
  // Nach jedem Zeichnen: neue Monster -> neue Würfel; sichtbar nur in der Weltphase ohne Überlagerung; geworfen wird, sobald sie sichtbar sind
  function sync() {
    if (!G || FAST) return;
    ensure();
    if (mons !== G.monsters) { mons = G.monsters; build(); }
    const visible = G.phase === 'world' && !G.over && !endView && !modal && overlay.style.display === 'none';
    layer.style.display = visible ? '' : 'none';
    if (!visible) return;
    items.forEach(it => { if (!it) return; const alive = M.monsterAlive(G.monsters[it.slot]); it.pl.style.display = it.mi.style.display = alive ? '' : 'none'; });
    if (!thrown && !Intro.on) throwAll();
  }
  return { sync, throwItem, throwRest };
})();
