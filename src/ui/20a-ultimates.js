/* ---------- Ultimate-Rituale für Heilfluss (Erde) und Prisma (Wasser), aus der Ultimate-Werkstatt (seit 0.7.2.2): mittig auf dem Bildschirm, wie das Pentagramm des Todesfluss (20-todesfluch.js). Die Marker und ihre Wirkung zeigt das Spiel selbst. ---------- */
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
    pColor: '#52a6f5', pRainbow: .6, pPrism: 1, pBeam: 1, pDome: 1, pFacets: 6, pShimmer: 1, pGlints: 16, pGlow: 12 };
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
  
  /* ---------- Prisma (Wasser): Lichtstrahl spaltet sich im Kristall in drei Farben, daraus wächst die Schildkuppel ---------- */
  const prismCols=p=>[mix(p.pColor,EL.F,p.pRainbow),mix(p.pColor,EL.E,p.pRainbow),mix(p.pColor,EL.W,p.pRainbow)];
  function domeGeom(p){const rx=165*p.size*p.pDome*.95;return{c:{x:C.x,y:C.y+78},rx,ry:rx*.85}}
  function fxPrism(ctx,p,t,D,u){
    const S=p.size,s=62*S*p.pPrism,Pc={x:C.x,y:C.y-14},gl=p.pGlow,cols=prismCols(p),dg=domeGeom(p),pc=p.pColor;
    const dp=eio(seg(u,.55,.78)),out=1-eio(seg(u,.9,.99)),fin=1-seg(u,.93,1);
    vignette(ctx,p.dark*eo(seg(u,0,.12))*(1-seg(u,.95,1)),Pc.x,Pc.y);
    const pr=eo(seg(u,.03,.2)),sc=(.3+.7*pr)*(1-.8*eio(seg(u,.9,.99)));
    const V=[[0,-s*1.05],[-s*.95,s*.58],[s*.95,s*.58]].map(v=>({x:Pc.x+v[0]*sc,y:Pc.y+v[1]*sc}));
    const E=lerpP(V[0],V[1],.55),X=lerpP(V[0],V[2],.55);
    // Kuppel (hinter dem Prisma)
    if(dp>0&&out>0){
      const {c,rx,ry}=dg;ctx.save();ctx.globalAlpha=out;
      const fillg=ctx.createRadialGradient(c.x,c.y-ry*.45,rx*.1,c.x,c.y-ry*.3,rx*1.05);fillg.addColorStop(0,rgba(lighten(pc,.6),.04*dp));fillg.addColorStop(1,rgba(pc,.26*dp));
      ctx.fillStyle=fillg;ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,Math.PI,Math.PI*2);ctx.ellipse(c.x,c.y,rx,rx*.28,0,0,Math.PI);ctx.closePath();ctx.fill();   // Fläche
      const lg=ctx.createLinearGradient(c.x-rx,0,c.x+rx,0);lg.addColorStop(0,cols[0]);lg.addColorStop(.5,cols[1]);lg.addColorStop(1,cols[2]);
      ctx.save();ctx.lineCap='round';ctx.shadowColor=cols[1];ctx.shadowBlur=gl;ctx.strokeStyle=lg;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,Math.PI,Math.PI+Math.PI*dp);ctx.stroke();ctx.restore();   // Rand
      ctx.strokeStyle=rgba(lighten(pc,.5),.5*dp);ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(c.x,c.y,rx,rx*.28,0,0,Math.PI);ctx.stroke();ctx.strokeStyle=rgba(pc,.25*dp);ctx.beginPath();ctx.ellipse(c.x,c.y,rx,rx*.28,0,Math.PI,Math.PI*2);ctx.stroke();   // Standring
      const nF=Math.round(p.pFacets),fa=seg(u,.62,.8);   // Facetten
      if(nF>1&&fa>0){
        ctx.strokeStyle=rgba(lighten(pc,.65),.3*fa);ctx.lineWidth=1.2;
        for(let i=1;i<nF;i++){const th=Math.PI+i/nF*Math.PI,bx=c.x+rx*Math.cos(th);ctx.beginPath();ctx.moveTo(bx,c.y+Math.sin(th)*0);ctx.quadraticCurveTo(c.x+(bx-c.x)*.92,c.y-ry*.7,c.x,c.y-ry);ctx.stroke()}
        [.35,.7].forEach(h=>{const rxh=rx*Math.sqrt(1-h*h);ctx.beginPath();ctx.ellipse(c.x,c.y-ry*h,rxh,rxh*.28,0,0,Math.PI);ctx.stroke()});
      }
      const sh=seg(u,.76,.94);   // Schimmer läuft über die Kuppel
      if(sh>0&&sh<1&&p.pShimmer>0){
        ctx.save();ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,Math.PI,Math.PI*2);ctx.ellipse(c.x,c.y,rx,rx*.28,0,0,Math.PI);ctx.closePath();ctx.clip();
        const bx=lerp(c.x-rx*1.3,c.x+rx*1.3,eio(sh)),sg=ctx.createLinearGradient(bx-60,0,bx+60,0);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,'+(.5*Math.sin(Math.PI*sh)*Math.min(1,p.pShimmer))+')');sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;ctx.fillRect(c.x-rx,c.y-ry,2*rx,ry+rx*.3);ctx.restore();
      }
      const nG=Math.round(p.pGlints),gr=rng(p.seed+21);   // Glitzern
      for(let i=0;i<nG;i++){const an=Math.PI+gr()*Math.PI,rd=Math.sqrt(gr())*.95,ph=gr()*6,sp=2+gr()*3,x=c.x+Math.cos(an)*rx*rd,y=c.y+Math.sin(an)*ry*rd*.9,tw=Math.max(0,Math.sin(t*sp+ph));
        if(tw>0)star4(ctx,x,y,3+5*tw,i%3===0?'#ffffff':cols[i%3],tw*dp*.9)}
      ctx.restore();
    }
    // Prisma (Kristall)
    if(pr>0&&out>0){
      ctx.save();ctx.globalAlpha=out;
      const gg=ctx.createLinearGradient(0,V[0].y,0,V[1].y);gg.addColorStop(0,'rgba(215,238,255,.34)');gg.addColorStop(1,rgba(pc,.16));
      ctx.fillStyle=gg;ctx.beginPath();V.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fill();
      glowLine(ctx,lighten(pc,.35),2.4,gl*1.2,.95*pr,()=>{V.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath()});
      ctx.strokeStyle=rgba('#ffffff',.22*pr);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(V[0].x,V[0].y);ctx.lineTo((V[1].x+V[2].x)/2,V[1].y);ctx.moveTo(Pc.x,Pc.y+s*.05*sc);ctx.lineTo(V[1].x,V[1].y);ctx.moveTo(Pc.x,Pc.y+s*.05*sc);ctx.lineTo(V[2].x,V[2].y);ctx.stroke();
      ctx.restore();
    }
    // einfallender Strahl, Brechung, drei Strahlen
    const bm=eo(seg(u,.2,.38)),B0={x:-30,y:E.y+80},ex=seg(u,.42,.6);
    if(bm>0&&out>0&&fin>0){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=out;
      const Bm=lerpP(B0,E,bm);ctx.lineCap='round';
      ctx.strokeStyle=rgba('#ffffff',.3);ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(B0.x,B0.y);ctx.lineTo(Bm.x,Bm.y);ctx.stroke();
      ctx.shadowColor='#ffffff';ctx.shadowBlur=gl;ctx.strokeStyle=rgba('#ffffff',.95);ctx.lineWidth=3.4;ctx.beginPath();ctx.moveTo(B0.x,B0.y);ctx.lineTo(Bm.x,Bm.y);ctx.stroke();
      const ins=seg(u,.34,.44);if(ins>0){ctx.strokeStyle=rgba('#ffffff',.7*ins*(1-ex*.6));ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(E.x,E.y);ctx.lineTo(lerp(E.x,X.x,ins),lerp(E.y,X.y,ins));ctx.stroke()}
      for(let k=0;k<3;k++){
        const q=eo(seg(u,.42+k*.03,.6+k*.03));if(q<=0)continue;
        const ang=.1+(k-1)*.24*p.pBeam,Ln=230*S*q,tx=X.x+Math.cos(ang)*Ln,ty=X.y+Math.sin(ang)*Ln,al=(1-.75*dp)*q;
        const g2=ctx.createLinearGradient(X.x,X.y,tx,ty);g2.addColorStop(0,rgba(lighten(cols[k],.5),al));g2.addColorStop(1,rgba(cols[k],al*.2));
        ctx.shadowBlur=gl;ctx.shadowColor=cols[k];ctx.strokeStyle=g2;ctx.lineWidth=7*(1-.4*q);ctx.beginPath();ctx.moveTo(X.x,X.y);ctx.lineTo(tx,ty);ctx.stroke();
        ctx.shadowBlur=0;ctx.strokeStyle=rgba('#ffffff',al*.7);ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(X.x,X.y);ctx.lineTo(lerp(X.x,tx,.8),lerp(X.y,ty,.8));ctx.stroke();
        if(q>.9)star4(ctx,tx,ty,10,cols[k],al);
      }
      ctx.restore();
    }
    const nP=Math.round(p.particles*.6),pa=seg(u,.4,.6)*(1-seg(u,.9,1));
    if(nP>0&&pa>0){const pr2=rng(p.seed+23);ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<nP;i++){const r1=pr2(),r2=pr2(),r3=pr2(),ph=(r1+t*(.15+.3*r2)/(D/3))%1,x=X.x+ph*200*S*(.6+r3*.5),y=X.y+(r2-.35)*ph*150*S;ctx.fillStyle=rgba(lighten(cols[i%3],.5),Math.sin(Math.PI*ph)*pa*.8);ctx.beginPath();ctx.arc(x,y,1+r3*1.8,0,7);ctx.fill()}ctx.restore()}
    const fl=p.flash*(seg(u,.55,.6)*(1-seg(u,.6,.7))*.35+seg(u,.9,.93)*(1-seg(u,.93,.99))*.55);
    if(fl>0){ctx.fillStyle=rgba(lighten(pc,.85),fl*.45);ctx.fillRect(-BIG,-BIG,2*BIG,2*BIG)}
  }
  function lerpP(a,b,q){return{x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q)}}
  const cvs = {}, raf = {};
  function play(kind) {   // 'E' Heilfluss, 'W' Prisma
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
      (kind === 'E' ? fxHeal : fxPrism)(ctx, P, t, D, clamp(u)); raf[kind] = requestAnimationFrame(step);
    };
    raf[kind] = requestAnimationFrame(step);
  }
  return { play };
})();
