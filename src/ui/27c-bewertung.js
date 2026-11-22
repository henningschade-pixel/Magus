/* ---------- Monsterbewertung (temporär, seit 0.15) ---------- */
// Zum Abstimmen der Monsterstärke: Nach einem Monsterkampf, den man als Angreifer geführt hat, fragt der Ergebnis-Bildschirm „zu schwer / etwas schwer / etwas leicht / zu leicht“. Die Antwort wird mit der Monsterkonfiguration
// (Form, Würfel, Werte, Deck), dem Kampfausgang und dem Stand der Spieler im Browser gespeichert (localStorage 'magus_monsterbewertung') und lässt sich als JSON exportieren. Im Menü unter Einstellungen ein- und ausschaltbar.
const RATE_KEY = 'magus_monsterbewertung', RATE_ON_KEY = 'magus_bewertung_an', RATE_MAX = 400;
let ratingCtx = null;   // Zustand beim Kampfbeginn (Monster und Spieler)
function ratingOn() { try { return localStorage.getItem(RATE_ON_KEY) !== '0'; } catch (e) { return true; } }
function ratingSetOn(on) { try { localStorage.setItem(RATE_ON_KEY, on ? '1' : '0'); } catch (e) { } }
function ratingList() { try { const l = JSON.parse(localStorage.getItem(RATE_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
function ratingStore(l) { try { localStorage.setItem(RATE_KEY, JSON.stringify(l.slice(-RATE_MAX))); return true; } catch (e) { return false; } }
function ratingSideInfo(p) {
  const cnt = {}; [].concat(p.deck.draw, p.deck.discard, p.deck.hand.filter(Boolean)).forEach(c => { cnt[c.id] = (cnt[c.id] || 0) + 1; });
  const s = p.stats; return { sp: p.sp, mag: Object.assign({}, s.mag), maxHp: s.maxHp, maxMana: s.maxMana, limit: s.limit, drawLimit: s.drawLimit, slots: p.slots, gold: s.gold, deck: cnt };
}
const _applyRate = M.apply;
M.apply = function (st, a) {   // beim Beginn eines Monsterkampfes die Konfiguration des Monsters und den Stand der Spieler festhalten
  if (st === G && a && a.type === 'combat' && st.phase === 'world' && st.monsters && st.monsters[a.elem]) {
    try { ratingCtx = { att: a.pid, elem: a.elem, stage: st.stage, worldTurns: st.worldTurns, seed: st.seed, monster: JSON.parse(JSON.stringify(st.monsters[a.elem])), players: st.players.map(ratingSideInfo), rules: { baseHp: M.MONSTER.baseHp } }; } catch (e) { ratingCtx = null; }
  }
  return _applyRate.call(M, st, a);
};
// Beim Kampfende (Ergebnis-Bildschirm): Frage vorbereiten, nur für den Angreifer, nicht beim Zuschauen
function ratingPrepare(res, sn) {
  if (!ratingOn() || SPEC || !res || res.mode !== 'monster' || !ratingCtx || ratingCtx.att !== ME || (sn && sn.att !== ME)) return null;
  const mo = ratingCtx.monster;
  return { value: null, rec: { ts: Date.now(), version: MAGUS_VERSION, seed: ratingCtx.seed, stage: ratingCtx.stage, worldTurns: ratingCtx.worldTurns,
    monster: { name: mo.name, el: mo.el, label: mo.label, variant: mo.variant, base: mo.base, stats: JSON.parse(JSON.stringify(mo.stats)), deck: mo.deckIds.slice().sort() },
    fight: { attackerWon: res.winner === 'a', monsterDefeated: !!res.monsterDefeated, reason: res.reason || null, turns: res.turns, fled: res.fled || null },
    me: ratingCtx.players[ME], opponent: ratingCtx.players[OPP], rating: null } };
}
function ratingHTML() {
  const r = endView && endView.rate; if (!r) return '';
  if (r.value) return '<div class="ratebox"><div class="rateq">Bewertung gespeichert: ' + ({ hard: 'zu schwer', abitHard: 'etwas schwer', abitEasy: 'etwas leicht', easy: 'zu leicht' })[r.value] + '</div></div>';
  return '<div class="ratebox"><div class="rateq">Wie schwer war dieses Monster?</div><div class="rateb">' +
    [['hard', 'Zu schwer'], ['abitHard', 'Etwas schwer'], ['abitEasy', 'Etwas leicht'], ['easy', 'Zu leicht']].map(([v, t]) => '<button class="btn" data-act="rate" data-v="' + v + '">' + t + '</button>').join('') + '</div></div>';
}
function ratingSave(v) {
  const r = endView && endView.rate; if (!r || r.value || !['hard', 'abitHard', 'abitEasy', 'easy'].includes(v)) return;
  r.rec.rating = v; r.value = v;
  const l = ratingList(); l.push(r.rec);
  if (!ratingStore(l)) toast('Bewertung konnte nicht gespeichert werden.');
  render();
}
function ratingSettingsHTML() {
  const n = ratingList().length;
  return '<section class="setgrp"><div class="sethead"><h3>Monsterbewertung (Test)</h3>' + menuBtn('ratetoggle', ratingOn() ? 'an' : 'aus', ' title="Nach einem Monsterkampf fragen, ob das Monster zu leicht oder zu schwer war"', 'small') + '</div>' +
    '<div class="setbox"><div class="rulerow"><span>Gespeicherte Bewertungen: ' + n + '</span><span>' + menuBtn('rateexport', 'Exportieren', n ? '' : ' disabled', 'small') + ' ' + menuBtn('rateclear', 'Löschen', n ? '' : ' disabled', 'small') + '</span></div></div>' +
    '<p class="sethint">Nach einem Monsterkampf als Angreifer fragt der Ergebnis-Bildschirm, ob das Monster zu schwer, etwas schwer, etwas leicht oder zu leicht war. Die Antwort wird zusammen mit der Monsterkonfiguration im Browser gespeichert.</p></section>';
}
async function ratingExport() {
  const l = ratingList(); if (!l.length) { toast('Noch keine Bewertungen.'); return; }
  const txt = JSON.stringify({ version: MAGUS_VERSION, exported: new Date().toISOString(), ratings: l }, null, 1), fn = 'magus-monsterbewertung-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '.json';
  let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (x) { dl = null; }
  if (dl) { try { await dl.save({ filename: fn, data: txt }); toast('Bewertungen exportiert (' + l.length + ').'); } catch (x) { if (!x || x.code !== 'declined') toast('Export nicht möglich.'); } return; }
  try { const a = document.createElement('a'), u = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.href = u; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Bewertungen exportiert (' + l.length + ').'); } catch (x) { toast('Export nicht möglich.'); }
}
