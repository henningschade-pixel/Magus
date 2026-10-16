/* Magus – Regelkern (Teil 2): Werte, Upgrade-Kosten, Tempel. */

function newStats() {
  return { gold: 3, hp: 3, maxHp: 3, mana: 4, maxMana: 4, limit: 1, mag: { F: 1, E: 1, W: 1 }, pending: 0, freeDraws: 0 };
}
function regen(stats, n) {   // n = Gewinn an HP und Mana (Regel regenByStage: je Abschnitt 1/2/3)
  n = n || 1;
  stats.hp = Math.min(stats.maxHp, Math.max(0, stats.hp) + n);
  stats.mana = Math.min(stats.maxMana, stats.mana + n);
}
function regenGain(state) { const r = state.rules.regenByStage; return r ? (r[Math.min(r.length, Math.max(1, state.stage)) - 1] || 1) : 1; }
// Kosten (in Upgrade-Punkten) für jeden Schritt des Ausspiellimits: limitCost (Standard 2). Ohne limitCost gilt die ältere Staffelung (erster Schritt limitFirstStepCost, danach 1).
function limitStepCost(state, s) { return state.rules.limitCost > 0 ? state.rules.limitCost : (s.limit <= 1 ? state.rules.limitFirstStepCost : 1); }
function manaStepCost() { return 1; }
// Gold für die nächste Magiestufe: Index = aktuelle Stufe (Stufe 1 → 2 kostet 1 Gold, Stufe 2 → 3 kostet 3 Gold).
function magicCost(state, lv) { const t = state.rules.magicCost || [0, 1, 2]; return t[lv] === undefined ? lv : t[lv]; }
// Tempel: n Gold ergeben n(n+1)/2 Punkte; die Stufe k+1 kostet k+1 Punkte und gibt einen Upgrade-Punkt.
function pointsForGold(n) { return n * (n + 1) / 2; }
function nextLevelCost(level) { return level + 1; }
function previewTemple(p, amount) {
  let pool = p.temple.points + pointsForGold(amount), level = p.temple.level, gained = 0;
  while (pool >= nextLevelCost(level)) { pool -= nextLevelCost(level); level++; gained++; }
  return { gained, pool, level, need: nextLevelCost(level), points: pointsForGold(amount) };
}
function applyTemple(stats, field) {
  if (field === 'hp') { stats.maxHp++; stats.hp = Math.min(stats.maxHp, stats.hp + 1); }
  else if (field === 'mana') { stats.maxMana++; stats.mana = Math.min(stats.maxMana, stats.mana + 1); }
  else if (field === 'limit') stats.limit++;
}
function magicProgress(p) { return (p.stats.mag.F - 1) + (p.stats.mag.E - 1) + (p.stats.mag.W - 1); }
