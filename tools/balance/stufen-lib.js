// Bausteine für die Stufen-Messung (stufen.js): Spielerbauten aus Gold, Tempel, Magie und Bibliothek zusammensetzen
// und gezielt Monsterkämpfe bzw. Showdowns zwischen zwei Bauten austragen (beide Seiten mit der Vorausschau).
const { M, AI } = require('./load.js');
const SUP = M.SUPERIOR, EL = M.ELEMENTS;

// Ausgangsbau: Startwerte eines Spielers, Deck 4/4/4 (Mittel der Startverteilung).
function baseBuild(rules) {
  const r = Object.assign({}, M.DEFAULT_RULES, rules || {});
  return { hp: r.startHp, mana: 4, limit: r.startLimit, slots: M.MIN_SLOTS, mag: { F: 1, E: 1, W: 1 }, buys: { hp: 0, mana: 0, limit: 0, slot: 0, mag: 0 }, temple: { points: 0, level: 0 }, up: 0, gold: 0,
    deck: ['F1', 'F1', 'F1', 'F1', 'E1', 'E1', 'E1', 'E1', 'W1', 'W1', 'W1', 'W1'], hpPer: r.hpPerPoint || 1, rise: r.priceRise || 0, cost: Object.assign({ hp: 1, mana: 1, limit: r.limitCost || 1, slot: 1 }, (rules || {}).cost || {}) };
}
const clone = b => JSON.parse(JSON.stringify(b));
function price(b, k) { return b.cost[k] * (1 + b.rise * b.buys[k]); }
function canBuy(b, k) {
  if (k === 'hp' || k === 'mana') return b.buys[k] < M.MAX_UPGRADES;
  if (k === 'limit') return b.limit < M.MAX_LIMIT;
  return b.slots < M.MAX_SLOTS;
}
function buy(b, k) {   // Gold-Ausbau; false, wenn nicht bezahlbar oder am Maximum
  const c = price(b, k); if (!canBuy(b, k) || b.gold < c) return false;
  b.gold -= c; b.buys[k]++;
  if (k === 'hp') b.hp += b.hpPer; else if (k === 'mana') b.mana++; else if (k === 'limit') b.limit++; else b.slots++;
  return true;
}
function sacrifice(b, n) {   // n Gold auf einmal in den Tempel
  if (n <= 0 || n > b.gold) return false;
  b.gold -= n; b.temple.points += n * (n + 1) / 2;
  while (b.temple.points >= b.temple.level + 1) { b.temple.points -= b.temple.level + 1; b.temple.level++; b.up++; }
  return true;
}
function magicCost(b) { return 1 * (1 + b.rise * b.buys.mag); }
function magic(b, e) { const c = magicCost(b); if (b.mag[e] >= M.MAX_MAGIC || b.up < c) return false; b.up -= c; b.buys.mag++; b.mag[e]++; return true; }

// Bibliothek: k Züge, in denen je eine Aufwertung gelingt. Ziel sind die Farben mit Magie über 1 (höchste zuerst), Karten nur bis zur Magiestufe.
// keep: so viele Karten jeder anderen Farbe bleiben mindestens im Deck (für Verteidigung und Kombos).
function library(b, k, keep) {
  const d = b.deck, cnt = id => d.filter(x => x === id).length, colour = e => d.filter(x => x[0] === e).length;
  const swap = (from, to) => { from.forEach(id => d.splice(d.indexOf(id), 1)); d.push(to); };
  const targets = EL.filter(e => b.mag[e] > 1).sort((x, y) => b.mag[y] - b.mag[x]);
  const cap2 = 6, cap3 = 4;   // Vorrat der Bibliothek je Kartenart
  let done = 0;
  for (; done < k; done++) {
    let ok = false;
    for (const X of targets) {
      const S = SUP[X], T = EL.find(e => e !== X && e !== S), isT = e => targets.includes(e);
      const free = e => colour(e) > (isT(e) ? 0 : keep);
      if (b.mag[X] >= 3 && cnt(X + '3') < cap3) {
        if (cnt(S + '2') > 0 && (!isT(S) || b.mag[S] < 2 || cnt(S + '2') > 1)) { swap([S + '2'], X + '3'); ok = true; break; }
        if (cnt(X + '2') >= 2 && b.limit >= 2 && cnt(X + '1') + cnt(X + '2') + cnt(X + '3') > 3) { swap([X + '2', X + '2'], X + '3'); ok = true; break; }
      }
      if (cnt(X + '2') + cnt(X + '3') < cap2 && cnt(S + '1') > 0 && free(S) && cnt(X + '2') < (b.mag[X] >= 3 ? 2 : cap2)) { swap([S + '1'], X + '2'); ok = true; break; }
      if (b.mag[X] >= 3 && cnt(X + '3') < cap3 && cnt(T + '1') > 0 && free(T) && cnt(S + '2') < cap2) { swap([T + '1'], S + '2'); ok = true; break; }
      if (cnt(X + '1') >= 2 && b.limit >= 2 && cnt(X + '2') < cap2) { swap([X + '1', X + '1'], X + '2'); ok = true; break; }
      if (cnt(S + '1') > 0 && free(S) && cnt(X + '2') < cap2) { swap([S + '1'], X + '2'); ok = true; break; }
    }
    if (!ok) break;
  }
  b.libDone = (b.libDone || 0) + done;
  return done;
}
function label(b) {
  const tiers = EL.map(e => e + ':' + [1, 2, 3].map(t => b.deck.filter(x => x === e + t).length).join('/')).join(' ');
  return 'HP ' + b.hp + ' Mana ' + b.mana + ' Limit ' + b.limit + ' Hand ' + b.slots + ' Magie F' + b.mag.F + ' E' + b.mag.E + ' W' + b.mag.W + ' | Deck ' + tiers + (b.gold ? ' | Gold übrig ' + b.gold : '') + (b.up ? ' | Punkte übrig ' + b.up : '');
}
// Farben eines Baus drehen (F→E→W→F ist NICHT der Überlegenheitskreis; gedreht wird entlang SUPERIOR, damit die Verhältnisse gleich bleiben): n Schritte.
function rotate(b, n) {
  const r = clone(b); let map = { F: 'F', E: 'E', W: 'W' };
  for (let i = 0; i < n; i++) map = { F: SUP[map.F], E: SUP[map.E], W: SUP[map.W] };
  r.mag = {}; EL.forEach(e => { r.mag[map[e]] = b.mag[e]; });
  r.deck = b.deck.map(id => map[id[0]] + id.slice(1));
  return r;
}

function setBuild(s, pid, b) {
  const p = s.players[pid], st = p.stats;
  st.maxHp = st.hp = b.hp; st.maxMana = st.mana = b.mana; st.limit = b.limit; p.slots = b.slots; st.mag = Object.assign({}, b.mag);
  p.deck = { draw: b.deck.map(id => ({ id, uid: s.uid++, locked: false })), hand: Array(b.slots).fill(null), discard: [], marks: [] };
}
function playOut(s) { let n = 0; while (s.phase === 'combat' && !s.over && n++ < 3000) { if (!AI.runTurn(s, M.actor(s)).ok) break; } return s.lastCombat; }

// Ein Monsterkampf: Spieler 0 mit Bau b greift im Abschnitt ‚stage‘ das Monster auf Platz g % 3 an (Monster gewürfelt wie im Spiel).
function monsterFight(b, stage, seed, g, rules) {
  const s = M.newGame({ seed, ai: [true, true], first: 0, rules });
  s.stage = stage; s.showdown = stage - 1; s.monsters = M.spawnForGame(s, stage);
  setBuild(s, 0, b);
  const slot = EL[g % 3], m = s.monsters[slot];
  const dHp = rules && rules.monHp && rules.monHp[stage]; if (dHp) { m.stats.maxHp = Math.max(1, m.stats.maxHp + dHp); m.stats.hp = m.stats.maxHp; }   // Probe: Monster-HP der Stufe verschieben (nur Messung, keine Spielregel)
  const r0 = M.apply(s, { pid: 0, type: 'combat', elem: slot }); if (!r0.ok) throw new Error(r0.error);
  const lc = playOut(s);
  return { el: m.el, form: m.variant.d, label: m.label, win: lc && lc.winner === 'a' ? 1 : 0, lose: lc && lc.winner === 'b' ? 1 : 0, turns: lc ? lc.turns : 0, hp: Math.max(0, s.players[0].stats.hp) };
}
// Ein Showdown zwischen zwei Bauten (Spieler 0 = a, Spieler 1 = b). first: wer zuerst angreift (über die Siegpunkte gesteuert: der Zurückliegende beginnt).
function showdown(a, b, seed, first, rules) {
  const s = M.newGame({ seed, ai: [true, true], first: 0, rules: Object.assign({}, rules, { idleLimit: 1 }) });
  setBuild(s, 0, a); setBuild(s, 1, b);
  s.players[0].sp = first === 0 ? 2 : 3; s.players[1].sp = first === 0 ? 3 : 2;
  s.idleTurns = 5;
  const r0 = M.apply(s, { pid: 0, type: 'draw' }); if (!r0.ok) throw new Error(r0.error);
  if (s.phase !== 'combat' || s.combat.mode !== 'showdown') throw new Error('Showdown nicht gestartet');
  const c = s.combat, att = c.att, lc = playOut(s);
  const w = lc && lc.winner ? (lc.winner === 'a' ? att : 1 - att) : null;
  return { win: w === 0 ? 1 : 0, lose: w === 1 ? 1 : 0, turns: lc ? lc.turns : 0 };
}
module.exports = { M, AI, SUP, EL, baseBuild, clone, price, canBuy, buy, sacrifice, magic, magicCost, library, label, rotate, setBuild, monsterFight, showdown };
