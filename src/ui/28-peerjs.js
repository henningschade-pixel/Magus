/* ---------- PeerJS-Adapter: gleiche Schnittstelle wie die Raum-Funktion von claude.ai ----------
   Direkte Verbindung (WebRTC) zwischen zwei Browsern; PeerJS' kostenloser Vermittlungsserver
   dient nur zum Verbindungsaufbau. Der Gastgeber meldet sich als 'magus-<code>' an, der Gast verbindet sich dorthin. */
const PeerRoom = {
  join(name, host) {
    return new Promise((resolve, reject) => {
      const subs = {}, pl = new Set(); let conn = null, peer = null, left = false, retry = null;
      const fire = (t, data) => (subs[t] || []).slice().forEach(f => { try { f({ data, sameTab: false }); } catch (e) { } });
      const peers = () => [{ sameTab: true }].concat(conn && conn.open ? [{ sameTab: false }] : []);
      const ping = () => { const p = peers(); pl.forEach(f => { try { f(p); } catch (e) { } }); };
      const attach = c => {
        if (conn && conn !== c) { try { conn.close(); } catch (e) { } }
        conn = c;
        c.on('open', ping);
        c.on('data', m => { if (m && m.t) fire(m.t, m.d); });
        c.on('close', () => { if (conn === c) { conn = null; ping(); if (!host) later(); } });
        c.on('error', e => { room.err = (e && e.type) || 'Verbindungsfehler'; });
        c.on('iceStateChanged', st => { room.ice = st; });
        if (c.open) ping();
      };
      const dial = () => { if (left || !peer || peer.destroyed || (conn && conn.open)) return; try { attach(peer.connect('magus-' + name.replace(/^mg-/, ''), { reliable: true })); } catch (e) { later(); } };
      const later = () => { clearTimeout(retry); retry = setTimeout(dial, 2000); };
      const room = {
        emit(t, d) { try { if (conn && conn.open) conn.send({ t, d }); } catch (e) { } return Promise.resolve(); },
        on(t, f) { (subs[t] = subs[t] || []).push(f); return () => { subs[t] = (subs[t] || []).filter(x => x !== f); }; },
        peerjs: true, peers, onPeers(f) { pl.add(f); return () => pl.delete(f); },
        async leave() { left = true; clearTimeout(retry); try { if (conn) conn.close(); } catch (e) { } try { peer.destroy(); } catch (e) { } }
      };
      let tries = 0;
      const create = () => {
        const opts = { debug: 0 };
        peer = host ? new window.Peer('magus-' + name.replace(/^mg-/, ''), opts) : new window.Peer(opts);
        peer.on('open', () => { room.opened = true; room.srv = 'Vermittlungsserver erreicht'; resolve(room); if (!host) dial(); });
        peer.on('connection', c => { if (host) attach(c); });
        peer.on('disconnected', () => { try { if (!left && !peer.destroyed) peer.reconnect(); } catch (e) { } });
        peer.on('error', e => {
          room.err = (e && e.type) || String(e);
          if (!room.opened) {
            if (host && e.type === 'unavailable-id' && ++tries < 5) { try { peer.destroy(); } catch (x) { } setTimeout(create, 3000); return; }   // alte Anmeldung nach Neuladen läuft noch aus
            if (e.type !== 'peer-unavailable') { reject(e); return; }
          }
          if (!host && e.type === 'peer-unavailable') later();
        });
      };
      create();
    });
  }
};
