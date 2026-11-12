/* ---------- Kampfablauf 4: Angriff, Fliehen, Erholen ---------- */
function execAttack(state) {
  const c = state.combat, side = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  const d = side.deck, sel = selection(d);
  const ev = evalAttack(side.stats, sel, { combo: allowed(state, 'attack', 'combo') });
  if (!ev.valid) return fail(ev.reason);
  if (!ev.affordable) return fail('Zu wenig Mana (' + ev.cost + ' nötig).');
  side.passed = 0;   // ein Angriff beendet die Serie der Passen-Züge
  const lvs = levelsFor(ev), death = ev.levels.ulti > 0, plan = [];
  if (!death) for (const k of ['hs', 'tr', 'sh', 'fe', 'ew', 'gh']) if (lvs[k] > 0) plan.push([k, lvs[k]]);
  side.stats.mana -= ev.cost;
  consumeSelection(d, sel);
  const texts = [], fxs = [];
  const echoOld = side.stats.echo, echoUsed = !!ev.levels.echo;   // Echo (seit 0.9): der Kombo wird durch das Echo der Seite verstärkt; seit 0.9.6 hinterlässt jede Nutzung von Primärmagie ein neues Echo (auch ohne Kombo)
  if (ev.prim && allowed(state, 'attack', 'echo')) side.stats.echo = ev.prim;   // Echo in der Farbe der ersten Karte (Einstellung echo); bei der Ultimate (Farbe der Schlusskarte: ev.ultiEl) ebenso
  if (echoUsed) texts.push('Echo (' + NAMES[echoOld] + '): Kombo +1 Stufe');
  applyComboPlan(state, side, opp, plan, ev, texts, fxs);
  if (death && (ev.ultiEl || ev.prim) === 'E' && side.stats.healPhase === undefined) side.stats.healPhase = side.stats.heal || 0;   // wie beim Todesfluch: ein in dieser Angriffsphase gelegter Heilmarker heilt erst am Ende der nächsten eigenen Angriffsphase
  if (death && (ev.ultiEl || ev.prim) === 'W' && side.stats.manaPhase === undefined) side.stats.manaPhase = side.stats.manaflow || 0;   // ebenso der Manamarker
  if (death) { const u = castUltimate(side, opp, ev.ultiEl || ev.prim, ev.levels.ulti); fxs.push(u.fx); texts.push(u.text); }
  c.lfp = null;
  const dmg0 = ev.prim ? ev.damage : 0;
  let dmg = dmg0;
  if (dmg0 > 0 && opp.stats.traps) dmg = dmg0 - springTraps(state, opp, side, ev.prim, dmg0, fxs, texts);   // die Falle wird aufgedeckt, sobald Schaden eingeht, vor der Verteidigung
  if (dmg > 0) fxs.push({ kind: 'attack', who: side.ctrl, to: opp.ctrl, elem: ev.prim, n: dmg });
  log(state, side.name + ' greift an' + (ev.prim ? ' (' + NAMES[ev.prim] + ', Schaden ' + dmg0 + ')' : ' (nur Flüche)') + (texts.length ? ' – ' + texts.join(', ') : '') + '.', side.ctrl, fxs.length ? fxs : undefined);
  if (hpDecided(state)) { c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'attack'; c.color = null; c.pending = 0; c.atkTurns = (c.atkTurns || 0) + 1; }   // Stufe 1: Der Rückwurf der Falle hat den Angreifer auf 0 HP gebracht. Er ist besiegt, noch bevor der Verteidiger verteidigt oder Schaden nimmt; kein Fluss wirkt mehr
  else if (dmg > 0) { c.color = ev.prim; c.pending = dmg; c.afterAtk = true; c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'defense'; c.atkTurns = (c.atkTurns || 0) + 1; }
  else passAttackTurn(state, true);
  const res = finishStep(state, { k: 'A', who: side.key === 'a' ? 0 : 1, v: dmg0 });
  return { ok: true, combatEnd: res };
}
// Fliehen (seit 0.9.1 standardmäßig abgeschaltet, Schalter fleeAllowed: 0 = aus, 1 = an; die Erschöpfung beendet festgefahrene Kämpfe): Im Monsterkampf und im Showdown darf jede Seite (im Monsterkampf der Angreifer ebenso wie der Spieler, der das Monster führt) den Kampf abbrechen, wenn der Gegner kein Mana mehr hat, ihr gerade kein Angriff entgegengebracht wird (eigener Angriffszug) und sie nicht unter einem Todesfluch steht. Kein Sieger, keine Beute; das Monster behält seine HP und sein Mana, und danach ist der Spieler am Zug, der das Monster geführt hat (er kann das angeschlagene Monster jetzt selbst angreifen).
function canFlee(state, pid) {
  const c = state.combat;
  if (!state.rules.fleeAllowed) return false;
  if (!c || c.forced || c.action !== 'attack') return false;
  const me = c.sides[c.turn], opp = c.sides[c.turn === 'a' ? 'b' : 'a'];
  return me.ctrl === pid && opp.stats.mana <= 0 && !(me.stats.death > 0);
}
function recoverGain(state) { const r = state.rules.recoverByStage; return r ? (r[Math.min(r.length, Math.max(1, state.stage)) - 1] || 1) : 1; }
