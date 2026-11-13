// Browser-Test Mehrspieler (Playwright, Chromium): zwei Geräte über einen nachgebauten Vermittlungsdienst (kein Netz nötig).
// Geprüft werden gleichzeitige Aktionen, eine stumme (tote) Verbindung, abweichende Spielstände, Neuladen und „Partie fortsetzen“.
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('path');
let chromium = null; try { ({ chromium } = require('playwright')); } catch (e) { /* nicht installiert */ }
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const url = 'file://' + path.join(__dirname, '..', 'index.html') + '?fast';

// Ersatz für PeerJS im Browser: Nachrichten laufen über __relaySend (Node) an alle anderen Seiten. __net.mute verschluckt alles (tote Verbindung, die niemand meldet).
function peerMock() {
  const ev = () => { const h = {}; return { on(t, f) { (h[t] = h[t] || []).push(f); }, emit(t, x) { (h[t] || []).slice().forEach(f => f(x)); } }; };
  const all = new Set(); window.__net = { mute: false };
  const out = m => { if (!window.__net.mute) window.__relaySend(JSON.stringify(m)); };
  window.__relayRecv = t => { if (window.__net.mute) return; const m = JSON.parse(t); all.forEach(p => p._in(m)); };
  class Conn { constructor(peer, cid, to) { Object.assign(this, ev()); this.peer = peer; this.cid = cid; this.to = to; this.open = false; }
    send(m) { if (this.open) out({ k: 'data', cid: this.cid, to: this.to, m }); }
    close() { if (this.dead) return; const was = this.open; this.dead = true; this.open = false; this.peer.conns.delete(this.cid); if (was) out({ k: 'close', cid: this.cid, to: this.to }); this.emit('close'); } }
  window.Peer = class { constructor(id) { Object.assign(this, ev()); this.id = typeof id === 'string' ? id : 'g' + Math.random().toString(36).slice(2); this.open = false; this.disconnected = false; this.destroyed = false; this.conns = new Map(); all.add(this);
      setTimeout(() => { if (!this.destroyed) { this.open = true; this.emit('open', this.id); } }, 30); }
    connect(to) { if (this.disconnected) return undefined; const c = new Conn(this, Math.random().toString(36).slice(2), to); this.conns.set(c.cid, c); out({ k: 'offer', cid: c.cid, to, from: this.id });
      setTimeout(() => { if (!c.open && !c.dead && !this.destroyed) this.emit('error', { type: 'peer-unavailable' }); }, 400); return c; }
    _in(m) { if (this.destroyed || !this.open || m.to !== this.id) return;
      if (m.k === 'offer') { const c = new Conn(this, m.cid, m.from); this.conns.set(c.cid, c); c.open = true; out({ k: 'answer', cid: m.cid, to: m.from }); this.emit('connection', c); setTimeout(() => c.emit('open'), 0); return; }
      const c = this.conns.get(m.cid); if (!c) return;
      if (m.k === 'answer') { c.open = true; c.emit('open'); } else if (m.k === 'data') c.emit('data', m.m); else if (m.k === 'close') { c.dead = true; c.open = false; this.conns.delete(c.cid); c.emit('close'); } }
    disconnect() { if (this.disconnected) return; this.disconnected = true; this.open = false; this.emit('disconnected'); }
    reconnect() { this.disconnected = false; setTimeout(() => { if (!this.destroyed) { this.open = true; this.emit('open', this.id); } }, 30); }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.open = false; [...this.conns.values()].forEach(c => c.close()); all.delete(this); this.emit('close'); } };
}

test('Mehrspieler: gleichzeitige Aktionen, tote Verbindung, abweichender Stand, Neuladen und „Partie fortsetzen“', { skip: !chromium && 'Playwright nicht installiert', timeout: 180000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const pages = [], errs = [];
    const device = async () => {   // ein Gerät = eigener Browser-Kontext (eigener Speicher)
      const ctx = await b.newContext({ viewport: { width: 1300, height: 820 } });
      await ctx.route(/unpkg|jsdelivr/, r => r.abort());
      await ctx.exposeFunction('__relaySend', t => { pages.forEach(q => { if (q.context() !== ctx && !q.isClosed()) q.evaluate(x => window.__relayRecv && window.__relayRecv(x), t).catch(() => { }); }); });
      await ctx.addInitScript(peerMock);
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); pages.push(p);
      await p.goto(url); await p.waitForTimeout(300);
      return p;
    };
    const st = p => p.evaluate(() => { const g = window.__magus.state, m = window.__magus.mp; return g && m ? { n: m.n, turn: g.turn, phase: g.phase, logN: g.logN, marks: g.players.map(q => q.deck.marks.join()), hands: g.players.map(q => q.deck.hand.map(c => c ? c.id + (c.locked ? '!' : '') : '-').join()) } : null; });
    const same = async (a, c, why, ms) => {
      const end = Date.now() + (ms || 15000); let x, y;
      do { await a.waitForTimeout(250); x = await st(a); y = await st(c); } while ((!x || !y || JSON.stringify(x) !== JSON.stringify(y)) && Date.now() < end);
      assert.deepEqual(y, x, why); return x;
    };
    const seat = p => p.evaluate(() => window.__magus.mp.seat);
    const act = (p, a) => p.evaluate(a => window.__magus.act(a), a);

    const host = await device(), guest = await device();
    await host.click('text=Mehrspieler'); await host.click('text=Raum erstellen');
    const code = (await host.textContent('.mpcode')).trim();
    await guest.click('text=Mehrspieler'); await guest.fill('#mpcode', code); await guest.click('text=Beitreten');
    await host.waitForFunction(() => window.__magus.mp && window.__magus.mp.started);
    await guest.waitForFunction(() => window.__magus.mp && window.__magus.mp.started);
    const hs = await seat(host), gs = await seat(guest);
    let s = await same(host, guest, 'beide starten mit demselben Stand');
    const onTurn = () => (s.turn === hs ? host : guest), offTurn = () => (s.turn === hs ? guest : host);

    // 1) Gleichzeitig: der eine zieht nach, der andere markiert außerhalb seines Zuges eine Karte
    for (let i = 0; i < 4; i++) {
      const a = onTurn(), o = offTurn();
      await Promise.all([act(a, { type: 'draw' }), act(o, { type: 'lock', slot: i % 3 })]);
      s = await same(host, guest, 'gleichzeitige Aktionen, Runde ' + i);
    }
    assert.ok(s.n >= 8, 'beide Aktionen jeder Runde sind angekommen (' + s.n + ')');
    assert.ok(s.hands.join().includes('!'), 'die Sperren außerhalb des Zuges sind erhalten');

    // 2) Tote Verbindung beim Gast: nichts kommt an, niemand meldet einen Abbruch. Der Gastgeber spielt weiter, soweit er am Zug ist.
    await guest.evaluate(() => { window.__net.mute = true; });
    if (s.turn === hs) await act(host, { type: 'draw' });
    await act(host, { type: 'lock', slot: 4 });
    const lone = await st(host);
    await host.waitForFunction(() => document.getElementById('homebtn').classList.contains('off'), null, { timeout: 15000 });   // Verbindungsverlust wird bemerkt
    assert.equal((await st(host)).n, lone.n, 'ohne Mitspieler spielt niemand für ihn (kein Computergegner)');
    await guest.evaluate(() => { window.__net.mute = false; });
    s = await same(host, guest, 'nach der Unterbrechung holt der Gast auf', 25000);
    await host.waitForFunction(() => !document.getElementById('homebtn').classList.contains('off'), null, { timeout: 15000 });

    // 3) Abweichender Spielstand beim Gast: wird über die Prüfsumme erkannt und vom Gastgeber aus repariert
    await guest.evaluate(() => { window.__magus.state.players[0].stats.hp += 3; });
    await guest.waitForTimeout(5000);
    assert.equal(await guest.evaluate(() => window.__magus.state.players[0].stats.hp), await host.evaluate(() => window.__magus.state.players[0].stats.hp), 'Gast hat den Stand des Gastgebers übernommen');
    s = await same(host, guest, 'nach der Reparatur gleich');

    // 4) Gast lädt die Seite neu: die Partie geht von selbst weiter
    await guest.reload(); await guest.waitForFunction(() => window.__magus.mp && window.__magus.mp.started, null, { timeout: 15000 });
    s = await same(host, guest, 'nach Neuladen des Gastes gleich', 25000);
    await act(onTurn(), { type: 'draw' }); s = await same(host, guest, 'Zug nach dem Neuladen kommt an');

    // 5) Gastgeber verlässt die Partie: kein „Spiel fortsetzen“ gegen den Computer, dafür „Partie fortsetzen“
    await host.click('#homebtn'); await host.click('[data-act="leave"]');
    assert.equal(await host.evaluate(() => window.__magus.state), null, 'die Partie läuft nicht ohne Raum weiter');
    assert.equal(await host.locator('[data-act="resume"]').count(), 0, 'kein „Spiel fortsetzen“');
    await host.click('[data-act="mpresume"]');
    await host.waitForFunction(() => window.__magus.mp && window.__magus.mp.started, null, { timeout: 15000 });
    s = await same(host, guest, 'Gastgeber ist über „Partie fortsetzen“ zurück', 30000);
    await act(onTurn(), { type: 'draw' }); s = await same(host, guest, 'Zug nach dem Fortsetzen kommt an');

    // 6) Gast schließt den Tab und öffnet die Seite neu: „Partie fortsetzen“ im Hauptmenü
    const gctx = guest.context(); await guest.close();
    const g2 = await gctx.newPage(); g2.on('pageerror', e => errs.push(e.message)); pages.push(g2);
    await g2.goto(url); await g2.waitForTimeout(300);
    await g2.click('[data-act="mpresume"]');
    await g2.waitForFunction(() => window.__magus.mp && window.__magus.mp.started, null, { timeout: 15000 });
    s = await same(host, g2, 'Gast ist nach geschlossenem Tab zurück', 30000);
    assert.equal(await seat(g2), gs, 'Gast sitzt wieder auf seinem Platz');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
