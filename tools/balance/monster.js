// Monster-Tuning: node monster.js <Partien> '<JS-Patch auf MONSTER>'   z. B. 'MONSTER.stage1Temple.E=[]'
const {M}=require('./load.js'), {runBatch}=require('./analyze.js');
const N=+process.argv[2]||2000, patch=process.argv[3]||'';
const MONSTER=M.MONSTER; if(patch) new Function('MONSTER','M',patch)(MONSTER,M);
const o=runBatch(N,{}), pct=(a,b)=>(100*a/b).toFixed(0).padStart(3)+'%';
const dec=o.first+o.second;
const rows=[];['Erdmonster','Feuermonster','Wassermonster'].forEach(n=>['I','II','III'].forEach(s=>{const m=o.mon[n+' '+s]||{att:1,win:0,lose:0,none:0};rows.push([n+' '+s,m])}));
['I','II','III'].forEach(s=>{const r=rows.filter(x=>x[0].endsWith(' '+s)).map(([n,m])=>n.split('m')[0].slice(0,3)+' '+pct(m.win,m.att)+'/'+pct(m.lose,m.att)+'/'+pct(m.none,m.att));console.log('Stufe '+s.padEnd(3),r.join(' | '))});
const t=k=>rows.filter(x=>x[0].endsWith(' '+k)).reduce((a,[,m])=>[a[0]+m.win,a[1]+m.att],[0,0]);
console.log('(Sieg/Niederlage/ohne Sieger je Angriff)  Ø Sieg I',pct(...t('I')),'II',pct(...t('II')),'III',pct(...t('III')),'| Beginner-Anteil',(100*o.first/dec).toFixed(1)+'%','Remis',pct(o.draw,o.over));
