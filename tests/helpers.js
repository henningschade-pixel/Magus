// Gemeinsame Hilfen: Regelkern und KI kommen aus der gebauten index.html (siehe tools/balance/load.js).
const { M, AI } = require('../tools/balance/load.js');
const card = id => Object.assign({ card: { id } }, M.parseCard(id));
const cards = ids => ids.map(card);
const STATS = (o) => Object.assign({ mana: 9, maxMana: 9, mag: { F: 3, E: 3, W: 3 }, limit: 3, hp: 9, maxHp: 9 }, o);
// Kampf gegen das Feuermonster mit vorgegebenen Handkarten; me = Seite des Spielers 0, op = Monsterseite
function combatSetup(seed, hand, opts) {
  opts = opts || {};
  const s = M.newGame({ seed: seed || 11, ai: [false, false], first: 0 });
  M.apply(s, { pid: 0, type: 'combat', elem: 'F' });
  const c = s.combat, me = c.sides.a, op = c.sides.b;
  me.stats.limit = opts.limit || 3; me.stats.mag = { F: 3, E: 3, W: 3 }; me.stats.mana = me.stats.maxMana = 9;
  const h = me.deck.hand;
  hand.forEach((id, i) => { h[i] = Object.assign({}, h[i], { id }); });
  for (let i = hand.length; i < h.length; i++) h[i] = null;
  return { s, c, me, op };
}
module.exports = { M, AI, card, cards, STATS, combatSetup };
