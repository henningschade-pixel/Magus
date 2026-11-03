/* ---------- Auflösung ---------- */
function clashStyle(p,ea,ed){
  if(p.clash!=='auto')return p.clash;
  if((ea==='F'&&ed==='W')||(ea==='W'&&ed==='F'))return'dampf';
  if((ea==='F'&&ed==='E')||(ea==='E'&&ed==='F'))return'lava';
  if((ea==='E'&&ed==='W')||(ea==='W'&&ed==='E'))return'schlamm';
  if(ea==='E'||ed==='E')return'splitter';   // Erde gegen Erde
  if(ea===ed)return'schock';
  return'funken';
}
// Dauer der Auflösung: Lava und Schlamm brauchen länger als Dampf und die älteren Stile (Werte der Elementkombi-Werkstatt)
function clashDur(p,style){return style==='lava'||style==='schlamm'?p.clashT:.6}
const KFLOOR=18;   // Boden unter dem Aufprall (Lavalache, Schlammpfütze)
function kMix(a,b,k){const n=parseInt(a.slice(1),16),m=parseInt(b.slice(1),16),f=(x,y)=>Math.round(x+(y-x)*k);return '#'+((1<<24)+(f(n>>16&255,m>>16&255)<<16)+(f(n>>8&255,m>>8&255)<<8)+f(n&255,m&255)).toString(16).slice(1)}
function kPuff(ctx,x,y,r,rgb,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+rgb+','+clamp(a)+')');g.addColorStop(1,'rgba('+rgb+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
function kRock(ctx,x,y,r,rot,seed,fill){
  const rn=rng(seed),n=7;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();
  for(let k=0;k<n;k++){const a=k/n*Math.PI*2,rr=r*(.65+rn()*.5);const px=Math.cos(a)*rr,py=Math.sin(a)*rr;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
// Wurfbahn mit Schwerkraft: Ort zur Zeit s, Landezeit und ob schon gelandet
function kBall(x0,y0,vx,vy,G,gy,s){
  const tl=(-vy+Math.sqrt(vy*vy+2*G*Math.max(0,gy-y0)))/G,u=Math.min(s,tl);
  return{x:x0+vx*u,y:y0+vy*u+.5*G*u*u,landed:s>=tl,tl,vx,vy:vy+G*u};
}
function kFlash(ctx,p,x,y,g,ca,cd){
  const S=p.clashSize,k=p.flash;if(k<=0)return;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const R=50*S*(.4+g*.8),fl=ctx.createRadialGradient(x,y,0,x,y,R);fl.addColorStop(0,'rgba(255,255,255,'+(.9*(1-g)*k)+')');fl.addColorStop(.5,rgba(ca,.45*(1-g)*k));fl.addColorStop(1,rgba(cd,0));
  ctx.fillStyle=fl;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.fill();ctx.restore();
}
// Feuer + Wasser: Dampf
function kSteam(ctx,p,x,y,g,sr){
  const S=p.clashSize,n=Math.round(12*clamp(p.steam,.5,2.5));
  for(let k=0;k<n;k++){
    const a=-Math.PI/2+(sr()-.5)*1.6,v=20+sr()*60,r=(10+sr()*16)*S*p.steam*(.5+g),al=Math.sin(Math.PI*g)*.5*p.steamDense;
    const px=x+Math.cos(a)*v*g+(sr()-.5)*30,py=y+Math.sin(a)*v*g-g*30*p.steamRise*p.steam;
    kPuff(ctx,px,py,Math.max(.1,r),'225,230,238',al);
  }
}
// Feuer + Erde: Lava. Glühende Brocken fliegen, kühlen ab und bleiben liegen, eine Lavalache wächst und verkrustet, dazu Funkenflug und Rauch
function kLava(ctx,p,x,y,g,sr,dur){
  const S=p.clashSize,s=g*dur,G=720,gy=y+KFLOOR,fade=1-seg(g,.8,1),heat=clamp(1-g*1.05);
  const pq=eo(seg(g,.1,.55)),R=46*S*p.lavaPool*pq;
  if(R>1){
    ctx.save();ctx.translate(x,gy);ctx.scale(1,.36);ctx.globalAlpha=fade;
    ctx.globalCompositeOperation='lighter';
    const gr=ctx.createRadialGradient(0,0,0,0,0,R);gr.addColorStop(0,rgba('#ffe9a8',.95*p.lavaGlow*Math.min(1,heat+.15)));gr.addColorStop(.35,rgba('#ff8a2a',.85*Math.min(1,heat+.25)));gr.addColorStop(.75,rgba('#a8310f',.7));gr.addColorStop(1,'rgba(60,20,10,0)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
    ctx.globalCompositeOperation='source-over';
    const cool=seg(g,.3,.9),cr=rng(991);   // dunkle Kruste, die sich über die Glut legt
    for(let k=0;k<9;k++){const a=cr()*Math.PI*2,d=cr()*R*.8,rr=R*(.14+cr()*.16);ctx.fillStyle='rgba(30,22,20,'+(.62*cool)+')';ctx.beginPath();ctx.ellipse(Math.cos(a)*d,Math.sin(a)*d,rr,rr*.8,cr()*3,0,7);ctx.fill()}
    ctx.restore();
  }
  for(let k=0;k<Math.round(p.lavaChunks);k++){
    const a=-Math.PI/2+(sr()-.5)*2.2,v=(140+sr()*170)*S*p.lavaThrow*.8,r=(4+sr()*7)*S*.8,rot0=sr()*6,spin=(sr()-.5)*10,sd=Math.floor(sr()*1e5);
    const b=kBall(x,y,Math.cos(a)*v*.65,Math.sin(a)*v,G,gy+(sr()-.5)*10,s);
    const h=clamp(heat+.1-(b.landed?(s-b.tl)*.15:0));
    ctx.save();ctx.globalAlpha=fade;
    kRock(ctx,b.x,b.y,r,rot0+spin*Math.min(s,b.tl),sd,kMix('#2a2420','#ff8a2a',h));
    ctx.restore();
    if(h>.05&&p.lavaGlow>0){ctx.save();ctx.globalAlpha=fade*h;orbGlow(ctx,b.x,b.y,r*.9*p.lavaGlow,'#ff7a3d','#ffd08a');ctx.restore()}
  }
  ctx.save();ctx.globalCompositeOperation='lighter';   // Funkenflug
  for(let k=0;k<Math.round(26*p.lavaSparks);k++){
    const a=-Math.PI/2+(sr()-.5)*2.8,v=(80+sr()*260)*S,life=.3+sr()*.55,d0=sr()*.15,q=(g-d0)/life;
    if(q<=0||q>=1)continue;const u=(g-d0)*dur;
    const px=x+Math.cos(a)*v*u*.5,py=y+Math.sin(a)*v*u+.5*380*u*u;
    ctx.fillStyle=rgba(k%3?'#ffc060':'#ff7a3d',(1-q)*.95);ctx.beginPath();ctx.arc(px,py,1.3+sr()*1.4,0,7);ctx.fill();
  }
  ctx.restore();
  for(let k=0;k<Math.round(8*p.lavaSmoke);k++){   // Rauch und Asche
    const ox=(sr()-.5)*70*S,rise=40+sr()*55,r=(14+sr()*14)*S*.8*(.6+g),al=Math.sin(Math.PI*clamp((g-.12)/.88))*.34*p.lavaSmoke;
    kPuff(ctx,x+ox*(.4+g),gy-14-g*rise,r,'74,68,66',al);
  }
}
// Erde + Wasser: Schlamm. Klumpen und Tropfen spritzen und klatschen auf den Boden, eine Pfütze breitet sich aus, blubbert und zeigt Wellen
function kMud(ctx,p,x,y,g,sr,dur){
  const S=p.clashSize,s=g*dur,G=700,gy=y+KFLOOR,fade=1-seg(g,.9,1);
  const col=kMix('#5b4129','#4f5d2b',p.mudTone),dark=kMix(col,'#1c130b',.5),light=kMix(col,'#d2b078',.4);
  const pq=eo(seg(g,.14,.6)),R=50*S*p.mudPool*pq;
  if(R>1){
    ctx.save();ctx.globalAlpha=fade;ctx.translate(x,gy);ctx.scale(1,.34);
    const gr=ctx.createRadialGradient(0,0,0,0,0,R);gr.addColorStop(0,col);gr.addColorStop(.7,dark);gr.addColorStop(1,rgba(dark,0));
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
    ctx.strokeStyle=rgba(light,.28);ctx.lineWidth=2.2;   // Wellen auf dem Brei
    for(let k=0;k<2;k++){const q=clamp((g-.18-k*.14)/.5);if(q>0&&q<1){ctx.globalAlpha=fade*(1-q);ctx.beginPath();ctx.arc(0,0,R*.25+R*.6*q,0,7);ctx.stroke()}}
    ctx.restore();
    const br=rng(555);   // Blasen steigen auf und platzen
    for(let k=0;k<Math.round(p.mudBubbles);k++){
      const a=br()*Math.PI*2,d=Math.sqrt(br())*R*.72,ph=(g*2.6+br()*3)%1,rr=(3+br()*5)*S*.7*Math.sin(Math.PI*ph);if(pq<.5||rr<.3)continue;
      const bx=x+Math.cos(a)*d,by=gy+Math.sin(a)*d*.34-rr*.5;
      ctx.save();ctx.globalAlpha=fade*.85;ctx.fillStyle=rgba(col,.9);ctx.strokeStyle=rgba(light,.7);ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(bx,by,rr,rr*.8,0,0,7);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(bx-rr*.3,by-rr*.3,rr*.25,0,7);ctx.fill();ctx.restore();
    }
  }
  for(let k=0;k<Math.round(p.mudClumps);k++){
    const vy=-(130+sr()*270)*S*.8*p.mudThrow,vx=(sr()-.5)*300*S*.7,rx=(5+sr()*8)*S*.7,isDrop=sr()<p.mudDrops,ground=gy+(sr()-.5)*12;
    const b=kBall(x,y,vx,vy,G,ground,s),land=clamp(b.x,x-170*S,x+170*S);
    ctx.save();ctx.globalAlpha=fade;
    if(!b.landed){
      const sp=Math.hypot(b.vx,b.vy),st=1+clamp(sp/700,0,.9),ang=Math.atan2(b.vy,b.vx),c=isDrop?'#7fb6e8':col;
      ctx.translate(b.x,b.y);ctx.rotate(ang);
      ctx.fillStyle=isDrop?rgba(c,.85):c;ctx.beginPath();ctx.ellipse(0,0,rx*st*(isDrop?.7:1),rx*.62*(isDrop?.7:1),0,0,7);ctx.fill();
      ctx.fillStyle=isDrop?'rgba(255,255,255,.6)':rgba(light,.55);ctx.beginPath();ctx.ellipse(-rx*.2,-rx*.2,rx*.35,rx*.2,0,0,7);ctx.fill();
    }else if(!isDrop){   // Klumpen klatscht flach auf den Boden
      const q=clamp((s-b.tl)/.12);ctx.translate(land,b.y+2);ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(0,0,rx*(1+.8*q),rx*(.62-.2*q)*.7,0,0,7);ctx.fill();
      ctx.fillStyle=rgba(col,.9);ctx.beginPath();ctx.ellipse(-rx*.1,-rx*.1,rx*.6*(1+.5*q),rx*.28,0,0,7);ctx.fill();
    }else{   // Tropfen: kleiner Ring, dann weg
      const q=clamp((s-b.tl)/.35);if(q<1){ctx.strokeStyle=rgba('#a8d0f0',(1-q)*.7);ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(land,b.y+2,3+q*14,(3+q*14)*.34,0,0,7);ctx.stroke()}
    }
    ctx.restore();
  }
}
function drawClash(ctx,p,style,x,y,g,ea,ed,seed){
  const ca=EL[ea],cd=EL[ed],S=p.clashSize,sr=rng(seed);
  ctx.save();
  if(style==='dampf'||style==='lava'||style==='schlamm')kFlash(ctx,p,x,y,seg(g,0,.45),ca,cd);
  if(style==='schock'||style==='funken'){
    ctx.globalCompositeOperation='lighter';const fl=ctx.createRadialGradient(x,y,0,x,y,50*S);fl.addColorStop(0,'rgba(255,255,255,'+(.9*(1-g))+')');fl.addColorStop(1,rgba(ca,0));
    ctx.fillStyle=fl;ctx.beginPath();ctx.arc(x,y,50*S*(.4+g),0,7);ctx.fill();
  }
  if(style==='schock'){
    ctx.globalCompositeOperation='lighter';[[ca,0],[cd,.12]].forEach(([c,dl])=>{const q=clamp((g-dl)/(1-dl));if(q<=0)return;ctx.strokeStyle=rgba(lighten(c,.4),(1-q)*.9);ctx.lineWidth=4*(1-q)+.8;ctx.beginPath();ctx.arc(x,y,10+q*70*S,0,7);ctx.stroke()});
  }
  if(style==='funken'){
    ctx.globalCompositeOperation='lighter';for(let k=0;k<26;k++){const a=sr()*Math.PI*2,v=30+sr()*110*S,c=k%2?ca:cd;ctx.strokeStyle=rgba(lighten(c,.5),(1-g)*.9);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*v*g*.6,y+Math.sin(a)*v*g*.6);ctx.lineTo(x+Math.cos(a)*v*g,y+Math.sin(a)*v*g);ctx.stroke()}
  }
  if(style==='dampf')kSteam(ctx,p,x,y,g,sr);
  if(style==='lava')kLava(ctx,p,x,y,g,sr,clashDur(p,style));
  if(style==='schlamm')kMud(ctx,p,x,y,g,sr,clashDur(p,style));
  if(style==='splitter'){
    for(let k=0;k<14;k++){const a=sr()*Math.PI*2,v=40+sr()*120*S,rot=sr()*6+g*(sr()-.5)*14,sz=3+sr()*6,gx=x+Math.cos(a)*v*g,gy=y+Math.sin(a)*v*g*.7+g*g*60;
      ctx.save();ctx.translate(gx,gy);ctx.rotate(rot);ctx.globalAlpha=1-g;ctx.fillStyle=k%3?'#6b6246':rgba(k%2?ca:cd,.9);ctx.beginPath();ctx.moveTo(-sz,-sz*.5);ctx.lineTo(sz,-sz*.2);ctx.lineTo(sz*.3,sz);ctx.closePath();ctx.fill();ctx.restore()}
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba(lighten('#93c24f',.3),(1-g)*.7);ctx.lineWidth=3*(1-g)+.5;ctx.beginPath();ctx.arc(x,y,8+g*50*S,0,7);ctx.stroke();
  }
  ctx.restore();
}


  const SC = 1.5, KP = { look: 'elementar', water: 'blob', wobble: 1, heavy: 1.75, flight: .9, gap: .07, arc: 185, trail: 1.7, size: 1, spread: 60, hover: .75, clash: 'auto', clashSize: 1.4, steam: 1, shake: 1, hit: 'beides', clashT: 1.5, flash: 1, steamRise: 1, steamDense: 1, lavaChunks: 9, lavaThrow: 1, lavaSparks: 1, lavaGlow: 1, lavaPool: 1, lavaSmoke: 1, mudClumps: 12, mudThrow: 1, mudPool: 1, mudBubbles: 6, mudTone: .15, mudDrops: .3 };   // Werte aus der Kampfeffekt-Werkstatt
  const at = el => { if (!el) return null; const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth; return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k }; };
  const panelOf = pid => pid === ME ? stage.querySelector('.sbody[data-lead]') : stage.querySelector('.sbody:not([data-lead])');
  const U = pt => ({ x: pt.x / SC, y: pt.y / SC });   // Bühnenpixel -> Werkstatt-Einheiten
  const hpOf = pid => U(at(panelOf(pid) && panelOf(pid).querySelector('[data-pv="hp"]')) || { x: 1000, y: pid === ME ? 700 : 70 });
  const handOf = pid => { const L = pid === ME ? L_MY : L_OP; return U({ x: L.cx, y: L.y + CH * L.s / 2 }); };
  const center = () => { const b = LAYOUT.combat; return U({ x: b.left + b.w / 2, y: b.top + b.h / 2 + 6 }); };
  let ex = null, queue = [];   // Folgt ein Angriff, während der vorige noch aufgelöst wird, wartet er in der Schlange
  function endEx() { if (ex) { cancelAnimationFrame(ex.raf); ex.cv.remove(); ex = null; } }
  const off = () => FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function slotY(e, isAtk) { const bottom = e.who === ME; return e.C0.y + ((bottom === isAtk) ? 34 : -34); }
