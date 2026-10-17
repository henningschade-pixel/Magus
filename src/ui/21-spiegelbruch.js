/* ---------- Schild-Effekt (aus der Schild-Werkstatt, Variante „Mitte“): Das Schildbild des Spiegels fliegt vergrößert in die Bildschirmmitte. Dort prallen die Geschosse auf, ein Rückwurf fliegt zum Angreifer, ungeblockter Schaden lässt Stufen brechen (Risse; ohne Stufe zerspringt das Schild). Ein überstandenes Schild fliegt zurück. ---------- */
const MirrorFx = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (u, a, b) => clamp((u - a) / (b - a));
  const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a) + ')'; };
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * k); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
  const EL = { F: '#ff7a3d', E: '#93c24f', W: '#52a6f5' };
  // Werte der Schild-Werkstatt (Export des Spielers)
  const P = { size: 240, fly: .55, back: .55, hold: .5, dim: .45, glow: 60, flash: 1.5, shake: .5, cracks: 8, scatter: 1, gravity: 1, tempo: 1, spark: 1 };
  const IMGS = {};
  function img(e) { if (!IMGS[e] && IMG['shield_' + e]) { const i = new Image(); i.src = IMG['shield_' + e]; IMGS[e] = i; } return IMGS[e]; }
  function orb(ctx, x, y, r, col) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, rgba(col, .85)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill(); ctx.restore();
  }
  const toStage = el => { const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth; return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k, h: r.height / k }; };
  // Zeitplan. Zwei Fälle: Ausgleich (abs Geschosse des Angreifers schlagen im Schild ein, das dafür Stufen verliert) oder Rückwurf
  // (die überschüssigen Verteidigungsgeschosse r prallen am Schild ab und fliegen zum Angreifer, das Schild verliert dafür Stufen)
  function plan(fx) {
    const refl = fx.r || 0, N = refl > 0 ? refl : Math.max(1, fx.abs || 1), F = .55 / P.tempo, G = .14 / P.tempo, t0 = .3 + (refl > 0 ? 0 : P.fly), ev = { sparks: [], refl: [], mode: refl > 0 ? 'r' : 'a' };
    for (let i = 0; i < N; i++) ev.sparks.push({ tl: t0 + i * G, ta: t0 + i * G + F, blocked: refl > 0, a: -Math.PI / 2 + (i - (N - 1) / 2) * .09 });
    if (refl > 0) { const last = ev.sparks[N - 1].ta; for (let j = 0; j < refl; j++) ev.refl.push({ tl: last + .1 + j * .11 / P.tempo, ta: last + .1 + j * .11 / P.tempo + .6 / P.tempo }); }
    ev.tBreak = refl > 0 ? ev.refl[0].tl + .05 : ev.sparks[0].ta;   // das Schild verliert Stufen: beim Ausgleich im ersten Einschlag, beim Rückwurf, sobald es zurückwirft
    ev.tEv = Math.max(ev.sparks[N - 1].ta + .6, ev.refl.length ? ev.refl[ev.refl.length - 1].ta + .5 : 0, ev.tBreak + 1.4);
    ev.tOut = ev.tEv + P.hold; ev.n = fx.markers; ev.lost = fx.broken; ev.after = fx.markers - fx.broken; ev.D = N; ev.B = refl;
    ev.tEnd = ev.tOut + P.back + .3;
    return ev;
  }
  function frame(ctx, t, fx, ev, home, hpAtt, from) {
    const col = EL[fx.elem] || EL.F, n = ev.n, gone = ev.after === 0, Z = { x: 640, y: 400 }, im = img(fx.elem);
    ctx.clearRect(0, 0, 1280, 800);
    const rf = ev.mode === 'r', u = eo(seg(t, 0, P.fly)), v = eio(seg(t, ev.tOut, ev.tOut + P.back)), m = rf ? 0 : gone ? u : u * (1 - v), md = rf ? 0 : u * (1 - v);   // Rückwurf: das Schild bleibt an seinem Platz, die überschüssige Verteidigung fliegt aus der Mitte zu ihm
    ctx.fillStyle = 'rgba(0,0,0,' + (P.dim * md) + ')'; ctx.fillRect(0, 0, 1280, 800);
    const hit = ev.sparks.find(s => t >= s.ta && t < s.ta + .15), brk = t > ev.tBreak;
    const amp = ((brk ? P.shake * 9 * Math.exp(-(t - ev.tBreak) * 6) : 0) + (hit ? P.shake * 2 : 0)) * (rf ? .5 : 1);
    const pos = { x: lerp(home.x, Z.x, m) + Math.sin(t * 90) * amp * (rf ? 1 : m), y: lerp(home.y, Z.y, m) + Math.cos(t * 70) * amp * .7 * (rf ? 1 : m) }, h = lerp(home.h, P.size, m) * (rf && hit ? 1.3 : 1), w = h * 132 / 180;
    const rEdge = h * .5 + 8, edge = a => ({ x: pos.x + rEdge * Math.cos(a) * .86, y: pos.y + rEdge * Math.sin(a) });
    const tShat = ev.tBreak + .12 + (n - 1) * .04 + .1, shattered = gone && t > tShat;
    if (im && im.complete) {
      if (shattered) {   // alle Stufen verloren: das Schild zerspringt
        const ts = t - tShat, rr = rng(21), GX = 4, GY = 5, iw = im.width, ih = im.height;
        for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
          const cx = (gx + .5) / GX - .5, cy = (gy + .5) / GY - .5, r1 = rr(), r2 = rr(), al = 1 - Math.pow(clamp(ts / 1.3), 1.4); if (al <= 0) continue;
          ctx.save(); ctx.globalAlpha = al; ctx.translate(pos.x + cx * w + cx * 160 * P.scatter * ts * (.6 + r1), pos.y + cy * h + cy * 120 * P.scatter * ts + 300 * P.gravity * ts * ts); ctx.rotate((r2 - .5) * ts * 5); ctx.shadowColor = col; ctx.shadowBlur = P.glow * .4;
          ctx.drawImage(im, gx * iw / GX, gy * ih / GY, iw / GX, ih / GY, -w / GX / 2, -h / GY / 2, w / GX, h / GY); ctx.restore();
        }
      } else {
        ctx.save(); ctx.translate(pos.x, pos.y); ctx.shadowColor = col; ctx.shadowBlur = P.glow * (.5 + m) * (1 + (hit ? P.flash : 0)); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.shadowBlur = 0;
        if (hit) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, .55 * P.flash); ctx.drawImage(im, -w / 2, -h / 2, w, h); }
        if (brk) {   // Risse nur in der großen Darstellung
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .9 * clamp((t - ev.tBreak) / .12) * (rf ? 1 : seg(m, .55, .95)); const cr = rng(11); ctx.strokeStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.lineWidth = Math.max(1, h / 120); ctx.lineJoin = 'round';
          for (let q = 0; q < P.cracks; q++) { let a = q / P.cracks * Math.PI * 2 + (cr() - .5) * .9, x = (cr() - .5) * w * .12, y = -h * .28 + (cr() - .5) * h * .08; const len = h * (.18 + cr() * .3); ctx.beginPath(); ctx.moveTo(x, y); for (let s2 = 1; s2 <= 6; s2++) { a += (cr() - .5) * .6; x += Math.cos(a) * len / 6; y += Math.sin(a) * len / 6; ctx.lineTo(x, y); } ctx.stroke(); }
        }
        ctx.restore();
      }
    }
    const lit = brk && t > ev.tBreak + .12 ? ev.after : n;   // Stufenanzeige: die gebrochene Stufe erlischt
    for (let i = 0; i < n && !shattered; i++) { const on = i < lit; ctx.save(); ctx.translate(pos.x + (i - (n - 1) / 2) * lerp(18, 34, m), pos.y + h / 2 + lerp(14, 34, m)); ctx.rotate(Math.PI / 4); ctx.strokeStyle = on ? col : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; const sz = lerp(4, 8, m); if (on) { ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fillStyle = rgba(col, .6); ctx.fillRect(-sz, -sz, 2 * sz, 2 * sz); } ctx.strokeRect(-sz, -sz, 2 * sz, 2 * sz); ctx.restore(); }
    ev.sparks.forEach(sp => {   // Geschosse und Aufprall (der durchgehende Schaden selbst läuft in der Kampfanimation)
      const tgt = edge(rf ? Math.atan2(from.y - pos.y, from.x - pos.x) + sp.a + Math.PI / 2 : sp.a);
      if (t >= sp.tl && t < sp.ta) { const b = (t - sp.tl) / (sp.ta - sp.tl); for (let q = 8; q >= 1; q--) { const bb = clamp(b - q * .02); ctx.save(); ctx.globalAlpha = (1 - q / 9) * .5; orb(ctx, lerp(from.x, tgt.x, bb), lerp(from.y, tgt.y, bb), (7 - q * .4) * P.spark, col); ctx.restore(); } orb(ctx, lerp(from.x, tgt.x, b), lerp(from.y, tgt.y, b), 9 * P.spark, col); }
      if (t >= sp.ta && t < sp.ta + .4) { const g = seg(t, sp.ta, sp.ta + .4); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fl = ctx.createRadialGradient(tgt.x, tgt.y, 0, tgt.x, tgt.y, 80 * (1 - g) + 10); fl.addColorStop(0, 'rgba(255,255,255,' + (Math.min(1, .9 * P.flash) * (1 - g)) + ')'); fl.addColorStop(1, rgba(col, 0)); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 90, 0, 7); ctx.fill(); ctx.strokeStyle = rgba(lighten(col, .5), (1 - g) * Math.min(1, P.flash)); ctx.lineWidth = 2.5 * (1 - g) + .5; ctx.beginPath(); ctx.ellipse(tgt.x, tgt.y, 8 + g * 54, 4 + g * 24, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    });
    ev.refl.forEach((sp, j) => {   // Rückwurf zum Angreifer
      const src = { x: pos.x + (j - (ev.refl.length - 1) / 2) * 16, y: pos.y - h * .3 };
      if (t >= sp.tl && t < sp.ta) { const b = eio((t - sp.tl) / (sp.ta - sp.tl)); for (let q = 8; q >= 1; q--) { const bb = clamp(b - q * .03); ctx.save(); ctx.globalAlpha = (1 - q / 9) * .55; orb(ctx, lerp(src.x, hpAtt.x, bb), lerp(src.y, hpAtt.y, bb), (8 - q * .4) * P.spark, col); ctx.restore(); } orb(ctx, lerp(src.x, hpAtt.x, b), lerp(src.y, hpAtt.y, b), 11 * P.spark, col); }
      if (t >= sp.ta && t < sp.ta + .45) { const g = seg(t, sp.ta, sp.ta + .45); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(lighten(col, .5), 1 - g); ctx.lineWidth = 3 * (1 - g) + .5; ctx.beginPath(); ctx.ellipse(hpAtt.x, hpAtt.y, 14 + g * 40, 6 + g * 16, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    });
    if (ev.refl.length) { const tt = ev.refl[ev.refl.length - 1].ta, q = seg(t, tt, tt + .1) * (1 - seg(t, tt + .6, tt + .9)); if (q > 0) { ctx.save(); ctx.font = '700 22px Alegreya, serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba('#ff6b6b', q); ctx.fillText('−' + fx.r, hpAtt.x, hpAtt.y - 20 - 10 * seg(t, tt, tt + .9)); ctx.restore(); } }
  }
  const ev0 = fx => (fx.r || 0) > 0 ? 'r' : 'a';   // Rückwurf: die Geschosse kommen von der Seite des Verteidigers, sonst vom Angreifer
  function play(fx) {
    const quiet = FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (quiet) return;
    const side = fx.who === ME ? 's' : 'o', homeEl = stage.querySelector('.mirstack[data-who="' + side + '"] .msh.' + fx.elem);
    const hp = FlowFx.hp(fx.att), home = homeEl ? toStage(homeEl) : { x: fx.who === ME ? 90 : 1190, y: fx.who === ME ? 690 : 110, h: 52 };
    const ev = plan(fx), from = ev0(fx) === 'r' ? { x: 640, y: 400 } : { x: 640, y: fx.who === ME ? 70 : 730 };   // Rückwurf: der Überschuss liegt in der Mitte
    fxUntil = Math.max(fxUntil, Date.now() + ev.tEnd * 1000);
    stage.dataset.shieldfx = side + fx.elem;   // das eigentliche Schild neben der Hand ausblenden, solange es fliegt
    ev.sparks.forEach((s, i) => Snd.play('shield_hit', s.ta, i === 0 ? .9 : .5));   // Aufprall der Geschosse auf dem Schild
    Snd.play('break', ev.tBreak + .12, .8);   // Splitter, wenn Stufen zerbrechen
    if (fx.r > 0) Snd.play('mirror_reflect', ev.refl[0].tl);
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; cv.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:800px;z-index:288;pointer-events:none'; stage.appendChild(cv);
    const ctx = cv.getContext('2d'), t0 = performance.now();
    const step = ts => {
      const t = (ts - t0) / 1000;
      if (t >= ev.tEnd) { cv.remove(); if (stage.dataset.shieldfx === side + fx.elem) delete stage.dataset.shieldfx; return; }
      frame(ctx, t, fx, ev, home, hp, from); requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // Zeit (ab Start des Effekts), bis der Schaden auf die HP darf: nach Aufprall, Durchschlag und Rückwurf
  const delay = fx => { const ev = plan(fx); return ev.tEv + .1; };
  // Zeit (ab Start des Effekts), zu der der letzte zurückgeworfene Schaden beim Angreifer einschlägt (0, wenn nichts zurückgeworfen wird)
  const landing = fx => { const ev = plan(fx); return ev.refl.length ? ev.refl[ev.refl.length - 1].ta : 0; };
  return { play, delay, landing };
})();
