/* ---------- PeerJS-Adapter: gleiche Schnittstelle wie die Raum-Funktion von claude.ai ----------
   Direkte Verbindung (WebRTC) zwischen zwei Browsern; PeerJS' kostenloser Vermittlungsserver
   dient nur zum Verbindungsaufbau. Der Gastgeber meldet sich als 'magus-<code>' an, der Gast verbindet sich dorthin.
   Seit 0.13.5 überwacht ein Wächter (alle 2 s) die Verbindung: Beide Seiten senden ein Lebenszeichen; bleibt es 8 s aus,
   gilt die Verbindung als tot (Tablets melden einen Abbruch oft nicht) und wird neu aufgebaut. Der Wächter meldet sich
   auch beim Vermittlungsserver neu an, wenn diese Anmeldung verloren ging (Bildschirmsperre, WLAN-Wechsel). */
const PeerRoom = {
  join(name, host) {
    return new Promise((resolve, reject) => {
      const id = 'magus-' + name.replace(/^mg-/, '');
      const subs = {}, pl = new Set(); let conn = null, peer = null, left = false, retry = null, timer = null;
      let last = 0, dialAt = 0, dials = 0, had = false, wasOn = false, lostAt = 0, cycleAt = 0, sigAt = 0, tickAt = Date.now();
      const fire = (t, data) => (subs[t] || []).slice().forEach(f => { try { f({ data, sameTab: false }); } catch (e) { } });
      const isOn = () => !!(conn && conn.open);
      const peers = () => [{ sameTab: true }].concat(isOn() ? [{ sameTab: false }] : []);
      const ping = () => {
        const on = isOn(); if (on) { had = true; dials = 0; } else if (wasOn) lostAt = Date.now(); wasOn = on;
        const p = peers(); pl.forEach(f => { try { f(p); } catch (e) { } });
      };
      const drop = () => { const c = conn; conn = null; if (c) { try { c.close(); } catch (e) { } } ping(); };
      const attach = c => {
        if (!c) return;   // peer.connect liefert nichts, solange die Anmeldung beim Vermittlungsserver fehlt
        if (conn && conn !== c) { const o = conn; conn = null; try { o.close(); } catch (e) { } }
        conn = c;
        c.on('open', () => { if (conn === c) { last = Date.now(); ping(); } });
        c.on('data', m => { if (conn !== c) return; last = Date.now(); if (m && m.t && m.t !== '_p') fire(m.t, m.d); });
        c.on('close', () => { if (conn === c) { conn = null; ping(); if (!host) later(); } });
        c.on('error', e => { room.err = (e && e.type) || 'Verbindungsfehler'; });
        c.on('iceStateChanged', st => { room.ice = st; });
        if (c.open) { last = Date.now(); ping(); }
      };
      const dial = () => {
        if (left || host || isOn() || !peer || peer.destroyed || peer.disconnected || !peer.open) return;   // fehlende Anmeldung holt der Wächter nach
        dialAt = Date.now(); dials++;
        try { attach(peer.connect(id, { reliable: true })); } catch (e) { }
      };
      const later = () => { clearTimeout(retry); retry = setTimeout(dial, 2000); };
      const tick = () => {
        if (left) return;
        const now = Date.now();
        if (now - tickAt > 6000) last = Math.max(last, now - 5000);   // Gerät war eingefroren (Bildschirmsperre, anderer Tab): der Verbindung 3 s geben, sich zu melden
        tickAt = now;
        if (isOn()) {
          try { conn.send({ t: '_p' }); } catch (e) { }
          if (now - last > 8000) { room.err = 'keine Antwort'; drop(); }
        }
        if (isOn()) return;
        if (!peer || peer.destroyed) { if (now - sigAt > 4000) create(); }
        else if (peer.disconnected) { if (now - sigAt > 1500) { sigAt = now; try { peer.reconnect(); } catch (e) { } } }
        else if (!peer.open) { if (now - sigAt > 15000) { try { peer.destroy(); } catch (e) { } } }   // Anmeldung hängt: neu anfangen
        else if (!host) {
          if (now - dialAt > 6000) { if (dials >= 3) { dials = 0; try { peer.destroy(); } catch (e) { } } else dial(); }   // drei Anläufe ohne Antwort: Anmeldung erneuern
        } else if (had && now - Math.max(lostAt, cycleAt) > 20000) { cycleAt = now; try { peer.disconnect(); } catch (e) { } }   // Gastgeber: Anmeldung auffrischen, falls sie unbemerkt abgerissen ist
      };
      const wake = () => { if (!left && timer && document.visibilityState !== 'hidden') tick(); };
      const room = {
        emit(t, d) { try { if (isOn()) conn.send({ t, d }); } catch (e) { } return Promise.resolve(); },
        on(t, f) { (subs[t] = subs[t] || []).push(f); return () => { subs[t] = (subs[t] || []).filter(x => x !== f); }; },
        peerjs: true, peers, onPeers(f) { pl.add(f); return () => pl.delete(f); },
        async leave() { stop(); try { if (conn) conn.close(); } catch (e) { } try { peer.destroy(); } catch (e) { } }
      };
      const stop = () => {
        left = true; clearTimeout(retry); clearInterval(timer);
        document.removeEventListener('visibilitychange', wake); window.removeEventListener('pageshow', wake); window.removeEventListener('online', wake);
      };
      let tries = 0;
      const create = () => {
        if (left) return;
        sigAt = Date.now();
        const p = peer = host ? new window.Peer(id, { debug: 0 }) : new window.Peer({ debug: 0 });
        p.on('open', () => {
          if (peer !== p || left) return;
          room.srv = 'Vermittlungsserver erreicht';
          if (!room.opened) {
            room.opened = true; timer = setInterval(tick, 2000);
            document.addEventListener('visibilitychange', wake); window.addEventListener('pageshow', wake); window.addEventListener('online', wake);
            resolve(room);
          }
          dial();
        });
        p.on('connection', c => { if (host && peer === p) attach(c); });
        p.on('error', e => {
          if (peer !== p) return;
          room.err = (e && e.type) || String(e);
          if (!room.opened) {
            if (host && e.type === 'unavailable-id' && ++tries < 20) { try { p.destroy(); } catch (x) { } setTimeout(create, 3000); return; }   // alte Anmeldung nach Neuladen läuft noch aus (bis zu einer Minute)
            if (e.type !== 'peer-unavailable') { stop(); reject(e); return; }
          }
          if (!host && e.type === 'peer-unavailable') { dials = 0; later(); }   // Vermittlung antwortet, der Gastgeber ist nur gerade nicht angemeldet
        });
      };
      create();
    });
  }
};
