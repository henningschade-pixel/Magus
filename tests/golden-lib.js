// Spielt feste Partien KI gegen KI und fasst jede in Kennzahlen plus Hash des Protokolls zusammen.
// Ändert sich eine Regel oder die KI absichtlich, wird golden.json mit `npm run golden` neu erzeugt.
const crypto = require('crypto');
const { M, AI } = require('./helpers.js');
function play(seed, first) {
  const s = M.newGame({ seed, ai: [true, true], first });
  let steps = 0; while (!s.over && steps < 20000) { if (!AI.runTurn(s, M.actor(s)).ok) break; steps++; }
  const h = crypto.createHash('sha1').update(s.log.map(l => l.txt).join('\n')).digest('hex').slice(0, 12);
  return { seed, first, over: s.over, winner: s.winner, sp: s.players.map(p => p.sp), steps, log: s.log.length, hash: h };
}
const SEEDS = Array.from({ length: 24 }, (_, i) => 1000 + i);
const all = () => SEEDS.map((sd, i) => play(sd, i & 1));
module.exports = { play, all };
