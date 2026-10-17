/* ---------- Lifeflow- und Lähmungs-Effekt (aus der Effektwerkstatt, auf die echte Oberfläche übertragen) ---------- */
const FlowFx = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (u, a, b) => clamp((u - a) / (b - a));
  const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (hex, a) => { if (hex[0] === 'r') return hex.replace('rgb(', 'rgba(').replace(')', ',' + clamp(a) + ')'); const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a) + ')'; };
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * k); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
  const G = '#93c24f', B = '#52a6f5', F = '#ff7a3d';
  function orb(ctx, x, y, r, col, core) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, rgba(core || '#ffffff', 1)); g.addColorStop(.25, rgba(col, .85)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, 7); ctx.fill(); ctx.restore(); }
  // Mittelpunkt eines Oberflächenelements in Bühnenkoordinaten
  function at(el) { if (!el) return null; const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth; return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k }; }
  const panelOf = pid => pid === ME ? stage.querySelector('.sbody[data-lead]') : stage.querySelector('.sbody:not([data-lead])');
  const hpOf = pid => at(panelOf(pid) && panelOf(pid).querySelector('[data-pv="hp"]')) || { x: pid === ME ? 1000 : 1000, y: pid === ME ? 700 : 70 };
  const markOf = pid => at(panelOf(pid) && (panelOf(pid).querySelector('.mk') || panelOf(pid).querySelector('.statrow'))) || { x: 1090, y: pid === ME ? 740 : 120 };
  const drawOf = pid => { const L = pid === ME ? L_MY : L_OP; return pid === ME ? (at(stage.querySelector('.freedraw:not(.opp)')) || { x: L.draw.x + CW * L.ps / 2, y: L.draw.y - 20 }) : { x: L.draw.x + CW * L.ps / 2, y: L.draw.y + CH * L.ps / 2 }; };
  const pileOf = pid => { const L = pid === ME ? L_MY : L_OP; return { x: L.disc.x + CW * L.ps / 2, y: L.disc.y + CH * L.ps / 2 }; };
  const handOf = pid => { const L = pid === ME ? L_MY : L_OP; return { x: L.cx, y: L.y + CH * L.s / 2 }; };
  function run(dur, fn) {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; cv.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:800px;z-index:289;pointer-events:none'; stage.appendChild(cv);
    const ctx = cv.getContext('2d'), t0 = performance.now();
    fxUntil = Math.max(fxUntil, Date.now() + dur * 1000);
    const step = ts => { const t = (ts - t0) / 1000; ctx.clearRect(0, 0, 1280, 800); if (t >= dur) { cv.remove(); return; } fn(ctx, t, t / dur); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const off = () => FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Lifeflow: die aufgelösten Marker wandeln sich in Funken, die zum Leben des Wirkenden und zum neuen Nachziehmarker fliegen */
  function lifeflow(fx) {
    if (off()) return;
    const n = Math.max(1, fx.removed || 1), seed = 5, hp = hpOf(fx.who), dr = fx.draws > 0 ? drawOf(fx.who) : null;
    const srcs = [], kinds = [];
    Object.keys(fx.got || {}).forEach(k => { for (let i = 0; i < fx.got[k]; i++) { srcs.push(markOf(k[0] === 's' ? fx.who : fx.to)); kinds.push(k); } });
    while (srcs.length < n) { srcs.push(markOf(fx.who)); kinds.push('sd'); }
    const dur = 2.6, d0 = .10, motes = 14;
    run(dur, (ctx, t, u) => {
      srcs.forEach((m, i) => {
        const d = d0 + i * .06, col = i % 2 ? B : G, mx = m.x + (i - (srcs.length - 1) / 2) * 16, my = m.y;
        const bs = (fx.removed || 0) > 0 ? seg(u, d - .02, d + .1) : 0;   // Marker-Auflösung nur, wenn wirklich Marker entfernt wurden
        if (bs > 0 && bs < 1) { ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.PI / 4); ctx.scale(1 + bs * .8, 1 + bs * .8); ctx.globalAlpha = 1 - bs; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillStyle = rgba(col, .55); ctx.fillRect(-9, -9, 18, 18); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(-9, -9, 18, 18); ctx.restore(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(lighten(col, .4), 1 - bs); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(mx, my, 10 + bs * 34, 0, 7); ctx.stroke(); ctx.restore(); }
        const r = rng(seed + i * 31 + 1);
        for (let k = 0; k < motes; k++) {
          const dl = r() * .08, ph = r() * 6.28, lat = (r() - .5) * 60, c2 = k % 2 ? B : G, noHeal = !(fx.heal > 0), toDraw = dr && (noHeal || k % 2 === 1), tg = toDraw ? dr : noHeal ? { x: m.x, y: m.y - 90 } : hp;
          const hs = handOf(fx.who), cardsPt = { x: hs.x + (r() - .5) * 360, y: hs.y }, sx0 = toDraw || noHeal ? mx : cardsPt.x, sy0 = toDraw || noHeal ? my : cardsPt.y;   // Heilung geht von den Karten aus, der Nachziehmarker kommt von den aufgelösten Markern
          const s = seg(u, d + .03 + dl, d + .03 + dl + .26); if (s <= 0 || s >= 1) continue;
          const pos = q => { const e = eio(q), cx = (sx0 + tg.x) / 2 + lat, cy = (sy0 + tg.y) / 2 - 60; const x = (1 - e) * (1 - e) * sx0 + 2 * (1 - e) * e * cx + e * e * tg.x, y = (1 - e) * (1 - e) * sy0 + 2 * (1 - e) * e * cy + e * e * tg.y, a = 10 * Math.sin(q * Math.PI); return [x + Math.cos(q * Math.PI * 4 + ph) * a, y + Math.sin(q * Math.PI * 4 + ph) * a]; };
          for (let j = 4; j >= 1; j--) { const q = clamp(s - j * .02); if (q <= 0) continue; const pp = pos(q); ctx.save(); ctx.globalAlpha = (1 - j / 5) * .5; orb(ctx, pp[0], pp[1], 2, c2); ctx.restore(); }
          const pp = pos(s); orb(ctx, pp[0], pp[1], 2.8, c2, '#ffffff');
        }
      });
      const tEnd = d0 + (srcs.length - 1) * .06 + .03 + .08 + .26;   // alle Funken angekommen
      const hu = seg(u, tEnd - .2, tEnd + .25);
      if (hu > 0 && hu < 1 && fx.heal > 0) {   // Heilung am Lebensbalken
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        [[G, 0], [B, .15]].forEach(([c, dl]) => { const q = clamp((hu - dl) / (1 - dl)); if (q <= 0) return; ctx.strokeStyle = rgba(c, (1 - q) * .9); ctx.lineWidth = 4 * (1 - q) + 1; ctx.shadowColor = c; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(hp.x, hp.y, 14 + q * 60, 8 + q * 22, 0, 0, 7); ctx.stroke(); });
        ctx.restore();
      }
      const tu = seg(u, tEnd - .15, tEnd) * (1 - seg(u, tEnd + .2, tEnd + .4));
      if (tu > 0 && fx.heal > 0) { ctx.save(); ctx.font = '700 24px Alegreya, serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba(lighten(G, .5), tu); ctx.shadowColor = G; ctx.shadowBlur = 10; ctx.fillText('+' + fx.heal + ' HP', hp.x, hp.y - 16 - 18 * seg(u, tEnd - .15, tEnd + .4)); ctx.restore(); }
      if (dr) {   // neuer Nachziehmarker leuchtet auf
        const du = seg(u, tEnd - .2, tEnd + .05) * (1 - seg(u, tEnd + .1, tEnd + .4));
        if (du > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(B, du * .9); ctx.lineWidth = 3; ctx.shadowColor = B; ctx.shadowBlur = 14; ctx.beginPath(); ctx.ellipse(dr.x, dr.y, 46 + (1 - du) * 20, 20 + (1 - du) * 10, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      }
    });
  }
  /* Lähmung: Feuer- und Erdfunken fliegen von der Hand des Angreifers auf den Ablagestapel des Gegners (ohne eigene Karte) */
  function aggro(fx) {
    if (off()) return;
    const n = Math.max(1, fx.n || 1), H = handOf(fx.who), P = pileOf(fx.to), gap = .22, flight = .75, start = .3, arc = 110, dur = start + (n - 1) * gap + flight + .9;
    const shake = fx.to === ME ? 0 : 0;
    run(dur, (ctx, t, u) => {
      const tt = t, ca = seg(tt, .0, .28) * (1 - seg(tt, start + (n - 1) * gap, start + (n - 1) * gap + .12));
      if (ca > 0) { const r = 5 + ca * 9, rot = tt * 8; orb(ctx, H.x + Math.cos(rot) * 14, H.y + Math.sin(rot) * 14, r, F); orb(ctx, H.x - Math.cos(rot) * 14, H.y - Math.sin(rot) * 14, r, G); }
      for (let i = 0; i < n; i++) {
        const s0 = start + i * gap, s = seg(tt, s0, s0 + flight), land = s0 + flight;
        if (s > 0 && s < 1) {
          const pos = q => { const e = eio(q); return [lerp(H.x, P.x, e), lerp(H.y, P.y, e) - Math.sin(q * Math.PI) * arc]; };
          for (let j = 12; j >= 1; j--) { const q = clamp(s - j * .03); if (q <= 0) continue; const pp = pos(q); ctx.save(); ctx.globalAlpha = (1 - j / 13) * .75; orb(ctx, pp[0], pp[1], 1.5 + 4 * (1 - j / 13), j % 2 ? F : G); ctx.restore(); }
          const pp = pos(s); orb(ctx, pp[0], pp[1], 8, i % 2 ? G : F, '#ffffff');
        }
        const g = seg(tt, land, land + .55);
        if (g > 0 && g < 1) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(i % 2 ? G : F, (1 - g) * .9); ctx.lineWidth = 3 * (1 - g) + .5; ctx.beginPath(); ctx.ellipse(P.x, P.y + 20, g * 80, g * 26, 0, 0, 7); ctx.stroke();
          const sr = rng(13 + i * 13); for (let q = 0; q < 14; q++) { const a = sr() * Math.PI * 2, v = 30 + sr() * 90; ctx.fillStyle = rgba(q % 2 ? G : F, 1 - g); ctx.fillRect(P.x + Math.cos(a) * v * g - 1.5, P.y + Math.sin(a) * v * g * .7 - g * 20 - 1.5, 3, 3); }
          ctx.restore();
        }
      }
    });
  }

  /* Entzug: ein Mana-Blitz fährt von der Hand des Angreifers in den Manawert des Gegners, die Manakugeln lösen sich heraus und verglühen */
  function drain(fx) {
    if (off()) return;
    const n = Math.max(1, fx.n || 1), H = handOf(fx.who), Mp = at(panelOf(fx.to) && panelOf(fx.to).querySelector('[data-pv="mana"]')) || { x: 1000, y: fx.to === ME ? 730 : 100 }, flight = .55, dur = flight + .25 + .9 + n * .08;
    run(dur, (ctx, t, u) => {
      const ca = seg(t, 0, .2) * (1 - seg(t, flight - .1, flight));
      if (ca > 0) { const rot = t * 9; orb(ctx, H.x + Math.cos(rot) * 12, H.y + Math.sin(rot) * 12, 4 + ca * 8, B); orb(ctx, H.x - Math.cos(rot) * 12, H.y - Math.sin(rot) * 12, 4 + ca * 8, '#6d7dff'); }
      const s = seg(t, .12, .12 + flight);
      if (s > 0 && s < 1) {
        const pos = q => { const e = eio(q); return [lerp(H.x, Mp.x, e), lerp(H.y, Mp.y, e) - Math.sin(q * Math.PI) * 90]; };
        for (let j = 14; j >= 1; j--) { const q = clamp(s - j * .025); if (q <= 0) continue; const pp = pos(q); ctx.save(); ctx.globalAlpha = (1 - j / 15) * .7; orb(ctx, pp[0], pp[1], 1.5 + 4 * (1 - j / 15), j % 2 ? B : '#9ab8ff'); ctx.restore(); }
        const pp = pos(s); orb(ctx, pp[0], pp[1], 8, B, '#ffffff');
      }
      const t0 = .12 + flight;
      const g = seg(t, t0, t0 + .35);
      if (g > 0 && g < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(lighten(B, .4), (1 - g) * .9); ctx.lineWidth = 3 * (1 - g) + .5; ctx.shadowColor = B; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(Mp.x, Mp.y, 10 + g * 50, 6 + g * 20, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      for (let i = 0; i < n; i++) {   // herausgelöste Manakugeln steigen auf und verglühen
        const a0 = t0 + .05 + i * .08, q = seg(t, a0, a0 + .9); if (q <= 0 || q >= 1) continue;
        const ang = (i - (n - 1) / 2) * .7 - Math.PI / 2, d = 18 + eo(q) * 46, x = Mp.x + Math.cos(ang) * d + Math.sin(q * 9 + i) * 5, y = Mp.y + Math.sin(ang) * d - q * 22;
        ctx.save(); ctx.globalAlpha = 1 - q * q; orb(ctx, x, y, 4.5 * (1 - q * .6), B, '#ffffff'); ctx.restore();
      }
      const tu = seg(t, t0 + .1, t0 + .3) * (1 - seg(t, t0 + .7, t0 + 1));
      if (tu > 0) { ctx.save(); ctx.font = '700 22px Alegreya, serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba(lighten(B, .45), tu); ctx.shadowColor = B; ctx.shadowBlur = 10; ctx.fillText('−' + n + ' Mana', Mp.x + 110, Mp.y + 6 - 12 * seg(t, t0 + .1, t0 + 1)); ctx.restore(); }
    });
  }
  /* Zerrüttung: Ein Feuer-Wasser-Blitz fährt in die Hand des Gegners, aus der Hand lösen sich Funken (die Karten, die er abwerfen muss) */
  function ruin(fx) {
    if (off()) return;
    const n = Math.max(1, fx.n || 1), H = handOf(fx.who), T = handOf(fx.to), flight = .55, dur = .12 + flight + 1.1;
    run(dur, (ctx, t, u) => {
      const ca = seg(t, 0, .2) * (1 - seg(t, flight - .1, flight));
      if (ca > 0) { const rot = t * 9; orb(ctx, H.x + Math.cos(rot) * 12, H.y + Math.sin(rot) * 12, 4 + ca * 8, F); orb(ctx, H.x - Math.cos(rot) * 12, H.y - Math.sin(rot) * 12, 4 + ca * 8, B); }
      const s = seg(t, .12, .12 + flight);
      if (s > 0 && s < 1) {
        const pos = q => { const e = eio(q); return [lerp(H.x, T.x, e), lerp(H.y, T.y, e) - Math.sin(q * Math.PI) * 80]; };
        for (let j = 14; j >= 1; j--) { const q = clamp(s - j * .025); if (q <= 0) continue; const pp = pos(q); ctx.save(); ctx.globalAlpha = (1 - j / 15) * .75; orb(ctx, pp[0], pp[1], 1.5 + 4 * (1 - j / 15), j % 2 ? F : B); ctx.restore(); }
        const pp = pos(s); orb(ctx, pp[0], pp[1], 8, F, '#ffb347');
      }
      const t0 = .12 + flight, g = seg(t, t0, t0 + .4);
      if (g > 0 && g < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ffb347', (1 - g) * .9); ctx.lineWidth = 3 * (1 - g) + .5; ctx.shadowColor = F; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(T.x, T.y, 20 + g * 130, 8 + g * 34, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      for (let i = 0; i < n * 5; i++) {   // Funken steigen aus der Hand auf
        const r = rng(91 + i * 7), a0 = t0 + .05 + r() * .25, q = seg(t, a0, a0 + .9); if (q <= 0 || q >= 1) continue;
        const x = T.x + (r() - .5) * 300 + Math.sin(q * 8 + i) * 6, y = T.y - 20 - q * 70 * (.6 + r());
        ctx.save(); ctx.globalAlpha = 1 - q * q; orb(ctx, x, y, 3.2 * (1 - q * .6), q < .5 ? '#ffd27a' : '#ff7a3d'); ctx.restore();
      }
      const tu = seg(t, t0 + .1, t0 + .3) * (1 - seg(t, t0 + .75, t0 + 1.05));
      if (tu > 0) { ctx.save(); ctx.font = '700 22px Alegreya, serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba('#ffb347', tu); ctx.shadowColor = F; ctx.shadowBlur = 10; ctx.fillText('−' + n + (n === 1 ? ' Karte' : ' Karten'), T.x, T.y - 70 - 12 * seg(t, t0 + .1, t0 + 1)); ctx.restore(); }
    });
  }
  const attack = fx => KampfFx.attack(fx), defense = fx => KampfFx.defense(fx), resetEx = () => KampfFx.reset();
  return { lifeflow, aggro, drain, ruin, attack, defense, resetEx, wait: () => KampfFx.remaining(), busy: () => KampfFx.busy(), hp: pid => hpOf(pid) };
})();

