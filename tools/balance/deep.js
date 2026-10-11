const {M,AI}=require('./load.js');
const N=+process.argv[2]||2000;
const real={s:null,ev:[]};
const orig=M.apply;
M.apply=function(state,a){
 const lc=state.lastCombat, t0=state.combatTurnsTotal;
 const r=orig.call(M,state,a);
 if(state===real.s&&state.lastCombat!==lc&&state.lastCombat){
  const c=state.lastCombat;
  real.ev.push({mode:c.mode,reason:c.reason,winner:c.winner,stage:state.showdown+(c.mode==='monster'?1:0),loot:c.loot,monsterDefeated:c.monsterDefeated});
 }
 return r;
};
const agg={mon:{},sh:{},draws:{reason:{}},gameDraw:{bothNoSP:0,tie2:0,other:0},mcount:[],exhMon:0,totMon:0,spDist:{},kills:[]};
for(let g=0;g<N;g++){
 const first=g%2;
 const s=M.newGame({seed:5000+g,ai:[true,true],first});
 real.s=s;real.ev=[];
 let st=0;while(!s.over&&st<20000){AI.runTurn(s,M.actor(s));st++}
 const stageOf=[];
 let sh=0, monsters=0;
 real.ev.forEach(e=>{
  if(e.mode==='monster'){monsters++;agg.totMon++;
   const k='Stufe '+s.stage; /* s.stage am Ende; Stage wird besser per Zählung der Showdowns unten */ }
 });
 // Stufe je Ereignis: Anzahl bisheriger Showdowns
 let stage=1;
 real.ev.forEach(e=>{
  if(e.mode==='monster'){const k='M'+stage+' '+e.reason+(e.winner?'/'+e.winner:'');agg.mon[k]=(agg.mon[k]||0)+1; if(e.reason==='exhaustion')agg.exhMon++;}
  else{const k='S'+stage+' '+e.reason+'/'+(e.winner||'-');agg.sh[k]=(agg.sh[k]||0)+1;stage++}
 });
 agg.mcount.push(monsters);
 const key=s.players[0].sp+':'+s.players[1].sp;agg.spDist[key]=(agg.spDist[key]||0)+1;
 if(s.winner===null){const a=s.players[0].sp;if(a===3)agg.gameDraw.tie2++;else agg.gameDraw.other++}
}
console.log('Monsterkampf-Ausgänge je Stufe (Anzahl):');Object.keys(agg.mon).sort().forEach(k=>console.log(' ',k,agg.mon[k]));
console.log('Showdown-Ausgänge:');Object.keys(agg.sh).sort().forEach(k=>console.log(' ',k,agg.sh[k]));
console.log('Monsterkämpfe/Partie: Ø',(agg.mcount.reduce((a,b)=>a+b,0)/N).toFixed(1),' Anteil Erschöpfung',(100*agg.exhMon/agg.totMon).toFixed(1)+'%');
const top=Object.entries(agg.spDist).sort((a,b)=>b[1]-a[1]).slice(0,10);
console.log('häufigste Endstände (SP0:SP1):',top.map(([k,v])=>k+' '+(100*v/N).toFixed(1)+'%').join(', '));
