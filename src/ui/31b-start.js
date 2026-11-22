/* ---------- Spielstart: Monster aufdecken und würfeln, dann Karten mischen und austeilen ---------- */
// Die Engine hat zu Beginn schon alles ausgeteilt; der Spielstart wird nur gezeigt: Monsterkarte 1, 2, 3 werden aufgedeckt und ihre Würfel geworfen, danach nimmt jeder Spieler seine Karten von der Ablage,
// mischt sie, legt sie auf den Nachziehstapel und teilt von dort die Hand aus. view() liefert dafür einen gedachten Kartenstand der Decks; Eingaben und Computerzüge warten bis zum Ende (Klick überspringt).
const Intro = (() => {
  const T = { mon: 300, monStep: 1900, dice: 650, players: 6200, plStep: 2900, deal: 1250, dealStep: 240, end: 500 };
  let monOnly = false, on = false, timers = [], monRev = 0, pl = {}, hint = null, covers = [];   // covers: verdeckte Monsterkarten als eigene Elemente (bleiben beim Neuzeichnen bestehen, die Dreh-Animation läuft ungestört)
  const later = (ms, fn) => timers.push(setTimeout(() => { if (on) { fn(); render(); } }, ms));
  function stop() { timers.forEach(clearTimeout); timers = []; on = false; monRev = 0; pl = {}; covers.forEach(c => c.remove()); covers = []; delete stage.dataset.hm; if (hint) { hint.remove(); hint = null; } }
  function start(afterPrep) {   // afterPrep (seit 0.15): Die Monster sind schon ausgelost und aufgedeckt (Vorbereitung); jetzt wird gemischt, ausgeteilt und danach würfeln die Monster (Konfiguration)
    stop();
    if (!G || FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || (navigator.webdriver && !/[?&]intro/.test(location.search))) return;   // Testläufe (Playwright, außer mit ?intro) und reduzierte Bewegung: ohne Vorführung
    const R = LAYOUT.monsters;
    if (!afterPrep) covers = M.ELEMENTS.map((e, i) => {
      const d = document.createElement('div');
      d.className = 'introcover';
      d.style.cssText = 'left:' + (R.left + i * R.step) + 'px;top:' + R.top + 'px;width:' + R.w + 'px;height:' + R.h + 'px';
      d.innerHTML = '<div class="cfshadow"></div><div class="mc"><div class="face cfback" style="background-image:url(' + IMG.logo + ')"></div><div class="face cffront"><div class="cfglint"></div></div></div>';
      stage.appendChild(d);
      return d;
    });
    if (!afterPrep) stage.dataset.hm = '0 1 2';   // die echten Monsterkarten bleiben verborgen, bis ihre Abdeckung umgedreht ist
    monOnly = !!G && G.phase === 'prep';   // Spielbeginn mit Vorbereitung: erst nur die Monster auslosen (aufdecken); Mischen, Austeilen und Würfeln folgen nach der Kartenwahl
    on = true; monRev = afterPrep ? 3 : 0; pl = monOnly ? {} : { [ME]: { st: 'disc', k: 0 }, [OPP]: { st: 'disc', k: 0 } };
    const n = G.players[ME].deck.hand.length, order = [ME, OPP], tP = afterPrep ? 300 : T.players, tD = afterPrep ? tP + 2 * T.plStep + 200 : 0;
    if (!afterPrep) M.ELEMENTS.forEach((e, i) => {
      const t = T.mon + i * T.monStep;
      later(t, () => { monRev = i + 1; Snd.play('flip', 0, .8); const c = covers[i]; if (c) reveal(c, i); });
      if (!monOnly) later(t + T.dice, () => DiceBoard.throwItem(i));
    });
    else M.ELEMENTS.forEach((e, i) => later(tD + i * 700, () => DiceBoard.throwItem(i)));   // Konfiguration der Monster nach dem Mischen und Austeilen
    if (!monOnly) order.forEach((p, j) => {
      const t = tP + j * T.plStep;
      later(t, () => { pl[p].st = 'draw'; Snd.play('shuffle', 0, .8); });
      for (let k = 1; k <= n; k++) later(t + T.deal + (k - 1) * T.dealStep, () => { pl[p].st = 'deal'; pl[p].k = k; Snd.play('flip', 0, .7); });
    });
    const tEnd = monOnly ? T.mon + 3 * T.monStep - 300 : afterPrep ? tD + 3 * 700 + 600 : T.players + 2 * T.plStep + T.end;
    later(tEnd, finish);
    hold = Date.now() + tEnd + 200;   // der Computer wartet
    hint = document.createElement('div'); hint.id = 'introhint'; hint.textContent = monOnly ? 'Klick: Aufdecken überspringen' : 'Klick: Spielstart überspringen'; stage.appendChild(hint);
  }
  function reveal(c, i) {   // Volle Drehung (Kartendreh-Werkstatt): die Abdeckung dreht sich um 180° und zeigt dabei eine Kopie der Monsterkarte
    const real = stage.querySelector('.mon[data-i="' + i + '"]'), ff = c.querySelector('.cffront');
    if (real) { const cl = real.cloneNode(true); cl.style.left = cl.style.top = '0'; ff.insertBefore(cl, ff.firstChild); }   // die Kopie liegt in der Abdeckung, nicht an der Kartenposition
    const end = () => { c.remove(); stage.dataset.hm = (stage.dataset.hm || '').split(' ').filter(x => x !== String(i)).join(' '); };
    // Schein in der Farbe des Monsters in diesem Feld (Feld und Element stimmen nicht immer überein)
    if (!real || FAST) end(); else CardFlip.monster(c.querySelector('.mc'), ({ F: '#ff6b3d', E: '#8bc34a', W: '#52a6f5' })[G.monsters[M.ELEMENTS[i]].el] || '#d2ad4f', end);
  }
  function finish() { const m = monOnly; stop(); hold = 0; if (!m) DiceBoard.throwRest(); pump(); }
  function skip() {   // alles sofort in den Endstand; die Karten springen, ohne Töne zu erzeugen (erst ein stummes Zeichnen, dann Ende)
    if (!on) return;
    timers.forEach(clearTimeout); timers = [];
    monRev = 3; covers.forEach(c => c.remove()); covers = []; Object.keys(pl).forEach(p => { pl[p].st = 'deal'; pl[p].k = 99; });
    if (!monOnly) DiceBoard.throwRest(); render();
    finish();
  }
  function view(deck, p) {   // gedachter Kartenstand des Decks: alle Karten auf der Ablage, dann auf dem Stapel, dann nach und nach in der Hand
    const s = pl[p]; if (!on || !s) return deck;
    const hc = deck.hand.filter(Boolean), n = deck.hand.length, all = hc.concat(deck.draw, deck.discard);
    if (s.st === 'disc') return Object.assign({}, deck, { draw: [], discard: all, hand: Array(n).fill(null), marks: [] });
    const k = s.st === 'deal' ? s.k : 0; let c = 0;
    return Object.assign({}, deck, { draw: deck.draw.concat(hc.slice(k).reverse()), discard: deck.discard, hand: deck.hand.map(x => (x && c++ < k ? x : null)), marks: [] });
  }
  document.addEventListener('pointerdown', e => { if (on) { e.stopPropagation(); e.preventDefault(); skip(); } }, true);
  return { start, stop, skip, view, get on() { return on; }, get monRev() { return monRev; } };
})();
