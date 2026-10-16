/* ---------- Mehrspieler (Raum-Funktion von claude.ai) ----------
   Beide Geräte rechnen dasselbe Spiel (gleicher Startwert) und tauschen nur Aktionen aus.
   Protokoll: hello (Gast tritt bei) → start (Startwert, Regeln) → need (ab Aktion n bitte) → acts; act = eine neue Aktion. */
let MP = null, roomApi;
const MP_TOPICS = ['hello', 'start', 'need', 'act', 'acts', 'sync'];
const MP_KEY = 'magus-mp';
// Kennung dieser Spielversion: beide Geräte müssen denselben Programmtext haben, sonst rechnen sie unterschiedlich.
const BUILD = (() => { let h = 2166136261; const t = [...document.scripts].map(x => x.text).join(''); for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); })();
function mpOldVersion(who) { mpWait('Andere Spielversion', '<p class="bad">' + who + ' hat eine andere Version von Magus geladen.</p><p class="note">Bitte auf beiden Geräten die Seite mit Strg+F5 (Handy: Seite neu laden, notfalls Cache leeren) neu laden und danach einen neuen Raum erstellen.</p>'); }
async function mpRoomApi() {
  if (roomApi) return roomApi;
  try { roomApi = window.claude && window.claude.use ? await window.claude.use('room') : null; } catch (e) { roomApi = null; }
  if (!roomApi && window.Peer) roomApi = PeerRoom;   // Online-Fassung ohne claude.ai: direkte Verbindung per PeerJS
  return roomApi || null;
}
let offerTries = 0;
async function mpOffer() {   // Startbildschirm: Mehrspielerbereich nur zeigen, wenn die Raum-Funktion da ist
  const api = await mpRoomApi(), box = document.getElementById('mpbox');
  if (box && api) box.style.display = 'block';
  else if (box && !(window.claude && window.claude.use) && ++offerTries < 8) setTimeout(mpOffer, 1000);   // PeerJS kommt evtl. verzögert vom Ausweich-Anbieter
}
function mpMsg(t, bad) { const m = document.getElementById('mpmsg'); if (m) { m.textContent = t || ''; m.style.color = bad ? 'var(--bad)' : ''; } }
function mpCode() { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.random() * a.length | 0]; return s; }
function mpSave() { try { if (MP && MP.started) sessionStorage.setItem(MP_KEY, JSON.stringify({ code: MP.code, seat: MP.seat, host: MP.host, seed: MP.seed, first: MP.first, rules: MP.rules, log: MP.log })); } catch (e) { } }
function mpForget() { try { sessionStorage.removeItem(MP_KEY); } catch (e) { } }
function mpOnline() { return !!MP && MP.room.peers().some(p => !p.sameTab); }
function mpChip() {   // die Rauminformation steht im Home-Menü; der Home-Knopf wird rot, wenn der Mitspieler offline ist
  const h = document.getElementById('homebtn'); if (h) h.classList.toggle('off', !!MP && !mpOnline());
  const m = document.getElementById('mproom'); if (m && MP) { const on = mpOnline(); m.textContent = 'Raum ' + MP.code.toUpperCase() + ' · ' + (on ? 'online' : 'offline'); m.style.color = on ? '' : 'var(--bad)'; }
}
async function mpOpen(code, host) {
  const api = await mpRoomApi(); if (!api) { mpMsg('Mehrspieler ist hier nicht verfügbar.', true); return false; }
  let room; try { room = await api.join('mg-' + code, host); } catch (e) { mpMsg(e && e.type === 'unavailable-id' ? 'Code schon vergeben, bitte erneut versuchen.' : 'Raum konnte nicht geöffnet werden (Verbindung zum Vermittlungsserver?).', true); return false; }
  MP = { room, code, host, seat: host ? 0 : 1, log: [], seed: null, first: 0, rules: null, started: false, subs: [], hello: null };
  // nur das eigene Echo (sameTab) wird ignoriert: das zweite Gerät derselben Person zählt als Mitspieler
  const on = (t, f) => MP.subs.push(room.on(t, m => { if (!m.sameTab) f(m.data || {}, m); }));
  on('hello', d => { if (!MP.host) return; if (d.v !== BUILD) { mpEmit('start', { v: BUILD }); if (!MP.started) mpOldVersion('Der Mitspieler'); return; } if (!MP.started) mpBegin(); mpEmit('start', { seed: MP.seed, first: MP.first, rules: MP.rules, v: BUILD }); });
  on('start', d => { if (MP.host) return; if (d.v !== BUILD) { clearInterval(MP.hello); mpOldVersion('Der Gastgeber'); return; } if (!MP.started || MP.seed !== d.seed) mpStart(d.seed, d.first, d.rules); clearInterval(MP.hello); mpEmit('need', { from: MP.log.length }); });
  on('need', d => mpSendLog(+d.from || 0));
  on('sync', d => { if (!MP.started) return; const n = +d.n; if (n > MP.log.length) mpEmit('need', { from: MP.log.length }); else if (n < MP.log.length) mpSendLog(n); });   // Herzschlag: verlorene Nachrichten nachholen
  MP.beat = setInterval(() => { if (MP && MP.started) mpEmit('sync', { n: MP.log.length }); }, 2000);
  on('act', d => mpRecv(+d.i, [d.a]));
  on('acts', d => mpRecv(+d.from, d.list || []));
  MP.subs.push(room.onPeers(() => mpChip()));
  return true;
}
function mpEmit(topic, data) { return MP.room.emit(topic, data).catch(e => { if (e && e.code === 'not_permitted') mpMsg('Zum Mitspielen sind Mitwirken-Rechte (Contributor) nötig.', true); }); }
function mpStart(seed, first, rules) {
  MP.seed = seed; MP.first = first; MP.rules = rules; MP.started = true; MP.log = [];
  ME = MP.seat; OPP = 1 - ME;
  clearTimeout(aiTimer); els.forEach(r => r.el.remove()); els.clear();
  G = M.newGame({ seed, first, names: ME === 0 ? ['Du', 'Mitspieler'] : ['Mitspieler', 'Du'], ai: [false, false], rules });
  M.record(G); G.keepSnap = true;
  seenCombat = null; endView = null; modal = null; introSeen = -1; hold = 0; started = true;
  overlay.style.display = 'none'; overlay.innerHTML = '';
  mpChip(); pump();
}
function mpBegin() {   // Gastgeber: Spiel anlegen
  const rules = Object.assign({}, M.DEFAULT_RULES);
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
    if (from + k < MP.log.length) continue;
    const a = list[k], prev = G.logN, r = M.apply(G, a);
    if (!r.ok) { toast('Synchronisierung fehlgeschlagen: ' + r.error); return; }
    MP.log.push(a); applied++;
    checkCombatEnd(prev);
    if (G.phase === 'combat') M.combatTick(G);   // wie pump(): gleiche Schrittfolge auf beiden Geräten
  }
  if (applied) { mpSave(); pump(); }
}
function mpWait(title, text) {
  overlay.style.display = 'flex';
  overlay.innerHTML = '<div class="box"><h1>' + title + '</h1>' + text + '<button class="btn" style="margin-top:14px" data-act="mpexit">Abbrechen</button></div>';
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
  const ask = () => { if (!MP) return; if (++tries > 12) { clearInterval(MP.hello); mpWait('Raum ' + code.toUpperCase(), '<p class="bad">Kein Gastgeber gefunden. Stimmt der Code, und ist der Raum auf dem anderen Gerät noch offen?</p>' + (MP.room.peerjs ? '<p class="note">Technisch: ' + [MP.room.srv || 'Vermittlungsserver nicht erreicht', MP.room.err ? 'Fehler ' + MP.room.err : '', MP.room.ice ? 'ICE ' + MP.room.ice : ''].filter(Boolean).join(' · ') + '</p>' : '')); return; } mpEmit('hello', { v: BUILD }); };
  MP.hello = setInterval(ask, 2000); ask();
}
async function mpLeave() {
  const m = MP; MP = null; mpForget();
  if (!m) return;
  clearInterval(m.hello); clearInterval(m.beat); m.subs.forEach(u => { try { u(); } catch (e) { } });
  try { await m.room.leave(); } catch (e) { }
  const hb = document.getElementById('homebtn'); if (hb) hb.classList.remove('off');
}
async function mpRestore() {   // nach Neuladen der Seite: laufende Partie wieder aufnehmen
  let sv = null; try { sv = JSON.parse(sessionStorage.getItem(MP_KEY) || 'null'); } catch (e) { }
  if (!sv || !(await mpRoomApi())) return;
  if (!(await mpOpen(sv.code, sv.host))) return;
  MP.seat = sv.seat; mpStart(sv.seed, sv.first, sv.rules);
  sv.log.forEach(a => { const prev = G.logN, r = M.apply(G, a); if (r.ok) { MP.log.push(a); checkCombatEnd(prev); if (G.phase === 'combat') M.combatTick(G); } });
  endView = null; modal = null; introSeen = G.phase === 'combat' && G.combat.mode === 'showdown' ? G.showdown : -1; hold = 0;
  mpSave(); pump();
  mpEmit('need', { from: MP.log.length }); if (!MP.host) mpEmit('hello', { v: BUILD });
}
