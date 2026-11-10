/* Magus – Regelkern (Teil 6): Kampf (Monsterkämpfe und Showdowns).
   Ein Angriffszug: Karten markieren (erste Karte bestimmt das Element), angreifen; die Gegenseite verteidigt.
   Kombos aus zwei Elementen (seit 0.9.9 bestimmt die Sekundärfarbe, die zweite Farbe, ihren Charakter: Rot Schaden, Blau variabel, Grün Heilung/Verbesserung); alle drei Farben ergeben eine Ultimate, deren Wirkung die Farbe der zuletzt markierten Karte bestimmt (Feuer Todesfluss, Erde Heilfluss, Wasser Manafluss; bis 0.9.8 bestimmte die erste Karte die Ultimate). */

/* ---------- Kampfberechnung ---------- */
function comboLevels(tiers, mag, prim) {
  const pair = (a, b) => {
    if (!tiers[a].length || !tiers[b].length) return 0;
    return Math.max(0, Math.min(3, Math.min(mag[a], mag[b], Math.max(...tiers[a]), Math.max(...tiers[b]))));
  };
  const lv = { fw: pair('F', 'W'), fe: pair('F', 'E'), ew: pair('E', 'W'), ulti: 0 };
  if (tiers.F.length && tiers.E.length && tiers.W.length) {
    const sum = e => tiers[e].reduce((n, t) => n + Math.min(t, mag[e]), 0);   // wie bei den geordneten Kombos: mehrere Karten einer Farbe ergeben zusammen die Stufe (W1 + W1 = 2)
    lv.ulti = Math.max(0, Math.min(3, sum('F'), sum('E'), sum('W')));
  }
  // Geordnete Kombos: Die Farbe der ersten Karte (Primärfarbe) wählt unter den beiden Kombos der zweiten Farbe (Sekundärfarbe), die den Charakter bestimmt. Bei allen drei Farben gilt nur die Ultimate.
  lv.ord = null;
  const present = ['F', 'E', 'W'].filter(e => tiers[e].length);
  if (prim && present.length === 2 && present.includes(prim)) {
    const other = present.find(e => e !== prim), key = ORD_COMBO[prim + other];
    const eff = e => tiers[e].reduce((a, t) => a + Math.min(t, mag[e]), 0);   // je Farbe die Summe der Kartenwerte (höchstens Magiestufe je Karte): mehrere Karten ergeben zusammen die Stufe
    lv.ord = { key, lvl: Math.max(0, Math.min(3, eff(prim), eff(other))), other };   // other: Farbe der zweiten Karten (für das Echo)
  }
  return lv;
}
// Schlüssel = Primärfarbe + Sekundärfarbe (F Rot/Feuer, W Blau/Wasser, E Grün/Erde). Seit 0.9.9 bestimmt die Sekundärfarbe den Charakter: Rot (Schaden): wt Falle (Blau + Rot), ra Lähmung (Grün + Rot); Blau (variabel): hs Hellsicht (Rot + Blau), ws Schild (Grün + Blau); Grün (Heilung/Verbesserung): gh Heilung (Rot + Grün), gr Läuterung (Blau + Grün).
const ORD_COMBO = { WF: 'wt', EF: 'ra', FW: 'hs', EW: 'ws', FE: 'gh', WE: 'gr' };
// Kombostufen auf die Plätze hs (Hellsicht), tr (Falle), sh (Schild), fe (Flüche), ew (Marker entfernen), gh (Heilung) abgebildet.
function levelsFor(ev) {
  const out = { hs: 0, tr: 0, sh: 0, fe: 0, ew: 0, gh: 0, ulti: ev.levels.ulti }, o = ev.ord;
  if (o && o.lvl > 0 && !(ev.levels.ulti > 0)) out[{ ra: 'fe', wt: 'tr', hs: 'hs', ws: 'sh', gh: 'gh', gr: 'ew' }[o.key]] = o.lvl;
  return out;
}
// Echo (seit 0.9): Seit 0.9.6 hinterlässt jede Nutzung von Primärmagie (Kombo, Ultimate, aber auch Angriff und Verteidigung ohne Kombo) bei ihrer Seite ein Echo in der Farbe der ersten Karte (stats.echo, kein Marker, nicht läuterbar; die nächste Nutzung erneuert es). Enthält der nächste Kombo eine Sekundärkarte in der Farbe des Echos, steigt seine Stufe um 1 (höchstens 3). Bei der Ultimate ist seit 0.9.9 die zuletzt markierte Karte die Sekundärkarte (ultiEl).
function echoBoost(stats, lv, ord, ultiEl) {
  const e = stats && stats.echo; if (!e) return;
  if (lv.ulti > 0) { if (ultiEl && e === ultiEl && lv.ulti < MAX_LVL_ECHO) { lv.ulti++; lv.echo = true; } }   // Ultimate: die Schlusskarte (Farbe ultiEl) ist die Sekundärkarte
  else if (ord && ord.lvl > 0 && ord.other === e && ord.lvl < MAX_LVL_ECHO) { ord.lvl++; ord.echo = true; lv.echo = true; }   // lv.echo nur, wenn die Stufe wirklich steigt
}
const MAX_LVL_ECHO = 3;
// Fluchkarten kosten beim Ausspielen je 1 Mana und zählen nicht als Element. Offen liegende Hellsichtkarten (c.free) kosten kein Mana.
// opt.combo === false: In dieser Phase sind Kombos abgeschaltet (Einstellung allowAtk/allowDef): nur Karten einer Farbe.
function evalAttack(stats, cards, opt) {
  if (!cards.length) return { valid: false, reason: 'Keine Karte gewählt.' };
  const curses = cards.filter(c => c.curse), normals = cards.filter(c => !c.curse);
  const prim = normals.length ? normals[0].el : null, lastEl = normals.length ? normals[normals.length - 1].el : null;   // lastEl: Farbe der zuletzt markierten Karte (bestimmt die Ultimate, seit 0.9.9)
  if (opt && opt.combo === false && normals.some(c => c.el !== prim)) return { valid: false, reason: 'Kombos sind in dieser Phase abgeschaltet (Einstellungen): nur Karten einer Farbe.' };
  const same = prim ? normals.filter(c => c.el === prim) : [];
  const cost = normals.filter(c => !c.free).length + curses.reduce((n, c) => n + c.tier, 0);
  let damage = 0; same.forEach(c => { damage += Math.min(c.tier, stats.mag[prim]); });
  const tiers = { F: [], E: [], W: [] }; normals.forEach(c => tiers[c.el].push(c.tier));
  const levels = comboLevels(tiers, stats.mag, prim);
  if (stats.noCombo) for (const k of stats.noCombo) levels[k] = 0; // nur für Simulationen
  const ord = levels.ord && !(stats.noCombo && stats.noCombo.includes(levels.ord.key)) ? levels.ord : null;
  echoBoost(stats, levels, ord, lastEl);   // Echo des letzten Kombos (seit 0.9)
  return { valid: true, prim, cost, damage, levels, ord, curses: curses.length, affordable: stats.mana >= cost, ultiEl: levels.ulti > 0 ? lastEl : null };
}
function evalDefense(stats, cards, color, opt) {
  if (!cards.length) return { valid: true, cost: 0, block: 0, empty: true };
  const curses = cards.filter(c => c.curse), normals = cards.filter(c => !c.curse);
  const el = normals.length ? normals[0].el : null, lastEl = normals.length ? normals[normals.length - 1].el : null;   // lastEl bestimmt die Ultimate (seit 0.9.9)
  const same = normals.filter(c => c.el === el), other = normals.filter(c => c.el !== el);
  if (opt && opt.combo === false && other.length) return { valid: false, reason: 'Kombos sind in dieser Phase abgeschaltet (Einstellungen): nur Karten einer Farbe.' };
  const ulti = other.length && new Set(other.map(c => c.el)).size > 1;   // alle drei Farben: Ultimate auch in der Verteidigung
  if (el && el !== color && el !== SUPERIOR[color]) return { valid: false, reason: NAMES[el] + ' kann nicht gegen ' + NAMES[color] + ' verteidigen.' };
  const cost = curses.reduce((n, c) => n + c.tier, 0) + (el === color ? same.filter(c => !c.free).length : 0) + other.filter(c => !c.free).length;   // Verteidigung in der überlegenen Farbe ist gratis, Kombokarten kosten 1 Mana
  let block = 0; same.forEach(c => { block += Math.min(c.tier, stats.mag[el]); });
  const out = { valid: true, el, cost, block, affordable: stats.mana >= cost, levels: { fw: 0, fe: 0, ew: 0, ulti: 0 }, ord: null, ultiEl: null };
  if (other.length) { const tiers = { F: [], E: [], W: [] }; normals.forEach(c => tiers[c.el].push(c.tier)); const lv = comboLevels(tiers, stats.mag, el); echoBoost(stats, lv, lv.ord, lastEl); out.ord = !ulti && lv.ord && lv.ord.lvl > 0 ? lv.ord : null; if (ulti) { out.levels.ulti = lv.ulti; if (lv.ulti > 0) out.ultiEl = lastEl; } if (lv.echo) out.levels.echo = true; }
  return out;
}

