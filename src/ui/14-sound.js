/* ---------- Sound ---------- */
const Snd = (() => {
  let ctx = null, bufs = {}, urls = {}, on = true, last = {}, sfxBus = null, musBus = null, musicOn = false;
  let sfxVol = 1, musVol = .5;   // Lautstärkeregler (0 bis 1) für Effekte und Hintergrundmusik
  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : Math.min(1, Math.max(0, +v)); } catch (e) { return d; } };
  try { on = localStorage.getItem('magus_sound') !== '0'; } catch (e) {}
  sfxVol = rd('magus_sfx', 1); musVol = rd('magus_music', .5);
  // Angleichung der Dateipegel (tools/sounds-angleichen.sh): diese Effekte wurden auf -20 dB mittleren Pegel angehoben; der Faktor erhält die bisherige Mischung
  const TRIM = { flip: .275, play: .345, ui_click: .25, dice: .37, coin_sacrifice: .335, shuffle: .53, ruin: .57, win: .77, mirror_reflect: .82, aggro: .88, break: .9, turn_change: .94 };
  // Einzeldatei-Build: data:-URIs direkt dekodieren (ohne fetch, das in eingebetteten Seiten blockiert sein kann); sonst Datei laden
  function bytes(u) { const b = atob(u.slice(u.indexOf(',') + 1)), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a.buffer; }
  function load(k, u) {
    const dec = ab => ctx.decodeAudioData(ab, b => { bufs[k] = b; }, () => {});
    // Ohne Webserver (file://) blockiert der Browser fetch: dann spielt ein Audio-Element die Datei direkt ab
    const fallback = () => { urls[k] = u; };
    try { if (u.slice(0, 5) === 'data:') dec(bytes(u)); else fetch(u).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(dec).catch(fallback); } catch (e) { fallback(); }
  }
  function init() {
    if (ctx || !window.SND) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC();
      ctx.onstatechange = () => musicSync(); sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(ctx.destination);
      musBus = ctx.createGain(); musBus.gain.value = musVol * musVol * .5; musBus.connect(ctx.destination);
      for (const k of Object.keys(window.SND)) {
        load(k, window.SND[k]);   // Dateien aus assets/audio (oder data:-URIs im Einzeldatei-Build)
      }
    } catch (e) { ctx = null; }
  }
  // Grundlautstärke je Sound (Ultimate und Fanfaren laut, Karten leise); vol überschreibt
  const VOL = { ultimate: 1, shield_hit: .8, win: .7, lose: .7, draw: .6, showdown_start: .75, stage_start: .6, atk_fire: .6, atk_earth: .6, atk_water: .6, hit: .6, block: .55, aggro: .6, ruin: .55, purify: .5, heal: .5, mirror_cast: .5, mirror_reflect: .55, recover: .4, turn_change: .35, coin_sacrifice: .95, temple_level: .6, upgrade_gain: .7, spend_upgrade: .6, magic_lv2: .7, magic_lv3: .8, card_lv2: .7, card_lv3: .8, ui_click: .3, dice: .6 };
  // Gesamtanhebung x1,35: die Dateien sind auf -20 dB mittleren Pegel normalisiert
  function play(k, delay, vol) {
    if (!on || !ctx || (!bufs[k] && !urls[k])) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!bufs[k]) {
      try { const a = new Audio(urls[k]); a.volume = Math.min(1, (vol === undefined ? (VOL[k] || 0.55) : vol) * 1.35 * (TRIM[k] || 1) * sfxVol); if (delay) setTimeout(() => a.play().catch(() => {}), delay * 1000); else a.play().catch(() => {}); } catch (e) {}
      return;
    }
    try { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[k]; g.gain.value = Math.min(1.25, (vol === undefined ? (VOL[k] || 0.55) : vol) * 1.35 * (TRIM[k] || 1)); s.connect(g); g.connect(sfxBus); s.start(ctx.currentTime + (delay || 0)); } catch (e) {}
  }
  // Hintergrundmusik: dunkler Drone mit langsamem Akkordwechsel (Am - F - G - Em, je 8 s), von Webaudio erzeugt und endlos wiederholt
  const CH = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], CHORD_S = 8;
  let musNext = 0, musStep = 0, musTimer = null, drone = null;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(m, t, dur, peak, type, bus) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(m); o.detune.value = (Math.random() - .5) * 12;
    f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + dur * .35); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + .1);
  }
  function musSched() {
    if (!musicOn || !ctx) return;
    while (musNext < ctx.currentTime + 2) {
      const c = CH[musStep % CH.length], t = musNext;
      c.forEach((m, i) => { note(m, t + i * .15, CHORD_S + 1.5, .05, 'triangle', musBus); note(m + 12, t + i * .15, CHORD_S + 1.5, .018, 'sine', musBus); });
      note(c[0] - 24, t, CHORD_S + 1, .09, 'sine', musBus);
      if (musStep % 2) note(c[(musStep >> 1) % 3] + 24, t + 2.5, 3.5, .012, 'sine', musBus);   // zarte hohe Note
      musNext += CHORD_S; musStep++;
    }
  }
  function musicStart() {
    if (musicOn || !ctx || !on || musVol <= 0) return;
    musicOn = true; musNext = ctx.currentTime + .1; musSched(); musTimer = setInterval(musSched, 1000);
    if (!drone) {   // Grundton, Quinte und Oktave mit langsam wandernder Filterfrequenz
      const f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = .05;
      lfo.frequency.value = .07; lg.gain.value = 140; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      [[33, 'sawtooth'], [40.02, 'sawtooth'], [45, 'sine']].forEach(([m, ty]) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = hz(m); o.connect(f); o.start(); });
      f.connect(g); g.connect(musBus); drone = g;
    }
    drone.gain.cancelScheduledValues(ctx.currentTime); drone.gain.setTargetAtTime(.05, ctx.currentTime, 2);
  }
  function musicStop() { musicOn = false; clearInterval(musTimer); if (drone && ctx) { drone.gain.cancelScheduledValues(ctx.currentTime); drone.gain.setTargetAtTime(0, ctx.currentTime, .3); } }
  function musicSync() { if (on && musVol > 0 && ctx && ctx.state === 'running') musicStart(); else if (musicOn) musicStop(); }
  // Browser (vor allem Safari/iOS) geben Ton erst frei, wenn im Klick/Tippen resume() und ein Ton gestartet werden
  function unlock() {
    init(); if (!ctx) return;
    try { if (ctx.state !== 'running') ctx.resume(); const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) {}
    musicSync();
  }
  const info = () => ({ on, state: ctx ? ctx.state : 'nicht gestartet', loaded: Object.keys(bufs).length + Object.keys(urls).length, total: Object.keys(window.SND || {}).length });
  return {
    init, play, unlock, info, get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('magus_sound', on ? '1' : '0'); } catch (e) {} init(); musicSync(); return on; },
    get sfx() { return sfxVol; }, get music() { return musVol; },
    setSfx(v) { sfxVol = Math.min(1, Math.max(0, v)); try { localStorage.setItem('magus_sfx', sfxVol); } catch (e) {} if (sfxBus) sfxBus.gain.value = sfxVol; },
    setMusic(v) { musVol = Math.min(1, Math.max(0, v)); try { localStorage.setItem('magus_music', musVol); } catch (e) {} if (musBus) musBus.gain.value = musVol * musVol * .5; musicSync(); },
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
