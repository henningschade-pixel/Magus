/* ---------- Erde: Ranken und Monolithe brechen in der Mitte aus dem Boden (Werte der Erd-Werkstatt) ---------- */
const EP = { form: 'monolith', height: 1.3, width: 1, variety: 1, moss: .8, thorns: 1, runes: .6, crackT: .5, rise: .22, overshoot: .15, shake: 1, dust: 2.2, debris: 1, cracks: 1.6, glow: .25, ending: 'zerbersten', endT: 1, seed: 7 };
const STONE={hi:'#98a06e',mid:'#6c7551',lo:'#434b33',dk:'#272c1d',dirt:'#4f4a30',dust:'138,136,98'};
function mix(a,b,k){const f=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)],x=f(a),y=f(b);return 'rgb('+x.map((v,i)=>Math.round(v+(y[i]-v)*k)).join(',')+')'}

function eCracks(ctx,x,y,prog,seed,p,alpha){   // Risse im Boden: dunkel, nach außen feiner, ohne Kontur
  if(prog<=0)return;const sr=rng(seed),R=(46+sr()*18)*p.cracks*(.7+.3*Math.min(1.4,p.width)),g=eo(prog);
  ctx.save();ctx.translate(x,y+3);ctx.scale(1,.5);ctx.lineCap='round';
  if(p.glow>0){const gg=ctx.createRadialGradient(0,0,0,0,0,R*.9);gg.addColorStop(0,'rgba(147,194,79,'+(.4*p.glow*prog*alpha)+')');gg.addColorStop(1,'rgba(147,194,79,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,R*.9,0,7);ctx.fill()}
  ctx.strokeStyle='rgba(30,23,15,'+(.92*alpha)+')';
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2+(sr()-.5)*.6,len=R*(.55+sr()*.6)*g;let px=0,py=0;
    for(let q=1;q<=5;q++){const aa=a+(sr()-.5)*.6,nx=px+Math.cos(aa)*len/5,ny=py+Math.sin(aa)*len/5;ctx.lineWidth=3.4*(1-(q-1)/5)+.35;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(nx,ny);ctx.stroke();
      if(q===3&&sr()>.45){const ba=aa+(sr()>.5?1:-1)*.7;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(nx,ny);ctx.lineTo(nx+Math.cos(ba)*len*.3,ny+Math.sin(ba)*len*.3);ctx.stroke()}px=nx;py=ny}}
  ctx.restore();
}
function poly(ctx,pts,fill,seam){ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(seam){ctx.strokeStyle='rgba(20,16,10,.35)';ctx.lineWidth=1;ctx.stroke()}}
let MOSS=.8;
function facetGrad(ctx,x0,y0,x1,y1,a,b){const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,mix(a,'#5f8a2c',MOSS*.45));g.addColorStop(1,b);return g}   // unten Moos, oben Fels
function thorn(ctx,x,y,ang,len,w){   // Dorn: dunkle Spitze mit hellem Ende
  const px=Math.cos(ang+Math.PI/2)*w,py=Math.sin(ang+Math.PI/2)*w;
  ctx.beginPath();ctx.moveTo(x+px,y+py);ctx.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len);ctx.lineTo(x-px,y-py);ctx.closePath();ctx.fillStyle='#2b2118';ctx.fill();
  ctx.strokeStyle='rgba(190,160,110,.7)';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x+Math.cos(ang)*len*.55,y+Math.sin(ang)*len*.55);ctx.lineTo(x+Math.cos(ang)*len,y+Math.sin(ang)*len);ctx.stroke();
}
function monolith(ctx,x,y,p,hh,seed,g){   // Monolith: hoher Stein mit Moos, Runen und einer Dornenranke
  const rn=rng(seed),w=42*Math.max(.7,p.width*1.25),sd=9,top=y-hh;
  const front=[[x-w*.5,y],[x-w*.44,top+12],[x-w*.2,top],[x+w*.36,top+7],[x+w*.5,y]];
  poly(ctx,front,facetGrad(ctx,x-w*.5,y,x+w*.2,top,STONE.mid,STONE.hi),true);
  poly(ctx,[[x+w*.5,y],[x+w*.36,top+7],[x+w*.36+sd,top+2],[x+w*.5+sd,y-5]],facetGrad(ctx,x+w*.4,y,x+w*.5+sd,top,STONE.lo,STONE.dk),true);
  poly(ctx,[[x-w*.2,top],[x+w*.36,top+7],[x+w*.36+sd,top+2],[x-w*.2+sd,top-5]],STONE.hi,true);
  ctx.strokeStyle='rgba(20,16,10,.5)';ctx.lineWidth=1.2;for(let k=0;k<3;k++){const yy=y-hh*(.25+k*.27)+(rn()-.5)*8;ctx.beginPath();ctx.moveTo(x-w*.45,yy);ctx.lineTo(x-w*.1+rn()*w*.3,yy+(rn()-.5)*10);ctx.lineTo(x+w*.48,yy+(rn()-.5)*8);ctx.stroke()}
  // Moos: unten kräftig, nach oben in Flecken
  ctx.fillStyle='rgba(111,163,52,'+(.6*MOSS)+')';ctx.beginPath();ctx.moveTo(x-w*.5,y);for(let k=0;k<=6;k++){ctx.lineTo(x-w*.5+k/6*w,y-hh*(.16+rn()*.2))}ctx.lineTo(x+w*.5,y);ctx.closePath();ctx.fill();
  for(let k=0;k<5;k++){ctx.fillStyle='rgba(140,190,70,'+(.5*MOSS)+')';ctx.beginPath();ctx.ellipse(x+(rn()-.5)*w*.8,y-hh*(.3+rn()*.55),3+rn()*6,2+rn()*3,rn()*3,0,7);ctx.fill()}
  // Runen: schwach leuchtend
  if(p.runes>0){ctx.save();ctx.strokeStyle='rgba(168,226,90,'+(.85*p.runes)+')';ctx.shadowColor='#93c24f';ctx.shadowBlur=8;ctx.lineWidth=1.8;ctx.lineCap='round';
    for(let k=0;k<3;k++){const gx=x-w*.15+(rn()-.5)*w*.2,gy=y-hh*(.4+k*.18);ctx.beginPath();ctx.moveTo(gx-5,gy-6);ctx.lineTo(gx+rn()*6-3,gy);ctx.lineTo(gx-4,gy+7);ctx.moveTo(gx,gy-1);ctx.lineTo(gx+7,gy-4+rn()*6);ctx.stroke()}ctx.restore()}
  vine(ctx,x,y,w,hh,seed,g,p);
}
function vine(ctx,x,y,w,hh,seed,g,p){   // Dornenranke, die den Monolithen umschlingt
  const rn=rng(seed+5),ph=rn()*6,u1=Math.min(1,g),pts=[];
  for(let k=0;k<=24;k++){const u=k/24*u1;pts.push([x+Math.sin(u*12+ph)*w*.62,y-u*hh*.92+Math.cos(u*12+ph)*3])}
  ctx.lineCap='round';
  for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1],wd=4.2*(1-k/pts.length*.6);
    ctx.strokeStyle='#3b2e1f';ctx.lineWidth=wd;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    ctx.strokeStyle='rgba(120,170,60,'+(.7*MOSS)+')';ctx.lineWidth=wd*.45;ctx.beginPath();ctx.moveTo(a[0],a[1]-.5);ctx.lineTo(b[0],b[1]-.5);ctx.stroke();
    if(k%2===1&&p.thorns>0){const ang=Math.atan2(b[1]-a[1],b[0]-a[0])+(k%4===1?-1:1)*(Math.PI/2-.45);thorn(ctx,a[0],a[1],ang,(5+rn()*5)*p.thorns,1.8)}}
  [.35,.6,.82].forEach((s,j)=>{const q=pts[Math.min(pts.length-1,Math.round(s*24))];if(s>u1)return;ctx.save();ctx.translate(q[0],q[1]);ctx.rotate((j%2?-1:1)*.9);ctx.beginPath();ctx.ellipse(6,0,6.5,2.6,0,0,7);ctx.fillStyle=j%2?'#9bcb54':'#76a63a';ctx.fill();ctx.restore()});
}
function roots(ctx,x,y,p,hh,seed,g){   // Wurzelranken brechen aus dem Boden, mit Moos und Blättern
  const rn=rng(seed),N=4+Math.round(rn()*2);
  for(let k=0;k<N;k++){
    const ox=(k-(N-1)/2)*p.width*10+(rn()-.5)*6,h=hh*(.5+rn()*.6),sway=(rn()-.5)*46,curl=(rn()>.5?1:-1)*(10+rn()*20),leaf=[.55,.85];
    const pt=s=>{const u=s*Math.min(1,g);return[x+ox+Math.sin(u*Math.PI*1.4)*curl+sway*u*.5,y-u*h*Math.min(1.15,.4+g*.7)]};
    ctx.lineCap='round';
    for(let s=0;s<.999;s+=.07){const a=pt(s),b=pt(s+.07),w=(10*(1-s)+2)*p.width;
      ctx.strokeStyle='#3b2e1f';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
      ctx.strokeStyle='#62502f';ctx.lineWidth=w*.35;ctx.beginPath();ctx.moveTo(a[0]-w*.18,a[1]);ctx.lineTo(b[0]-w*.18,b[1]);ctx.stroke();
      if(((s*14)|0)%3===0&&MOSS>0){ctx.strokeStyle='rgba(120,170,60,'+(.75*MOSS)+')';ctx.lineWidth=w*.8;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}}
    if(p.thorns>0)for(let s=.14;s<.96;s+=.085){if(s>Math.min(1,g))break;const a=pt(s-.02),b=pt(s+.02),ang=Math.atan2(b[1]-a[1],b[0]-a[0]),q=pt(s),dir=((s*12)|0)%2?1:-1;thorn(ctx,q[0],q[1],ang+dir*(Math.PI/2-.5),(4+rn()*7)*p.thorns*(1-s*.35),1.6)}
    leaf.forEach((s,j)=>{if(s>Math.min(1,g))return;const q=pt(s);[-1,1].forEach(d=>{ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(d*(.9+rn()*.4)-1.2);ctx.beginPath();ctx.ellipse(6,0,6.5,2.6,0,0,7);ctx.fillStyle=j%2?'#9bcb54':'#76a63a';ctx.fill();ctx.restore()})});
  }
}
function grass(ctx,x,y,w,e,a,seed){if(e<=0)return;const rn=rng(seed);ctx.save();ctx.globalAlpha=a;for(let k=0;k<12;k++){const bx=x+(rn()-.5)*w*1.7,len=(6+rn()*13)*Math.min(1,e*1.4),lean=(bx-x)/w*.5+(rn()-.5)*.3;ctx.beginPath();ctx.moveTo(bx-1.6,y+2);ctx.lineTo(bx+Math.sin(lean)*len,y+2-Math.cos(lean)*len);ctx.lineTo(bx+1.6,y+2);ctx.closePath();ctx.fillStyle=k%3?'#7fb040':'#a6d460';ctx.fill()}ctx.restore()}
function leafBit(ctx,x,y,r,rot,a,k){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=a;ctx.beginPath();ctx.ellipse(0,0,r*1.7,r*.7,0,0,7);ctx.fillStyle=k%2?'#8fc04a':'#6c9a35';ctx.fill();ctx.restore()}
const NATUR=['ranken','monolith','ranken','ranken','monolith'];
function formOf(p,i){return p.form==='natur'?NATUR[(i+(p.seed|0))%NATUR.length]:p.form}
function eDust(ctx,x,y,age,seed,p,scale){
  if(age<=0||p.dust<=0)return;const rn=rng(seed),life=1.1,u=age/life;if(u>=1)return;
  for(let k=0;k<7;k++){const a=Math.PI+rn()*Math.PI,v=40+rn()*70,r0=7+rn()*8,e=eo(clamp(u*1.2));
    const px=x+Math.cos(a)*v*e*1.1*scale,py=y-4+Math.sin(a)*v*e*.35-e*14,rr=(r0+e*24)*scale;
    const g=ctx.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,'rgba('+STONE.dust+','+(.38*(1-u)*Math.min(1.3,p.dust))+')');g.addColorStop(1,'rgba('+STONE.dust+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,rr,0,7);ctx.fill()}
}
function eChunk(ctx,x,y,r,rot,a,seed){const rn=rng(seed);ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=a;ctx.beginPath();for(let k=0;k<5;k++){const t=k/5*6.28,rr=r*(.6+rn()*.6);const px=Math.cos(t)*rr,py=Math.sin(t)*rr;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fillStyle=rn()>.5?STONE.lo:STONE.mid;ctx.fill();ctx.restore()}
function eDebris(ctx,x,y,age,seed,p,power){   // Brocken fliegen hoch und fallen zurück
  if(age<=0||p.debris<=0)return;const rn=rng(seed),N=Math.round(10*p.debris*power);
  for(let k=0;k<N;k++){const a=-Math.PI/2+(rn()-.5)*2.1,v=(130+rn()*190)*power,life=.9+rn()*.5,ag=age-rn()*.05;if(ag<=0||ag>=life)continue;
    const px=x+Math.cos(a)*v*ag,py=y+Math.sin(a)*v*ag+.5*560*ag*ag;if(py>y+6)continue;
    if(rn()<.38*p.moss+.12)leafBit(ctx,px,py,1.7+rn()*2.4,ag*(rn()*14-7),1-Math.pow(ag/life,3),k);else eChunk(ctx,px,py,1.8+rn()*3.6,ag*(rn()*14-7),1-Math.pow(ag/life,3),seed+k)}
}
function mound(ctx,x,y,w,e,a){   // aufgeworfene Erde am Fuß
  if(e<=0)return;ctx.save();ctx.globalAlpha=a;const rw=w*.9*Math.min(1,e*1.3);
  const g=ctx.createRadialGradient(x,y,0,x,y,rw);g.addColorStop(0,'rgba(84,68,48,.95)');g.addColorStop(1,'rgba(84,68,48,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y+2,rw,rw*.32,0,0,7);ctx.fill();ctx.restore();
}

const EARTH_SCALE = .4;   // Darstellung der Erdmagie im Spiel (Werkstattgröße = 1)
function earthForm(ctx, x, by, seed, i, t, tCrack, tRise, endAt, ending) {
  ctx.save(); ctx.translate(x, by); ctx.scale(EARTH_SCALE, EARTH_SCALE); ctx.translate(-x, -by);
  earthFormRaw(ctx, x, by, seed, i, t, tCrack, tRise, endAt, ending);
  ctx.restore();
}
function earthFormRaw(ctx, x, by, seed, i, t, tCrack, tRise, endAt, ending) {
  const p = EP; MOSS = p.moss;
  const form = formOf(p, i), endP = seg(t, endAt, endAt + p.endT), crackFade = 1 - endP;
  eCracks(ctx, x, by, seg(t, tCrack, tRise), seed, p, crackFade);
  const r = seg(t, tRise, tRise + p.rise), e = r < 1 ? eo(r) * (1 + p.overshoot * Math.sin(r * Math.PI)) : 1;
  const rv = rng(seed + 99), vh = 1 + (rv() - .5) * .5 * p.variety, vw = 1 + (rv() - .5) * .4 * p.variety, lean = (rv() - .5) * .3 * p.variety, pp = Object.assign({}, p, { width: p.width * vw });   // geringere Streuung als in der Werkstatt, damit nichts übers Feld hinausragt
  const hh = (form === 'monolith' ? 128 : 112) * p.height * vh;
  if (t < tRise) return;
  const vis = ending === 'versinken' ? 1 - eio(endP) : 1, alpha = ending === 'zerbersten' ? clamp(1 - endP * 3) : 1;
  if (alpha > 0 && vis > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 4000 + by + 2); ctx.clip(); ctx.globalAlpha = alpha;
    const lift = form === 'ranken' ? 0 : hh * (1 - e * vis), yy = by + lift;
    ctx.translate(x, by); ctx.rotate(form === 'ranken' ? 0 : lean * .5); ctx.translate(-x, -by);
    if (form === 'monolith') monolith(ctx, x, yy, pp, hh, seed, clamp(e * vis, 0, 1)); else roots(ctx, x, by, pp, hh, seed, e * vis);
    ctx.restore();
  }
  mound(ctx, x, by, p.width * 38, e, 1 - endP);
  grass(ctx, x, by, p.width * 34, e, 1 - endP, seed + 21);
  eDust(ctx, x, by, t - tRise, seed + 3, p, 1); eDebris(ctx, x, by, t - tRise, seed + 5, p, 1);
  if (endP > 0) { const ag = t - endAt; if (ending === 'zerbersten') { eDebris(ctx, x, by - hh * .45, ag, seed + 9, p, 1.3); eDust(ctx, x, by, ag, seed + 11, p, 1.2); } else eDust(ctx, x, by, ag, seed + 11, p, 1); }
}
  function startEx(fx, pre) {
    endEx();
    if (!pre) Snd.play('atk_' + ({ F: 'fire', E: 'earth', W: 'water' }[fx.elem] || 'fire'));
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; cv.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:800px;z-index:287;pointer-events:none'; stage.appendChild(cv);
    const n = Math.max(1, Math.min(10, fx.n)), rn = rng(Math.floor(Math.random() * 9999)), seeds = []; for (let i = 0; i < 20; i++) seeds.push(Math.floor(rn() * 1e5));
    ex = { cv, ctx: cv.getContext('2d'), t0: performance.now(), n, who: fx.who, to: fx.to, C0: center(), seeds, p: Object.assign({}, KP, { atk: fx.elem, def: fx.elem }), def: null, tAe: (n - 1) * KP.gap + KP.flight };
    if (pre) ex.t0 -= (ex.tAe + 1) * 1000;
    const loop = ts => { if (!ex || ex.cv !== cv) return; frame(ts); if (ex) ex.raf = requestAnimationFrame(loop); };
    ex.raf = requestAnimationFrame(loop);
  }
  function frame(ts) {
    const e = ex, ctx = e.ctx, p = e.p, t = (ts - e.t0) / 1000, n = e.n, C0 = e.C0, d = e.def;
    const T = d ? d.T : { tA: 0, tD: 1e9, tC: 1e9, tK: 1e9, tH: 1e9, hf: .8, cl: .6, pairs: 0, left: 0, end: 1e9 };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 1280, 800);
    const HA = handOf(e.who), HD = d ? d.H : null, hp = d ? d.hp : null, b = d ? d.b : 0, seeds = e.seeds;
    let amp = p.shake * (t > T.tK && t < T.tK + .4 ? 3 * (1 - seg(t, T.tK, T.tK + .4)) : 0);
    const earthHit = (el, starts, N) => { if (el !== 'E') return; for (let i = 0; i < N; i++) { const ta = starts + i * p.gap + p.flight; if (t > ta && t < ta + .4) amp += p.shake * p.heavy * 7 * Math.exp(-(t - ta) * 9); } };
    earthHit(p.atk, 0, n); if (d) earthHit(p.def, T.tD, b);
    ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.translate(Math.sin(t * 95) * amp, Math.cos(t * 80) * amp * .7);
    const grid = (i, cnt, isAtk) => {   // ab 6 Geschossen zweizeilig, damit die Magie nicht aus der Kampfbox ragt; jede Zeile mittig, die zweite weiter von der Mitte entfernt
      const rows = cnt > 5 ? 2 : 1, per = Math.ceil(cnt / rows), row = Math.floor(i / per), inRow = row < rows - 1 ? per : cnt - per * row, y0 = slotY(e, isAtk), sg = y0 >= C0.y ? 1 : -1;
      return { x: C0.x + (i % per - (inRow - 1) / 2) * p.spread, y: rows === 1 ? y0 : C0.y + sg * (20 + row * 24), cy: rows === 1 ? C0.y : C0.y + (row ? 14 : -14) };   // cy: Treffpunkt der Paare
    };
    const slotA = i => grid(i, n, true), slotD = j => grid(j, b, false);
    for (let i = 0; i < n; i++) {   // Angriffsfunken
      const s0 = i * p.gap, s = seg(t, s0, s0 + p.flight), sl = slotA(i), paired = i < T.pairs, absd = !paired && i < T.pairs + (T.abs || 0);   // absd: vom Schild ausgeglichen
      if (s <= 0) continue;
      if (p.atk === 'E') {   // Erde bricht am Platz aus dem Boden, zerbirst beim Aufprall; der Rest fliegt als Brocken zu den HP
        earthForm(ctx, sl.x, sl.y, seeds[i], i, t, s0, s0 + p.flight - EP.rise, paired ? T.tK : absd ? T.tS : T.tH, 'zerbersten');
        if (paired || absd || t < T.tH) continue;
      } else {
        if (s < 1) { drawProjectile(ctx, p, p.atk, HA, sl, s, seeds[i], t); continue; }
        if (paired && t >= T.tC) { const m = seg(t, T.tC, T.tK); if (m >= 1) continue; drawIdle(ctx, p, p.atk, sl.x, lerp(sl.y, sl.cy, m * m), seeds[i], t, 1); continue; }
      }
      if (absd && t >= T.tS) { const f = seg(t, T.tS, T.tS + .25); if (f >= 1) continue; ctx.save(); ctx.globalAlpha = 1 - f; drawIdle(ctx, p, p.atk, sl.x, sl.y, seeds[i], t, 1 - f); ctx.restore(); continue; }   // das Schild fängt dieses Geschoss ab
      if (!paired && !absd && t >= T.tH) {
        const hpt = { x: hp.x - 40 + (i % 3) * 40, y: hp.y };
        { const f = seg(t, T.tH, T.tH + T.hf); if (f >= 1) continue; if (f > 0) { drawProjectile(ctx, p, p.atk, { x: sl.x, y: sl.y }, hpt, f, seeds[i], t); continue; } }
      }
      if (p.atk !== 'E') drawIdle(ctx, p, p.atk, sl.x, sl.y, seeds[i], t, 1);
    }
    for (let j = 0; j < b; j++) {   // Verteidigungsfunken
      const s0 = T.tD + j * p.gap, s = seg(t, s0, s0 + p.flight), sl = slotD(j), paired = j < T.pairs;
      if (s <= 0) continue;
      if (p.def === 'E') { earthForm(ctx, sl.x, sl.y, seeds[10 + j], j, t, s0, s0 + p.flight - EP.rise, T.tK, paired ? 'zerbersten' : 'versinken'); continue; }
      if (s < 1) { drawProjectile(ctx, p, p.def, HD, sl, s, seeds[10 + j], t); continue; }
      if (paired && t >= T.tC) { const m = seg(t, T.tC, T.tK); if (m >= 1) continue; drawIdle(ctx, p, p.def, sl.x, lerp(sl.y, sl.cy, m * m), seeds[10 + j], t, 1); continue; }
      if (t >= T.tK) { const f = seg(t, T.tK, T.tK + .5); if (f >= 1) continue; ctx.save(); ctx.globalAlpha = 1 - f; drawIdle(ctx, p, p.def, sl.x, sl.y - f * 14, seeds[10 + j], t, 1 - f); ctx.restore(); continue; }
      drawIdle(ctx, p, p.def, sl.x, sl.y, seeds[10 + j], t, 1);
    }
    for (let i = 0; i < T.pairs; i++) {   // Auflösung der Paare
      const g = seg(t, T.tK, T.tK + T.cl); if (g <= 0 || g >= 1) continue;
      drawClash(ctx, p, clashStyle(p, p.atk, p.def), grid(i, T.pairs, true).x, grid(i, T.pairs, true).cy, g, p.atk, p.def, seeds[i] + 3);
    }
    for (let i = 0; i < T.left; i++) {   // Rest trifft die HP
      const g = seg(t, T.tH + T.hf, T.tH + T.hf + .5); if (g <= 0 || g >= 1) continue; const hx = hp.x - 40 + ((T.pairs + i) % 3) * 40;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      { const fl = ctx.createRadialGradient(hx, hp.y, 0, hx, hp.y, 40); fl.addColorStop(0, 'rgba(255,255,255,' + (.9 * (1 - g)) + ')'); fl.addColorStop(1, rgba(EL[p.atk], 0)); ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(hx, hp.y, 45, 0, 7); ctx.fill(); }
      ctx.strokeStyle = rgba(lighten(EL[p.atk], .4), (1 - g) * .9); ctx.lineWidth = 3 * (1 - g) + .5; ctx.beginPath(); ctx.ellipse(hx, hp.y, 8 + g * 44, 4 + g * 18, 0, 0, 7); ctx.stroke();
      ctx.restore();
    }
    if (T.left) { const q = seg(t, T.tH + T.hf, T.tH + T.hf + .2) * (1 - seg(t, T.tH + T.hf + .5, T.tH + T.hf + .7)); if (q > 0) { ctx.save(); ctx.font = '700 20px Alegreya, serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba('#ff6b6b', q); ctx.fillText('−' + T.left, hp.x, hp.y - 14 - 10 * seg(t, T.tH + T.hf, T.tH + T.hf + .7)); ctx.restore(); } }
    if (d && t > T.end) { endEx(); next(); }
  }
  function next() { const q = queue.shift(); if (!q) return; startEx(q.fx, false); if (q.def) applyDef(q.def); }
  function attack(fx) { if (off()) return; if (ex && ex.def) queue.push({ fx, def: null }); else startEx(fx, false); }
  function defense(fx) {
    if (off()) return;
    if (queue.length) { queue[queue.length - 1].def = fx; return; }
    const pend = Math.max(1, Math.min(10, fx.pending));
    if (!ex) startEx({ who: fx.to, to: fx.who, elem: fx.attElem, n: pend }, true);
    applyDef(fx);
  }
  function applyDef(fx) {
    const bb = Math.max(0, Math.min(10, fx.block));
    const e = ex, p = e.p, now = (performance.now() - e.t0) / 1000, tD = Math.max(now, e.tAe + p.hover), pairs = Math.min(e.n, bb);
    const tDe = bb ? tD + (bb - 1) * p.gap + p.flight : tD, tC = tDe + .12, tK = tC + (pairs ? .3 : 0);
    p.def = fx.defElem || fx.attElem;
    const sh = fx.mirror && !off() ? fx.mirror : null, shD = sh ? MirrorFx.delay(sh) : 0, hf = .8;
    const abs = sh ? Math.min(sh.abs || 0, e.n - pairs) : 0, left = e.n - pairs - abs;   // vom Schild ausgeglichene Geschosse erreichen die HP nicht
    const tS = tK + (pairs ? .55 : 0);   // erst läuft die normale Grafik (Angriff gegen Verteidigung), danach, nur wenn das Schild wirklich eingreift, der Schild-Effekt
    const tH = sh ? tS + shD : tK + (pairs ? .45 : 0);   // der Schaden auf den HP kommt nach dem Schild-Effekt
    e.def = { H: handOf(fx.who), hp: hpOf(fx.who), ha: hpOf(fx.to), b: bb, T: { tA: 0, tD, tC, tK, tS, tH, hf, cl: .6, pairs, left, abs, end: Math.max(left ? tH + hf + .7 : tK + .6, sh ? tS + shD : 0) + .3 + (p.atk === 'E' || p.def === 'E' ? .35 : 0) } };
    fxUntil = Math.max(fxUntil, Date.now() + (e.def.T.end - now) * 1000);
    if (fx.hpPre) {   // HP-Balken zeigen den Schaden genau im Moment des Einschlags (ohne Verzögerung)
      const at = tt => Math.max(0, Math.round((tt - now) * 1000)), msD = at(left > 0 ? tH + hf : tH), msA = sh && sh.r > 0 ? at(tS + MirrorFx.landing(sh)) : 0;   // Verteidiger: Einschlag der Geschosse; Angreifer: Rückwurf
      hpHold = { until: Date.now() + Math.max(msD, msA), pre: fx.hpPre, un: { [fx.who]: Date.now() + msD, [fx.to]: Date.now() + msA } };
      [msD, msA].forEach(ms => setTimeout(() => { if (G) render(); }, ms + 15));
    }
    if (sh) { lateN++; setTimeout(() => { lateN--; MirrorFx.play(sh); }, Math.max(0, Math.round((tS - now) * 1000))); }
    if (pairs > 0) Snd.play('block', Math.max(0, tC - now));
    if (left > 0) Snd.play('hit', Math.max(0, tH + hf - now));   // Bruch-Sound beim Einschlag der Funken
  }
  return { attack, defense, reset() { queue = []; endEx(); }, busy() { return queue.length > 0 || !!(ex && (ex.def || performance.now() - ex.t0 < ex.tAe * 1000 + 50)); }, remaining() { if (!ex || !ex.def) return 0; return Math.max(0, ex.def.T.end - (performance.now() - ex.t0) / 1000); } };
})();
let leadPrev = null;
const fdSel = new Set();   // Zerrüttung: von mir gewählte Abwurfkarten (Handplätze)
const forcedMe = () => !!(G && G.phase === 'combat' && G.combat && G.combat.forced && G.combat.forced.pid === ME);
let curKey = null, curDown = false, mkSeen = null, dthSeen = null, fxFor = null, fxLast = 0;
// Sekundär ausgelöste Effekte (Spiegel wirft Schaden zurück, Todes-Fluch zehrt) kurz an der betroffenen Seite einblenden
// Ton zu einem Kampfeffekt (Angriff und Verteidigung bringen ihre Sounds im Ablauf der Animation selbst mit)
function fxSound(f) {
  if (f.kind === 'ultimate' || (f.kind === 'aggro' && f.ult)) Snd.play('ultimate');
  else if (f.kind === 'aggro') Snd.play('aggro');
  else if (f.kind === 'ruin') Snd.play('ruin');
  else if (f.kind === 'lifeflow') Snd.play(f.removed > 0 || !(f.heal > 0) ? 'purify' : 'heal');
  else if (f.kind === 'mirrorcast') Snd.play('shield_hit');   // Spiegelmarker wird gelegt: Schildsound
  else if (f.kind === 'recover') Snd.play('recover');
  if (f.kind === 'lifeflow') for (let i = 0; i < Math.min(f.removed || 0, 6); i++) Snd.play('break', .15 + i * .12, .8);   // Läuterung: für jeden zerstörten Marker/Token der Splitter-Sound
}
// Kombo-Effekte: Die Animation läuft zuerst, die Wirkung (Flüche im Ablagestapel, Zerrüttungs-Abfrage, Heilung und entfernte Marker) wird erst angezeigt, wenn sie ankommt – wie beim Angriff.
// Die Engine hat die Wirkung schon angewendet; bis ‚until‘ zeigt die Oberfläche den Stand davor. pre: Werte vor der Aktion (preStats).
let comboHold = [];
function holdCombo(f, delay) {
  if (FAST || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  let dur;   // Sekunden bis zur Ankunft (passend zu den Animationen in 22-lifeflow-aggro.js)
  if (f.kind === 'aggro') dur = .3 + (Math.max(1, f.n || 1) - 1) * .22 + .75;
  else if (f.kind === 'ruin') dur = .12 + .55 + .05;
  else if (f.kind === 'lifeflow') dur = (.1 + (Math.max(1, f.removed || 1) - 1) * .06 + .37) * 2.6;
  else return;
  const ms = delay + Math.round(dur * 1000) + 40;
  comboHold.push({ f, from: Date.now() + delay * 0, until: Date.now() + ms, pre: preStats ? JSON.parse(JSON.stringify(preStats)) : null });
  setTimeout(render, ms + 30);
}
let holdFor = null, holdSeen = 0;
function withComboHold(fn) {
  if (G && holdFor !== G) { holdFor = G; holdSeen = G.logN; comboHold = []; }
  else if (G && G.logN > holdSeen) {   // neue Kombo-Effekte vor dem Zeichnen vormerken (showFx läuft erst mitten im Zeichnen)
    for (const e of G.log) if (e.n > holdSeen) [].concat(e.fx || []).forEach(f => holdCombo(f, f.late ? Math.round(1000 * FlowFx.wait()) + 150 : 0));
    holdSeen = G.logN;
  }
  comboHold = comboHold.filter(h => Date.now() < h.until);
  if (!comboHold.length || !G || G.phase !== 'combat' || !G.combat) return fn();
  const c = G.combat, sides = [c.sides.a, c.sides.b], saved = sides.map(s => ({ disc: s.deck.discard, st: Object.assign({}, s.stats) })), forced = c.forced;
  for (const h of comboHold) {
    const f = h.f;
    if (f.kind === 'aggro') { const v = sides.find(s => s.ctrl === f.to); if (v) v.deck.discard = v.deck.discard.slice(0, Math.max(0, v.deck.discard.length - 2 * Math.max(1, Math.min(3, f.n || 1)))); }   // Lähmung S legt 2 S Flüche
    else if (f.kind === 'ruin') c.forced = null;
    else if (f.kind === 'lifeflow' && h.pre) {
      sides.forEach((s, i) => { const p = i ? h.pre.b : h.pre.a; ['death', 'mirror', 'mirrorEl', 'freeDraws'].forEach(k => { if (p[k] === undefined) delete s.stats[k]; else s.stats[k] = p[k]; }); });
      const w = sides.find(s => s.ctrl === f.who); if (w && f.heal > 0) w.stats.hp = Math.max(0, w.stats.hp - f.heal);
    }
  }
  try { return fn(); } finally {
    c.forced = forced;
    sides.forEach((s, i) => { s.deck.discard = saved[i].disc; Object.keys(s.stats).forEach(k => { delete s.stats[k]; }); Object.assign(s.stats, saved[i].st); });
  }
}
function showFx() {
  if (fxFor !== G) { fxFor = G; fxLast = G.logN; FlowFx.resetEx(); return; }
  let k = 0;
  for (const e of G.log) {
    if (e.n <= fxLast) continue;
    const go = f => { if (!FAST) fxSound(f); if (f.kind === 'lifeflow') FlowFx.lifeflow(f); else if (f.kind === 'aggro') FlowFx.aggro(f); else if (f.kind === 'drain') FlowFx.drain(f); else if (f.kind === 'ruin') FlowFx.ruin(f); else if (f.kind === 'attack') FlowFx.attack(f); else if (f.kind === 'defense') FlowFx.defense(f); };
    [].concat(e.fx || []).forEach(f => { if (f.late) { lateN++; setTimeout(() => { lateN--; go(f); }, Math.round(1000 * FlowFx.wait()) + 150); } else go(f); });   // Kombo der Verteidigung erst nach der Kampfanimation
    const m = /^(Spiegel|Todes-Fluch): /.exec(e.txt); if (!m) continue;
    if (m[1] === 'Todes-Fluch') Snd.play('curse', 0, 0.95);   // Fluch-Sound, wenn der Todes-Fluch Schaden macht
    const mirror = m[1] === 'Spiegel', victimMe = mirror ? e.pid !== ME : e.pid === ME;
    const d = document.createElement('div'); d.className = 'fxnote ' + (mirror ? 'mirror' : 'death');
    d.style.top = (victimMe ? 546 - k * 54 : 172 + k * 54) + 'px';
    d.innerHTML = '<i>' + (mirror ? '⟲' : '☠') + '</i><span>' + esc(e.txt) + '</span>';
    setTimeout(() => { stage.appendChild(d); setTimeout(() => d.remove(), 3300); }, mirror ? Math.round(1000 * FlowFx.wait()) : 0); k++;   // Spiegel-Hinweis erst nach dem Schild-Effekt
  }
  fxLast = G.logN;
}
function applyCursor() {
  const c = (CURSORS[curKey] || {})[curDown ? 'pressed' : 'normal'] || (CURSORS[curKey] || {}).normal, st = document.documentElement.style;
  const v = c ? 'url(' + c[0] + ') ' + c[1] + ' ' + c[2] + ', ' : '';
  st.setProperty('--cd', v + 'default'); st.setProperty('--cp', v + 'pointer');
}
function setCursor(k) { if (k === curKey) return; curKey = k; applyCursor(); }
document.addEventListener('pointerdown', () => { curDown = true; applyCursor(); }, true);
document.addEventListener('pointerup', () => { curDown = false; applyCursor(); }, true);
function render() {   // läuft der Ergebnis-Bildschirm, wird der Endstand des Kampfes gezeigt (die Engine ist schon in der Weltphase)
  specBtnSync();
  if (!G) return;
  if (!endView && !modal) {   // neue Upgrade-Punkte (Abschnittsbonus, Trostpreis): Ton, sobald sie sichtbar werden
    const up = G.players[ME].stats.upGot;
    if (upSeen !== null && up > upSeen && !FAST) Snd.play('upgrade_gain');
    upSeen = up;
  }
  if (!endView) {
    if (hpHold && Date.now() < hpHold.until && G.phase === 'combat' && G.combat) {   // Schild-Effekt läuft: die HP-Werte zeigen noch den Stand vor dem Schaden
      const sides = [G.combat.sides.a, G.combat.sides.b], keep = sides.map(s => s.stats.hp);
      sides.forEach(s => { if (hpHold.pre[s.ctrl] !== undefined && Date.now() < (hpHold.un[s.ctrl] || 0)) s.stats.hp = hpHold.pre[s.ctrl]; });
      try { withComboHold(renderInner); } finally { sides.forEach((s, i) => { s.stats.hp = keep[i]; }); }
    } else withComboHold(renderInner);
  }
  else {
    const sp = G.phase, sc = G.combat, cur = endView.cur, keep = [cur.sides.a.stats.hp, cur.sides.b.stats.hp];
    if (endView.stage === 'anim' && hpHold && Date.now() >= hpHold.until) { cur.sides.a.stats.hp = endView.snap.sides.a.stats.hp; cur.sides.b.stats.hp = endView.snap.sides.b.stats.hp; }   // der Schaden steht sofort da, wenn die Geschosse einschlagen
    G.phase = 'combat'; G.combat = cur;
    try { renderInner(); } finally { G.phase = sp; G.combat = sc; cur.sides.a.stats.hp = keep[0]; cur.sides.b.stats.hp = keep[1]; }
  }
  let ov = document.getElementById('endov');
  const html = overlayHTML();
  if (html && !ov) { ov = document.createElement('div'); ov.id = 'endov'; stage.appendChild(ov); }
  if (ov) { if (html) { if (ov.dataset.k !== html) { ov.innerHTML = html; ov.dataset.k = html; } ov.style.display = 'block'; } else { ov.style.display = 'none'; ov.dataset.k = ''; } }
}
function renderInner() {
  if (!G) return;
  const cx = ctx();
  let h = sidePanels(cx);
  if (cx.combat) h += combatCenter(cx) + comboRef(cx);
  else h += vendorPanel() + monsterCards();
  panels.innerHTML = h;
  const lg0 = logEl.querySelector('.logl'), lgKeep = lg0 && lg0.scrollHeight - lg0.scrollTop - lg0.clientHeight > 24 ? lg0.scrollTop : null;   // nicht am Ende: Leseposition merken
  if (cx.combat) {   // links: nur der Kampflog (Einträge seit Kampfbeginn)
    const from = cx.c.logFrom || 0;
    logEl.className = 'logpanel'; logEl.style.cssText = box(LAYOUT.combo);
    logEl.innerHTML = '<h3><button class="logdl" title="Spiellog exportieren (Alt-Klick: in die Zwischenablage)">⤓</button>Kampflog</h3><div class="logl">' + G.log.filter(e => e.n > from).slice(-300).map(e => '<div class="' + (e.pid === ME ? 'me' : e.pid === null ? '' : 'op') + '">' + esc(e.txt) + '</div>').join('') + '</div>';
  } else {
    logEl.className = 'logpanel'; logEl.style.cssText = box(LAYOUT.logPanel);
    logEl.innerHTML = '<h3><button class="logdl" title="Spiellog exportieren (Alt-Klick: in die Zwischenablage)">⤓</button>Protokoll</h3><div class="logst">Abschnitt ' + G.stage + '/3 · Showdowns ' + G.showdown + '/3<br>Siegpunkte ' + G.players[ME].sp + ' : ' + G.players[OPP].sp + '</div><div class="logl">' + G.log.slice(-300).map(e => '<div class="' + (e.pid === ME ? 'me' : e.pid === null ? '' : 'op') + '">' + esc(e.txt) + '</div>').join('') + '</div>';
  }
  { const lg = logEl.querySelector('.logl'); if (lg) lg.scrollTop = lgKeep === null ? lg.scrollHeight : lgKeep; }
  { const mc = cx.combat && G.combat.mode === 'monster' ? G.combat : null, side = mc ? (G.combat.sides.b.ctrl === ME ? 'bot' : 'top') : '';   // Farbe auf der Seite dessen, der das Monster steuert
    stage.dataset.top = side === 'top' ? mc.elem : ''; stage.dataset.bot = side === 'bot' ? mc.elem : ''; }
  if (cx.combat) {   // Marker (Schwäche, Spiegel, Tod) weg -> Sound
    const sa = G.combat.sides.a.stats, sb = G.combat.sides.b.stats, n = x => (x.mirror || 0) + (x.death || 0);
    const mirNew = G.log.some(e => e.n > fxLast && [].concat(e.fx || []).some(f => f.kind === 'mirror'));   // beim Spiegelbruch spielt die Animation den Sound selbst, zum Einschlag
    if (mkSeen && mkSeen.c === G.combat && (n(sa) < mkSeen.a || n(sb) < mkSeen.b) && !mirNew) Snd.play('break', 0, 0.7);
    mkSeen = { c: G.combat, a: n(sa), b: n(sb) };
    const dd = (sa.death || 0) + (sb.death || 0);   // Todes-Fluch-Marker hinzugekommen -> Fluch-Sound
    if (dthSeen && dthSeen.c === G.combat && dd > dthSeen.n) CurseFx.play();
    dthSeen = { c: G.combat, n: dd };
  } else { mkSeen = null; dthSeen = null; }
  if (manaPv > 0 && cx.combat) { const mv = panels.querySelector('.sbody[data-lead] [data-pv="mana"]'), st = cx.myStats; if (mv) mv.innerHTML = '<span class="pvdn">' + Math.max(0, st.mana - manaPv) + '</span>/' + st.maxMana; }   // Mana nach dem Ausspielen in Rot
  { const mine = panels.querySelector('.sbody[data-lead]');   // Knopfspalte weich ein- und ausfahren
    if (mine) { const now = mine.classList.contains('hasup'); if (leadPrev !== null && leadPrev !== now) { mine.classList.toggle('hasup', leadPrev); void mine.offsetWidth; mine.classList.toggle('hasup', now); } leadPrev = now; } }
  showFx();
  DiceBoard.sync();   // Monsterwürfel (31a-wuerfel.js)
  setCursor(cx.combat && cx.mine.kind === 'monster' ? 'monster' : 'human');
  renderCards(); MirrorFx.track();
  turnSync();   // nach den Karten, damit deren Flüge schon bekannt sind
  pvSticky();
  if (G.over && !endView && !modal) { if (endSnd !== G) { endSnd = G; Snd.play(G.winner === ME ? 'win' : G.winner === null ? 'draw' : 'lose'); } showEnd(); }
  endTick(); specAdvance();
}
function showStart() {
  setCursor('human');
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  overlay.innerHTML = '<div class="box start"><h1>Magus</h1>' +
    '<p class="note intro" style="margin-top:-2px"><b>Danke, dass du Magus testest!</b> Der Schwerpunkt von <b>Version 0.5</b> ist das <b>Balancing</b> und die neue <b>Darstellung des Spielstarts</b> samt Würfel-Overlay. <b>Balancing:</b> Der Bonus zu Beginn jedes Abschnitts (und die Hilfe nach einer Niederlage gegen ein Monster) entspricht der Stufe: <b>1, 2 und 3</b> Gold und Upgrade-Punkte. Der Preis der <b>Magie</b> steigt mit jedem Kauf, unabhängig von der Stufe: das erste Upgrade kostet 1, das zweite 2, das dritte 3 Upgrade-Punkte. Bei den übrigen Verbesserungen (HP, Mana, Handplatz 1, 2, 3 Gold, Ausspiellimit 2, 4, 6) verteuert jeder Kauf die nächste Stufe seiner Kategorie um den Grundpreis. Das Ausspiellimit der Monster beträgt <b>2, 3 und 4</b> in Stufe I, II und III. Der <b>rote Pluswürfel</b> trägt statt „Limit“ nun einen <b>Pfeil nach oben</b>: eine Magiestufe mehr auf der Folgemagie des Monsters (Feuer → Erde, Erde → Wasser, Wasser → Feuer). Bei der <b>Ultimate</b> zählen mehrere Karten einer Farbe zusammen (E2, F2, W1, W1 ergibt Ultimate 2); ihr <b>Todes-Fluch</b> wirkt erst in der nächsten Angriffsphase des Verfluchten. Die <b>Läuterung</b> darf jeden Marker und Token auf dem Brett wählen, auch eigene, und spielt für jeden zerstörten den Splitter-Sound. Achte beim Testen vor allem darauf, ob die Schwierigkeit von Stufe zu Stufe angemessen steigt und ob die Einnahmen und Preise zusammenpassen. <b>Spielstart und Würfel:</b> Zu Beginn werden die <b>drei Monsterkarten nacheinander aufgedeckt</b> und ihre Würfel geworfen. Danach nimmt jeder Spieler seine Karten von der Ablage, <b>mischt</b> sie, legt sie auf den Stapel und <b>teilt die Hand aus</b>, mit Tönen; ein Klick überspringt den Ablauf. Der <b>Pluswürfel</b> (rot, mit „+“) macht ein Monster in einem Wert stärker, der <b>Minuswürfel</b> (grün, mit „−“) schwächer; eine leere Seite hat keine Grafik und wird wie aufgehobene Würfel durchscheinend dargestellt. Die Seiten sind <b>HP, Mana, Limit, Ziehen</b> (Nachziehlimit), <b>Hand</b> (Handkarte) und leer. Zeigen beide Würfel denselben Wert, werden sie abgedunkelt; der Mauszeiger über einem Würfel erklärt die Wirkung. <b>Monster (seit 0.4):</b> Zu jedem Element gibt es einen <b>Spezialisten</b> (stärkere Spitze, schwächere Basis) und einen <b>Generalisten</b> (vielseitiger, schwächere Spitze), zum Beispiel „Feuer-Spezialist“ und „Feuer-Generalist“; je Stufe werden <b>drei von sechs möglichen Monstern ausgelost</b>. <b>Grundregeln:</b> Du startest mit Ausspiellimit 2 und 2 Siegpunkten. Magie kaufst du mit Upgrade-Punkten, alle anderen Verbesserungen mit Gold; im Tempel wandelst du Gold in Upgrade-Punkte. Stehen alle drei Magien auf Stufe 3, werden übrige Upgrade-Punkte sofort zu Siegpunkten. <b>Nachziehmarker:</b> Wer nachzieht, dreht seinen Marker auf Rot, jede andere Aktion zurück auf Grün; wer bei Rot nachzieht, gibt dem Gegner 1 Gold (Weltphase) bzw. ein Nachziehtoken (Kampf). Das <b>Nachziehlimit</b> erlaubt öfter hintereinander nachzuziehen, bevor der Marker auf Rot springt.</p>' +
    '<img class="logo" alt="" src="assets/img/logo.webp">' +
    (G && !G.over && !MP && started ? '<button class="btn primary" style="font-size:22px;padding:10px 28px;flex:none;align-self:center;margin-bottom:8px" data-act="resume">Spiel fortsetzen</button>' : '') + '<button class="btn' + (G && !G.over && !MP && started ? '' : ' primary') + '" style="font-size:22px;padding:10px 28px;flex:none;align-self:center" data-act="newgame">' + (G && !G.over && !MP && started ? 'Neues Spiel gegen den Computer' : 'Gegen den Computer spielen') + '</button>' +
    '<button class="btn" style="font-size:18px;padding:8px 22px;flex:none;align-self:center;margin-top:8px" data-act="newspec" title="Zwei Computerspieler spielen gegeneinander, du schaust zu (für Spielablauf und Statistik)">Zwei Computern zuschauen</button>' +
    '<div id="mpbox" class="mpbox" style="display:none"><b>Mehrspieler</b> <span class="note">zwei Geräte, ein Raum</span><div class="mprow"><button class="btn" data-act="mphost">Raum erstellen</button><input id="mpcode" maxlength="5" placeholder="Code" autocomplete="off" spellcheck="false"><button class="btn" data-act="mpjoin">Beitreten</button></div><div id="mpmsg" class="note"></div></div></div>';
  mpOffer();
}
function showEnd() {
  const w = G.winner, a = G.players[ME].sp, b = G.players[OPP].sp;
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  overlay.innerHTML = '<div class="box"><h1>' + (SPEC ? (w === null ? 'Unentschieden' : esc(G.players[w].name) + ' gewinnt') : w === ME ? 'Gewonnen' : w === null ? 'Unentschieden' : 'Verloren') + '</h1><p style="font-size:26px">' + a + ' : ' + b + ' Siegpunkte</p><p>' + (w === null ? 'Bei Gleichstand an Siegpunkten, Gold und Tempelstufe gibt es keinen Sieger.' : esc(G.players[w].name) + (G.templeWin ? ' hat bei gleichem Gold die höhere Tempelstufe (' + G.players[ME].temple.level + ' : ' + G.players[OPP].temple.level + ').' : G.goldWin ? ' hat bei Punktgleichstand das meiste Gold (' + G.players[ME].stats.gold + ' : ' + G.players[OPP].stats.gold + ').' : ' hat die meisten Siegpunkte.')) + '</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" style="font-size:19px;padding:8px 18px" data-act="stend" title="Verlauf der Partie">📈 Statistik</button><button class="btn" style="font-size:19px;padding:8px 18px" data-act="logdl" title="Protokoll der Partie als Datei speichern">⬇ Protokoll</button></div><button class="btn primary" style="font-size:22px;padding:10px 28px" data-act="' + (MP ? 'mpexit' : SPEC ? 'leave' : 'newgame') + '">' + (MP ? 'Zum Startbildschirm' : SPEC ? 'Zum Hauptmenü' : 'Neues Spiel') + '</button></div>';
}
