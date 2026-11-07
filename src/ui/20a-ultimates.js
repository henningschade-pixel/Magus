/* ---------- Ultimate-Rituale für Heilfluss (Erde) und Manafluss (Wasser, seit 0.8; bis 0.7.7 Multispiegel), aus der Ultimate-Werkstatt (seit 0.7.2.2): mittig auf dem Bildschirm, wie das Pentagramm des Todesfluss (20-todesfluch.js). Die Marker und ihre Wirkung zeigt das Spiel selbst. ---------- */
const UltFx = (() => {
  const BIG = 3000, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, seg = (u, a, b) => clamp((u - a) / (b - a));
  const eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = (hex, a) => { if (hex[0] === 'r') return hex.replace('rgb(', 'rgba(').replace(')', ',' + clamp(a) + ')'); const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a) + ')'; };
  const lighten = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * k); return 'rgb(' + f(n >> 16 & 255) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
  const mix = (a, b, k) => { const n = parseInt(a.slice(1), 16), m = parseInt(b.slice(1), 16), f = (x, y) => Math.round(x + (y - x) * k); return '#' + ((1 << 24) + (f(n >> 16 & 255, m >> 16 & 255) << 16) + (f(n >> 8 & 255, m >> 8 & 255) << 8) + f(n & 255, m & 255)).toString(16).slice(1); };
  const EL = { F: '#ff7a3d', E: '#93c24f', W: '#52a6f5' }, C = { x: 360, y: 268 };
  // Werte der Ultimate-Werkstatt (Standard)
  const P = { dur: 4, size: 1.2, dark: .55, flash: 1, shake: .5, particles: 50, seed: 3,
    hColor: '#93c24f', hRings: 2, hVines: 6, hVineH: 1, hPlus: 1, hLight: .7, hPulse: 3, hGlow: 14,
    mColor: '#52a6f5', mRings: 2, mStar: 8, mCrystal: 1, mPulse: 3, mGlow: 14 };
  function glowLine(ctx,col,w,glow,alpha,draw){
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    ctx.shadowColor=col;ctx.shadowBlur=glow;ctx.strokeStyle=rgba(col,alpha*.8);ctx.lineWidth=w*1.8;ctx.beginPath();draw();ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle=rgba(lighten(col,.55),alpha);ctx.lineWidth=w*.8;ctx.beginPath();draw();ctx.stroke();ctx.restore();
  }
  function puff(ctx,x,y,r,col,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
  function vignette(ctx,a,cx,cy){if(a<=0)return;const v=ctx.createRadialGradient(cx,cy-40,40,cx,cy-40,450);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,'+a+')');ctx.fillStyle=v;ctx.fillRect(-BIG,-BIG,2*BIG,2*BIG)}
  function rrect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  function star4(ctx,x,y,r,col,a){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=rgba(col,a);ctx.beginPath();for(let i=0;i<8;i++){const an=i*Math.PI/4-Math.PI/2,rr=i%2?r*.28:r;ctx.lineTo(x+Math.cos(an)*rr,y+Math.sin(an)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
  
  /* ---------- Heilfluss (Erde): grüner Kreis mit Pluszeichen, Ranken, aufsteigendes Licht ---------- */
  function fxHeal(ctx,p,t,D,u){
    const col=p.hColor,S=p.size,R=150*S,tilt=.42,Cc={x:C.x,y:C.y+30},gl=p.hGlow,top=-Math.PI/2;
    const fin=1-seg(u,.93,1),flick=1-.25*(.5+.5*Math.sin(t*23+Math.sin(t*7)*2)),inten=fin*flick;
    vignette(ctx,p.dark*.7*eo(seg(u,0,.12))*(1-seg(u,.95,1)),Cc.x,Cc.y);
    ctx.save();ctx.translate(Cc.x,Cc.y);ctx.scale(1,tilt);   // Boden
    const fg=ctx.createRadialGradient(0,0,0,0,0,R*1.2);fg.addColorStop(0,rgba(col,.34*seg(u,.1,.5)*inten));fg.addColorStop(1,rgba(col,0));ctx.fillStyle=fg;ctx.beginPath();ctx.arc(0,0,R*1.25,0,7);ctx.fill();
    for(let i=0;i<Math.round(p.hRings);i++){const rf=[1,.8,.6][i],pr=eio(seg(u,.03+i*.07,.2+i*.06));if(pr>0)glowLine(ctx,col,2.4*(i?.75:1),gl,inten,()=>ctx.arc(0,0,R*rf,top,top+Math.PI*2*pr))}
    const n=10;
    for(let i=0;i<n;i++){const a=top+i/n*Math.PI*2,al=seg(u,.16+i/n*.12,.22+i/n*.12);if(al<=0)continue;const x=Math.cos(a)*R*1.12,y=Math.sin(a)*R*1.12,h=R*.07;glowLine(ctx,col,1.8,gl*.5,inten*al,()=>{ctx.moveTo(x-h,y);ctx.lineTo(x+h,y);ctx.moveTo(x,y-h);ctx.lineTo(x,y+h)})}
    ctx.restore();
    const nV=Math.round(p.hVines),rr=rng(p.seed+11);   // Ranken wachsen aus dem Ring
    for(let i=0;i<nV;i++){
      const hr=rr(),pr1=rr(),pr2=rr();   // Zufallswerte immer in gleicher Reihenfolge ziehen
      const a=i/nV*Math.PI*2+.3,gv=eo(seg(u,.16+i*.02,.5+i*.015))*(1-seg(u,.9,.96));if(gv<=0)continue;
      const bx=Cc.x+Math.cos(a)*R*.95,by=Cc.y+Math.sin(a)*R*.95*tilt,Hh=(70+hr*60)*p.hVineH*S/1.2,ph=pr1*6,sw=10+pr2*10,dir=Math.cos(a)>0?1:-1;
      const pt=s=>({x:bx+Math.sin(s*4+ph)*sw*s*dir+dir*s*12,y:by-s*Hh});
      glowLine(ctx,col,1.7,gl*.5,inten*.9,()=>{for(let k=0;k<=24;k++){const s=gv*k/24,q=pt(s);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}});
      for(let k=1;k<=4;k++){const s=gv*k/4.3;if(s<.12)continue;const q=pt(s);ctx.save();ctx.translate(q.x,q.y);ctx.rotate((k%2?-1:1)*.9-Math.PI/2);ctx.fillStyle=rgba(lighten(col,.25),.85*inten);ctx.shadowColor=col;ctx.shadowBlur=gl*.5;ctx.beginPath();ctx.ellipse(8,0,9,3.6,0,0,7);ctx.fill();ctx.restore()}
    }
    const lc=seg(u,.5,.8)*(1-seg(u,.93,1))*p.hLight;   // Lichtsäule
    if(lc>0){const pw=100*S*(1+.1*Math.sin(t*9));ctx.save();ctx.globalCompositeOperation='lighter';const gy=ctx.createLinearGradient(0,Cc.y,0,Cc.y-380);gy.addColorStop(0,rgba(lighten(col,.3),.5*lc*flick));gy.addColorStop(1,rgba(col,0));[1,.6,.3].forEach((f,i)=>{ctx.fillStyle=gy;ctx.globalAlpha=i?.7:.32;ctx.fillRect(Cc.x-pw*f/2,Cc.y-380,pw*f,380)});ctx.restore()}
    const pl=seg(u,.42,.62),py=C.y-75;   // Pluszeichen
    if(pl>0){
      const fade=1-seg(u,.9,.97),sc=(.4+.6*eo(pl))*(1+.06*Math.sin(t*6)*seg(u,.62,.9)),arm=40*S*p.hPlus*sc,wd=arm*.42;
      if(fade>0){ctx.save();ctx.translate(C.x,py);ctx.shadowColor=col;ctx.shadowBlur=gl*1.6;ctx.fillStyle=rgba(lighten(col,.6),.95*pl*fade*flick);ctx.beginPath();rrect(ctx,-arm,-wd/2,2*arm,wd,wd/2);rrect(ctx,-wd/2,-arm,wd,2*arm,wd/2);ctx.fill();
        ctx.shadowBlur=0;ctx.strokeStyle=rgba(lighten(col,.4),.55*pl*fade);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,arm*1.5,0,7);ctx.stroke();ctx.restore()}
    }
    for(let k=0;k<Math.round(p.hPulse);k++){const q=seg(u,.6+k*.06,.82+k*.06);if(q>0&&q<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba(lighten(col,.4),(1-q)*.8*fin);ctx.lineWidth=4*(1-q)+1;const r2=R*(.2+1.1*eo(q));ctx.beginPath();ctx.ellipse(Cc.x,Cc.y,r2,r2*tilt,0,0,7);ctx.stroke();ctx.restore()}}
    const nP=Math.round(p.particles),pa=seg(u,.18,.45)*(1-seg(u,.9,1));   // aufsteigende Lichtpunkte
    if(nP>0&&pa>0){
      const pr=rng(p.seed+13);ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<nP;i++){const r1=pr(),r2=pr(),r3=pr(),ph=(r1+t*(.12+.25*r2)/(D/4))%1,an=r1*Math.PI*2,rad=R*Math.sqrt(r2)*.9,x=Cc.x+Math.cos(an)*rad+Math.sin(ph*7+r3*6)*8,y=Cc.y+Math.sin(an)*rad*tilt-ph*230*(.5+.6*r3);ctx.fillStyle=rgba(i%4?lighten(col,.45):'#ffe9a8',Math.sin(Math.PI*ph)*pa*.9);ctx.beginPath();ctx.arc(x,y,1.2+r3*2.2,0,7);ctx.fill()}
      ctx.restore();
    }
    const fl=p.flash*seg(u,.88,.92)*(1-seg(u,.92,.99));
    if(fl>0){ctx.fillStyle=rgba(lighten(col,.8),fl*.42);ctx.fillRect(-BIG,-BIG,2*BIG,2*BIG)}
  }
  
  /* ---------- Manafluss (Wasser, seit 0.8): blauer Ring mit Achtstern am Boden, Manafunken ziehen spiralförmig zur Mitte und verdichten sich zu einem schwebenden Kristall; Pulse, dann stieben die Funken auseinander ---------- */
  function fxMana(ctx,p,t,D,u){
    const col=p.mColor,S=p.size,R=150*S,tilt=.42,Cc={x:C.x,y:C.y+30},gl=p.mGlow,top=-Math.PI/2,Lt=lighten(col,.6);
    const fin=1-seg(u,.93,1),flick=1-.22*(.5+.5*Math.sin(t*21+Math.sin(t*6)*2)),inten=fin*flick;
    vignette(ctx,p.dark*.75*eo(seg(u,0,.12))*(1-seg(u,.95,1)),Cc.x,Cc.y);
    ctx.save();ctx.translate(Cc.x,Cc.y);ctx.scale(1,tilt);   // Boden
    const fg=ctx.createRadialGradient(0,0,0,0,0,R*1.2);fg.addColorStop(0,rgba(col,.36*seg(u,.08,.45)*inten));fg.addColorStop(1,rgba(col,0));ctx.fillStyle=fg;ctx.beginPath();ctx.arc(0,0,R*1.25,0,7);ctx.fill();
    for(let i=0;i<Math.round(p.mRings);i++){const rf=[1,.78,.58][i],pr=eio(seg(u,.03+i*.06,.2+i*.06));if(pr>0)glowLine(ctx,col,2.4*(i?.75:1),gl,inten,()=>ctx.arc(0,0,R*rf,top,top+Math.PI*2*pr))}
    const n=Math.max(5,Math.round(p.mStar)),sp=eio(seg(u,.12,.44)),rs=R*.9;   // Achtstern: jede dritte Ecke verbunden, zeichnet sich der Reihe nach
    if(sp>0){const tot=n*sp,full=Math.floor(tot),rest=tot-full,v=k=>{const a=top+((k*3)%n)/n*Math.PI*2+t*.12;return[Math.cos(a)*rs,Math.sin(a)*rs]};
      glowLine(ctx,col,2,gl*.8,inten*.95,()=>{const a0=v(0);ctx.moveTo(a0[0],a0[1]);for(let k=1;k<=full&&k<=n;k++){const q=v(k);ctx.lineTo(q[0],q[1])}if(full<n&&rest>0){const a1=v(full),a2=v(full+1);ctx.lineTo(lerp(a1[0],a2[0],rest),lerp(a1[1],a2[1],rest))}})}
    for(let i=0;i<12;i++){const a=top+i/12*Math.PI*2,al=seg(u,.16+i/12*.12,.22+i/12*.12);if(al<=0)continue;const x=Math.cos(a)*R*1.1,y=Math.sin(a)*R*1.1,h=R*.05;glowLine(ctx,col,1.6,gl*.5,inten*al,()=>{ctx.moveTo(x,y-h);ctx.lineTo(x+h,y);ctx.lineTo(x,y+h);ctx.lineTo(x-h,y);ctx.closePath()})}   // Rautenrunen am Rand
    ctx.restore();
    const nP=Math.round(p.particles),pa=seg(u,.18,.5)*(1-seg(u,.78,.86));   // Manafunken: vom Ring spiralförmig zur Mitte, dabei aufwärts
    if(nP>0&&pa>0){const pr=rng(p.seed+31);ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<nP;i++){const r1=pr(),r2=pr(),r3=pr(),ph=(r1+t*(.18+.22*r2)/(D/4))%1,rad=R*.95*Math.pow(1-ph,1.2),an=r2*Math.PI*2+ph*5.5*(r3>.5?1:-1),x=Cc.x+Math.cos(an)*rad,y=Cc.y+Math.sin(an)*rad*tilt-ph*95*(.6+.6*r3);
        puff(ctx,x,y,5+4*r3,col,Math.sin(Math.PI*ph)*pa*.5);ctx.fillStyle=rgba(i%4?Lt:'#ffffff',Math.sin(Math.PI*ph)*pa*.95);ctx.beginPath();ctx.arc(x,y,1.1+r3*1.9,0,7);ctx.fill()}
      ctx.restore()}
    const cr=eo(seg(u,.4,.66))*(1-eo(seg(u,.86,.94))),cy=C.y-62+Math.sin(t*2.4)*4*cr;   // Kristall
    if(cr>0){const h=62*S*p.mCrystal*cr,w=h*.52,sx=Math.cos(t*2.2),fl=.75+.25*Math.sin(t*9);
      ctx.save();ctx.translate(C.x,cy);
      puff(ctx,0,0,h*1.7,col,.5*cr*inten);
      ctx.shadowColor=col;ctx.shadowBlur=gl*1.8;
      const P=[[0,-h],[w*sx,0],[0,h],[-w*sx,0]];
      ctx.fillStyle=rgba(mix(col,'#ffffff',.55),.92*cr*flick);ctx.beginPath();P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle=rgba(col,.7*cr);ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(w*sx,0);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
      ctx.strokeStyle=rgba('#ffffff',.85*cr*fl);ctx.lineWidth=1.6;ctx.beginPath();P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.moveTo(-w*sx,0);ctx.lineTo(w*sx,0);ctx.moveTo(0,-h);ctx.lineTo(0,h);ctx.stroke();
      ctx.restore();star4(ctx,C.x+w*.2,cy-h*.3,7+5*Math.sin(t*7)**2,'#ffffff',.9*cr)}
    for(let k=0;k<Math.round(p.mPulse);k++){const q=seg(u,.6+k*.06,.84+k*.06);if(q>0&&q<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba(lighten(col,.5),(1-q)*.8*fin);ctx.lineWidth=4*(1-q)+1;const r2=R*(.2+1.1*eo(q));ctx.beginPath();ctx.ellipse(Cc.x,Cc.y,r2,r2*tilt,0,0,7);ctx.stroke();ctx.restore()}}
    const bs=seg(u,.84,.97);   // Abschluss: der Kristall zerstiebt in Funken
    if(bs>0&&bs<1){const pr=rng(p.seed+37);ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<26;i++){const a=pr()*Math.PI*2,sp2=60+pr()*150,x=C.x+Math.cos(a)*sp2*eo(bs),y=C.y-62+Math.sin(a)*sp2*.7*eo(bs)+bs*bs*40;ctx.fillStyle=rgba(i%3?Lt:'#ffffff',(1-bs)*.9);ctx.beginPath();ctx.arc(x,y,1.2+pr()*2.2,0,7);ctx.fill()}
      ctx.restore()}
    const fl2=p.flash*(seg(u,.4,.44)*(1-seg(u,.44,.54))*.28+seg(u,.86,.9)*(1-seg(u,.9,.97))*.42);
    if(fl2>0){ctx.fillStyle=rgba(lighten(col,.8),fl2*.42);ctx.fillRect(-BIG,-BIG,2*BIG,2*BIG)}
  }
  function lerpP(a,b,q){return{x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q)}}
  const cvs = {}, raf = {};
  function play(kind) {   // 'E' Heilfluss, 'W' Manafluss
    if (FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    let cv = cvs[kind];
    if (!cv) { cv = cvs[kind] = document.createElement('canvas'); cv.width = SW; cv.height = 800; cv.style.cssText = 'position:absolute;left:0;top:0;width:' + SW + 'px;height:800px;z-index:290;pointer-events:none'; stage.appendChild(cv); }
    cancelAnimationFrame(raf[kind]);
    fxUntil = Math.max(fxUntil, Date.now() + P.dur * 1000);
    const ctx = cv.getContext('2d'), k = 1.45, t0 = performance.now(), D = P.dur;
    const step = ts => {
      const t = (ts - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, SW, 800);
      if (t >= D) { cv.remove(); cvs[kind] = null; return; }
      const u = t / D, amp = P.shake * (kind === 'E' ? (u > .88 ? 6 * Math.exp(-(u - .88) * D * 6) : 0) : (u > .74 ? 4 * Math.exp(-(u - .74) * D * 6) : 0));
      ctx.setTransform(k, 0, 0, k, SW / 2 - C.x * k, 400 - C.y * k);   // Mitte des Rituals = Bildschirmmitte
      ctx.translate(Math.sin(t * 95) * amp, Math.cos(t * 80) * amp * .7);
      (kind === 'E' ? fxHeal : fxMana)(ctx, P, t, D, clamp(u)); raf[kind] = requestAnimationFrame(step);
    };
    raf[kind] = requestAnimationFrame(step);
  }
  return { play };
})();

/* ---------- Falle (Blau + Rot, seit 0.8): die verdeckte Karte dreht sich um; trifft die Farbe, fliegt ein Geschoss zum Angreifer ---------- */
const TrapFx = (() => {
  const panelOf = pid => pid === ME ? stage.querySelector('.sbody[data-lead]') : stage.querySelector('.sbody:not([data-lead])');
  const pos = (el, fb) => { if (!el) return fb; const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth; return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k }; };
  const COL = { F: '#ff7a3d', E: '#93c24f', W: '#52a6f5' };
  function play(f) {
    if (FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const tc = stage.querySelector('.trapcard[data-who="' + (f.who === ME ? 's' : 'o') + '"]');
    const from = pos(tc || panelOf(f.who), { x: SW / 2, y: f.who === ME ? 560 : 240 }), to = pos(panelOf(f.to), { x: SW / 2, y: f.to === ME ? 560 : 240 });
    const w = 96, h = 134, el = document.createElement('div');
    el.className = 'trapfx';
    el.style.cssText = 'left:' + (from.x - w / 2) + 'px;top:' + (from.y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;transition:left .35s,top .35s,width .35s,height .35s';
    el.innerHTML = '<div class="tf"><div class="bk"><img src="' + IMG.back + '"></div><div class="fr"><img src="' + (f.card && IMG[f.card] ? IMG[f.card] : IMG.back) + '"></div></div>';
    stage.appendChild(el);
    const mid = { x: SW / 2, y: 400 };
    requestAnimationFrame(() => { el.style.left = (mid.x - 70) + 'px'; el.style.top = (mid.y - 98) + 'px'; el.style.width = '140px'; el.style.height = '196px'; });
    setTimeout(() => { el.classList.add('up'); Snd.play('shield_hit'); }, 380);
    setTimeout(() => {
      if (f.hit) {
        el.classList.add('hit'); Snd.play('hit', 0, .9);
        const o = document.createElement('div'); o.style.cssText = 'position:absolute;z-index:296;pointer-events:none;border-radius:50%;width:26px;height:26px;margin:-13px 0 0 -13px;left:' + mid.x + 'px;top:' + mid.y + 'px;background:radial-gradient(#fff,' + (COL[f.el] || '#ff7a3d') + ' 55%,rgba(0,0,0,0));box-shadow:0 0 22px ' + (COL[f.el] || '#ff7a3d') + ';transition:left .45s ease-in,top .45s ease-in';
        stage.appendChild(o); requestAnimationFrame(() => { o.style.left = to.x + 'px'; o.style.top = to.y + 'px'; });
        setTimeout(() => {
          o.remove();
          const n = document.createElement('div'); n.textContent = '\u2212' + f.refl; n.style.cssText = 'position:absolute;z-index:297;pointer-events:none;font:700 38px Alegreya,serif;color:#ff6b3d;text-shadow:0 0 4px #000,0 0 10px #000;left:' + (to.x - 20) + 'px;top:' + (to.y - 24) + 'px;transition:top .8s,opacity .8s';
          stage.appendChild(n); requestAnimationFrame(() => { n.style.top = (to.y - 80) + 'px'; n.style.opacity = '0'; }); setTimeout(() => n.remove(), 900);
        }, 460);
      }
    }, 1050);
    setTimeout(() => { el.style.transition = 'opacity .45s'; el.style.opacity = '0'; }, f.hit ? 1650 : 1350);
    setTimeout(() => el.remove(), f.hit ? 2150 : 1850);
  }
  return { play, ms: f => (f.hit ? 1650 : 1350) };
})();
