/* ---------- Sound ---------- */
const Snd = (() => {
  let ctx = null, bufs = {}, on = true, last = {};
  try { on = localStorage.getItem('magus_sound') !== '0'; } catch (e) {}
  // Einzeldatei-Build: data:-URIs direkt dekodieren (ohne fetch, das in eingebetteten Seiten blockiert sein kann); sonst Datei laden
  function bytes(u) { const b = atob(u.slice(u.indexOf(',') + 1)), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a.buffer; }
  function load(k, u) {
    const dec = ab => ctx.decodeAudioData(ab, b => { bufs[k] = b; }, () => {});
    try { if (u.slice(0, 5) === 'data:') dec(bytes(u)); else fetch(u).then(r => r.arrayBuffer()).then(dec).catch(() => {}); } catch (e) { /* Sound bleibt stumm */ }
  }
  function init() {
    if (ctx || !window.SND) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC();
      for (const k of Object.keys(window.SND)) {
        load(k, window.SND[k]);   // Dateien aus assets/audio (oder data:-URIs im Einzeldatei-Build)
      }
    } catch (e) { ctx = null; }
  }
  // Grundlautstärke je Sound (Ultimate und Fanfaren laut, Karten leise); vol überschreibt
  const VOL = { ultimate: .95, shield_hit: .8, game_win: .8, game_lose: .8, win: .7, lose: .7, draw: .6, showdown_start: .75, stage_start: .6, atk_fire: .6, atk_earth: .6, atk_water: .6, hit: .6, block: .55, aggro: .6, ruin: .55, purify: .5, heal: .5, mirror_cast: .5, mirror_reflect: .55, recover: .4, turn_change: .35, coin_sacrifice: .95, temple_level: .6, spend_upgrade: .6, magic_lv2: .7, magic_lv3: .8, card_lv2: .7, card_lv3: .8, ui_click: .3 };
  // Gesamtanhebung x1,35: die Dateien sind auf -20 dB mittleren Pegel normalisiert
  function play(k, delay, vol) {
    if (!on || !ctx || !bufs[k]) return;
    if (ctx.state === 'suspended') ctx.resume();
    try { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[k]; g.gain.value = Math.min(1.25, (vol === undefined ? (VOL[k] || 0.55) : vol) * 1.35); s.connect(g); g.connect(ctx.destination); s.start(ctx.currentTime + (delay || 0)); } catch (e) {}
  }
  // Browser (vor allem Safari/iOS) geben Ton erst frei, wenn im Klick/Tippen resume() und ein Ton gestartet werden
  function unlock() {
    init(); if (!ctx) return;
    try { if (ctx.state !== 'running') ctx.resume(); const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) {}
  }
  const info = () => ({ on, state: ctx ? ctx.state : 'nicht gestartet', loaded: Object.keys(bufs).length, total: Object.keys(window.SND || {}).length });
  return {
    init, play, unlock, info, get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('magus_sound', on ? '1' : '0'); } catch (e) {} init(); return on; },
  };
})();
['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, () => Snd.unlock(), { capture: true }));
let sndQ = { flip: 0, place: 0, shuf: 0 };
function flushSound(quiet) {
  const q = sndQ; sndQ = { flip: 0, place: 0, shuf: 0 };
  if (quiet) return;
  if (q.shuf >= 2) { Snd.play('shuffle', 0, 0.8); q.place = 0; }
  for (let i = 0; i < Math.min(q.flip, 4); i++) Snd.play('flip', i * 0.09);
  for (let i = 0; i < Math.min(q.place, 4); i++) Snd.play('play', 0.05 + i * 0.09);
}
