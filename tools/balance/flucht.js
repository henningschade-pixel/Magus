// Fluchtanalyse: node tools/balance/flucht.js <Partien> ['<KI-Params A>'] ['<KI-Params B>']
// Für jeden Monsterkampf: Ausgang je Stufe, und ob die Flucht vorher möglich war (Angreifer bzw. Monsterführer). Zeigt, wie viele Niederlagen sich durch Fliehen hätten abwenden lassen.
const {M,AI}=require('./load.js');
const N=+process.argv[2]||400, pa=JSON.parse(process.argv[3]||'null'), pb=JSON.parse(process.argv[4]||'null');
const st={}, end={}; let goal=0, games=0, sp=0, spLost=0;
const S=k=>st[k]||(st[k]={n:0,win:0,lose:0,flee:0,fleeA:0,fleeL:0,loseA:0,winL:0,fleeByA:0,fleeByL:0,fleeLThenKill:0});
for(let g=0;g<N;g++){
  const s=M.newGame({seed:9000+g,ai:[true,true],first:g&1});
  AI.setParams(0,pa); AI.setParams(1,pb);
  let cur=null, steps=0, after=null;
  while(!s.over&&steps<20000){
    const pid=M.actor(s);
    if(s.phase==='combat'&&s.combat.mode==='monster'){
      const c=s.combat; if(!cur||cur.c!==c) cur={c,stage:s.stage,att:c.att,def:c.def,elem:c.elem,aF:false,lF:false};
      if(M.canFlee(s,c.att)) cur.aF=true;
      if(M.canFlee(s,c.def)) cur.lF=true;
    }
    if(after&&s.phase==='world'&&s.turn===after.def&&pid===after.def){}   // (nur Platzhalter)
    const lc=s.lastCombat, r=AI.runTurn(s,pid); steps++; if(!r.ok)break;
    if(s.lastCombat!==lc&&s.lastCombat&&s.lastCombat.mode==='monster'&&cur){
      const e=s.lastCombat, k='Stufe '+cur.stage, x=S(k); x.n++;
      if(cur.aF)x.fleeA++; if(cur.lF)x.fleeL++;
      if(e.winner==='a'){x.win++; if(cur.lF)x.winL++;}
      else if(e.winner==='b'){x.lose++; if(cur.aF)x.loseA++; if(e.sp&&e.sp.loser<0)spLost++;}
      else if(e.reason==='flee'){x.flee++; if(r.acts.some(a=>a.type==='flee'&&a.pid===cur.att))x.fleeByA++; else {x.fleeByL++; after={def:cur.def,elem:cur.elem,k};}}
      cur=null;
    }
    if(after&&s.lastCombat!==lc&&s.lastCombat&&s.lastCombat.mode==='monster'&&s.lastCombat.monsterDefeated&&s.lastCombat!==null){/* siehe unten */}
  }
  AI.setParams(0,null); AI.setParams(1,null);
  if(!s.over)continue; games++;
  if(s.showdown<3)goal++;
  sp+=s.players[0].sp+s.players[1].sp;
  const key=[s.players[0].sp,s.players[1].sp].sort((a,b)=>b-a).join(':'); end[key]=(end[key]||0)+1;
}
const p=(a,b)=>b?(100*a/b).toFixed(0)+'%':'-';
console.log('Partien',games,'| vorzeitiges Ende (Schwelle)',goal,p(goal,games),'| Ø Siegpunkte am Ende (beide zus.)',(sp/games).toFixed(2),'| Ø verlorene SP durch Monsterniederlagen',(spLost/games).toFixed(2));
for(const k of Object.keys(st).sort()){const x=st[k];
  console.log(k+': Kämpfe/Partie',(x.n/games).toFixed(1),'| Sieg',p(x.win,x.n),'Niederl.',p(x.lose,x.n),'Flucht',p(x.flee,x.n),'(Angr.',x.fleeByA,'Führer',x.fleeByL+')',
   '|| Niederlagen mit Fluchtmöglichkeit Angr.',p(x.loseA,x.lose),'| Spielersiege mit Fluchtmöglichkeit Führer',p(x.winL,x.win));}
console.log('Endstände:',Object.entries(end).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+' '+p(v,games)).join(', '));
