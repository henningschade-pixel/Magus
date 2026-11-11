function plan(state, pid) {
  if (state.phase === 'world') { const st = ecoStep(state, pid); if (st) return [st]; }   // Wirtschaftsschritt (Punkte ausgeben, Magie kaufen, Gold opfern) hat Vorrang; er ist keine Aktion, danach plant die Oberfläche denselben Zug neu
  return state.phase === 'combat' ? searchPlan(state, pid) : worldPlan(state, pid);   // Kampf: Vorausschau (40-suche.js), ohne Durchläufe (setSearch(0)) die Basis-KI
}
// Führt einen vollständigen KI-Zug aus; bei Fehlern greift eine sichere Rückfalloption.
function fallback(state, pid) {
  const A = a => Object.assign({ pid }, a);
  if (state.phase === 'combat') {
    const c = state.combat;
    if (c.forced) return [A(forcedAct(state, pid))];
    return c.action === 'defense' ? [A({ type: 'pass' }), A({ type: 'recover' }), A({ type: 'draw' })] : [A({ type: 'recover' }), A({ type: 'draw' }), A({ type: 'pass' }), A({ type: 'attack' })];   // Einstellungen: nicht jede Aktion ist in jeder Phase erlaubt, die Engine lehnt unerlaubte ab
  }
  return [A({ type: 'draw' })];
}
function runTurn(state, pid) {
  const pre = [];   // Opfern, Magie kaufen und Upgrades sind kein Zug (Opfern seit 0.7.6.4, Magie und Upgrades seit 0.9.3): danach geht derselbe Zug weiter
  if (state.phase === 'world') {
    for (let g = 0; g < 12; g++) {
      const st = ecoStep(state, pid); if (!st) break;
      const r = M.apply(state, st); if (!r.ok) break;
      pre.push(st);
    }
  }
  const tries = [plan(state, pid), ...fallback(state, pid).map(a => [a])];
  for (const acts of tries) {
    const marks0 = state.phase === 'combat' ? state.combat.sides[state.combat.turn].deck.marks.slice() : null;
    let okAll = true, last = null;
    for (const a of acts) { last = M.apply(state, a); if (!last.ok) { okAll = false; break; } }
    if (okAll) return { ok: true, acts: pre.concat(acts) };
    // fehlgeschlagene Markierungen zurücksetzen
    if (state.phase === 'combat') state.combat.sides[state.combat.turn].deck.marks = marks0 || [];
    else state.players[pid].deck.marks = [];
  }
  return pre.length ? { ok: true, acts: pre } : { ok: false };
}

return { plan, runTurn, fallback, ecoStep, setParams, setSearch, basePlan: combatPlan, DEFAULTS, _race: raceTurns };
}));