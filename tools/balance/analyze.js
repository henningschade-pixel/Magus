const {M,AI}=require('./load.js');
const origApply=M.apply;
function runBatch(N,rules,opts){
 opts=opts||{};
 const out={N,stuck:0,over:0,first:0,second:0,draw:0,spDiffFirst:0,steps:[],
  sh:[0,1,2].map(()=>({n:0,attWin:0,defWin:0,draw:0,firstWin:0,secondWin:0,turns:0,exh:0,forced:0,attIsLeaderBehind:0})),
  mon:{}, end:{hp:[0,0],mana:[0,0],lim:[0,0],slots:[0,0],mag:[0,0],gold:[0,0],temple:[0,0],maxHpSum:[0,0]},
  stageLead:[], winIfWonSh1:{w:0,n:0}, comeback:{n:0,w:0}, scoreDist:{}, monsterWinsByFirst:[0,0], monGold:[0,0],
  monsterKills:[0,0], monsterLoss:[0,0]};
 for(let g=0;g<N;g++){
  const first=g%2, seed=(opts.seed0||1000)+g;
  const s=M.newGame({seed,ai:[true,true],first,rules});
  let steps=0,stuck=false,prevLC=null;
  // Monsterkampf: Zustand merken
  while(!s.over&&steps<20000){
   const pid=M.actor(s);
   const wasCombat=s.phase==='combat'?{mode:s.combat.mode,elem:s.combat.elem,att:s.combat.att,stage:s.stage,m:s.combat.sides.b.monster,sd:s.showdown}:null;
   const lcBefore=s.lastCombat;
   const sp0=[s.players[0].sp,s.players[1].sp];
   const r=AI.runTurn(s,pid); steps++;
   if(!r.ok){stuck=true;break}
   if(s.lastCombat!==lcBefore&&s.lastCombat){
    const c=s.lastCombat;
    // Kampfdauer: nicht direkt verfügbar -> combatTurnsTotal Differenz
    if(c.mode==='monster'){
      // info aus wasCombat nicht sicher (Kampf startet und endet evtl. innerhalb eines runTurn). nutze Log
    }
   }
  }
  out.steps.push(steps);
  if(stuck||!s.over){out.stuck++;continue}
  out.over++;
  if(s.winner===null)out.draw++;else if(s.winner===first)out.first++;else out.second++;
  out.spDiffFirst+=s.players[first].sp-s.players[1-first].sp;
  // Auswertung aus Log
  const names=s.players.map(p=>p.name);
  let sd=0,att=null,stage=1;
  const seatOf=pidx=>pidx===first?'first':'second';
  let lastAtk=null;
  s.log.forEach(l=>{const t=l.txt;let m;
   if((m=/^Showdown (\d): (.+) greift zuerst an/.exec(t))){sd=+m[1]-1;att=names.indexOf(m[2]);}
   if(/ gewinnt den Showdown/.test(t)){const w=l.pid;const S=out.sh[sd];S.n++;
     if(w===att)S.attWin++;else S.defWin++;
     if(w===first)S.firstWin++;else S.secondWin++;}
   if(/Showdown ohne Sieger/.test(t)){const S=out.sh[sd];S.n++;S.draw++;}
   if((m=/^(.+) greift (.+) an\./.exec(t))&&!/Showdown/.test(t)){lastAtk={att:names.indexOf(m[1]),mon:m[2]};}
   if(lastAtk&&(m=/^(.+) besiegt (.+) und erhält (\d+) Gold/.exec(t))){const k=m[2];const M2=out.mon[k]||(out.mon[k]={att:0,win:0,lose:0,none:0});M2.att++;M2.win++;lastAtk=null;out.monsterKills[names.indexOf(m[1])]++;}
   else if(lastAtk&&/ gewinnt den Kampf\. /.test(t)){const k=lastAtk.mon;const M2=out.mon[k]||(out.mon[k]={att:0,win:0,lose:0,none:0});M2.att++;M2.lose++;lastAtk=null;}
   else if(lastAtk&&/Kein Sieger/.test(t)){const k=lastAtk.mon;const M2=out.mon[k]||(out.mon[k]={att:0,win:0,lose:0,none:0});M2.att++;M2.none++;lastAtk=null;}
  });
  // Endstatus
  s.players.forEach((p,i)=>{const sl=i===first?0:1;const st=p.stats;
   out.end.maxHpSum[sl]+=st.maxHp;out.end.mana[sl]+=st.maxMana;out.end.lim[sl]+=st.limit;out.end.slots[sl]+=p.slots;
   out.end.mag[sl]+=st.mag.F+st.mag.E+st.mag.W-3;out.end.gold[sl]+=st.gold;out.end.temple[sl]+=p.temple.level;});
 }
 return out;
}
module.exports={runBatch};
if(require.main===module){
 const N=+process.argv[2]||2000;const rules=process.argv[3]?JSON.parse(process.argv[3]):{};
 const o=runBatch(N,rules);console.log(JSON.stringify(o,null,1));
}
