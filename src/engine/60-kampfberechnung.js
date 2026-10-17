/* Magus – Regelkern (Teil 6): Kampf (Monsterkämpfe und Showdowns).
   Ein Angriffszug: Karten markieren (erste Karte bestimmt das Element), angreifen; die Gegenseite verteidigt.
   Kombos aus zwei Elementen: Control (F+W), Lähmung (F+E), Lifeflow (E+W); alle drei ergeben eine Ultimate. */

/* ---------- Kampfberechnung ---------- */
function comboLevels(tiers, mag, prim) {
  const pair = (a, b) => {
    if (!tiers[a].length || !tiers[b].length) return 0;
    return Math.max(0, Math.min(3, Math.min(mag[a], mag[b], Math.max(...tiers[a]), Math.max(...tiers[b]))));
  };
  const lv = { fw: pair('F', 'W'), fe: pair('F', 'E'), ew: pair('E', 'W'), ulti: 0 };
  if (tiers.F.length && tiers.E.length && tiers.W.length) {
    lv.ulti = Math.max(0, Math.min(3, Math.min(mag.F, mag.E, mag.W, Math.max(...tiers.F), Math.max(...tiers.E), Math.max(...tiers.W))));
  }
  // Geordnete Kombos: Die Farbe der ersten Karte bestimmt die Rolle, die zweite Farbe die Wirkung. Bei allen drei Farben gilt nur die Ultimate.
  lv.ord = null;
  const present = ['F', 'E', 'W'].filter(e => tiers[e].length);
  if (prim && present.length === 2 && present.includes(prim)) {
    const other = present.find(e => e !== prim), key = ORD_COMBO[prim + other];
    const eff = e => tiers[e].reduce((a, t) => a + Math.min(t, mag[e]), 0);   // je Farbe die Summe der Kartenwerte (höchstens Magiestufe je Karte): mehrere Karten ergeben zusammen die Stufe
    lv.ord = { key, lvl: Math.max(0, Math.min(3, eff(prim), eff(other))), el: key === 'bm' ? 'F' : key === 'bg' ? 'E' : null };
  }
  return lv;
}
// Rot = Feuer (Lähmung), Blau = Wasser (Defensiv), Grün = Erde (Heilend): ra Flüche, rm Mana-Entzug, bm/bg roter/grüner Spiegel, gh Heilung, gr Marker entfernen + Nachziehen.
const ORD_COMBO = { FE: 'ra', FW: 'rm', WF: 'bm', WE: 'bg', EW: 'gh', EF: 'gr' };
// Kombostufen auf die Plätze fw (Spiegel), fe (Flüche), ew (Marker entfernen), rm (Mana-Entzug), gh (Heilung) abgebildet.
function levelsFor(ev) {
  const out = { fw: 0, fe: 0, ew: 0, rm: 0, gh: 0, ulti: ev.levels.ulti }, o = ev.ord;
  if (o && o.lvl > 0 && !(ev.levels.ulti > 0)) out[{ ra: 'fe', rm: 'rm', bm: 'fw', bg: 'fw', gh: 'gh', gr: 'ew' }[o.key]] = o.lvl;
  return out;
}
// Fluchkarten kosten beim Ausspielen je 1 Mana und zählen nicht als Element.
function evalAttack(stats, cards) {
  if (!cards.length) return { valid: false, reason: 'Keine Karte gewählt.' };
  const curses = cards.filter(c => c.curse), normals = cards.filter(c => !c.curse);
  const prim = normals.length ? normals[0].el : null;
  const same = prim ? normals.filter(c => c.el === prim) : [];
  const cost = normals.length + curses.reduce((n, c) => n + c.tier, 0);
  let damage = 0; same.forEach(c => { damage += Math.min(c.tier, stats.mag[prim]); });
  const tiers = { F: [], E: [], W: [] }; normals.forEach(c => tiers[c.el].push(c.tier));
  const levels = comboLevels(tiers, stats.mag, prim);
  if (stats.noCombo) for (const k of stats.noCombo) levels[k] = 0; // nur für Simulationen
  const ord = levels.ord && !(stats.noCombo && stats.noCombo.includes(levels.ord.key)) ? levels.ord : null;
  return { valid: true, prim, cost, damage, levels, ord, curses: curses.length, affordable: stats.mana >= cost };
}
function evalDefense(stats, cards, color) {
  if (!cards.length) return { valid: true, cost: 0, block: 0, empty: true };
  const curses = cards.filter(c => c.curse), normals = cards.filter(c => !c.curse);
  const el = normals.length ? normals[0].el : null;
  const same = normals.filter(c => c.el === el), other = normals.filter(c => c.el !== el);
  const ulti = other.length && new Set(other.map(c => c.el)).size > 1;   // alle drei Farben: Ultimate auch in der Verteidigung
  if (el && el !== color && el !== SUPERIOR[color]) return { valid: false, reason: NAMES[el] + ' kann nicht gegen ' + NAMES[color] + ' verteidigen.' };
  const cost = curses.reduce((n, c) => n + c.tier, 0) + (el === color ? same.length : 0) + other.length;   // Verteidigung in der überlegenen Farbe ist gratis, Kombokarten kosten 1 Mana
  let block = 0; same.forEach(c => { block += Math.min(c.tier, stats.mag[el]); });
  const out = { valid: true, el, cost, block, affordable: stats.mana >= cost, levels: { fw: 0, fe: 0, ew: 0, ulti: 0 }, ord: null };
  if (other.length) { const tiers = { F: [], E: [], W: [] }; normals.forEach(c => tiers[c.el].push(c.tier)); const lv = comboLevels(tiers, stats.mag, el); out.ord = !ulti && lv.ord && lv.ord.lvl > 0 ? lv.ord : null; if (ulti) out.levels.ulti = lv.ulti; }
  return out;
}

