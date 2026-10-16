/* ---------- Todesfluch-Effekt (aus der Effektwerkstatt): Pentagramm in Lila, mittig auf dem Bildschirm, ohne Figur ---------- */
const CurseFx = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (u, a, b) => clamp((u - a) / (b - a));
  const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (hex, a) => { if (hex[0] === 'r') return hex.replace('rgb(', 'rgba(').replace(')', ',' + clamp(a) + ')'); const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a) + ')'; };
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * k); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
  const P = { color: '#a67bff', size: 1.2, tilt: .42, rings: 2, runes: 14, lineW: 2.5, glow: 14, flicker: .4, particles: 50, pillar: .6, dark: .55, finish: 'implode', shake: .5, dur: 4, seed: 3 };   // Werte der Effektwerkstatt (lila)
  function glowLine(ctx, col, w, glow, alpha, draw) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = glow; ctx.strokeStyle = rgba(col, alpha * .8); ctx.lineWidth = w * 1.8; ctx.beginPath(); draw(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = rgba(lighten(col, .55), alpha); ctx.lineWidth = w * .8; ctx.beginPath(); draw(); ctx.stroke(); ctx.restore();
  }
  function frame(ctx, t) {
    const p = P, u = clamp(t / p.dur), col = p.color, C = { x: 360, y: 320 }, R = 170 * p.size, tilt = p.tilt, BIG = 3000;
    const g = seg(u, .82, .93), charge = seg(u, .62, .68);
    const amp = p.shake * (u > .9 ? 12 * Math.exp(-(u - .9) * p.dur * 5) : 2.5 * charge * (1 - seg(u, .82, .84)));
    ctx.save(); ctx.translate(Math.sin(t * 97) * amp, Math.cos(t * 83) * amp * .7);
    const dk = p.dark * eo(seg(u, 0, .12)) * (1 - seg(u, .95, 1));   // Abdunklung
    if (dk > 0) { const v = ctx.createRadialGradient(C.x, C.y - 40, 40, C.x, C.y - 40, 720 * .62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + dk + ')'); ctx.fillStyle = v; ctx.fillRect(-BIG, -BIG, 2 * BIG, 2 * BIG); }
    const sc = 1 - .92 * eio(g), ga = 1 - seg(u, .9, .94);
    const flick = 1 - p.flicker * .5 * (.5 + .5 * Math.sin(t * 41 + Math.sin(t * 13) * 3)) * (.4 + .6 * charge);
    const pulse = 1 + .3 * Math.sin((u - .62) * p.dur * 14) * charge * (1 - seg(u, .82, .84));
    const ignite = seg(u, .6, .64) * (1 - seg(u, .64, .72)), inten = ga * flick * pulse, w = p.lineW, gl = p.glow * (1 + ignite * 1.5);
    ctx.save(); ctx.translate(C.x, C.y); ctx.scale(sc, sc * tilt);
    if (ga > 0) {
      const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.2); fg.addColorStop(0, rgba(col, .32 * charge * inten)); fg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, 7); ctx.fill();
      const top = -Math.PI / 2;
      [1, .9, .8].slice(0, p.rings).forEach((rf, i) => { const pr = eio(seg(u, .04 + i * .06, .22 + i * .05)); if (pr > 0) glowLine(ctx, col, w * (i ? .75 : 1), gl, inten, () => ctx.arc(0, 0, R * rf, top, top + Math.PI * 2 * pr)); });
      const pr2 = eio(seg(u, .07, .25)); if (pr2 > 0) glowLine(ctx, col, w * .5, gl * .6, inten * .8, () => ctx.arc(0, 0, R * 1.2, top, top + Math.PI * 2 * pr2));
      const n = p.runes, rr = rng(p.seed + 1), des = []; for (let i = 0; i < n; i++) des.push({ a: rr(), b: rr(), c: rr(), d: rr(), e: rr() > .5 });
      const hh = R * .085;
      for (let i = 0; i < n; i++) {
        const a = top + i / n * Math.PI * 2, al = seg(u, .22 + i / n * .14, .27 + i / n * .14); if (al <= 0) continue;
        const d = des[i]; ctx.save(); ctx.rotate(a + Math.PI / 2); ctx.translate(0, -R * 1.1);
        glowLine(ctx, col, w * .7, gl * .5, inten * al, () => {
          ctx.moveTo(0, -hh); ctx.lineTo(0, hh);
          const y1 = -hh * (.2 + d.a * .7), y2 = hh * (.1 + d.b * .7), wd = hh * (.5 + d.c * .4);
          ctx.moveTo(0, y1); ctx.lineTo(wd, y1 + hh * .5 * (d.e ? 1 : -1)); ctx.moveTo(0, y2); ctx.lineTo(-wd, y2 + hh * .5 * (d.e ? -1 : 1));
          if (d.d > .5) { ctx.moveTo(-wd * .8, -hh); ctx.lineTo(wd * .8, -hh); }
        });
        ctx.restore();
      }
      const sr = R * [1, .9, .8][p.rings - 1], pts = []; for (let q = 0; q < 5; q++) { const a = top + q / 5 * Math.PI * 2; pts.push([Math.cos(a) * sr, Math.sin(a) * sr]); }
      const order = [0, 2, 4, 1, 3, 0];
      if (ignite > 0 || charge > 0) { ctx.beginPath(); order.slice(0, 5).forEach((o, q) => q ? ctx.lineTo(pts[o][0], pts[o][1]) : ctx.moveTo(pts[o][0], pts[o][1])); ctx.closePath(); ctx.fillStyle = rgba(col, (.10 * charge + .25 * ignite) * inten); ctx.fill(); }
      for (let q = 0; q < 5; q++) { const pr = eo(seg(u, .30 + q * .06, .30 + q * .06 + .08)); if (pr <= 0) continue; const a = pts[order[q]], b = pts[order[q + 1]]; glowLine(ctx, col, w * 1.15, gl, inten, () => { ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], pr), lerp(a[1], b[1], pr)); }); }
    }
    ctx.restore();
    const pil = p.pillar * seg(u, .55, .68) * (1 - seg(u, .94, 1)) * ga;   // Lichtsäule
    if (pil > 0) { const pw = (46 + g * 80) * p.size * (1 + (pulse - 1) * .6); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gy = ctx.createLinearGradient(0, C.y, 0, C.y - 400); gy.addColorStop(0, rgba(col, .5 * pil * flick)); gy.addColorStop(1, rgba(col, 0)); [1, .62, .3].forEach((f, i) => { ctx.fillStyle = gy; ctx.globalAlpha = i ? .7 : .35; ctx.fillRect(C.x - pw * f / 2, C.y - 400, pw * f, 400); }); ctx.restore(); }
    const nP = Math.round(p.particles), pa = seg(u, .5, .68) * (1 - seg(u, .9, 1));   // Funken
    if (nP > 0 && pa > 0) {
      const pr = rng(p.seed + 3); ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < nP; i++) { const r1 = pr(), r2 = pr(), r3 = pr(), ph = (r1 + t * (.18 + .4 * r2) / (p.dur / 3)) % 1, an = r1 * Math.PI * 2, rad = R * Math.sqrt(r2) * .95, x = C.x + Math.cos(an) * rad * sc, y0 = C.y + Math.sin(an) * rad * tilt * sc, y = y0 - ph * 480 * .5 * (.5 + r3); ctx.fillStyle = rgba(lighten(col, .4), Math.sin(Math.PI * ph) * pa * .9); ctx.beginPath(); ctx.arc(x + Math.sin(ph * 9 + r3 * 6) * 6, y, 1 + r3 * 2, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    const sw = seg(u, .93, 1);   // Schockring und Blitz
    if (sw > 0 && sw < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const rr2 = R * (.15 + 1.1 * eo(sw)); ctx.strokeStyle = rgba(lighten(col, .5), (1 - sw) * .9); ctx.lineWidth = 5 * (1 - sw) + 1; ctx.beginPath(); ctx.ellipse(C.x, C.y, rr2, rr2 * tilt, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    const fl = ignite * .18 + .85 * seg(u, .9, .93) * (1 - seg(u, .93, .99));
    if (fl > 0) { ctx.fillStyle = rgba(lighten(col, .75), fl * .6); ctx.fillRect(-BIG, -BIG, 2 * BIG, 2 * BIG); }
    ctx.restore();
  }
  let cv = null, raf = 0;
  function play() {
    if (FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    if (!cv) { cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; cv.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:800px;z-index:290;pointer-events:none'; stage.appendChild(cv); }
    cancelAnimationFrame(raf);
    fxUntil = Math.max(fxUntil, Date.now() + P.dur * 1000);
    const ctx = cv.getContext('2d'), k = 1.45, t0 = performance.now();
    const step = ts => {
      const t = (ts - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1280, 800);
      if (t >= P.dur) { cv.remove(); cv = null; return; }
      ctx.setTransform(k, 0, 0, k, 640 - 360 * k, 400 - 320 * k);   // Pentagramm-Mitte = Bildschirmmitte
      frame(ctx, t); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  return { play };
})();

