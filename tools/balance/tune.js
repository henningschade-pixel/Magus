// Selbstspiel-Abstimmung der KI: node tools/balance/tune.js <Partien> '<Params A als JSON>' ['<Params B als JSON>'] ['<Regeln>']
// A gegen B (B = Standardwerte), Plätze und Beginner wechseln, gleiche Seeds. Ausgabe: Siegquote von A (Remis zählt halb).
const {M,AI}=require('./load.js');
function match(N,pa,pb,rules,seed0){
  seed0=seed0||5000; let w=0,l=0,d=0,sp=0;
  for(let g=0;g<N;g++){
    const seed=seed0+(g>>2), first=g&1, seatA=(g>>1)&1;   // jeder Seed viermal (Beginner x Platz getauscht): bei gleichen Parametern exakt 50 %
    const s=M.newGame({seed,ai:[true,true],first,rules});
    AI.setParams(seatA,pa); AI.setParams(1-seatA,pb);
    let steps=0;
    while(!s.over&&steps<20000){const r=AI.runTurn(s,M.actor(s));steps++;if(!r.ok)break;}
    AI.setParams(0,null);AI.setParams(1,null);
    if(!s.over){d++;continue}
    if(s.winner===null)d++;else if(s.winner===seatA)w++;else l++;
    sp+=s.players[seatA].sp-s.players[1-seatA].sp;
  }
  const dec=w+l; return {N,w,l,d,share:(w+0.5*d)/(w+l+d),spDiff:sp/N,se:Math.sqrt(0.25/N)};
}
module.exports={match};
if(require.main===module){
  const N=+process.argv[2]||400, pa=JSON.parse(process.argv[3]||'{}'), pb=JSON.parse(process.argv[4]||'{}'), rules=JSON.parse(process.argv[5]||'{}');
  const t=Date.now(); const r=match(N,pa,pb,rules); console.log(JSON.stringify(r),((Date.now()-t)/1000).toFixed(1)+'s');
}
