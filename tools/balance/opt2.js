// Koordinatenabstieg gegen einen Pool von Gegnern (nicht nur gegen sich selbst): node tools/balance/opt2.js <Runden> <Partien je Test> [Start-JSON]
// Im reinen Selbstspiel schaukeln sich beide KIs auf "erst alles ausbauen, dann angreifen" hoch, was gegen einen früh angreifenden Menschen verliert.
// Darum spielt jeder Kandidat gegen den Champion und gegen frühe Angreifer. Übernommen wird ein Wert, wenn die mittlere Verbesserung gegenüber dem Champion klar ist und sich bestätigt.
const { fork } = require('child_process'), fs = require('fs'), path = require('path');
if (process.argv[2] === '__worker') {
  const { match } = require('./tune.js'); process.on('message', m => { process.send({ id: m.id, r: match(m.N, m.a, m.b, m.rules, m.seed0) }); });
} else {
  const R = +process.argv[2] || 2, N = +process.argv[3] || 600, rules = {};
  const { AI } = require('./load.js'); const D = AI.DEFAULTS;
  const STEP = eval('(' + /const STEP=(\{[^}]*\})/.exec(fs.readFileSync(path.join(__dirname, 'opt.js'), 'utf8'))[1] + ')');
  let champ = Object.assign({}, D, JSON.parse(process.argv[4] || '{}'));
  const OPPS = [null, { cBase: 40, oHits: 2, oFree: 5 }, { cBase: 30, cWt: 4, oFree: 4 }, { cBase: 36, oHits: 3, oFree: 3, cHp: 1.2 }];   // null = der Champion selbst
  const only = process.env.PARAMS ? process.env.PARAMS.split(',') : Object.keys(STEP);
  const workers = [0, 1, 2, 3].map(() => { const w = fork(__filename, ['__worker']); w.busy = false; return w; });
  let nid = 0; const pending = new Map(), queue = [];
  workers.forEach(w => w.on('message', m => { w.busy = false; const p = pending.get(m.id); pending.delete(m.id); p(m.r); pump(); }));
  function pump() { for (const w of workers) { if (w.busy || !queue.length) continue; const j = queue.shift(); w.busy = true; pending.set(j.id, j.res); w.send(j.msg); } }
  const run = (a, b, seed0, n) => new Promise(res => { const id = nid++; queue.push({ id, res, msg: { id, a, b, N: n || N, rules, seed0 } }); pump(); });
  // Gesamtwert: mittlerer Siegquoten-Unterschied zum Champion über alle Gegner (Gegner = Champion: Vergleich mit 50 %)
  async function score(cand, seed0, n) {
    const parts = await Promise.all(OPPS.map(async (o, i) => { const opp = o ? Object.assign({}, champ, o) : champ; const r = await run(cand, opp, seed0 + i * 101, n); return r; }));
    return parts;
  }
  (async () => {
    const log = (...a) => { const t = a.join(' '); console.log(t); fs.appendFileSync(path.join(__dirname, 'opt2.log'), t + '\n'); };
    for (let r = 0; r < R; r++) {
      const seed0 = 40000 + r * 997;
      const base = await Promise.all(OPPS.map(async (o, i) => o ? await run(champ, Object.assign({}, champ, o), seed0 + i * 101) : { share: 0.5, se: Math.sqrt(0.25 / N) }));
      log('Runde', r + 1, 'Champion gegen Pool:', base.map(b => (100 * b.share).toFixed(1) + '%').join(' | '));
      const cands = []; for (const k of only) for (const dir of [1, -1]) { const v = +(champ[k] + dir * STEP[k]).toFixed(3); if (['limitA', 'slotA', 'manaA', 'hpA', 'limitB', 'slotB', 'minHp', 'minMana', 'oHits', 'stallFrom', 'keepB', 'xPen', 'xCost', 'xHp', 'xHor', 'tHorizon', 'sRisk', 'sZero', 'fleeSafe', 'fleeHp', 'fleeA', 'fleeA0', 'fleeW', 'fleeL', 'fleeLHp', 'fleeLMana', 'fleeHits', 'mRes', 'mResHp', 'mResL', 'mResBlk', 'tRace', 'tAlive', 'tLoot'].includes(k) && v < 0) continue; cands.push({ k, v }); }
      const res = [];
      for (const c of cands) {   // nacheinander in Gruppen, damit der Speicher klein bleibt
        const parts = await score(Object.assign({}, champ, { [c.k]: c.v }), seed0, N);
        const gain = parts.reduce((a, p, i) => a + p.share - base[i].share, 0) / OPPS.length, se = Math.sqrt(parts.reduce((a, p, i) => a + p.se * p.se + base[i].se * base[i].se, 0)) / OPPS.length;
        res.push({ ...c, gain, se, parts });
      }
      res.sort((a, b) => b.gain - a.gain);
      log('  beste Kandidaten:', res.slice(0, 5).map(x => x.k + '=' + x.v + ' ' + (100 * x.gain).toFixed(1) + 'pp').join(' | '));
      let acc = 0;
      for (const c of res.slice(0, 5)) {
        if (c.gain < 1.5 * c.se) break;
        const cand = Object.assign({}, champ, { [c.k]: c.v });
        const parts = await score(cand, seed0 + 7000, N * 2), b2 = await Promise.all(OPPS.map(async (o, i) => o ? await run(champ, Object.assign({}, champ, o), seed0 + 7000 + i * 101, N * 2) : { share: 0.5, se: Math.sqrt(0.25 / (2 * N)) }));
        const gain = parts.reduce((a, p, i) => a + p.share - b2[i].share, 0) / OPPS.length, se = Math.sqrt(parts.reduce((a, p, i) => a + p.se * p.se + b2[i].se * b2[i].se, 0)) / OPPS.length;
        const ok = gain > 1.5 * se && parts.every((p, i) => p.share - b2[i].share > -2 * se);
        log('  Bestätigung', c.k + '=' + c.v, (100 * gain).toFixed(1) + 'pp', ok ? 'übernommen' : 'verworfen');
        if (ok) { champ = cand; acc++; }
      }
      const diff = {}; for (const k of Object.keys(champ)) if (champ[k] !== D[k]) diff[k] = champ[k];
      log('Champion-Änderungen:', JSON.stringify(diff));
      fs.writeFileSync(path.join(__dirname, 'champion2.json'), JSON.stringify(diff, null, 1));
      if (!acc && r > 0) break;
    }
    workers.forEach(w => w.kill()); process.exit(0);
  })();
}
