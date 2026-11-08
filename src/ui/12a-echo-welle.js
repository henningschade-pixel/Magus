/* ---------- Echo auf dem Magie-Board (seit 0.9.4): Die Schlange der Echo-Farbe leuchtet pulsierend und sendet Wellen nach außen (Werkstatt: werkstatt/echo-werkstatt.html) ---------- */
/* ECHOWAVE BEGIN */
const EchoWave = (() => {
  // Voreinstellung; die Werkstatt exportiert dieselben Schlüssel als JSON. Längen sind Bildpunkte der Brettgrafik (1254 × 1254) und wachsen mit der Brettgröße; r0, reach und die Winkel sind Anteile bzw. Grad.
  const DEFAULTS = { on: true, span: 100, edge: 26, r0: .44, reach: .2, waves: 3, period: 2.6, line: 22, lineEnd: .5, opacity: .9, white: .55, glow: .75, glowW: 64, blur: 26, pulse: 1.3, depth: .5, blend: 'screen', colF: '#ff6a3a', colE: '#8be05a', colW: '#5ab8ff' };
  const DIR = { F: -90, E: 30, W: 150 };   // Mitte der Schlange auf dem Brett: Feuer oben, Erde rechts unten, Wasser links unten (wie die Magie-Knöpfe)
  const BOARD = 1254;
  const CSS = '.echow{position:absolute;pointer-events:none;z-index:2}.echow svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.echow circle{fill:none}.echow .ewv{transform-origin:50% 50%;transform-box:view-box}' +
    '@keyframes ewscale{from{transform:scale(1);stroke-width:var(--ew-w0)}to{transform:scale(var(--ew-k));stroke-width:var(--ew-w1)}}' +
    '@keyframes ewfade{0%{opacity:0}14%{opacity:var(--ew-o)}100%{opacity:0}}' +
    '@keyframes ewglow{0%,100%{opacity:var(--ew-g0)}50%{opacity:var(--ew-g1)}}' +
    '@media (prefers-reduced-motion:reduce){.echow .ewv{animation:none!important;opacity:0}.echow .ewg{animation:none!important;opacity:var(--ew-g1)}}';
  let injected = false;
  function inject() {
    if (injected || typeof document === 'undefined') return; injected = true;
    const s = document.createElement('style'); s.id = 'echow-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  // HTML der Ebene für ein Brett der Kantenlänge size (px); el = Farbe des Echos ('F', 'E', 'W'). Sie liegt im Element .bd über der Grafik und ragt nach außen. now (ms) legt die Phase fest, damit die Wellen beim Neuzeichnen nicht von vorn beginnen.
  function html(el, size, cfg, now) {
    const c = Object.assign({}, DEFAULTS, cfg || {}); if (!c.on || !DIR[el]) return '';
    inject();
    const mf = Math.max(0, c.r0 + c.reach - .5) + .05, T = BOARD * (1 + 2 * mf), C = T / 2, r0 = c.r0 * BOARD, k = (c.r0 + c.reach) / c.r0, col = c['col' + el] || '#fff';
    const P = Math.max(.3, c.period), t = (now == null ? Date.now() : now) / 1000, n = Math.max(0, Math.round(c.waves));
    const edge = Math.min(c.edge, c.span / 2), from = DIR[el] + 90 - c.span / 2, M = size * mf;
    const mask = 'conic-gradient(from ' + from.toFixed(1) + 'deg at 50% 50%,transparent 0deg,#000 ' + edge + 'deg,#000 ' + (c.span - edge) + 'deg,transparent ' + c.span + 'deg)';
    const fid = 'ewb' + el, g1 = c.glow, g0 = c.glow * (1 - c.depth);
    let h = '<div class="echow" data-el="' + el + '" style="left:' + (-M).toFixed(1) + 'px;top:' + (-M).toFixed(1) + 'px;width:' + (size + 2 * M).toFixed(1) + 'px;height:' + (size + 2 * M).toFixed(1) + 'px;mix-blend-mode:' + c.blend + ';-webkit-mask-image:' + mask + ';mask-image:' + mask + '">' +
      '<svg viewBox="0 0 ' + T.toFixed(0) + ' ' + T.toFixed(0) + '" aria-hidden="true"><defs><filter id="' + fid + '" filterUnits="userSpaceOnUse" x="0" y="0" width="' + T.toFixed(0) + '" height="' + T.toFixed(0) + '"><feGaussianBlur stdDeviation="' + c.blur + '"/></filter></defs>';
    h += '<circle class="ewg" cx="' + C + '" cy="' + C + '" r="' + r0.toFixed(1) + '" stroke="' + col + '" stroke-width="' + c.glowW + '" filter="url(#' + fid + ')" style="--ew-g0:' + g0.toFixed(3) + ';--ew-g1:' + g1.toFixed(3) + ';opacity:' + g1.toFixed(3) + (c.pulse > 0 && c.depth > 0 ? ';animation:ewglow ' + c.pulse + 's ease-in-out ' + (-(t % c.pulse)).toFixed(3) + 's infinite' : '') + '"/>';
    for (let i = 0; i < n; i++) {
      const d = -((t % P) + i * P / n), an = 'animation:ewscale ' + P + 's cubic-bezier(.15,.55,.35,1) ' + d.toFixed(3) + 's infinite,ewfade ' + P + 's linear ' + d.toFixed(3) + 's infinite;opacity:0;';
      h += '<circle class="ewv" cx="' + C + '" cy="' + C + '" r="' + r0.toFixed(1) + '" stroke="' + col + '" style="--ew-k:' + k.toFixed(3) + ';--ew-w0:' + c.line + ';--ew-w1:' + (c.line * c.lineEnd).toFixed(2) + ';--ew-o:' + c.opacity + ';' + an + '"/>';
      if (c.white > 0) h += '<circle class="ewv" cx="' + C + '" cy="' + C + '" r="' + r0.toFixed(1) + '" stroke="#fff" style="--ew-k:' + k.toFixed(3) + ';--ew-w0:' + (c.line * .3).toFixed(2) + ';--ew-w1:' + (c.line * .3 * c.lineEnd).toFixed(2) + ';--ew-o:' + (c.opacity * c.white).toFixed(3) + ';' + an + '"/>';
    }
    return h + '</svg></div>';
  }
  return { DEFAULTS, DIR, BOARD, html, css: () => CSS };
})();
/* ECHOWAVE END */
