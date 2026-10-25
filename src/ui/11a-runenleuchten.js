/* ---------- Leuchtende Runen im Hintergrund (Werkstatt: werkstatt/runen-werkstatt.html) ---------- */
/* RUNEGLOW BEGIN */
const RuneGlow = (() => {
  // Voreinstellung; die Werkstatt exportiert dieselben Schlüssel als JSON
  const DEFAULTS = { on: true, pause: 2.4, spread: .7, maxN: 4, fadeIn: .9, hold: 1.1, fadeOut: 1.9, size: 150, sizeVar: .5, power: .85, powerVar: .3, color1: '#ffc268', color2: '#ff7a3d', mix: .35, soft: .45, blend: 'screen', grow: .3, flicker: .25 };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
  // host: Bühne (Elternelement); opt.mask: URL der Runenmaske (1024 x 1024 Kachel); opt.before: Element, vor dem die Ebene eingefügt wird
  function attach(host, opt) {
    opt = opt || {};
    const layer = document.createElement('div'); layer.id = 'runeglow';
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;-webkit-mask-image:url("' + opt.mask + '");mask-image:url("' + opt.mask + '");-webkit-mask-size:1024px 1024px;mask-size:1024px 1024px';
    host.insertBefore(layer, opt.before || null);
    let cfg = Object.assign({}, DEFAULTS, opt.cfg || {}), timer = null, live = 0;
    const rnd = (v, f) => v * (1 + (Math.random() * 2 - 1) * f);
    function spawn(at) {
      const c = cfg, W = layer.offsetWidth || 1280, H = layer.offsetHeight || 800, r = Math.max(10, rnd(c.size, c.sizeVar)), p = Math.min(1, Math.max(.02, rnd(c.power, c.powerVar)));
      const col = Math.random() < c.mix ? c.color2 : c.color1, d = document.createElement('div'), x = at ? at.x : Math.random() * W, y = at ? at.y : Math.random() * H;
      d.style.cssText = 'position:absolute;left:' + (x - r) + 'px;top:' + (y - r) + 'px;width:' + 2 * r + 'px;height:' + 2 * r + 'px;border-radius:50%;opacity:0;will-change:opacity,transform;' +
        'background:radial-gradient(circle,' + rgba(col, 1) + ' 0%,' + rgba(col, .55) + ' ' + Math.round(c.soft * 50) + '%,' + rgba(col, 0) + ' 70%)';
      layer.style.mixBlendMode = c.blend; layer.appendChild(d); live++;
      const fi = c.fadeIn, ho = c.hold, fo = c.fadeOut, total = Math.max(.1, fi + ho + fo), s0 = 1 - c.grow, kf = [{ opacity: 0, transform: 'scale(' + s0 + ')', offset: 0 }, { opacity: p, transform: 'scale(1)', offset: fi / total }];
      const n = Math.round(ho * 6);   // Flackern: kleine Helligkeitssprünge während des Haltens
      for (let i = 1; i <= n; i++) kf.push({ opacity: p * (1 - c.flicker * Math.random()), transform: 'scale(1)', offset: (fi + ho * i / (n + 1)) / total });
      kf.push({ opacity: p * (1 - c.flicker * .3), transform: 'scale(1)', offset: (fi + ho) / total }, { opacity: 0, transform: 'scale(' + (1 + c.grow * .3) + ')', offset: 1 });
      const a = d.animate(kf, { duration: total * 1000, easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = a.oncancel = () => { d.remove(); live--; };
    }
    function tick() {
      timer = null; if (!cfg.on) return;
      if (!document.hidden && live < cfg.maxN) spawn();
      timer = setTimeout(tick, Math.max(80, rnd(cfg.pause, cfg.spread) * 1000));
    }
    function start() { if (!timer && cfg.on) timer = setTimeout(tick, 400); }
    function stop() { clearTimeout(timer); timer = null; }
    return {
      layer, spawn, start, stop, get cfg() { return cfg; },
      set(c) { cfg = Object.assign({}, DEFAULTS, c); stop(); if (cfg.on) start(); },   // laufende Flecken blenden noch aus
    };
  }
  return { DEFAULTS, attach };
})();
/* RUNEGLOW END */
const runeGlow = RuneGlow.attach(stage, { mask: 'assets/runen-maske.webp', before: document.getElementById('panels') });
runeGlow.start();
