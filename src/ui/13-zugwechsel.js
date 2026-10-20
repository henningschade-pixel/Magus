/* ---------- Zugwechsel (Werte der Zugwechsel-Werkstatt): Der Rand teilt sich in der Mitte, zwei Linien laufen links und rechts zur anderen Seite ---------- */
let turnSide = null, turnAnim = null, turnWait = 0, cardsUntil = 0;   // cardsUntil: bis wann Karten fliegen oder verbrennen
const TURN = { dur: 1.1, pause: .15, width: 4, glow: 26, head: 1, tail: .35, comet: .8, inner: 70, pulse: .35 };
function turnClasses() { const live = !turnAnim || turnAnim.done; stage.classList.toggle('turn-me', turnSide === 'me' && live); stage.classList.toggle('turn-opp', turnSide === 'opp' && live); }
function turnSync() {
  const want = G && !G.over ? (myTurn() ? 'me' : 'opp') : null;
  if ((!turnAnim || turnAnim.done) && want !== turnSide) {
    const calm = FAST || !turnSide || !want || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (calm) turnSide = want;
    else if (FlowFx.busy() || lateN > 0 || Date.now() < Math.max(fxUntil + 60, cardsUntil)) { if (!turnWait) turnWait = setTimeout(() => { turnWait = 0; render(); }, 80); }   // erst wenn Berechnung, Kampfanimation und Kartenflüge des Zugs fertig sind
    else startTurn(turnSide, want);
  }
  turnClasses();
}
// Der Zugwechsel steht aus oder läuft noch: der Computer zieht erst danach
function turnPending() { return !!(G && !G.over && ((turnAnim && !turnAnim.done) || (turnSide && turnSide !== (myTurn() ? 'me' : 'opp')))); }
// Eigene Eingaben sind erst erlaubt, wenn der Zugmarker auf der eigenen Seite angekommen ist
function markerOnWay() { return !!(G && !G.over && myTurn() && turnSide !== 'me'); }
function startTurn(from, to) {
  if (turnAnim && turnAnim.cv) turnAnim.cv.remove();
  const cv = document.createElement('canvas'); cv.id = 'turncv'; cv.width = 1280; cv.height = 800; stage.appendChild(cv);
  const me = { from, to, t0: performance.now(), cv, done: false }; turnAnim = me;
  Snd.play('turn_change');
  const c = cv.getContext('2d'), tMove = TURN.pause + TURN.dur, tEnd = tMove + .1;
  const loop = ts => {
    if (turnAnim !== me) return;
    const t = (ts - me.t0) / 1000;
    if (!me.done && t >= tMove) { me.done = true; turnSide = to; render(); }   // Randleuchten übernimmt, die Linien sind angekommen
    if (t >= tEnd) { cv.remove(); turnAnim = null; render(); return; }
    drawTurn(c, to === 'opp', t, me.done); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function drawTurn(c, up, t, done) {
  const W = 1280, H = 800, GOLD = '210,173,79', T = TURN, cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
  const m = T.width / 2 + 1, L1 = W / 2 - m, L2 = H - 2 * m, Pn = L1 + L2 + L1;
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const ptAt = (d, side) => { let x, y; if (d <= L1) { x = W / 2 - d; y = H - m; } else if (d <= L1 + L2) { x = m; y = H - m - (d - L1); } else { x = m + (d - L1 - L2); y = m; } return [side > 0 ? W - x : x, y]; };
  c.clearRect(0, 0, W, H);
  const u = cl((t - T.pause) / T.dur), breath = 1 - T.pulse * .3 * (.5 + .5 * Math.sin(t * 3.6));
  const edge = (yy, a) => {   // Randlinie mit Innenglühen
    if (a <= 0) return; const upE = yy < H / 2; c.save(); c.globalAlpha = cl(a);
    if (T.inner > 0) { const g = c.createLinearGradient(0, upE ? 0 : H, 0, upE ? T.inner : H - T.inner); g.addColorStop(0, 'rgba(' + GOLD + ',.4)'); g.addColorStop(1, 'rgba(' + GOLD + ',0)'); c.fillStyle = g; c.fillRect(0, upE ? 0 : H - T.inner, W, T.inner); }
    c.shadowColor = 'rgba(' + GOLD + ',.95)'; c.shadowBlur = T.glow; c.strokeStyle = 'rgba(' + GOLD + ',.95)'; c.lineWidth = T.width; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); c.restore();
  };
  const yFrom = up ? H - m : m;
  if (!done && u <= 0) edge(yFrom, breath);
  else if (!done && u < 1) {
    const tau = T.tail * .8, hp = ease(cl(u / (1 - tau))), tp = ease(cl((u - tau) / (1 - tau))), shade = T.comet * Math.sin(Math.PI * u);
    const mapD = d => up ? d : Pn - d;
    const tail = lerp(0, L1 + L2, tp), head = lerp(L1, Pn, hp);
    for (const sd of [-1, 1]) {
      const a = mapD(tail), b = mapD(head), n = Math.max(2, Math.ceil(Math.abs(b - a) / 14));
      c.save(); c.lineCap = 'round'; c.shadowColor = 'rgba(' + GOLD + ',.95)'; c.shadowBlur = T.glow; c.lineWidth = T.width;
      let prev = ptAt(a, sd);
      for (let k = 1; k <= n; k++) { const p = ptAt(lerp(a, b, k / n), sd), f = k / n; c.strokeStyle = 'rgba(' + GOLD + ',' + cl(lerp(1, .12 + .88 * Math.pow(f, 1.6), shade)) + ')'; c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(p[0], p[1]); c.stroke(); prev = p; }
      c.restore();
    }
  }
}
function myTurn() { return !G.over && M.actor(G) === ME; }
