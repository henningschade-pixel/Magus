// Koordinatenabstieg für die KI-Gewichte per Selbstspiel (parallel): node tools/balance/opt.js <Runden> <Partien je Test> [Regeln-JSON] [Start-JSON]
// Herausforderer (Champion ± Schritt) spielen gegen den Champion; ein Wert wird übernommen, wenn er klar gewinnt und in einem zweiten Lauf mit neuen Seeds bestätigt wird.
const {fork}=require('child_process'), fs=require('fs'), path=require('path');
if(process.argv[2]==='__worker'){
  const {match}=require('./tune.js'); process.on('message',m=>{const r=match(m.N,m.a,m.b,m.rules,m.seed0);process.send({id:m.id,r});});
}else{
  const R=+process.argv[2]||2, N=+process.argv[3]||800, rules=JSON.parse(process.argv[4]||'{}');
  const {AI}=require('./load.js'); const D=AI.DEFAULTS;
  let champ=Object.assign({},D,JSON.parse(process.argv[5]||'{}'));
  const STEP={limitA:1,slotA:1,manaA:1,hpA:1,limitB:1,slotB:1,cBase:2,cHp:.7,cMana:.5,cWt:.7,cMon:.3,minHp:1,minMana:1,dBase:2,dCurse:1.5,dEmpty:3,dSlot:1,dNorm:2,vUp:1.5,vUpW:.5,wMark:.2,keepB:1,wDeath:2,wDraw:.5,wFW:.7,wFE:.4,wEW:.8,aDmg:.4,aCost:.4,aCurse:.5,aThr:.3,oHits:2,oFree:1,stallDec:.1,stallFrom:6,rW:.3,rRef:1,dRec:.7,dLeth:10,dPend:1.5,dCost:.5,dKeep:.4,mirW:1.5,mirAvoid:1,lfOpp:1,lfOppW:.4,mBase:3,mCost:.5,mCnt:.3,mTop:1,mPlan:2,vOff:.2,vOver:.2,xPen:1,xCost:.5,xHp:.3,xHor:.5,tRace:.5,tHorizon:1,tAlive:.7,tLoot:.7,mCounter:.4,mCatch:.4};
  const only=process.env.PARAMS?process.env.PARAMS.split(','):Object.keys(STEP);
  const workers=[0,1,2,3].map(()=>{const w=fork(__filename,['__worker']);w.busy=false;return w;});
  let nid=0;const pending=new Map();
  workers.forEach(w=>w.on('message',m=>{w.busy=false;const p=pending.get(m.id);pending.delete(m.id);p(m.r);pump();}));
  const queue=[];
  function pump(){for(const w of workers){if(w.busy||!queue.length)continue;const j=queue.shift();w.busy=true;pending.set(j.id,j.res);w.send(j.msg);}}
  const run=(a,b,seed0,n)=>new Promise(res=>{const id=nid++;queue.push({id,res,msg:{id,a,b,N:n||N,rules,seed0}});pump();});
  (async()=>{
    const log=(...a)=>{const t=a.join(' ');console.log(t);fs.appendFileSync(path.join(__dirname,'opt.log'),t+'\n');};
    for(let r=0;r<R;r++){
      const seed0=20000+r*997;
      const cands=[];
      for(const k of only){for(const dir of [1,-1]){const v=+(champ[k]+dir*STEP[k]).toFixed(3);if(['limitA','slotA','manaA','hpA','limitB','slotB','minHp','minMana','oHits','stallFrom','keepB'].includes(k)&&v<0)continue;if(k.startsWith('r')&&v<0)continue;if(v<0&&!['aThr'].includes(k))continue;cands.push({k,v});}}
      const res=await Promise.all(cands.map(async c=>({...c,r:await run(Object.assign({},champ,{[c.k]:c.v}),champ,seed0)})));
      res.sort((a,b)=>b.r.share-a.r.share);
      log('Runde',r+1,'beste Kandidaten:',res.slice(0,5).map(x=>x.k+'='+x.v+' '+(100*x.r.share).toFixed(1)+'%').join(' | '));
      let acc=0;
      for(const c of res.slice(0,6)){
        if(c.r.share<0.5+1.5*c.r.se)break;
        const cand=Object.assign({},champ,{[c.k]:c.v});
        const conf=await run(cand,champ,seed0+5000,N*2);
        log('  Bestätigung',c.k+'='+c.v,(100*conf.share).toFixed(1)+'%',conf.share>0.5+1.5*conf.se?'übernommen':'verworfen');
        if(conf.share>0.5+1.5*conf.se){champ=cand;acc++;}
      }
      const diff={};for(const k of Object.keys(champ))if(champ[k]!==D[k])diff[k]=champ[k];
      log('Champion-Änderungen:',JSON.stringify(diff));
      fs.writeFileSync(path.join(__dirname,'champion.json'),JSON.stringify(diff,null,1));
      if(!acc&&r>0)break;
    }
    workers.forEach(w=>w.kill());
  })();
}
