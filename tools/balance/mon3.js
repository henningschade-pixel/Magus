// Stufe-III-Monster: node mon3.js <Partien> a,b [a,b ...]   (a = Zäh-Schritte, b = Mana-Schritte; Varianten: b-1, b, b+1)
const {M}=require('./load.js'), {runBatch}=require('./analyze.js');
const N=+process.argv[2]||300, combos=process.argv.slice(3).map(s=>s.split(',').map(Number));   // je Eintrag a3,b3[,a2,b2]
const MON=M.MONSTER, base3=JSON.parse(JSON.stringify(MON.temple[3])), var3=JSON.parse(JSON.stringify(MON.variants.temple[3]));
const mk=(a,b)=>['hp','limit',...Array(a-1).fill('hp'),...Array(Math.max(0,b)).fill('mana')];
const mk2=(a,b)=>['limit',...Array(a).fill('hp'),...Array(Math.max(0,b)).fill('mana')];
for(const [a,b,a2,b2] of combos){
  if(a2!==undefined)['F','E','W'].forEach(el=>{MON.temple[2][el]=mk2(a2,b2);MON.variants.temple[2][el]=[mk2(a2,b2),mk2(a2,Math.max(0,b2-1)),mk2(a2,b2+1)];});
  ['F','E','W'].forEach(el=>{MON.temple[3][el]=mk(a,b);MON.variants.temple[3][el]=[mk(a,b),mk(a,Math.max(0,b-1)),mk(a,b+1)];});
  const o=runBatch(N,{}); const row={};
  for(const s of ['I','II','III']){let w=0,l=0,n=0,t=0;for(const e of ['Erdmonster','Feuermonster','Wassermonster']){const m=o.mon[e+' '+s]||{att:0,win:0,lose:0,none:0};w+=m.win;l+=m.lose;n+=m.none;t+=m.att;}row[s]=[w,l,n].map(x=>(100*x/Math.max(1,t)).toFixed(0)).join('/')+' (n='+t+')';}
  const st=M.spawnMonsters?null:null;
  console.log('III: Zäh '+a+' Mana '+b+(a2!==undefined?' | II: Zäh '+a2+' Mana '+b2:''),'| Sieg/Niederl./ohne  I:',row.I,' II:',row.II,' III:',row.III,'| Showdown-Remis',(100*o.sh.reduce((x,y)=>x+y.draw,0)/Math.max(1,o.sh.reduce((x,y)=>x+y.n,0))).toFixed(0)+'%');
}
