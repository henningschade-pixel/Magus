// Vergleicht Varianten (Regeln, KI-Gewichte, Quelltext-Änderungen) nach der Länge der drei Abschnitte. Aufruf: node tools/balance/phasen-varianten.js [Partien=1000] [Name,...]
// Quelltext-Änderungen (patch) gelten nur für diesen Lauf, die Dateien im Spiel bleiben unberührt.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const engSrc = scripts.find(s => s.includes('Regelkern (Teil 1)')), aiSrc = scripts.find(s => s.includes('einfacher Computergegner'));
function load(patches) {
  let e = engSrc, a = aiSrc;
  for (const [from, to, which] of patches || []) { const t = which === 'ai' ? a : e; if (!t.includes(from)) throw new Error('Patch passt nicht: ' + from); const r = t.split(from).join(to); if (which === 'ai') a = r; else e = r; }
  const run = (src, req) => { const m = { exports: {} }; new Function('module', 'exports', 'require', src)(m, m.exports, req); return m.exports; };
  const M = run(e, require), AI = run(a, id => id === './engine.js' ? M : require(id)); return { M, AI };
}
const VARIANTS = {
  basis: {},
  'KI: Patt im Kampf auflösen (stallDec +0,15)': { ai: { stallDec: 0.15 } },
  'Kampf: Erschöpfung nach 60 Zügen': { patches: [['const MAX_COMBAT_TURNS = 400;', 'const MAX_COMBAT_TURNS = 60;']] },
  'Stillstand: Showdown nach 40 Zügen ohne Sieg': { rules: { idleLimit: 40 } },
  'Stufe II: Monster ohne Limit-Schritt, dafür HP': { patches: [["2: { F: ['limit', 'hp', 'mana'], E: ['limit', 'hp', 'mana'], W: ['limit', 'hp', 'mana'] }", "2: { F: ['hp', 'hp', 'mana'], E: ['hp', 'hp', 'mana'], W: ['hp', 'hp', 'mana'] }"]] },
  'Stufe II: mehr Gold (1,3,3)': { rules: { stageGold: [0, 1, 3, 3] } },
  'Limit-Schritt billiger (1)': { rules: { limitCost: 1, limitFirstStepCost: 1 } },
  'Erholen +2/+2/+3 (recoverByStage)': { rules: { recoverByStage: [2, 2, 3] } },
  'Kombi A: Patt-Auflösung + Stillstand 40': { ai: { stallDec: 0.15 }, rules: { idleLimit: 40 } },
  'Kombi B: A + Erholen +2/+2/+3': { ai: { stallDec: 0.15 }, rules: { idleLimit: 40, recoverByStage: [2, 2, 3] } },
  'Kombi B mit Stillstand 60': { ai: { stallDec: 0.15 }, rules: { idleLimit: 60, recoverByStage: [2, 2, 3] } },
  'Kombi B mit Stillstand 30': { ai: { stallDec: 0.15 }, rules: { idleLimit: 30, recoverByStage: [2, 2, 3] } },
  'Kombi D: B + Start-Mana 6': { ai: { stallDec: 0.15 }, rules: { idleLimit: 40, recoverByStage: [2, 2, 3] }, patches: [['mana: 4, maxMana: 4, limit: 1', 'mana: 6, maxMana: 6, limit: 1']] },
  'Kombi E: B + Regeneration +2/+2/+3': { ai: { stallDec: 0.15 }, rules: { idleLimit: 40, recoverByStage: [2, 2, 3], regenByStage: [2, 2, 3] } },
  'Kombi F: B + Stufe-I-Monster Limit 3 (II: kein Limit-Schritt)': { ai: { stallDec: 0.15 }, rules: { idleLimit: 40, recoverByStage: [2, 2, 3] }, patches: [["stage1Temple: { F: ['mana'], E: ['mana', 'mana'], W: ['mana'] }", "stage1Temple: { F: ['mana', 'limit'], E: ['mana', 'mana', 'limit'], W: ['mana', 'limit'] }"], ["2: { F: ['limit', 'hp', 'mana'], E: ['limit', 'hp', 'mana'], W: ['limit', 'hp', 'mana'] }", "2: { F: ['hp', 'mana'], E: ['hp', 'mana'], W: ['hp', 'mana'] }"]] },
  'Kombi C: B + Stufe II Gold 3': { ai: { stallDec: 0.15 }, rules: { idleLimit: 40, recoverByStage: [2, 2, 3], stageGold: [0, 1, 3, 3] } },
};
module.exports = { load, VARIANTS };
function stats(N, v) {
  const { M, AI } = load(v.patches); if (v.ai) { AI.setParams(0, v.ai); AI.setParams(1, v.ai); }
  const orig = M.apply; let rec = null;
  M.apply = function (s, a) { const st = s.stage, ph = s.phase, md = s.combat && s.combat.mode, r = orig.apply(this, arguments); if (r && r.ok && rec && !['mark', 'lock'].includes(a.type)) rec[st - 1][ph === 'world' ? 0 : md === 'showdown' ? 2 : 1]++; return r; };
  let r_detail = null; const mon = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; const games = []; let first = 0, second = 0, draw = 0, spd = 0, stuck = 0;
  for (let g = 0; g < N; g++) {
    const f = g % 2, s = M.newGame({ seed: 1000 + g, ai: [true, true], first: f, rules: v.rules || {} }); rec = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; let n = 0;
    while (!s.over && n++ < 20000) { if (!AI.runTurn(s, M.actor(s)).ok) break; }
    if (!s.over || s.showdown < 3 && !s.winner && s.winner !== 0 && s.winner !== null) { stuck++; continue; }
    if (s.winner === null) draw++; else if (s.winner === f) first++; else second++; spd += s.players[f].sp - s.players[1 - f].sp;
    { let st = 1, last = false; s.log.forEach(l => { const t = l.txt, m = /^Abschnitt (\d):/.exec(t); if (m) st = +m[1]; const o = mon[st - 1];
      if (/ greift .+ an\./.test(t) && !/Showdown/.test(t)) { o[0]++; last = true; } else if (last && / besiegt .+/.test(t)) { o[1]++; last = false; } else if (last && / gewinnt den Kampf\./.test(t)) { o[2]++; last = false; } else if (last && /Kein Sieger/.test(t)) { o[3]++; last = false; } }); }
    games.push(rec.map(r => r[0] + r[1] + r[2])); (r_detail = r_detail || []).push(rec.map(r => r.slice()));
  }
  return { games, first, second, draw, spd, stuck, detail: r_detail, mon };
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const pct = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };
if (require.main === module) {
  const N = +process.argv[2] || 1000, only = process.argv[3] ? process.argv[3].split(',') : null;
  console.log('Variante'.padEnd(52), 'Abschn.1 Ø±SD (P90)', 'Abschn.2 Ø±SD (P90)', 'Abschn.3 Ø±SD (P90)', ' kürz/läng', ' Beginner', ' Remis', ' Ø gesamt');
  for (const [name, v] of Object.entries(VARIANTS)) {
    if (only && !only.some(o => name.includes(o))) continue;
    const r = stats(N, v), g = r.games, col = i => g.map(x => x[i]);
    const cell = i => (mean(col(i)).toFixed(0) + '±' + sd(col(i)).toFixed(0) + ' (' + pct(col(i), .9) + ')').padStart(19);
    const rat = mean(g.map(x => Math.min(...x) / Math.max(...x)));
    if (process.argv[4] === 'detail') console.log('   Aufteilung Ø (Welt/Monsterkämpfe/Showdown):', [0, 1, 2].map(i => ['Welt', 'Monster', 'SD'].map((_, k) => mean(r.detail.map(d => d[i][k])).toFixed(0)).join('/')).join('  |  '));
    if (process.argv[4] === 'detail') console.log('   Monsterangriffe je Abschnitt: Spieler siegt / verliert / ohne Sieger:', r.mon.map(o => (o[1] / o[0] * 100).toFixed(0) + '% / ' + (o[2] / o[0] * 100).toFixed(0) + '% / ' + (o[3] / o[0] * 100).toFixed(0) + '%').join('  |  '));
    console.log(name.padEnd(52), cell(0), cell(1), cell(2), rat.toFixed(2).padStart(10), (r.first / (r.first + r.second) * 100).toFixed(0).padStart(8) + '%', (r.draw / g.length * 100).toFixed(1).padStart(5) + '%', mean(g.map(x => x[0] + x[1] + x[2])).toFixed(0).padStart(8), r.stuck ? ' (festgefahren: ' + r.stuck + ')' : '');
  }
}
