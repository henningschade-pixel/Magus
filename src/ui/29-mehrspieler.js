/* ---------- Mehrspieler (Raum-Funktion von claude.ai) ----------
   Beide Geräte rechnen dasselbe Spiel (gleicher Startwert) und tauschen nur Aktionen aus.
   Protokoll: hello (Gast tritt bei) → start (Startwert, Regeln) → need (ab Aktion n bitte) → acts; act = eine neue Aktion.
   sync (alle 2 s): Zahl der Aktionen und Prüfsumme des Spielstands. Fehlen Aktionen, werden sie nachgereicht; weicht die
   Prüfsumme ab, gilt der Stand des Gastgebers: Der Gast baut die Partie aus dessen Aktionen neu auf (resync).
   Die Partie liegt zusätzlich im Speicher des Browsers, damit sie nach Neuladen oder geschlossenem Tab fortgesetzt werden kann. */
let MP = null, roomApi;
const MP_KEY = 'magus-mp';
// Kennung dieser Spielversion: beide Geräte müssen denselben Programmtext haben, sonst rechnen sie unterschiedlich.
const BUILD = (() => { let h = 2166136261; const t = [...document.scripts].map(x => x.text).join(''); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); })();
function mpOldVersion(who) {
  mpWait('Andere Spielversion', '<p class="bad">' + who + ' hat eine andere Version von Magus geladen.</p><p class="note">Bitte auf beiden Geräten die Seite mit Strg+F5 (Handy: Seite neu laden, notfalls Cache leeren) neu laden und danach einen neuen Raum erstellen.</p>');
}
async function mpRoomApi() {
  if (roomApi) return roomApi;
  try { roomApi = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { roomApi = null; }
  if (!roomApi && window.Peer) roomApi = PeerRoom;   // Online-Fassung ohne claude.ai: direkte Verbindung per PeerJS
  return roomApi || null;
}
let offerTries = 0;
async function mpOffer() {   // Startbildschirm: Mehrspielerbereich nur zeigen, wenn die Raum-Funktion da ist
  const api = await mpRoomApi(), box = document.getElementById('mpbox');
  const na = document.getElementById('mpna');
  if (box && api) { box.style.display = 'block'; if (na) na.style.display = 'none'; }
  else if (box && !(window.claude && window.claude.use) && ++offerTries < 8) setTimeout(mpOffer, 1000);
  else if (na) na.textContent = 'Mehrspieler ist in dieser Umgebung nicht verfügbar.';   // PeerJS kommt evtl. verzögert vom Ausweich-Anbieter
}
function mpMsg(t, bad) { const m = document.getElementById('mpmsg'); if (m) { m.textContent = t || ''; m.style.color = bad ? 'var(--bad)' : ''; } }
function mpCode() { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.random() * a.length | 0]; return s; }
// Zwei Ablagen: sessionStorage (dieser Tab: nach Neuladen geht es von selbst weiter) und localStorage (Knopf „Partie fortsetzen“, auch nach geschlossenem Tab)
const MP_STORES = [() => sessionStorage, () => localStorage];
function mpSave() {
  if (!MP || !MP.started) return;
  const t = JSON.stringify({ code: MP.code, seat: MP.seat, host: MP.host, seed: MP.seed, first: MP.first, rules: MP.rules, log: MP.log, ts: Date.now(), over: !!(G && G.over) });
  MP_STORES.forEach(st => { try { st().setItem(MP_KEY, t); } catch (e) { } });
}
function mpForget() { try { sessionStorage.removeItem(MP_KEY); } catch (e) { } }   // die Ablage für „Partie fortsetzen“ bleibt, bis die Partie zu Ende ist oder eine neue beginnt
function mpSaved(only) {   // gespeicherte, noch laufende Partie (höchstens 12 Stunden alt) oder null
  for (const st of only ? [MP_STORES[0]] : MP_STORES) {
    try { const sv = JSON.parse(st().getItem(MP_KEY) || 'null'); if (sv && sv.code && Array.isArray(sv.log) && !sv.over && Date.now() - (sv.ts || Date.now()) < 12 * 3600e3) return sv; } catch (e) { }
  }
  return null;
}
function mpOnline() { return !!MP && MP.room.peers().some(p => !p.sameTab); }
// Prüfsumme des Spielstands: beide Geräte müssen nach gleich vielen Aktionen denselben Wert haben
function mpHash() {
  const hand = d => d && d.hand ? [d.hand.map(x => x ? x.id + (x.locked ? '!' : '') : 0), d.marks || 0, d.draw ? d.draw.length : 0] : 0, c = G.combat;
  const t = JSON.stringify([G.phase, G.stage, G.showdown, G.turn, G.logN, !!G.over, G.players.map(p => [p.sp, M.prim(p.stats), hand(p.deck)]), c ? [c.turn, ['a', 'b'].map(k => [M.prim(c.sides[k].stats), hand(c.sides[k].deck)])] : 0]);
  let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function mpBeat() { if (MP && MP.started && G) mpEmit('sync', { n: MP.log.length, h: mpHash() }); }
// Gast: Partie aus den Aktionen des Gastgebers neu aufbauen (nach abweichender Prüfsumme oder einer Aktion, die sich nicht ausführen ließ)
function mpRepair() {
  if (!MP || MP.host || !MP.started || Date.now() - (MP.fixAt || 0) < 6000) return;
  MP.fixAt = Date.now();
  if (++MP.bad > 3) { if (MP.bad === 4) mpWait('Spielstände weichen ab', '<p class="bad">Die beiden Geräte rechnen trotz Abgleich unterschiedlich.</p><p class="note">Bitte auf beiden Geräten die Seite neu laden und „Partie fortsetzen“ wählen.</p>'); return; }
  toast('Spielstand wird mit dem Gastgeber abgeglichen …');
  mpStart(MP.seed, MP.first, MP.rules, true); MP.quiet = true;
  mpEmit('need', { from: 0 });
}
function mpQuiet() { if (G.over) return; endView = null; modal = null; introSeen = G.phase === 'combat' && G.combat.mode === 'showdown' ? G.showdown : -1; hold = 0; }   // nachgeholte Aktionen: keine Ergebnis- und Ankündigungsbildschirme von früher
function mpChip() {   // die Rauminformation steht im Home-Menü; der Home-Knopf wird rot, wenn der Mitspieler offline ist
  if (MP && MP.started) { const on = mpOnline(); if (MP.on !== undefined && MP.on !== on) toast(on ? 'Mitspieler wieder verbunden.' : 'Verbindung zum Mitspieler unterbrochen. Sie wird neu aufgebaut …'); MP.on = on; }
  const h = document.getElementById('homebtn'); if (h) h.classList.toggle('off', !!MP && !mpOnline());
  const m = document.getElementById('mproom'); if (m && MP) { const on = mpOnline(); m.textContent = 'Raum ' + MP.code.toUpperCase() + ' · ' + (on ? 'online' : 'offline'); m.style.color = on ? '' : 'var(--bad)'; }
}
async function mpOpen(code, host) {
  const api = await mpRoomApi(); if (!api) { mpMsg('Mehrspieler ist hier nicht verfügbar.', true); return false; }
  let room; try { room = await api.join('mg-' + code, host); } catch (e) { mpMsg(e && e.type === 'unavailable-id' ? 'Code schon vergeben, bitte erneut versuchen.' : 'Raum konnte nicht geöffnet werden (Verbindung zum Vermittlungsserver?).', true); return false; }
  MP = { room, code, host, seat: host ? 0 : 1, log: [], seed: null, first: 0, rules: null, started: false, subs: [], hello: null, bad: 0 };
  // nur das eigene Echo (sameTab) wird ignoriert: das zweite Gerät derselben Person zählt als Mitspieler
  const on = (t, f) => MP.subs.push(room.on(t, m => { if (!m.sameTab) f(m.data || {}, m); }));
  on('hello', d => { if (!MP.host) return; if (d.v !== BUILD) { mpEmit('start', { v: BUILD }); if (!MP.started) mpOldVersion('Der Mitspieler'); return; } if (!MP.started) mpBegin(); mpEmit('start', { seed: MP.seed, first: MP.first, rules: MP.rules, v: BUILD }); });
  on('start', d => { if (MP.host) return; if (d.v !== BUILD) { clearInterval(MP.hello); mpOldVersion('Der Gastgeber'); return; } if (!MP.started || MP.seed !== d.seed) mpStart(d.seed, d.first, d.rules); clearInterval(MP.hello); mpEmit('need', { from: MP.log.length }); });
  on('need', d => mpSendLog(+d.from || 0));
  on('sync', d => {   // Herzschlag: verlorene Nachrichten nachholen, abweichende Spielstände erkennen
    if (!MP.started || !G) return; const n = +d.n;
    if (n > MP.log.length) mpEmit('need', { from: MP.log.length }); else if (n < MP.log.length) mpSendLog(n);
    else if (d.h && d.h !== mpHash()) { if (MP.host) mpEmit('resync', {}); else mpRepair(); }
    else MP.bad = 0;
  });
  on('resync', () => mpRepair());
  MP.beat = setInterval(mpBeat, 2000);
  on('act', d => mpRecv(+d.i, [d.a]));
  on('acts', d => mpRecv(+d.from, d.list || []));
  MP.subs.push(room.onPeers(() => { mpChip(); if (mpOnline()) mpBeat(); }));   // wieder verbunden: sofort abgleichen
  return true;
}
function mpEmit(topic, data) { return MP.room.emit(topic, data).catch(e => { if (e && e.code === 'not_permitted') mpMsg('Zum Mitspielen sind Mitwirken-Rechte (Contributor) nötig.', true); }); }
function mpStart(seed, first, rules, again) {   // again: dieselbe Partie wird neu aufgebaut (ohne Eröffnung)
  MP.seed = seed; MP.first = first; MP.rules = rules; MP.started = true; MP.log = []; MP.quiet = false;
  ME = MP.seat; OPP = 1 - ME;
  clearTimeout(aiTimer); els.forEach(r => r.el.remove()); els.clear();
  G = M.newGame({ seed, first, names: ME === 0 ? ['Du', 'Mitspieler'] : ['Mitspieler', 'Du'], ai: [false, false], rules });
  M.record(G); G.keepSnap = true;
  seenCombat = null; endView = null; modal = null; introSeen = -1; hold = 0; started = true;
  overlay.style.display = 'none'; overlay.innerHTML = '';
  if (again) Intro.stop(); else Intro.start();
  mpChip(); pump();
}
function mpBegin() {   // Gastgeber: Spiel anlegen
  const rules = Object.assign({}, M.DEFAULT_RULES, gameRules());   // Spieleinstellungen des Gastgebers gelten für beide
  mpStart((Math.random() * 2 ** 31) | 0, Math.random() < 0.5 ? 0 : 1, rules);
}
function mpPush(a) { MP.log.push(a); mpSave(); mpEmit('act', { i: MP.log.length - 1, a }); }
function mpSendLog(from) {
  if (!MP || !MP.started) return;
  let i = from;
  while (i < MP.log.length) {
    const list = []; let size = 0, start = i;
    while (i < MP.log.length && size < 3000) { size += JSON.stringify(MP.log[i]).length + 1; list.push(MP.log[i]); i++; }
    mpEmit('acts', { from: start, list });
  }
}
function mpRecv(from, list) {
  if (!MP || !MP.started || !G) return;
  if (from > MP.log.length) { mpEmit('need', { from: MP.log.length }); return; }
  let applied = 0;
  for (let k = 0; k < list.length; k++) {
    if (from + k < MP.log.length) {
      // Beide Geräte haben gleichzeitig gehandelt (Markieren und Sperren gehen auch außerhalb des eigenen Zuges): die Aktion des Gastgebers kommt zuerst
      if (!MP.host && JSON.stringify(MP.log[from + k]) !== JSON.stringify(list[k])) { mpRebase(from + k, list.slice(k)); return; }
      continue;
    }
    const a = list[k], prev = G.logN, r = M.apply(G, a);
    if (!r.ok) { if (MP.host) mpEmit('resync', {}); else mpRepair(); break; }   // Aktion passt nicht zum eigenen Stand: der Stand des Gastgebers gilt
    MP.log.push(a); applied++;
    checkCombatEnd(prev);
  }
  if (applied) { if (applied > 3 || MP.quiet) mpQuiet(); mpSave(); pump(); }
}
// Gast: Die eigenen Aktionen ab Stelle at weichen denen des Gastgebers. Partie bis dorthin neu aufbauen, die Aktionen des Gastgebers
// einfügen und die eigenen dahinter erneut ausführen und senden (was dann nicht mehr geht, entfällt).
function mpRebase(at, theirs) {
  const base = MP.log.slice(0, at), mine = MP.log.slice(at);
  mpStart(MP.seed, MP.first, MP.rules, true);
  base.concat(theirs).forEach(a => { const prev = G.logN; if (M.apply(G, a).ok) { MP.log.push(a); checkCombatEnd(prev); } });
  mpQuiet();
  mine.forEach(a => { const prev = G.logN; if (M.apply(G, a).ok) { MP.log.push(a); mpEmit('act', { i: MP.log.length - 1, a }); checkCombatEnd(prev); } });
  mpSave(); pump();
}
function mpWait(title, text, extra) {
  overlay.style.display = 'flex'; overlay.className = 'overlay';
  overlay.innerHTML = '<div class="box"><h1>' + title + '</h1>' + text + (extra || '') + '<button class="btn" style="margin-top:14px" data-act="mpexit">Abbrechen</button></div>';
}
async function mpHost() {
  if (MP) await mpLeave();
  const code = mpCode();
  if (!(await mpOpen(code, true))) return;
  mpWait('Raum ' + code.toUpperCase(), '<p>Gib diesen Code auf dem zweiten Gerät ein:</p><div class="mpcode">' + code.toUpperCase() + '</div><p class="note">Warte auf Mitspieler …<br>Das zweite Gerät braucht Zugriff mit Mitwirken-Rechten auf diese Seite.</p>');
}
async function mpJoin() {
  const inp = document.getElementById('mpcode'), code = ((inp && inp.value) || '').trim().toLowerCase();
  if (!/^[a-z0-9]{5}$/.test(code)) { mpMsg('Bitte den 5-stelligen Code eingeben.', true); return; }
  if (MP) await mpLeave();
  if (!(await mpOpen(code, false))) return;
  mpWait('Raum ' + code.toUpperCase(), '<p class="note">Verbinde mit dem Gastgeber …</p>');
  let tries = 0;
  const ask = () => {
    if (!MP) return;
    if (++tries > 12) {
      clearInterval(MP.hello);
      mpWait('Raum ' + code.toUpperCase(), '<p class="bad">Kein Gastgeber gefunden. Stimmt der Code, und ist der Raum auf dem anderen Gerät noch offen?</p>' + (MP.room.peerjs ? '<p class="note">Technisch: ' + [MP.room.srv || 'Vermittlungsserver nicht erreicht', MP.room.err ? 'Fehler ' + MP.room.err : '', MP.room.ice ? 'ICE ' + MP.room.ice : ''].filter(Boolean).join(' · ') + '</p>' : ''));
      return;
    }
    mpEmit('hello', { v: BUILD });
  };
  MP.hello = setInterval(ask, 2000); ask();
}
async function mpLeave() {
  const m = MP; MP = null; mpForget();
  if (!m) return;
  if (m.started) { clearTimeout(aiTimer); G = null; started = false; endView = null; modal = null; }   // ohne Raum läuft die Partie nicht weiter (sonst übernähme der Computer den Platz des Mitspielers)
  clearInterval(m.hello); clearInterval(m.beat); m.subs.forEach(u => { try { u(); } catch (e) { } });
  try { await m.room.leave(); } catch (e) { }
  const hb = document.getElementById('homebtn'); if (hb) hb.classList.remove('off');
}
async function mpRestore(sv) {   // laufende Partie wieder aufnehmen: nach Neuladen der Seite von selbst, sonst über „Partie fortsetzen“
  const auto = !sv; if (auto) sv = mpSaved(true);
  if (!sv) return;
  if (!(await mpRoomApi())) { if (!auto) toast('Mehrspieler ist hier nicht verfügbar.'); return; }
  if (MP) await mpLeave();
  const title = 'Raum ' + sv.code.toUpperCase();
  mpWait(title, '<p class="note">Partie wird fortgesetzt …</p>');
  if (!(await mpOpen(sv.code, sv.host))) {
    mpWait(title, '<p class="bad">Der Raum konnte nicht wieder geöffnet werden.</p><p class="note">Besteht eine Internetverbindung? Ist die Partie auf diesem Gerät noch in einem anderen Tab offen, dort weiterspielen.</p>', '<button class="btn primary" style="margin-top:14px" data-act="mpresume">Erneut versuchen</button>');
    return;
  }
  MP.seat = sv.seat; mpStart(sv.seed, sv.first, sv.rules, true);
  sv.log.forEach(a => { const prev = G.logN, r = M.apply(G, a); if (r.ok) { MP.log.push(a); checkCombatEnd(prev); } });
  mpQuiet();
  mpSave(); pump();
  mpEmit('need', { from: MP.log.length }); if (!MP.host) mpEmit('hello', { v: BUILD });
}
