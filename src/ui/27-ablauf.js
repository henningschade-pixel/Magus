/* ---------- Ablauf ---------- */
function newGame(spec) {
  if (MP) mpLeave();
  SPEC = !!spec; clearTimeout(specT); specT = 0; specSpeed = 1;
  ME = 0; OPP = 1;
  clearTimeout(aiTimer);
  els.forEach(r => r.el.remove()); els.clear();
  G = M.newGame({ seed: (/[?&]seed=(\d+)/.exec(location.search) || [0, (Math.random() * 2 ** 31) | 0])[1] | 0, names: SPEC ? ['Computer A', 'Computer B'] : ['Du', 'Computer'], ai: [SPEC, true] });
  M.record(G); G.keepSnap = true;
  seenCombat = null; upSeen = null; endView = null; modal = null; introSeen = -1; hold = 0; started = true;
  overlay.style.display = 'none'; overlay.innerHTML = '';
  pump();
}
function snapStats(c) { return { a: JSON.parse(JSON.stringify(c.sides.a.stats)), b: JSON.parse(JSON.stringify(c.sides.b.stats)) }; }
const _apply = M.apply;
M.apply = function (st, a) { if (st === G && st.phase === 'combat' && st.combat) preStats = snapStats(st.combat); return _apply.call(M, st, a); };   // Werte vor der letzten Aktion merken
function checkCombatEnd(prevLog) {
  if (G.lastCombat && G.lastCombat !== seenCombat) {
    seenCombat = G.lastCombat;
    const res = G.lastCombat, lines = G.log.filter(e => e.n > prevLog).map(e => e.txt);
    hold = Date.now() + (FAST ? 0 : 60000);   // bis zum Klick wartet der Computer
    if (FAST || !res.snap) { hold = 0; return; }
    const cur = JSON.parse(JSON.stringify(res.snap)), sn = res.snap;
    if (preStats) { cur.sides.a.stats = JSON.parse(JSON.stringify(preStats.a)); cur.sides.b.stats = JSON.parse(JSON.stringify(preStats.b)); }   // bis die Animation durch ist, gelten noch die Werte vor der letzten Aktion
    endView = Object.assign({ stage: 'anim', cur, snap: sn, res }, endTexts(res, sn, lines));
  }
}
// Ton zum Ergebnis-Bildschirm: Sieg, Niederlage oder Unentschieden
function resultSound(ev) { Snd.play(ev.cls === 'win' ? 'win' : ev.cls === 'lose' ? 'lose' : 'draw'); }
// Texte des Ergebnis-Bildschirms (aus Sicht von ME)
function endTexts(res, sn, lines) {
  const rest = lines.filter(t => /^(Alle drei Monster|Zwei Monster|Erholungsphase|Abschnitt|Jeder Spieler erhält|.* erhält als Trostpreis|.* verlor den Showdown|Spielende|Gleichstand|Die Beute|.* erhält die Beute)/.test(t)), me = G.players[ME], opp = G.players[OPP];
  if (res.mode === 'monster') {
    const m = sn.sides.b.monster, mine = sn.att === ME;
    if (res.winner === 'a') return mine ? { cls: 'win', title: 'Sieg', sub: m.name + ' besiegt', loot: res.loot > 0 ? 'Beute: ' + res.loot + ' Gold' : 'Keine Beute', rest } : { cls: 'draw', title: m.name + ' besiegt', sub: G.players[sn.att].name + ' erhält ' + (res.loot || 0) + ' Gold', rest };
    if (res.winner === 'b') return mine ? { cls: 'lose', title: 'Niederlage', sub: m.name + ' gewinnt den Kampf', loot: 'Keine Beute', rest } : { cls: 'draw', title: m.name + ' siegt', sub: 'Keine Beute', rest };
    return { cls: 'draw', title: 'Unentschieden', sub: 'Kein Sieger, keine Beute', rest };
  }
  const wc = res.winner ? sn.sides[res.winner].ctrl : null, sp = me.sp + ' : ' + opp.sp + ' Siegpunkte';
  if (wc === null) return { cls: 'draw', title: 'Showdown unentschieden', sub: 'Kein Sieger: je 1 Siegpunkt', loot: sp, rest };
  return wc === ME ? { cls: 'win', title: 'Showdown gewonnen', sub: '+2 Siegpunkte', loot: sp, rest } : { cls: 'lose', title: 'Showdown verloren', sub: G.players[wc].name + ' erhält 2 Siegpunkte', loot: sp, rest };
}
// Ablauf nach dem letzten Zug: Animation zu Ende -> Werte anpassen -> abdunkeln und Ergebnis zeigen -> Klick -> Weltphase
function endTick() {
  if (!endView || endView.stage !== 'anim') return;
  const now = Date.now();
  if (FlowFx.busy() || lateN > 0 || now < fxUntil + 60) { if (!endView.tm) endView.tm = setTimeout(() => { if (endView) endView.tm = 0; render(); }, 80); return; }
  endView.cur = JSON.parse(JSON.stringify(endView.snap)); endView.stage = 'values';   // Endwerte zeigen (HP- und Manaleisten laufen auf den neuen Stand)
  setTimeout(() => render(), 0);
  setTimeout(() => { if (endView && endView.stage === 'values') { endView.stage = 'result'; resultSound(endView); render(); } }, 450);
}
function overlayHTML() {
  if (endView && endView.stage === 'result') return '<div class="endov" data-act="dismiss" style="position:absolute;inset:0"><div class="endbox ' + endView.cls + '"><div class="et">' + esc(endView.title) + '</div><div class="es">' + esc(endView.sub) + '</div>' + (endView.loot ? '<div class="el">' + esc(endView.loot) + '</div>' : '') + (endView.rest.length ? '<div class="er">' + endView.rest.map(esc).join('<br>') + '</div>' : '') + '<small>Klicken, um fortzufahren</small></div></div>';
  if (modal) return '<div class="endov" data-act="dismiss" style="position:absolute;inset:0"><div class="endbox intro"><div class="et">' + esc(modal.title) + '</div><div class="es">' + esc(modal.sub) + '</div>' + (modal.lines.length ? '<div class="er">' + modal.lines.map(esc).join('<br>') + '</div>' : '') + '<small>Klicken, um zu beginnen</small></div></div>';
  return '';
}
// Showdown beginnt: vorher klar sagen, was jetzt passiert
function checkShowdownIntro() {
  if (FAST || !G || G.over || endView || modal || G.phase !== 'combat' || G.combat.mode !== 'showdown' || introSeen === G.showdown) return;
  introSeen = G.showdown; Snd.play('showdown_start');
  const first = G.log.slice().reverse().find(e => /^Showdown \d/.test(e.txt));
  modal = { title: 'Showdown ' + (G.showdown + 1) + ' von 3', sub: 'Alle Monster sind besiegt: Duell Spieler gegen Spieler', lines: [first ? first.txt : '', 'Wer gewinnt, erhält 2 Siegpunkte, bei Gleichstand je 1. Es gewinnt, wer zuerst 4 Siegpunkte hat oder nach drei Showdowns vorn liegt.'].filter(Boolean) };
}
// Töne zu eigenen Weltphasen-Aktionen (Tempel, Upgrades, Magie, Händler)
function worldSound(type, gainedUp, magNow, cardLv) {
  if (FAST) return;
  if (type === 'temple') { Snd.play('coin_sacrifice'); if (gainedUp) Snd.play('temple_level', .45); }
  else if (type === 'spend') Snd.play('spend_upgrade');
  else if (type === 'magic') { if (magNow === 2) Snd.play('magic_lv2'); else if (magNow === 3) Snd.play('magic_lv3'); }   // Magie auf Stufe 2 bzw. 3 (höher geht es nicht)
  else if (type === 'vendor' && cardLv >= 2) Snd.play('card_lv' + cardLv);   // Karte auf Stufe 2 bzw. 3 aufgewertet
}
function act(a) {
  if (!G || G.over || endView || modal || SPEC) return;   // beim Zuschauen gibt es keine Eingaben
  const full = Object.assign({ pid: ME }, a), prev = G.logN, up0 = G.players[ME].stats.upGot, r = M.apply(G, full);
  if (!r.ok) { toast(r.error); return; }
  if (a.type === 'temple') upSeen = G.players[ME].stats.upGot;   // Upgrade-Punkte aus dem Tempel haben ihren eigenen Ton (Tempelstufe)
  worldSound(a.type, G.players[ME].stats.upGot > up0, a.type === 'magic' ? G.players[ME].stats.mag[a.elem] : 0, a.type === 'vendor' ? +String(a.result).slice(1) : 0);
  if (MP) mpPush(full);
  checkCombatEnd(prev); pump();
}
function pump() {
  clearTimeout(aiTimer);
  checkShowdownIntro();
  if (endView || modal) { render(); return; }   // Ergebnis- und Ankündigungsbildschirm: Spiel pausiert bis zum Klick
  render();
  if (!G || G.over) return;
  const who = M.actor(G);
  if ((who === ME && !SPEC) || MP) return;
  aiTimer = setTimeout(aiTurn, FAST ? 4 : Math.max(700 / (SPEC ? specSpeed : 1), hold - Date.now()));
}
async function execPlan(acts) {
  for (let i = 0; i < acts.length; i++) {
    const prev = G.logN, r = M.apply(G, acts[i]);
    if (!r.ok) { const d = G.phase === 'combat' ? G.combat.sides[G.combat.turn].deck : G.players[OPP].deck; d.marks = []; render(); return false; }
    checkCombatEnd(prev); render();
    if (i < acts.length - 1) await sleep(430 / (SPEC ? specSpeed : 1));
  }
  return true;
}
async function aiTurn() {
  if (!G || G.over || (!SPEC && M.actor(G) !== OPP)) return;
  const who = SPEC ? M.actor(G) : OPP;
  let ok = await execPlan(AI.plan(G, who));
  if (!ok) for (const fb of AI.fallback(G, who)) { ok = await execPlan([fb]); if (ok) break; }
  pump();
}
// Ergebnis-Bildschirm oder Ankündigung wegklicken (beim Zuschauen geschieht das nach kurzer Zeit von selbst)
function dismissOverlay() {
  if (endView && endView.stage === 'result') { endView = null; hold = 0; if (G && G.stage > stageSeen) Snd.play('stage_start'); stageSeen = G ? G.stage : stageSeen; pump(); }
  else if (modal) { modal = null; hold = 0; pump(); }
}
function specAdvance() {
  if (!SPEC || specT || !((endView && endView.stage === 'result') || modal)) return;
  specT = setTimeout(() => { specT = 0; if (SPEC && overlay.style.display !== 'flex') dismissOverlay(); else if (SPEC) specAdvance(); }, 2600);
}
