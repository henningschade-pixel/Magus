/* ---------- Kampfablauf 3: Effekte (Schild, Dauereffekte, Ultimates, Hellsicht, Fallen, Kombo-Plan, erlaubte Aktionen) ---------- */
// Angriffszug endet ohne Schaden: die Gegenseite greift an (Verteidigung entfällt).
const MAX_LVL = 3;   // höchste Kombostufe und Höchstzahl der Schildladungen
// Schild (Blau + Grün, seit 0.8; stats.rainbow, Grafik des früheren Multischilds): Ladungen 1/2/3. Er mindert eingehenden, nicht geblockten Schaden gegen jede Farbe und verliert je gemindertem Schaden eine Ladung. Ein neues Schild addiert seine Ladungen zu den liegenden (seit 0.12.1.1 ohne Höchstgrenze; zuvor galt die höhere Zahl, höchstens 3).
// Das Schild wirkt vor jeder Schadensquelle (seit 0.8.3.2): auch gegen den Rückwurf der Falle, den Todesfluch und die Erschöpfung. Es mindert den Schaden um höchstens seine Ladungen und verliert je gemindertem Schaden eine Ladung. Gibt den tatsächlich verlorenen Schaden zurück; absorbed (optional) meldet die Minderung.
function shieldHit(stats, dmg) {
  const ab = Math.min(stats.rainbow || 0, Math.max(0, dmg));
  if (ab > 0) { stats.rainbow -= ab; if (!stats.rainbow) delete stats.rainbow; }
  return { hit: dmg - ab, absorbed: ab };
}
function shieldAdd(stats, n) { stats.rainbow = (stats.rainbow || 0) + n; }   // seit 0.12.1.1 stapeln die Ladungen (vorher: höchster Wert, höchstens 3)
// Ultimates (seit 0.9.9 nach der Farbe der zuletzt markierten Karte, vorher der ersten): Feuer = Todesfluch (stats.death, Marker beim Gegner), Erde = Meditation (stats.heal, +1 HP je Marker am Ende der eigenen Angriffsphase), Wasser = Erleuchtung (seit 0.8, stats.manaflow: +1 Mana je Marker am Ende der eigenen Angriffsphase). Alle drei Marker entfernt nur die Läuterung.
// Läuterung: gewählte Marker (sm/om Manamarker, sd/od Todesmarker, sh/oh Heilmarker, sr/or Schildmarker, st/ot Nachziehtokens), höchstens S; ohne Wahl automatisch eigene Todesmarker, dann Schild-, Mana- und Heilmarker des Gegners.
function lifeflowPicks(state, side, opp, lvl) {
  if (Array.isArray(state.combat.lfp)) return state.combat.lfp.slice(0, lvl);
  const out = []; let om = opp.stats.manaflow || 0, sd = side.stats.death || 0, orb = opp.stats.rainbow || 0, oh = opp.stats.heal || 0;
  while (out.length < lvl && sd > 0) { out.push('sd'); sd--; }
  while (out.length < lvl && orb > 0) { out.push('or'); orb--; }
  while (out.length < lvl && om > 0) { out.push('om'); om--; }
  while (out.length < lvl && oh > 0) { out.push('oh'); oh--; }
  return out;
}
// Stufe der Erschöpfung für den Angriffszug Nr. done (1-basiert): je 2 * exhaustRounds Angriffszüge eine Stufe mehr
function exhaustionLevel(state, done) {
  const n = state.rules.exhaustRounds || 0;
  return n > 0 && done > 0 ? Math.floor((done - 1) / (2 * n)) : 0;
}
// Todesfluch: Am Ende der eigenen Angriffsphase (nach Angriff und Verteidigung der Gegenseite) verliert die Seite so viele HP, wie sie Todesmarker trägt.
// Ist der Kampf schon entschieden (eine Seite auf 0 HP), wirkt er nicht mehr (Stufe 3 der Niederlagenprüfung, siehe hpDecided).
function deathTick(state, side, done) {   // done: Nummer des Angriffszugs (1, 2, 3 …), der gerade endet; für die Erschöpfung
  const c = state.combat;
  // Ein Fluch, der erst in dieser Angriffsphase (durch die Ultimate der Verteidigung) gesprochen wurde, wirkt noch nicht: deathPhase merkt die Stufe zu Beginn der Phase.
  const dmg = Math.min(side.stats.death || 0, side.stats.deathPhase === undefined ? Infinity : side.stats.deathPhase); delete side.stats.deathPhase;
  if (hpDecided(state)) return;   // Stufe 3 (Dauereffekte) kommt nach Stufe 1 (Rückwurf) und 2 (Schaden nach der Verteidigung): ist dort schon eine Seite auf 0 HP gefallen, wirkt kein Dauereffekt mehr
  if (dmg > 0) {
    const sh = shieldHit(side.stats, dmg);   // das Schild mindert auch den Todesfluch
    side.stats.hp = Math.max(0, side.stats.hp - sh.hit);
    log(state, 'Todesfluch: ' + side.name + ' verliert ' + sh.hit + ' HP am Ende der Angriffsphase' + (sh.absorbed ? ' (Schild mindert um ' + sh.absorbed + ')' : '') + '.', side.ctrl);
  }
  // Erschöpfung (seit 0.7.7.2): Nach je exhaustRounds Kampfrunden (Standard 10, 0 = aus) steigt sie um 1; beide Seiten (auch das Monster) verlieren am Ende ihrer Angriffsphase so viele HP, wie die Erschöpfung hoch ist. Runde 1–10: 0, Runde 11–20: 1, Runde 21–30: 2 …
  const exLvl = exhaustionLevel(state, done);
  if (exLvl > 0 && side.stats.hp > 0) {
    const sh = shieldHit(side.stats, exLvl);   // das Schild mindert auch die Erschöpfung
    side.stats.hp = Math.max(0, side.stats.hp - sh.hit);
    log(state, 'Erschöpfung ' + exLvl + ': ' + side.name + ' verliert ' + sh.hit + ' HP am Ende der Angriffsphase' + (sh.absorbed ? ' (Schild mindert um ' + sh.absorbed + ')' : '') + '.', side.ctrl);
    if (side.stats.hp <= 0) return;
  }
  // Meditation (Erd-Ultimate): am Ende der eigenen Angriffsphase +1 HP je Heilmarker (nur Marker, die schon zu Beginn der Phase lagen: healPhase wie deathPhase), höchstens bis zu den maximalen HP; nur wer noch steht
  const hl = Math.min(side.stats.heal || 0, side.stats.healPhase === undefined ? Infinity : side.stats.healPhase); delete side.stats.healPhase;
  if (hl > 0 && side.stats.hp > 0) {
    const before = side.stats.hp; side.stats.hp = Math.min(side.stats.maxHp, side.stats.hp + hl);
    if (side.stats.hp > before) log(state, 'Meditation: ' + side.name + ' heilt ' + (side.stats.hp - before) + ' HP am Ende der Angriffsphase.', side.ctrl, { kind: 'healtick', who: side.ctrl, n: side.stats.hp - before, marks: hl });
  }
  // Erleuchtung (Wasser-Ultimate, seit 0.8): am Ende der eigenen Angriffsphase +1 Mana je Marker (nur Marker, die schon zu Beginn der Phase lagen: manaPhase), höchstens bis zum maximalen Mana; nur wer noch steht
  const mf = Math.min(side.stats.manaflow || 0, side.stats.manaPhase === undefined ? Infinity : side.stats.manaPhase); delete side.stats.manaPhase;
  if (mf > 0 && side.stats.hp > 0) {
    const before = side.stats.mana; side.stats.mana = Math.min(side.stats.maxMana, side.stats.mana + mf);
    if (side.stats.mana > before) log(state, 'Erleuchtung: ' + side.name + ' regeneriert ' + (side.stats.mana - before) + ' Mana am Ende der Angriffsphase.', side.ctrl, { kind: 'manatick', who: side.ctrl, n: side.stats.mana - before, marks: mf });
  }
}
// Ultimate wirken lassen: die Farbe der Schlusskarte (el, seit 0.9.9; vorher der ersten Karte) bestimmt die Marker. who legt sie bei sich (Erde, Wasser) oder beim Gegner (Feuer).
function castUltimate(side, opp, el, lvl) {
  lvl = Math.max(1, Math.min(MAX_LVL, lvl));
  if (el === 'E') { side.stats.heal = (side.stats.heal || 0) + lvl; return { text: 'Ultimate ' + lvl + ' (Erde): Meditation, ' + side.stats.heal + ' HP am Ende jeder eigenen Angriffsphase bis Kampfende', fx: { kind: 'ultimate', who: side.ctrl, to: side.ctrl, el: 'E', n: lvl } }; }
  if (el === 'W') { side.stats.manaflow = (side.stats.manaflow || 0) + lvl; return { text: 'Ultimate ' + lvl + ' (Wasser): Erleuchtung, ' + side.stats.manaflow + ' Mana am Ende jeder eigenen Angriffsphase bis Kampfende', fx: { kind: 'ultimate', who: side.ctrl, to: side.ctrl, el: 'W', n: lvl } }; }
  opp.stats.death = (opp.stats.death || 0) + lvl;   // seit 0.12.1.1 stapeln alle drei Flüsse (vorher: höchster Wert)
  return { text: 'Ultimate ' + lvl + ' (Feuer): Todesfluch für ' + opp.name + ' (' + opp.stats.death + ' HP am Ende jeder seiner Angriffsphasen bis Kampfende)', fx: { kind: 'ultimate', who: side.ctrl, to: opp.ctrl, el: 'F', n: lvl } };
}
function passAttackTurn(state, wasAttack) {   // wasAttack: Die Aktion war ein Angriff (auch ohne Schaden); sonst „ohne Angriff“
  const c = state.combat;
  deathTick(state, c.sides[c.turn], (c.atkTurns || 0) + 1);
  c.turn = c.turn === 'a' ? 'b' : 'a'; c.action = 'attack'; c.color = null; c.pending = 0; c.lfp = null;
  c.atkTurns = (c.atkTurns || 0) + 1;   // ein Angriffszug ist vorbei (Angriff ohne Schaden, Passen, Erholen, Nachziehen)
  c.afterAtk = !!wasAttack;
  if (!hpDecided(state) && reactionUseful(state)) c.action = 'defense';   // seit 0.9.9.13: Auch ohne Angriff reagiert die Gegenseite (Reaktion ohne Angriff, pending 0); danach folgt ihre eigene Aktion
}
// Reaktion ohne Angriff (seit 0.9.9.13): Sie entsteht nur, wenn die Einstellungen für die Verteidigungsphase (allowDef, Stufen an / ohne Angriff) dort Erholen oder Nachziehen erlauben und beides etwas bewirken kann; sonst beginnt die Gegenseite gleich mit ihrer Aktion. Verteidigen gibt es ohne Angriff nicht
function reactionUseful(state) {
  const c = state.combat, side = c.sides[c.turn], keep = c.action, kp = c.pending;
  c.action = 'defense'; c.pending = 0;
  const rec = allowed(state, 'defense', 'recover') && side.stats.mana < side.stats.maxMana;
  const drw = allowed(state, 'defense', 'draw') && side.stats.mana >= drawManaCost(state, side.ctrl);
  c.action = keep; c.pending = kp;
  return !!(rec || drw);
}
// Ende der Reaktion ohne Angriff: dieselbe Seite führt jetzt ihre Aktion aus
function endReaction(state) {
  const c = state.combat, side = c.sides[c.turn];
  side.deck.marks = []; c.action = 'attack'; c.color = null; c.pending = 0; c.lfp = null;
  return { ok: true, combatEnd: finishStep(state, { who: side.key === 'a' ? 0 : 1 }) };
}

// HP nach einer Heilung um lvl: höchstens bis zu den maximalen HP, nie weniger als vorher
function healedHp(stats, hp, lvl) { return lvl > 0 ? Math.max(hp, Math.min(stats.maxHp, hp + lvl)) : hp; }
// Hellsicht (Blau + Rot, seit 0.8.0.9): Die Seite zieht drei Karten vom Zugstapel (der Ablagestapel wird bei Bedarf gemischt), wählt S davon aus und legt sie offen vor sich; die übrigen kommen auf den Ablagestapel. Die offenen Karten lassen sich wie Handkarten ausspielen, kosten aber kein Mana, und werden danach abgelegt (unbenutzte am Kampfende). Sie belegen keine Handplätze (hinten angehängt, siehe addSight). c.forced = { pid, kind: 'sight', cards, n, lvl }; die Entscheidung kommt als Aktion fd mit pick = ['k'|'a', ...] je Karte (k = offen vor mich legen, a = ablegen); genau n Karten mit k, keine Fluchkarten.
function sightDraw(state, side, lvl) {
  const d = side.deck, cards = [];
  for (let i = 0; i < 3; i++) {
    if (!d.draw.length && d.discard.length) { d.draw = d.discard.splice(0); state.rng.shuffle(d.draw); }
    if (!d.draw.length) break;
    cards.push(d.draw.pop());
  }
  const ok = cards.filter(cd => !parseCard(cd.id).curse).length, n = Math.min(lvl, ok);
  if (n > 0 && n < ok) state.combat.forced = { pid: side.ctrl, n, kind: 'sight', cards, lvl };
  else sightResolve(state, side, cards, cards.map(cd => (n > 0 && !parseCard(cd.id).curse ? 'k' : 'a')));   // keine Wahl: alle brauchbaren Karten bleiben liegen, der Rest geht auf den Ablagestapel
  return { drawn: cards.length, choose: n > 0 && n < ok, n };
}
function sightResolve(state, side, cards, pick) {
  const d = side.deck, keep = cards.filter((cd, i) => pick[i] === 'k');
  cards.forEach((cd, i) => { if (pick[i] !== 'k') d.discard.push(cd); });
  addSight(d, keep);
  return { k: keep.length, a: cards.length - keep.length };
}
// Falle (Blau + Rot seit 0.9.9; zuvor Rot + Blau seit 0.8.0.1, davor Blau + Rot seit 0.8): Die Seite zieht drei Karten vom Zugstapel (seit 0.8.0.5 nicht mehr in die Hand) und legt eine davon verdeckt vor sich; die übrigen kommen auf den Ablagestapel (stats.traps = Liste von { card, el, tier, lvl }, seit 0.12.1.1 stapelnd; kein Marker, die Läuterung erreicht sie nicht). Welche, wählt der Spieler (c.forced mit kind 'trap'; ohne Wahlmöglichkeit gleich). Fluchkarten kommen nicht in Frage.
function trapDraw(state, side, lvl) {
  const d = side.deck, cards = [];
  for (let i = 0; i < 3; i++) {   // drei Karten direkt vom Zugstapel (der Ablagestapel wird bei Bedarf gemischt); sie ersetzen keine Handkarten
    if (!d.draw.length && d.discard.length) { d.draw = d.discard.splice(0); state.rng.shuffle(d.draw); }
    if (!d.draw.length) break;
    cards.push(d.draw.pop());
  }
  const ok = cards.map((cd, i) => parseCard(cd.id).curse ? -1 : i).filter(i => i >= 0);
  if (ok.length === 1) { trapSet(state, side, cards[ok[0]], lvl); cards.forEach((cd, i) => { if (i !== ok[0]) d.discard.push(cd); }); }
  else if (ok.length > 1) state.combat.forced = { pid: side.ctrl, n: 1, kind: 'trap', cards, lvl };
  else cards.forEach(cd => d.discard.push(cd));
  return { drawn: cards.length, choose: ok.length > 1, none: ok.length === 0 };
}
function trapSet(state, side, card, lvl) {
  const pc = parseCard(card.id);
  card.locked = false;
  (side.stats.traps = side.stats.traps || []).push({ card, el: pc.el, tier: pc.tier, lvl });   // seit 0.12.1.1 stapeln die Fallen (vorher ersetzte eine neue die liegende)
}
// Die Fallen werden aufgedeckt, sobald Schaden eingeht (vor der Verteidigung), alle liegenden in der Reihenfolge, in der sie gelegt wurden (seit 0.12.1.1 können mehrere liegen). Entspricht die Farbe des Schadens der Farbe einer Karte, wirft sie 1/2/3 (Stufe 1/2/3) unblockbaren Schaden auf den Angreifer zurück; zusammen höchstens der eingehende Schaden, der entsprechend sinkt (eine spätere Falle wirft nur noch, was übrig ist). Danach kommen alle Karten auf den Ablagestapel, auch ohne Rückwurf.
function springTraps(state, owner, att, color, dmg, fxs, texts) {
  const list = owner.stats.traps; if (!list || !list.length) return 0;
  delete owner.stats.traps;
  let left = dmg, total = 0, absTotal = 0; const items = [];
  for (const t of list) {
    owner.deck.discard.push(t.card);
    const refl = t.el === color ? Math.min(t.lvl, left) : 0, hit = refl > 0;
    left -= refl; total += refl;
    const sh = refl > 0 ? shieldHit(att.stats, refl) : { hit: 0, absorbed: 0 };   // das Schild des Angreifers mindert auch den Rückwurf (er bleibt unblockbar, das Schild ist aber kein Block)
    if (sh.hit > 0) att.stats.hp = Math.max(0, att.stats.hp - sh.hit);
    absTotal += sh.absorbed;
    texts.push('Falle von ' + owner.name + ' (' + NAMES[t.el] + (hit ? ') trifft: ' + refl + ' unblockbarer Schaden zurück' + (sh.absorbed ? ', Schild von ' + att.name + ' mindert um ' + sh.absorbed : '') : t.el === color ? '), Angriff in ' + NAMES[color] + ': der Schaden ist schon zurückgeworfen, keine Wirkung' : '), Angriff in ' + NAMES[color] + ': keine Wirkung'));
    items.push({ card: t.card.id, el: t.el, lvl: t.lvl, hit, refl, abs: sh.absorbed });
  }
  const first = items.find(x => x.hit) || items[0];   // die Summe steuert die Angriffsanimation; die einzelnen Karten stehen in list
  fxs.push({ kind: 'trap', who: owner.ctrl, to: att.ctrl, el: first.el, card: first.card, attElem: color, hit: total > 0, refl: total, abs: absTotal, lvl: first.lvl, dmg0: dmg, list: items });
  return total;
}
// Wirkung der Kombos (Angriff und nach der Verteidigung): plan = [[Schlüssel, Stufe], ...]
function applyComboPlan(state, side, opp, plan, ev, texts, fxs) {
  const c = state.combat;
  for (const [k, lvl] of plan) {
    if (k === 'sh') { shieldAdd(side.stats, lvl); fxs.push({ kind: 'shieldcast', who: side.ctrl, to: opp.ctrl, n: lvl }); texts.push('Schild ' + lvl + ' (' + side.stats.rainbow + ' Ladung' + (side.stats.rainbow === 1 ? '' : 'en') + ')'); }
    if (k === 'hs') {
      const r = sightDraw(state, side, lvl);
      fxs.push({ kind: 'sightcast', who: side.ctrl, to: opp.ctrl, n: lvl });
      texts.push('Hellsicht ' + lvl + ': ' + (r.drawn ? 'zieht ' + r.drawn + ' Karte' + (r.drawn === 1 ? '' : 'n') + (r.choose ? ' und wählt ' + r.n + ' davon' : r.n ? ', ' + r.n + ' bleibt offen liegen' : ', keine brauchbar') : 'keine Karte zum Ziehen'));
    }
    if (k === 'tr') {
      const r = trapDraw(state, side, lvl);
      fxs.push({ kind: 'trapcast', who: side.ctrl, to: opp.ctrl, n: lvl });
      texts.push('Falle ' + lvl + ': zieht ' + r.drawn + ' Karte' + (r.drawn === 1 ? '' : 'n') + (r.none ? ', keine eignet sich als Falle' : r.choose ? ' und legt eine davon verdeckt vor sich (Wahl)' : ' und legt eine davon verdeckt vor sich'));
      if (state.combat.forced && state.combat.forced.kind === 'trap') state.combat.forced.lvl = lvl;
    }
    if (k === 'fe') { texts.push('Lähmung ' + lvl + ': ' + inflictCurses(state, opp, lvl)); fxs.push({ kind: 'aggro', who: side.ctrl, to: opp.ctrl, n: lvl }); }
    if (k === 'gh') {
      const before = side.stats.hp; side.stats.hp = healedHp(side.stats, before, lvl);
      texts.push('Heilung ' + lvl + ': +' + (side.stats.hp - before) + ' HP'); fxs.push({ kind: 'lifeflow', who: side.ctrl, to: opp.ctrl, got: {}, removed: 0, heal: side.stats.hp - before, draws: 0 });
    }
    else if (k === 'ew') {   // Läuterung: S Marker beliebig vom Brett nehmen, je entferntem Marker 1 Gratis-Nachziehen
      const before = side.stats.hp, picks = lifeflowPicks(state, side, opp, lvl), names = { sd: 'eigene Todesmarker', od: 'Todesmarker des Gegners', sm: 'eigene Manamarker', om: 'Manamarker des Gegners', sh: 'eigene Heilmarker', oh: 'Heilmarker des Gegners', sr: 'eigene Schildladungen', or: 'Schildladungen des Gegners', st: 'eigene Nachziehtokens', ot: 'Nachziehtoken des Gegners' };
      const got = {}; let removed = 0;
      for (const pk of picks) {
        const kk = pk.split(':')[0];
        const tgt = kk[0] === 's' ? side : opp, key = kk[1] === 'd' ? 'death' : kk[1] === 't' ? 'freeDraws' : kk[1] === 'h' ? 'heal' : kk[1] === 'r' ? 'rainbow' : 'manaflow';
        if ((tgt.stats[key] || 0) <= 0) continue;
        tgt.stats[key]--; if (key !== 'freeDraws' && tgt.stats[key] <= 0) delete tgt.stats[key];
        removed++; got[kk] = (got[kk] || 0) + 1;
      }
      const dr = removed - (got.ot || 0) - (got.st || 0);   // Gratis-Nachziehen je entferntem Marker (zerstörte Nachziehtokens, eigene wie gegnerische, zählen nicht)
      if (dr) side.stats.freeDraws += dr;
      texts.push('Läuterung ' + lvl + (!removed ? ': nichts zu entfernen' : '') + (removed ? ', ' + Object.keys(got).map(kk => got[kk] + ' ' + names[kk]).join(', ') + ' weg' : '') + (dr ? ', ' + dr + ' Gratis-Nachziehen' : ''));
      fxs.push({ kind: 'lifeflow', who: side.ctrl, to: opp.ctrl, got, removed, heal: side.stats.hp - before, draws: dr });
    }
  }
}
// Erlaubte Aktionen je Phase (Einstellungen seit 0.9.9.5): rules.allowAtk (Angriffsphase: attack, recover, draw, pass, echo, combo) und rules.allowDef (Verteidigungsphase: defend, recover, draw, pass, echo, combo), Werte 1/0 (allowDef zusätzlich 2 = nur nach einem Angriff, 3 = nur ohne vorausgegangenen Angriff). echo: die Magie der Phase setzt ein Echo; combo: Karten einer zweiten Farbe lösen eine Kombo aus. Erholen oder Passen bleibt immer erlaubt (sind beide abgeschaltet, gilt Passen).
function allowed(state, phase, k) {
  const key = phase === 'defense' ? 'allowDef' : 'allowAtk', o = (state.rules && state.rules[key]) || {}, dflt = DEFAULT_RULES[key];
  const atkBefore = !!(state.combat && state.combat.afterAtk);   // Verteidigungsphase: War die Aktion davor ein Angriff? Die Schadenshöhe spielt keine Rolle
  const on = x => { const v = o[x] !== undefined && o[x] !== null ? +o[x] : +dflt[x]; return key === 'allowDef' && v >= 2 ? (v === 2 ? atkBefore : !atkBefore) : !!v; };   // Verteidigung: 1 an, 0 aus, 2 nur nach Angriff, 3 nur ohne Angriff
  if (k === 'pass') return on('pass') || !on('recover');   // Erholen oder Passen bleibt immer möglich, damit keine Phase ohne ausführbare Aktion bleibt
  return on(k);
}
