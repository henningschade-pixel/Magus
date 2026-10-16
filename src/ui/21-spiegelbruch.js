/* ---------- Spiegelbruch-Effekt (aus der Effektwerkstatt, ohne Figuren): Der Angriff in der Farbe des Angreifers prallt am Spiegel ab (Rückwurf), ungeblockter Schaden zerbricht Stufen des Spiegels, mittig auf dem Bildschirm ---------- */
const MirrorFx = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (u, a, b) => clamp((u - a) / (b - a));
  const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (hex, a) => { if (hex[0] === 'r') return hex.replace('rgb(', 'rgba(').replace(')', ',' + clamp(a) + ')'); const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a) + ')'; };
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * k); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
  const EL = { F: '#ff7a3d', E: '#93c24f', W: '#52a6f5' };
  const D = { size: 1, cracks: 8, shards: 12, crackT: .12, scatter: 1, gravity: 1, shine: .6, shake: .5, dur: 3, seed: 7 };   // Werte der Effektwerkstatt
  function orb(ctx, x, y, r, col, core) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, rgba(core || '#ffffff', 1)); g.addColorStop(.25, rgba(col, .85)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill(); ctx.restore();
  }
  function frame(ctx, t, p) {
    const u = clamp(t / p.dur), col = EL[p.elem] || EL.W, rnd = rng(p.seed), BIG = 3000;
    const IMP = .42, SH = IMP + p.crackT, N = clamp(p.markers, 1, 3), nb = clamp(p.broken, 0, N);
    const S = { x: 360, y: 240 }, R = 150 * p.size, rx = R * .78, ry = R, ang0 = Math.PI + .35;
    const I = { x: S.x + rx * Math.cos(ang0) * .92, y: S.y + ry * Math.sin(ang0) * .92 };
    const aT = p.fromTop ? 20 : 20, aY = p.fromTop ? -10 : 490;   // Ausgangspunkt des Angriffs (links oben beim Gegner, links unten bei dir)
    const kI = u > IMP ? Math.exp(-(u - IMP) * p.dur * 7) : 0, kS = u > SH ? Math.exp(-(u - SH) * p.dur * 5) : 0, amp = p.shake * (5 * kI + 11 * kS);
    ctx.save(); ctx.translate(Math.sin(t * 93) * amp, Math.cos(t * 77) * amp * .7);
    const dim = .4 * eo(seg(u, 0, .1)) * (1 - seg(u, .88, 1));
    if (dim > 0) { ctx.fillStyle = 'rgba(0,0,0,' + dim + ')'; ctx.fillRect(-BIG, -BIG, 2 * BIG, 2 * BIG); }
    const cast = seg(u, .04, .12) * (1 - seg(u, .12, .16));
    if (cast > 0) orb(ctx, aT, aY, 6 + cast * 6, col);
    const s = p.shards, verts = [];
    for (let ring = 0; ring <= N; ring++) { const row = []; for (let j = 0; j < s; j++) { const a = (j + (rnd() - .5) * .6) / s * Math.PI * 2, rf = ring === 0 ? 0 : ring / N + (ring < N ? (rnd() - .5) * .35 / N : 0); row.push({ x: S.x + rx * rf * Math.cos(a), y: S.y + ry * rf * Math.sin(a) }); } verts.push(row); }
    const rimFrac = u < SH ? 1 : (N - nb) / N, pulse = .6 + .4 * Math.sin(t * 5), fadeAll = 1 - seg(u, .9, 1) * 0;
    const appear = eo(seg(u, 0, .08));
    for (let l = 0; l < N; l++) for (let j = 0; j < s; j++) {
      const j2 = (j + 1) % s, poly = [verts[l][j], verts[l][j2], verts[l + 1][j2], verts[l + 1][j]];
      const cx = (poly[0].x + poly[1].x + poly[2].x + poly[3].x) / 4, cy = (poly[0].y + poly[1].y + poly[2].y + poly[3].y) / 4, r1 = rnd(), r2 = rnd(), r3 = rnd(), broken = l >= N - nb;
      let ox = 0, oy = 0, rot = 0, sc = .985, al = 1, tt = 0;
      if (broken && u > SH) { const d = Math.hypot(cx - I.x, cy - I.y); tt = Math.max(0, (u - SH - d / (R * 2) * .05)) * p.dur; const dx = (cx - I.x) / (d || 1), dy = (cy - I.y) / (d || 1), v = 140 * p.scatter * (.5 + r1); ox = dx * v * tt + (r2 - .5) * 30 * tt; oy = dy * v * tt * .6 + .5 * 320 * p.gravity * tt * tt - 30 * tt * p.scatter; rot = (r3 - .5) * tt * 7; sc = .985 + tt * .25; al = 1 - Math.pow(clamp(tt / 1.4), 1.6); }
      al *= appear * (u > SH ? 1 : 1);
      if (al <= 0) continue;
      const glint = p.shine * (.5 + .5 * Math.sin(r1 * 20 + rot * 4 + tt * 9 + t * 1.2));
      ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-cx, -cy); ctx.globalAlpha = al;
      ctx.beginPath(); poly.forEach((v, k) => k ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)); ctx.closePath();
      ctx.fillStyle = 'rgba(' + (190 + glint * 60 | 0) + ',' + (215 + glint * 40 | 0) + ',255,' + (.10 + .22 * glint + (l === N - 1 ? .04 : 0)) + ')'; ctx.fill();
      ctx.fillStyle = rgba(col, .10); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,' + (.22 + .4 * glint) + ')'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    if (rimFrac > 0) {
      ctx.save(); ctx.globalAlpha = appear; ctx.shadowColor = col; ctx.shadowBlur = 14;
      for (let l = 1; l <= N * rimFrac + .001; l++) { const f = l / N; ctx.strokeStyle = rgba(lighten(col, .35), (l === Math.round(N * rimFrac) ? .9 : .5) * (l === N && u > SH ? pulse : 1)); ctx.lineWidth = l === Math.round(N * rimFrac) ? 3.2 : 1.6; ctx.beginPath(); ctx.ellipse(S.x, S.y, rx * f, ry * f, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      if (p.shine > 0) { ctx.save(); ctx.beginPath(); ctx.ellipse(S.x, S.y, rx * rimFrac, ry * rimFrac, 0, 0, Math.PI * 2); ctx.clip(); const bx = lerp(S.x - rx * 1.6, S.x + rx * 1.6, ((t * .45) % 1)), g = ctx.createLinearGradient(bx - 60, S.y - ry, bx + 60, S.y + ry); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,' + (.28 * p.shine * appear) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(S.x - rx, S.y - ry, rx * 2, ry * 2); ctx.restore(); }
    }
    const lit = u < SH ? N : N - nb;   // Marker unter dem Schild
    for (let i = 0; i < N; i++) { const px = S.x + (i - (N - 1) / 2) * 26, py = S.y + ry + 26, on = i < lit; ctx.save(); ctx.globalAlpha = appear; ctx.translate(px, py); ctx.rotate(Math.PI / 4); ctx.strokeStyle = on ? col : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; if (on) { ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = rgba(col, .6); ctx.fillRect(-6, -6, 12, 12); } ctx.strokeRect(-6, -6, 12, 12); ctx.restore(); }
    if (nb > 0 && u >= IMP && u < SH + .04) {   // Risse
      const gr = eo(seg(u, IMP, SH)), fade = 1 - seg(u, SH, SH + .04), cr = rng(p.seed + 7);
      ctx.save(); ctx.beginPath(); ctx.ellipse(S.x, S.y, rx, ry, 0, 0, Math.PI * 2); const fi = (N - nb) / N; if (fi > 0) { ctx.moveTo(S.x + rx * fi, S.y); ctx.ellipse(S.x, S.y, rx * fi, ry * fi, 0, 0, Math.PI * 2); } ctx.clip('evenodd');
      ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 8;
      for (let k = 0; k < p.cracks; k++) { const a = k / p.cracks * Math.PI * 2 + (cr() - .5) * .9, len = R * (.55 + cr() * 1.0) * gr; let x = I.x, y = I.y; ctx.beginPath(); ctx.moveTo(x, y); const steps = 7; for (let q = 1; q <= steps; q++) { const aa = a + (cr() - .5) * .55; x += Math.cos(aa) * len / steps; y += Math.sin(aa) * len / steps; ctx.lineTo(x, y); if (q === 3 && cr() > .45) { const ba = aa + (cr() > .5 ? 1 : -1) * (.5 + cr() * .5); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ba) * len * .35, y + Math.sin(ba) * len * .35); ctx.moveTo(x, y); } } ctx.stroke(); }
      ctx.restore();
    }
    const b = seg(u, .12, IMP);   // Geschoss in der Farbe des Angreifers
    if (u >= .12 && u < IMP) {
      for (let i = 14; i >= 1; i--) { const bb = clamp(b - i * .012), px = lerp(aT, I.x, bb), py = lerp(aY, I.y, bb) + Math.sin(bb * Math.PI) * -14; ctx.save(); ctx.globalAlpha = (1 - i / 15) * .5; orb(ctx, px, py, 8 - i * .4, col); ctx.restore(); }
      orb(ctx, lerp(aT, I.x, b), lerp(aY, I.y, b) + Math.sin(b * Math.PI) * -14, 9, col);
    }
    if (u >= IMP) {   // Einschlag
      const g = seg(u, IMP, IMP + .2);
      if (g < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = ctx.createRadialGradient(I.x, I.y, 0, I.x, I.y, 70 * (1 - g) + 10); fl.addColorStop(0, 'rgba(255,255,255,' + (.9 * (1 - g)) + ')'); fl.addColorStop(1, rgba(col, 0)); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(I.x, I.y, 80, 0, 7); ctx.fill(); ctx.strokeStyle = rgba(lighten(col, .5), 1 - g); ctx.lineWidth = 2.5 * (1 - g) + .5; ctx.beginPath(); ctx.ellipse(I.x, I.y, g * 90 * .5, g * 90, 0, 0, 7); ctx.stroke(); const sr = rng(p.seed + 11); for (let k = 0; k < 18; k++) { const a = sr() * Math.PI * 2, v = 40 + sr() * 110; ctx.fillStyle = rgba(lighten(col, .6), 1 - g); ctx.fillRect(I.x + Math.cos(a) * v * g - 1.5, I.y + Math.sin(a) * v * g - 1.5, 3, 3); } ctx.restore(); }
    }
    if (nb > 0 && u >= SH && u < SH + .1) { const f = 1 - seg(u, SH, SH + .1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, R * 1.3); fl.addColorStop(0, 'rgba(255,255,255,' + (.55 * f) + ')'); fl.addColorStop(1, rgba(col, 0)); ctx.fillStyle = fl; ctx.fillRect(S.x - 400, S.y - 400, 800, 800); ctx.restore(); }
    if (p.r > 0 && u > SH + .02) {   // Rückwurf zum Angreifer (auf seine HP-Leiste)
      const tx = p.hpT ? p.hpT.x : aT, ty = p.hpT ? p.hpT.y : aY;
      const r = seg(u, SH + .02, SH + .27);
      if (r < 1) { const e = eio(r); for (let i = 12; i >= 1; i--) { const bb = clamp(e - i * .02); ctx.save(); ctx.globalAlpha = (1 - i / 13) * .55; orb(ctx, lerp(I.x, tx, bb), lerp(I.y, ty, bb) - Math.sin(bb * Math.PI) * 16, 11 - i * .5, col, lighten(col, .7)); ctx.restore(); } orb(ctx, lerp(I.x, tx, e), lerp(I.y, ty, e) - Math.sin(e * Math.PI) * 16, 13, col, '#ffffff'); }
      const h = seg(u, SH + .27, SH + .5);
      if (h > 0 && h < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(lighten(col, .5), 1 - h); ctx.lineWidth = 3 * (1 - h) + .5; ctx.beginPath(); ctx.ellipse(tx, ty, p.hpT ? 14 + h * 40 : h * 70, p.hpT ? 6 + h * 16 : h * 90, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      if (p.hpT && p.r > 0) { const q = seg(u, SH + .27, SH + .33) * (1 - seg(u, SH + .45, SH + .55)); if (q > 0) { ctx.save(); ctx.font = '700 20px Alegreya, serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba('#ff6b6b', q); ctx.fillText('−' + p.r, tx, ty - 14 - 10 * seg(u, SH + .27, SH + .55)); ctx.restore(); } }
    }
    ctx.restore();
  }
  let cv = null, raf = 0;
  function play(fx) {
    const quiet = FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (fx.broken > 0) Snd.play('break', quiet ? 0 : .42 * D.dur, 0.7);   // Bruch-Sound erst, wenn das Projektil den Spiegel trifft (Einschlag bei 42 % der Dauer)
    if (fx.r > 0) Snd.play('mirror_reflect', quiet ? 0 : .56 * D.dur);
    if (quiet) return;
    fxUntil = Math.max(fxUntil, Date.now() + D.dur * 1000);
    const KK = 1.5, hp0 = FlowFx.hp(fx.att);   // reflektierter Schaden fliegt auf die HP-Leiste des Angreifers
    const p = Object.assign({}, D, { elem: fx.elem, markers: fx.markers, broken: fx.broken, fromTop: fx.att !== ME, r: fx.r, hpT: hp0 ? { x: (hp0.x - 640 + 360 * KK) / KK, y: (hp0.y - 400 + 240 * KK) / KK } : null });
    if (!cv) { cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; cv.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:800px;z-index:288;pointer-events:none'; stage.appendChild(cv); }
    cancelAnimationFrame(raf);
    const ctx = cv.getContext('2d'), k = 1.5, t0 = performance.now(), mine = cv;
    const step = ts => {
      const t = (ts - t0) / 1000; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1280, 800);
      if (t >= p.dur) { mine.remove(); if (cv === mine) cv = null; return; }
      ctx.setTransform(k, 0, 0, k, 640 - 360 * k, 400 - 240 * k); frame(ctx, t, p); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  return { play };
})();

