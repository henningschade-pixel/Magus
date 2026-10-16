/* ---------- Funken je Element ---------- */
function orbGlow(ctx,x,y,r,col,core){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(x,y,0,x,y,r*3);g.addColorStop(0,rgba(core||'#ffffff',1));g.addColorStop(.25,rgba(col,.85));g.addColorStop(1,rgba(col,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*3,0,7);ctx.fill();ctx.restore();
}
function rock(ctx,x,y,r,rot,seed,col){
  const rn=rng(seed),n=7;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();
  for(let k=0;k<n;k++){const a=k/n*Math.PI*2,rr=r*(.65+rn()*.5);const px=Math.cos(a)*rr,py=Math.sin(a)*rr;k?ctx.lineTo(px,py):ctx.moveTo(px,py)}
  ctx.closePath();ctx.fillStyle='#4c4a36';ctx.fill();ctx.strokeStyle=lighten(col,.2);ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=rgba(col,.55);ctx.beginPath();ctx.arc(-r*.2,-r*.2,r*.35,0,7);ctx.fill();ctx.restore();
}
function ribbon(ctx,pos,q,col,size,len,t,seed){
  const n=18,pts=[];for(let i=0;i<=n;i++){const s=clamp(q-len*(1-i/n));const a=pos(s),b=pos(Math.min(1,s+.01));const nx=-(b[1]-a[1]),ny=b[0]-a[0],m=Math.hypot(nx,ny)||1;
    const w=Math.sin(s*22-t*14+seed)*3.2*(i/n);pts.push([a[0]+nx/m*w,a[1]+ny/m*w,i/n])}
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  [[1.0,.28,col],[.55,.55,lighten(col,.5)]].forEach(([wf,al,c])=>{for(let i=1;i<pts.length;i++){const k=pts[i][2];ctx.strokeStyle=rgba(c.startsWith('#')?c:col,al*k);if(!c.startsWith('#'))ctx.strokeStyle=c.replace('rgb','rgba').replace(')',','+(al*k)+')');
    ctx.lineWidth=size*(.25+1.7*k)*wf;ctx.beginPath();ctx.moveTo(pts[i-1][0],pts[i-1][1]);ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke()}});
  const sr=rng(seed+5);ctx.fillStyle='rgba(210,235,255,.8)';
  for(let k=0;k<7;k++){const i=Math.floor(sr()*n),pp=pts[i];const dx=(sr()-.5)*14,dy=(sr()-.5)*14;ctx.globalAlpha=pp[2]*.8;ctx.beginPath();ctx.arc(pp[0]+dx,pp[1]+dy,1+sr()*1.6,0,7);ctx.fill()}
  ctx.restore();
}
// Wasserformen: wabernder Ball, schwappende Welle, Schwall
function waterBody(ctx,x,y,R,ang,t,seed,p){
  const wb=p.wobble,col=EL.W;ctx.save();ctx.translate(x,y);
  ctx.save();ctx.globalAlpha=.75;orbGlow(ctx,0,0,R*(p.water==='schwall'?1.5:1.05),col,'#8cc8ff');ctx.restore();   // weicher Schein um das Wasser
  ctx.filter='blur(1.3px)';   // weiche Ränder und Innenzeichnung
  if(p.water==='welle'){ctx.rotate(ang);   // Wellenkamm quer zur Flugrichtung, der Kamm schwappt nach vorn und hinten
    const sl=Math.sin(t*7+seed)*.35*wb,H2=R*2.1;
    ctx.beginPath();ctx.moveTo(-R*.4,-H2);
    ctx.bezierCurveTo(R*(1.4+sl),-H2*.7,R*(1.6+sl),H2*.7,-R*.4,H2);
    ctx.bezierCurveTo(-R*1.1,H2*.4,-R*1.1,-H2*.4,-R*.4,-H2);ctx.closePath();
    const g=ctx.createLinearGradient(-R,0,R*1.6,0);g.addColorStop(0,rgba('#0d3f80',.9));g.addColorStop(1,rgba(col,.9));
    ctx.fillStyle=g;ctx.shadowColor=col;ctx.shadowBlur=24;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(235,248,255,.5)';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();   // Schaumkante
    for(let u=-1;u<=1.001;u+=.1){const yy=u*H2*.92,xx=R*(1.45+sl)*(1-u*u*.82)-R*.3+Math.sin(u*14+t*9+seed)*R*.13*wb;u<=-.99?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy)}ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.45)';const sr=rng(seed);for(let k=0;k<6;k++){ctx.beginPath();ctx.arc(R*(.5+sr()*.8),(sr()-.5)*H2*1.5,1.4+sr()*2,0,7);ctx.fill()}
  }else if(p.water==='schwall'){ctx.rotate(ang);   // länglicher Wasserschwall mit wogender Oberfläche
    const L=R*2.6,n=14;ctx.beginPath();
    for(let i=0;i<=n;i++){const u=i/n,xx=lerp(-L,L*.9,u),w=R*Math.sin(Math.PI*Math.pow(u,.7))*(1+.16*wb*Math.sin(u*9-t*10+seed));i?ctx.lineTo(xx,-w):ctx.moveTo(xx,-w)}
    for(let i=n;i>=0;i--){const u=i/n,xx=lerp(-L,L*.9,u),w=R*Math.sin(Math.PI*Math.pow(u,.7))*(1+.16*wb*Math.sin(u*9-t*10+seed+1.7));ctx.lineTo(xx,w)}
    ctx.closePath();const g=ctx.createLinearGradient(-L,0,L,0);g.addColorStop(0,rgba('#0d3f80',.35));g.addColorStop(.6,rgba('#1f6fc4',.9));g.addColorStop(1,rgba(lighten(col,.3),.95));
    ctx.fillStyle=g;ctx.shadowColor=col;ctx.shadowBlur=24;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(215,240,255,.28)';ctx.lineWidth=1.8;for(let k=-1;k<=1;k+=1){ctx.beginPath();for(let i=0;i<=n;i++){const u=i/n,xx=lerp(-L*.8,L*.8,u),yy=k*R*.45+Math.sin(u*8-t*12+k+seed)*R*.18*wb;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.stroke()}
    ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.ellipse(L*.55,-R*.35,R*.5,R*.2,-.2,0,7);ctx.fill();
  }else{   // wabernder Wasserball
    const n=28;ctx.beginPath();for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=R*(1+.16*wb*Math.sin(3*a+t*6+seed)+.1*wb*Math.sin(5*a-t*8+seed*2)+.06*wb*Math.sin(2*a+t*11));const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}
    ctx.closePath();const g=ctx.createRadialGradient(-R*.3,-R*.35,R*.1,0,0,R*1.3);g.addColorStop(0,rgba(lighten(col,.55),.95));g.addColorStop(.55,rgba(col,.85));g.addColorStop(1,rgba('#0d3f80',.9));
    ctx.fillStyle=g;ctx.shadowColor=col;ctx.shadowBlur=26;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(225,245,255,.28)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.ellipse(-R*.35,-R*.4,R*.3,R*.17,-.6,0,7);ctx.fill();
    ctx.strokeStyle='rgba(225,245,255,.2)';ctx.lineWidth=1.4;const sr=rng(seed);for(let k=0;k<3;k++){ctx.beginPath();ctx.arc((sr()-.5)*R*.9,(sr()-.2)*R*.9+Math.sin(t*4+k)*R*.1,R*(.1+sr()*.12),0,7);ctx.stroke()}
  }
  ctx.filter='none';ctx.restore();
}
// Erde: Brocken (kleine eckige Splitter) mit Rotation
function chunk(ctx,x,y,sz,rot,al,col,seed){const rn=rng(seed);ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=al;ctx.beginPath();
  for(let k=0;k<5;k++){const a=k/5*Math.PI*2,r=sz*(.6+rn()*.6);k?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)}
  ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='rgba(20,16,10,.7)';ctx.lineWidth=1;ctx.stroke();ctx.restore()}
// Erde: kräftiger Einschlag mit Blitz, Staubring, Brocken und Staubwolken
// Ein Funke am Ort q (0..1) seines Fluges von a nach b
function drawProjectile(ctx,p,el,a,b,q,seed,t){
  const col=EL[el],heavy=el==='E'&&p.look!=='kugel',pos=s=>{const e=heavy?Math.pow(s,1.7):eio(s);return[lerp(a.x,b.x,e),lerp(a.y,b.y,e)-Math.sin(s*Math.PI)*p.arc*(heavy?.55:1)]};
  const rn=rng(seed),size=8*p.size*(heavy?1.15+.45*p.heavy:1),TL=Math.round(10*p.trail);
  const P=pos(q),P2=pos(Math.min(1,q+.01)),ang=Math.atan2(P2[1]-P[1],P2[0]-P[0]);
  const waterX=el==='W'&&p.look!=='kugel';
  if(waterX&&p.trail>0&&p.water!=='blob')ribbon(ctx,pos,q,col,size*.5,.22*p.trail,t,seed);
  for(let j=waterX&&p.water!=='blob'?0:TL;j>=1;j--){
    const s=clamp(q-j*.03/Math.max(.5,p.trail));if(s<=0)continue;const pp=pos(s),k=1-j/(TL+1),r1=rn(),r2=rn();
    ctx.save();
    if(p.look==='kugel'){ctx.globalAlpha=k*.6;orbGlow(ctx,pp[0],pp[1],size*k*.9,col)}
    else if(el==='F'){ctx.globalAlpha=k*.75;orbGlow(ctx,pp[0]+(r1-.5)*6,pp[1]-j*1.2+(r2-.5)*4,size*k*(.7+r2*.5),j%2?'#ffb347':col)}
    else if(el==='E'){ctx.restore();ctx.save();if(j%2){const rg=ctx.createRadialGradient(pp[0],pp[1]+j,0,pp[0],pp[1]+j,size*k*1.6);rg.addColorStop(0,'rgba(170,150,105,'+(.35*k)+')');rg.addColorStop(1,'rgba(170,150,105,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(pp[0],pp[1]+j,size*k*1.6,0,7);ctx.fill()}else chunk(ctx,pp[0]+(r1-.5)*12,pp[1]+j*2.2+(r2-.5)*6,Math.max(1.2,size*k*.4),j*1.3+r1*5,k*.85,j%3?'#7a6e4c':'#8aa05a',seed+j)}   // Staubwolken und fallende Brocken
    else{ctx.globalAlpha=k*.8;ctx.fillStyle=j%2?rgba(col,.9):'rgba(210,235,255,.9)';ctx.beginPath();ctx.arc(pp[0]+(r1-.5)*6,pp[1]+j*2.2+(r2-.5)*4,Math.max(.8,size*k*.32),0,7);ctx.fill()}   // Tropfen fallen vom Wasserball
    ctx.restore();
  }
  if(heavy){ctx.save();ctx.globalAlpha=.55;orbGlow(ctx,P[0],P[1],size*.85,col,'#b9e070');ctx.restore();ribbon(ctx,pos,q,'#93c24f',size*.7,.2*p.trail,t,seed)}
  if(p.look==='kugel')orbGlow(ctx,P[0],P[1],size,col,'#fff');
  else if(el==='F'){orbGlow(ctx,P[0],P[1],size*1.15,col,'#ffb347');orbGlow(ctx,P[0],P[1]-size*.25,size*.55,'#ff8a2f')}   // ruhiger Feuerball ohne hellen Kernpunkt
  else if(el==='E')rock(ctx,P[0],P[1],size*1.1,q*5+seed,seed,col);
  else waterBody(ctx,P[0],P[1],size*1.6,ang,t,seed,p);
  return P;
}
// Ruhende Funken in der Mitte (schweben leicht)
// Feuerpartikel: Funken lösen sich vom Feuerball und steigen auf, werden kleiner und verglühen (ruhige Position, kein Wabern)
function fireEmbers(ctx,x,y,size,t,seed){
  const rn=rng(Math.floor(seed*7)+11),N=14;
  for(let k=0;k<N;k++){
    const r1=rn(),r2=rn(),r3=rn(),ph=((t*(.55+r1*.5)+k/N+r2)%1),life=1-ph;
    const px=x+(r3-.5)*size*1.6+Math.sin(ph*5+k)*size*.35*ph,py=y-size*.2-ph*size*(4.2+r1*2.2);
    const col=ph<.35?'#ffd27a':ph<.7?'#ff9a3d':'#e0501f';
    ctx.save();ctx.globalAlpha=Math.min(1,life*1.6)*.85;orbGlow(ctx,px,py,Math.max(.6,size*(.28+r2*.18)*life),col);ctx.restore();
  }
}
function drawIdle(ctx,p,el,x,y,seed,t,alpha){
  const col=EL[el],size=8*p.size;ctx.save();ctx.globalAlpha=alpha;if(el!=='F')y+=Math.sin(t*3+seed)*3;
  if(p.look==='kugel')orbGlow(ctx,x,y,size,col,'#fff');
  else if(el==='F'){orbGlow(ctx,x,y,size*1.15,col,'#ffb347');orbGlow(ctx,x,y-size*.25,size*.55,'#ff8a2f');fireEmbers(ctx,x,y,size,t,seed)}
  else if(el==='E'){const R2=size*1.1*(1.15+.45*p.heavy*(p.look==='kugel'?0:1));ctx.save();ctx.globalAlpha*=.5;orbGlow(ctx,x,y,R2*.7,col,'#b9e070');ctx.restore();rock(ctx,x,y,R2,seed+.3,seed,col);for(let k=0;k<3;k++){const a=t*1.8+k*2.1+seed;chunk(ctx,x+Math.cos(a)*R2*1.7,y+Math.sin(a)*R2*.7-4,2.4,a*2,.9,'#8aa05a',seed+k)}}
  else{waterBody(ctx,x,y,size*1.6,0,t,seed,p);ctx.strokeStyle=rgba(col,.4*(1-((t*1.2+seed)%1)));ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y+size*1.3,size*(1+((t*1.2+seed)%1)*1.6),size*.4*(1+((t*1.2+seed)%1)*1.6),0,0,7);ctx.stroke()}
  ctx.restore();
}

