const path=require('path');const root=process.argv[2]||'old';
const {M,AI}=require(path.join(__dirname,root,'tools/balance/load.js'));
const d=JSON.parse(require('fs').readFileSync(process.argv[3]||path.join(__dirname,'spiellog-2026-10-15.json'),'utf8'));
const s=M.newGame({seed:d.seed,rules:d.rules,first:d.first,names:d.spieler.map(p=>p.name),ai:[false,false]});
let bad=0,n=0;
for(const a of d.actions){
  const hands=s.players.map(p=>p.deck.hand.map(c=>c&&c.id));
  const bh=a.before.players.map(p=>p.hand);
  const same=JSON.stringify(hands)===JSON.stringify(bh);
  if(!same){bad++;if(bad<4)console.log('Abweichung bei Aktion',a.i,JSON.stringify(a.action),'\n log:',JSON.stringify(bh),'\n sim:',JSON.stringify(hands));}
  const r=M.apply(s,a.action); n++;
  if(r&&r.ok===false){console.log('Aktion abgelehnt',a.i,JSON.stringify(a.action),r.error);break;}
}
console.log('Aktionen',n,'Abweichungen',bad,'stage',s.stage,'showdown',s.showdown);
