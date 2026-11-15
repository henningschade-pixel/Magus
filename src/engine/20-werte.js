/* Magus – Regelkern (Teil 2): Werte, Upgrade-Kosten. */

function newStats() {
  return { gold: 3, hp: 3, maxHp: 3, mana: 4, maxMana: 4, limit: 1, drawLimit: 1, mag: { F: 1, E: 1, W: 1 }, buys: {}, freeDraws: 0, goldGot: 0 };   // goldGot: insgesamt erhaltenes Gold (für die Statistik)
}
function regen(stats, n) {   // n = Gewinn an HP und Mana (Regel regenByStage: je Abschnitt 1/2/3)
  n = n || 1;
  stats.hp = Math.min(stats.maxHp, Math.max(0, stats.hp) + n);
  stats.mana = Math.min(stats.maxMana, stats.mana + n);
}
function regenGain(state) { const r = state.rules.regenByStage; return r ? (r[Math.min(r.length, Math.max(1, state.stage)) - 1] || 1) : 1; }
// Kosten (in Gold) für jeden Schritt des Ausspiellimits: limitCost (Standard 2). Ohne limitCost gilt die ältere Staffelung (erster Schritt limitFirstStepCost, danach 1).
// Steigende Preise (Regel priceRise, seit 0.3.2): Jeder Kauf in einer Kategorie verteuert die nächste Stufe dieser Kategorie um deren Grundpreis (Preis = Grundpreis × (1 + priceRise × bisherige Käufe)).
// Kategorien: hp, mana, limit, slot, draw (Nachziehlimit) und mag (Magie, alle drei Richtungen zusammen, unabhängig von der Stufe); s.buys zählt die Käufe des Spielers.
function bought(s, k) { return (s && s.buys && s.buys[k]) || 0; }
function risen(state, base, s, k) { return base * (1 + (state.rules.priceRise || 0) * bought(s, k)); }
function maxed(s, k, rules) { const m = rules ? rules.maxUpgrades : MAX_UPGRADES; return m > 0 && bought(s, k) >= m; }   // HP und Mana der Spieler: höchstens zwei Ausbauten (Regel maxUpgrades 2; 0 = ohne Obergrenze, so nur in 0.13.2.2). Ohne ‚rules‘ gilt die alte feste Grenze
function buyCount(s, k) { s.buys = s.buys || {}; s.buys[k] = (s.buys[k] || 0) + 1; }
function limitStepCost(state, s) { return risen(state, state.rules.limitCost > 0 ? state.rules.limitCost : (s.limit <= 1 ? state.rules.limitFirstStepCost : 1), s, 'limit'); }
function manaStepCost(state, s) { return risen(state, 1, s, 'mana'); }
function hpStepCost(state, s) { return risen(state, 1, s, 'hp'); }
function slotStepCost(state, s) { return risen(state, 1, s, 'slot'); }
// Bezahlung (seit 0.14): Alles kostet Gold, auch die Magie. Upgrade-Punkte und Tempel gibt es nicht mehr.
function goldTxt(n) { return n + ' Gold'; }
// Preis der nächsten Magiestufe in Gold (seit 0.14, vorher in Tempel-Upgrade-Punkten mit denselben Zahlen): unabhängig von der Stufe, nur die Zahl der bisherigen Magie-Käufe zählt (erstes Upgrade 1, zweites 2, drittes 3 usw.).
function magicCost(state, lv, s) { return risen(state, 1, s, 'mag'); }   // lv bleibt aus Kompatibilitätsgründen Parameter; ohne s der Grundpreis
// Verbesserungen der Monster (Listen ‚stage1Temple‘ und ‚temple‘ in 30-monster.js; die Namen stammen noch aus der Zeit des Spieler-Tempels)
function applyTemple(stats, field) {
  if (field === 'hp') { stats.maxHp++; stats.hp = Math.min(stats.maxHp, stats.hp + 1); }
  else if (field === '-hp') { stats.maxHp = Math.max(1, stats.maxHp - 1); stats.hp = Math.min(stats.maxHp, stats.hp); }   // nur für Monster-Varianten: 1 HP weniger als Preis für etwas anderes
  else if (field === 'mana') { stats.maxMana++; stats.mana = Math.min(stats.maxMana, stats.mana + 1); }
  else if (field === 'limit') stats.limit++;
}
function magicProgress(p) { return (p.stats.mag.F - 1) + (p.stats.mag.E - 1) + (p.stats.mag.W - 1); }
