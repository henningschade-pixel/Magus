const path=require('path');const root=process.argv[2]||'old';
const {M,AI}=require(path.join(__dirname,root,'tools/balance/load.js'));
const d=JSON.parse(require('fs').readFileSync(process.argv[3]||path.join(__dirname,'spiellog-2026-10-15.json'),'utf8'));
const s=M.newGame({seed:d.seed,rules:d.rules,first:d.first,names:d.spieler.map(p=>p.name),ai:[false,false]});
const TERM=new Set(['attack','defend','draw','recover','pass','combat','vendor','temple','magic','spend','freeDraw','fd','discardCurses']);
const rows=[];
const slotsOf=acts=>{const m=new Set();acts.filter(a=>a.type==='mark').forEach(a=>m.has(a.slot)?m.delete(a.slot):m.add(a.slot));return [...m].sort()};
for(const A of d.actions){
  const a=A.action;
  if(TERM.has(a.type)&&M.actor(s)===a.pid){
    const orig=s.rng.random; s.rng.random=()=>0.3;
    let sug; try{sug=AI.plan(s,a.pid)}catch(e){sug=[{type:'ERR'}]} s.rng.random=orig;
    const c=s.combat,p=s.players[a.pid];
    const hm=(c?c.sides[c.turn].deck:p.deck).marks.slice().sort();
    const hand=(c?c.sides[c.turn].deck:p.deck).hand.map(x=>x&&x.id);
    rows.push({i:A.i,pid:a.pid,phase:s.phase,stage:s.stage,ca:c?c.action:null,mode:c?c.mode:null,
      h:a.type,hm,ai:sug.filter(x=>TERM.has(x.type)).map(x=>x.type).pop()||'?',am:slotsOf(sug),
      hp:(c?c.sides[c.turn].stats:p.stats).hp,mana:(c?c.sides[c.turn].stats:p.stats).mana,hand,pend:c?c.pending:0,
      oppHp:c?c.sides[c.turn==='a'?'b':'a'].stats.hp:null});
  }
  M.apply(s,a);
}
const stat={};
for(const r of rows){const key=(r.phase==='combat'?(r.mode+'/'+r.ca):'world');const o=stat[key]=stat[key]||{n:0,same:0,conf:{},mk:0,mkn:0};o.n++;if(r.h===r.ai){o.same++;if(['attack','defend'].includes(r.h)){o.mkn++;if(JSON.stringify(r.hm)===JSON.stringify(r.am))o.mk++}}const ck=r.h+'→KI:'+r.ai;o.conf[ck]=(o.conf[ck]||0)+1;}
for(const [k,v] of Object.entries(stat)){console.log(k,'n='+v.n,'gleiche Aktionsart',(100*v.same/v.n).toFixed(0)+'%','; bei gleichem Typ attack/defend gleiche Kartenwahl',v.mk+'/'+v.mkn);console.log('   ',Object.entries(v.conf).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([c,n])=>c+' '+n).join(' | '));}
require('fs').writeFileSync(__dirname+'/agree_rows.json',JSON.stringify(rows));
