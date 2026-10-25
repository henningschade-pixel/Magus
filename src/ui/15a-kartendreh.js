/* ---------- Kartendreh: die Drehung „Volle Drehung" aus werkstatt/kartendreh-werkstatt.html ---------- */
// Eine Drehung um 180° mit Perspektive, Heben, Vergrößerung, seitlichem Kippen, Überdrehen und Hüpfer; bei den Monsterkarten dazu Schatten, Glanzstreifen und Leuchten in der Elementfarbe.
// Gebaut als Web-Animation auf dem 3D-Element der Karte (.inner bei Handkarten, .mc bei den Monsterkarten zum Spielstart); danach gilt wieder der Stand aus dem Stylesheet.
const CardFlip = (() => {
  const MON = { extra: 0, persp: 800, heben: 30, skal: 1.06, kipp: 4, huepf: 6, nach: 8, schatten: .5, glanz: .5, leucht: .4, dauer: 900 };   // Monsterkarten (Export der Werkstatt)
  const HAND = { extra: 0, persp: 500, heben: 60, skal: 1.18, kipp: 8, huepf: 8, nach: 14, leucht: 1, dauer: 800 };   // Handkarten: die Karten sind klein und fliegen zugleich, deshalb deutlicher als bei den Monsterkarten
  const bez = (x1, y1, x2, y2) => t => { let a = 0, b = 1, u = t; for (let k = 0; k < 24; k++) { u = (a + b) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < t) a = u; else b = u; } return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u; };
  const ease = bez(.4, 0, .2, 1);
  function pose(P, t, a0, a1) {
    const e = ease(t), sinT = Math.sin(Math.PI * t), dir = a1 >= a0 ? 1 : -1;
    const over = P.nach * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - .6) / .4))) * (t > .6 ? 1 : 0);
    return { ang: a0 + (a1 - a0 + dir * 360 * P.extra) * e + dir * over, sinT, lift: P.heben * sinT, sc: 1 + (P.skal - 1) * sinT, z: P.kipp * Math.sin(2 * Math.PI * t) * (1 - t), hop: t > .85 ? -P.huepf * Math.sin(Math.PI * (t - .85) / .15) : 0 };
  }
  function frames(P, a0, a1, fn) {
    const N = 36, out = [];
    for (let i = 0; i <= N; i++) { const t = i / N, p = pose(P, t, a0, a1); out.push(fn(p, t)); }
    return out;
  }
  const tf = (P, p) => 'perspective(' + P.persp + 'px) translateY(' + p.hop + 'px) translateZ(' + p.lift + 'px) rotateZ(' + p.z + 'deg) scale(' + p.sc + ') rotateY(' + p.ang + 'deg)';
  const run = (el, kf, dur) => el.animate(kf, { duration: dur, easing: 'linear' });
  function hand(inner, from, to) {   // Handkarte: .inner von from nach to (0 = Vorderseite, 180 = Rückseite)
    if (!inner.animate) return 0;
    run(inner, frames(HAND, from, to, p => ({ transform: tf(HAND, p) })), HAND.dauer);
    inner.querySelectorAll('.face').forEach(f => run(f, frames(HAND, from, to, p => ({ boxShadow: '0 3px 9px rgba(0,0,0,.55), 0 0 ' + 26 * HAND.leucht * p.sinT + 'px ' + 3 * HAND.leucht * p.sinT + 'px rgba(255,226,150,' + .9 * p.sinT + ')' })), HAND.dauer));   // goldener Schein, solange die Karte in der Luft ist
    return HAND.dauer;
  }
  function monster(mc, col, done) {   // Monsterkarte zum Spielstart: .mc (verdeckt 0° -> offen 180°) mit Schatten, Glanz und Leuchten; done() am Ende
    const P = MON, slot = mc.parentNode, sh = slot.querySelector('.cfshadow'), gl = slot.querySelector('.cfglint'), fr = slot.querySelector('.cffront');
    if (!mc.animate) { done(); return 0; }
    run(mc, frames(P, 0, 180, p => ({ transform: tf(P, p) })), P.dauer).onfinish = done;
    if (sh) run(sh, frames(P, 0, 180, p => ({ opacity: P.schatten * (1 - .6 * p.sinT), transform: 'scale(' + (1 + .15 * p.sinT) + ')' })), P.dauer);
    if (gl) run(gl, frames(P, 0, 180, (p, t) => ({ opacity: P.glanz * p.sinT, transform: 'translateX(' + (-60 + 360 * t) + '%) skewX(-15deg)' })), P.dauer);
    const rim = p => '0 0 0 2px rgba(239,230,210,' + .75 * p.sinT + ')';   // heller Rand: die schwarze Karte steht sonst nicht vom dunklen Steinhintergrund ab, besonders in der Kantenstellung
    const bk = slot.querySelector('.cfback');
    if (bk) run(bk, frames(P, 0, 180, p => ({ boxShadow: rim(p) })), P.dauer);
    if (fr) run(fr, frames(P, 0, 180, p => ({ boxShadow: rim(p) + ', 0 0 ' + 40 * P.leucht * p.sinT + 'px ' + 4 * P.leucht * p.sinT + 'px ' + col })), P.dauer);
    return P.dauer;
  }
  return { hand, monster, MON, HAND };
})();
