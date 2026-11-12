// Verteilt Kampf-Aufträge der Stufen-Messung auf mehrere Prozesse.
// Auftrag: { kind: 'monster' | 'showdown', a: Bau, b: Bau (nur Showdown), stage, N, seed0, sim, rules }
// Ergebnis: { n, win, lose, byEl: { F: { n, win, lose }, ... }, turns, hp }
const { fork } = require('child_process');
const os = require('os');
if (process.argv[2] === '__w') {
  const L = require('./stufen-lib.js');
  process.on('message', ({ id, job }) => {
    L.AI.setSearch({ sim: job.sim || 0, ms: 0 });
    const out = { n: 0, win: 0, lose: 0, byEl: {}, turns: 0, hp: 0 };
    for (let g = 0; g < job.N; g++) {
      let r;
      if (job.kind === 'showdown') r = L.showdown(job.a, job.b, (job.seed0 || 7000) + (g >> 1), g & 1, job.rules || {});
      else {
        r = L.monsterFight(job.a, job.stage, (job.seed0 || 4000) + Math.floor(g / 3), g, job.rules || {});
        const e = out.byEl[r.el] || (out.byEl[r.el] = { n: 0, win: 0, lose: 0 }); e.n++; e.win += r.win; e.lose += r.lose;
      }
      out.n++; out.win += r.win; out.lose += r.lose; out.turns += r.turns; out.hp += r.hp || 0;
    }
    process.send({ id, out });
  });
} else {
  module.exports = function run(jobs, onDone) {
    return new Promise(resolve => {
      const n = Math.max(1, Math.min(jobs.length, +process.env.MAGUS_PROCS || os.cpus().length));
      const W = Array.from({ length: n }, () => fork(__filename, ['__w'])), res = new Array(jobs.length);
      let next = 0, done = 0;
      const feed = w => { if (next < jobs.length) { const id = next++; w.send({ id, job: jobs[id] }); } };
      W.forEach(w => { w.on('message', ({ id, out }) => { res[id] = out; done++; if (onDone) onDone(id, out, done); if (done === jobs.length) { W.forEach(x => x.kill()); resolve(res); } else feed(w); }); feed(w); });
      if (!jobs.length) { W.forEach(x => x.kill()); resolve(res); }
    });
  };
}
