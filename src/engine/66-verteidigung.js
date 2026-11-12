/* ---------- Kampfablauf 5: Verteidigung (Ergebnis, Vorschau, Ausführung) ---------- */
// Ergebnis einer Verteidigung (Schild, Restschaden): gemeinsam für die Ausführung (execDefense) und die Vorschau der Oberfläche (previewDefense). Seit 0.8 gibt es nur noch das Schild (stats.rainbow): Es mindert den nicht geblockten Schaden gegen jede Farbe und verliert je gemindertem Schaden eine Ladung; einen Rückwurf gibt es nicht mehr (die Felder refl, lostStd, std und die Farbe bleiben der Form halber). rb: Ladungen nach dem Kombo; ohne Angabe zählen die Ladungen, die jetzt liegen.
function defenseOutcome(stats, color, pending, block, mir, std, rb) {
  const r0 = rb === undefined ? (stats.rainbow || 0) : rb, missing = Math.max(0, pending - block), absorb = Math.min(r0, missing);
  return { mLvl: r0, absorb, refl: 0, used: absorb, lostStd: 0, lostRb: absorb, lost: absorb, std: 0, rb: r0, leftover: missing - absorb };
}
// Was ein Kombo der Verteidigung für den laufenden Angriff ändert: Schild und Falle, die in der Verteidigung gestellt werden, wirken erst nach ihr (seit 0.7.2.23 für Schilde, seit 0.8 auch für die Falle). Die Heilung wirkt seit 0.5.4 wieder nach dem Schaden (heal: Stufe, hp: HP vor dem Schaden).
function defenseComboPre(stats, ev, color) {
  const lvs = ev && ev.ord && !(ev.levels && ev.levels.ulti > 0) ? levelsFor(ev) : null, rb = stats.rainbow || 0;
  return { heal: lvs ? lvs.gh || 0 : 0, hp: stats.hp, mir: rb, std: 0, rb };
}
// Vorschau für die Knöpfe „Verteidigen“ und „Passen“, ohne etwas zu ändern: Mana-Kosten, Block, Restschaden und die HP danach (beim Verteidiger und, durch den Spiegelrückwurf, beim Angreifer). null, wenn gerade keine Verteidigung ansteht oder die Auswahl nicht geht.
function previewDefense(state, passOnly) {
  const c = state.combat;
  if (!c || c.forced || c.action !== 'defense') return null;
  const side = c.sides[c.turn], att = c.sides[c.turn === 'a' ? 'b' : 'a'];
  let block = 0, cost = 0, pre = defenseComboPre(side.stats, null, c.color);   // Heilung (heal) wirkt nach dem Schaden
  if (!passOnly) {
    const sel = selection(side.deck);
    if (sel.length) { const ev = evalDefense(side.stats, sel, c.color, { combo: allowed(state, 'defense', 'combo') }); if (!ev.valid || ev.affordable === false) return null; block = ev.block || 0; cost = ev.cost || 0; pre = defenseComboPre(side.stats, ev, c.color); }
  }
  const o = defenseOutcome(side.stats, c.color, c.pending, block, pre.mir, pre.std, pre.rb);
  return Object.assign({ who: side.ctrl, att: att.ctrl, cost, block, heal: pre.heal, hpAfter: pre.hp - o.leftover > 0 ? healedHp(side.stats, pre.hp - o.leftover, pre.heal) : 0, attHpAfter: Math.max(0, att.stats.hp - o.refl) }, o);
}
function execDefense(state, passOnly, how) {   // how: 'recover' | 'draw' (Zug ohne Verteidigung, der Schaden wird hingenommen), sonst Passen
  const c = state.combat, side = c.sides[c.turn], c0pending = c.pending;
  const d = side.deck;
  let block = 0, cost = 0, sel = [], defEv = null;
  if (!passOnly) {
    sel = selection(d);
    const ev = evalDefense(side.stats, sel, c.color, { combo: allowed(state, 'defense', 'combo') });
    if (!ev.valid) return fail(ev.reason);
    if (ev.affordable === false) return fail('Zu wenig Mana (' + ev.cost + ' nötig).');
    block = ev.block || 0; cost = ev.cost || 0; defEv = ev;
  }
  side.stats.mana -= cost;
  // Passen in der Verteidigung bringt kein Mana (nur im Angriffszug gibt es Erholen)
  if (sel.length) consumeSelection(d, sel); else d.marks = [];
  const attacker = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const defEchoOld = side.stats.echo, defEchoUsed = !!(defEv && defEv.levels && defEv.levels.echo);   // Echo (seit 0.9), wie im Angriff; seit 0.9.6 hinterlässt auch eine Verteidigung ohne Kombo ein Echo in der Farbe ihrer ersten Karte
  if (defEv && defEv.el && allowed(state, 'defense', 'echo')) side.stats.echo = defEv.el;   // Farbe der ersten Karte (bei der Ultimate nicht die der Schlusskarte)
  // Seit 0.4 wirkt der Kombo zuerst, danach die Verteidigung: Ein Spiegel dieser Farbe wirkte früher schon gegen den Angriff, auf den verteidigt wird; seit 0.7.2.23 stellt ihn die Verteidigung erst nach dem Schaden. Seit 0.5.4 gilt das nicht mehr für die Heilung: Sie wirkt wieder nach Angriff und Verteidigung (Zerrüttung und die übrigen Kombos bleiben davor).
  if (defEv && defEv.levels && defEv.levels.ulti > 0) defenseUltimate(state, side, attacker, defEv);
  const early = defEv && defEv.ord ? defenseEarlyCombos(state, c, side, attacker, defEv, defEchoUsed, defEchoOld) : { lateShield: 0, lateTrap: 0, healLvl: 0 };
  const lateShield = early.lateShield, lateTrap = early.lateTrap, healLvl = early.healLvl;   // Schild und Falle, die in dieser Verteidigung gestellt werden, wirken erst nach ihr, ebenso die Heilung
  // Schild (dauerhaft, 1 bis 3 Ladungen): Er mindert den nicht geblockten Schaden gegen jede Farbe und verliert dafür je geminderten Schaden eine Ladung. Das gilt auch beim Passen.
  const { absorb, used, lost, rb, leftover } = defenseOutcome(side.stats, c.color, c.pending, block);
  const hpPre = { [side.ctrl]: side.stats.hp, [attacker.ctrl]: attacker.stats.hp };   // HP vor dem Schaden, aber nach dem Kombo (Oberfläche zeigt sie, bis die Geschosse einschlagen)
  side.stats.hp = side.stats.hp - leftover;   // vorläufig, die Heilung (seit 0.5.4 nach dem Schaden) gleicht ihn noch aus; danach nie unter 0
  const defEl = sel.length && sel[0].el && !sel[0].curse ? sel[0].el : c.color;
  const defFx = { kind: 'defense', rec: !!passOnly, who: side.ctrl, to: attacker.ctrl, attElem: c.color, defElem: defEl, pending: c.pending, block, hpPre, afterCombo: !!(defEv && (defEv.ord || (defEv.levels && defEv.levels.ulti > 0))) };   // hpPre: HP vor dem Schaden, die Oberfläche zeigt sie, bis die Geschosse einschlagen
  log(state, side.name + (passOnly ? (how === 'recover' ? ' erholt sich und nimmt den Schaden hin' : how === 'draw' ? ' zieht Karten nach und nimmt den Schaden hin' : ' passt und nimmt den Schaden hin') : ' verteidigt' + (block ? ' (Block ' + block + ')' : ' ohne Block')) + ' und verliert ' + leftover + ' HP' + '.', side.ctrl, defFx);
  if (used > 0) {
    side.stats.rainbow = Math.max(0, (side.stats.rainbow || 0) - lost); if (!side.stats.rainbow) delete side.stats.rainbow;
    log(state, 'Schild: ' + side.name + ' mindert den Schaden um ' + absorb + ' und verliert ' + lost + ' Ladung' + (lost === 1 ? '' : 'en') + '.', side.ctrl, undefined);
    // Schild-Effekt (Oberfläche, Grafik des Multischilds, elem 'R'): läuft in der Verteidigungsanimation, vor dem Schaden auf den HP
    defFx.mirror = { hpPre, elem: 'R', markers: rb, broken: lost, who: side.ctrl, att: attacker.ctrl, r: 0, abs: absorb, d: c.pending, blk: block };
  }
  if (healLvl > 0 && side.stats.hp > 0) defenseLateHeal(state, side, attacker, defEv, healLvl);
  if (lateShield > 0 || (lateTrap > 0 && side.stats.hp > 0)) defenseLateSetup(state, side, attacker, defEv, lateShield, lateTrap);
  side.stats.hp = Math.max(0, side.stats.hp);
  const attSide = attacker;   // wer gerade angegriffen hat: seine Angriffsphase endet mit dieser Verteidigung
  c.action = 'attack'; c.color = null; c.pending = 0; c.lfp = null;
  if (!hpDecided(state)) deathTick(state, attSide, c.atkTurns || 0);   // Stufe 2 (Schaden nach der Verteidigung, samt Heilung) ist abgeschlossen; erst wenn dabei niemand auf 0 HP fiel, folgen als Stufe 3 die Dauereffekte (atkTurns zählt den Angriff dieser Phase schon mit)
  const res = finishStep(state, { k: 'V', who: side.key === 'a' ? 0 : 1, v: block, b: c0pending, left: leftover });
  return { ok: true, combatEnd: res };
}
// Ultimate in der Verteidigung: je nach Farbe der Schlusskarte Todesfluch für den Angreifer (Feuer), Meditation (Erde) oder Erleuchtung (Wasser) für den Verteidiger
function defenseUltimate(state, side, attacker, defEv) {
  const uel = defEv.ultiEl || defEv.el;
  if (uel !== 'E' && uel !== 'W' && attacker.stats.deathPhase === undefined) attacker.stats.deathPhase = attacker.stats.death || 0;
  const u = castUltimate(side, attacker, uel, defEv.levels.ulti);
  log(state, side.name + ' wirkt eine Ultimate: ' + u.text + '.', side.ctrl, uel === 'E' || uel === 'W' ? Object.assign(u.fx, { first: true }) : { kind: 'aggro', who: side.ctrl, to: attacker.ctrl, n: defEv.levels.ulti, first: true, ult: true });
}
// Kombos, die vor dem Schaden wirken (Hellsicht, Lähmung, Zerrüttung …); liefert die Stufen von Schild, Falle und Heilung, die erst nach dem Schaden wirken.
function defenseEarlyCombos(state, c, side, attacker, defEv, defEchoUsed, defEchoOld) {
  const lvs = levelsFor(defEv), plan = [], texts = [], fxs = [];
  for (const k of ['hs', 'fe', 'ew']) if (lvs[k] > 0) plan.push([k, lvs[k]]);
  const lateShield = lvs.sh || 0, lateTrap = lvs.tr || 0;   // Heilung (gh), Schild und Falle wirken erst nach dem Schaden, Zerrüttung und die übrigen Kombos davor
  const healLvl = lvs.gh || 0;
  if (defEchoUsed) texts.push('Echo (' + NAMES[defEchoOld] + '): Kombo +1 Stufe');
  applyComboPlan(state, side, attacker, plan, defEv, texts, fxs);
  c.lfp = null;
  fxs.forEach(f => { f.first = true; });   // Oberfläche: Kombo-Animation läuft vor der Verteidigungsanimation
  if (texts.length) log(state, side.name + ' wirkt einen Kombo: ' + texts.join(', ') + '.', side.ctrl, fxs.length ? fxs : undefined);
  return { lateShield, lateTrap, healLvl };
}
// Heilung nach Angriff und Verteidigung (seit 0.5.4): gleicht den Schaden nachträglich aus, höchstens bis zum Maximum; seit 0.7.6.2 nur, wenn der Verteidiger nach dem Schaden noch über 0 HP steht (sonst ist er besiegt und die Heilung verfällt)
function defenseLateHeal(state, side, attacker, defEv, healLvl) {
  const hTexts = [], hFxs = [];
  applyComboPlan(state, side, attacker, [['gh', healLvl]], defEv, hTexts, hFxs);
  hFxs.forEach(f => { f.late = true; });   // Oberfläche: Heilungsanimation nach der Verteidigungsanimation
  log(state, side.name + ' heilt nach der Verteidigung: ' + hTexts.join(', ') + '.', side.ctrl, hFxs);
}
// Schild und Falle nach Angriff und Verteidigung: gelten erst für den nächsten Angriff
function defenseLateSetup(state, side, attacker, defEv, lateShield, lateTrap) {
  const mTexts = [], mFxs = [], plan = [];
  if (lateTrap > 0 && side.stats.hp > 0) plan.push(['tr', lateTrap]);
  if (lateShield > 0) plan.push(['sh', lateShield]);
  applyComboPlan(state, side, attacker, plan, defEv, mTexts, mFxs);
  mFxs.forEach(f => { f.late = true; });
  log(state, side.name + ' stellt nach der Verteidigung: ' + mTexts.join(', ') + '.', side.ctrl, mFxs);
}

