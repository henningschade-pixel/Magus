/* ---------- Auflösung ---------- */
function clashStyle(p,ea,ed){
  if(p.clash!=='auto')return p.clash;
  if((ea==='F'&&ed==='W')||(ea==='W'&&ed==='F'))return'dampf';
  if(ea==='E'||ed==='E')return'splitter';
  if(ea===ed)return'schock';
  return'funken';
}
function drawClash(ctx,p,style,x,y,g,ea,ed,seed){
  const ca=EL[ea],cd=EL[ed],S=p.clashSize,sr=rng(seed);
  ctx.save();
  if(style==='schock'||style==='funken'||style==='dampf'){
    ctx.globalCompositeOperation='lighter';const fl=ctx.createRadialGradient(x,y,0,x,y,50*S);fl.addColorStop(0,'rgba(255,255,255,'+(.9*(1-g))+')');fl.addColorStop(1,rgba(ca,0));
    ctx.fillStyle=fl;ctx.beginPath();ctx.arc(x,y,50*S*(.4+g),0,7);ctx.fill();
  }
  if(style==='schock'){
    ctx.globalCompositeOperation='lighter';[[ca,0],[cd,.12]].forEach(([c,dl])=>{const q=clamp((g-dl)/(1-dl));if(q<=0)return;ctx.strokeStyle=rgba(lighten(c,.4),(1-q)*.9);ctx.lineWidth=4*(1-q)+.8;ctx.beginPath();ctx.arc(x,y,10+q*70*S,0,7);ctx.stroke()});
  }
  if(style==='funken'){
    ctx.globalCompositeOperation='lighter';for(let k=0;k<26;k++){const a=sr()*Math.PI*2,v=30+sr()*110*S,c=k%2?ca:cd;ctx.strokeStyle=rgba(lighten(c,.5),(1-g)*.9);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*v*g*.6,y+Math.sin(a)*v*g*.6);ctx.lineTo(x+Math.cos(a)*v*g,y+Math.sin(a)*v*g);ctx.stroke()}
  }
  if(style==='dampf'){
    for(let k=0;k<12;k++){const a=-Math.PI/2+(sr()-.5)*1.6,v=20+sr()*60,r=(10+sr()*16)*S*p.steam*(.5+g),al=Math.sin(Math.PI*g)*.5;
      const px=x+Math.cos(a)*v*g+(sr()-.5)*30,py=y+Math.sin(a)*v*g-g*30*p.steam;
      const rg=ctx.createRadialGradient(px,py,0,px,py,r);rg.addColorStop(0,'rgba(225,230,238,'+al+')');rg.addColorStop(1,'rgba(225,230,238,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill()}
  }
  if(style==='splitter'){
    for(let k=0;k<14;k++){const a=sr()*Math.PI*2,v=40+sr()*120*S,rot=sr()*6+g*(sr()-.5)*14,sz=3+sr()*6,gx=x+Math.cos(a)*v*g,gy=y+Math.sin(a)*v*g*.7+g*g*60;
      ctx.save();ctx.translate(gx,gy);ctx.rotate(rot);ctx.globalAlpha=1-g;ctx.fillStyle=k%3?'#6b6246':rgba(k%2?ca:cd,.9);ctx.beginPath();ctx.moveTo(-sz,-sz*.5);ctx.lineTo(sz,-sz*.2);ctx.lineTo(sz*.3,sz);ctx.closePath();ctx.fill();ctx.restore()}
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=rgba(lighten('#93c24f',.3),(1-g)*.7);ctx.lineWidth=3*(1-g)+.5;ctx.beginPath();ctx.arc(x,y,8+g*50*S,0,7);ctx.stroke();
  }
  ctx.restore();
}


  const SC = 1.5, KP = { look: 'elementar', water: 'blob', wobble: 1, heavy: 1.75, flight: .9, gap: .07, arc: 185, trail: 1.7, size: 1, spread: 60, hover: .75, clash: 'auto', clashSize: 1.4, steam: 1, shake: 1, hit: 'beides' };   // Werte aus der Kampfeffekt-Werkstatt
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
