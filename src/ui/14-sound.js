/* ---------- Sound ---------- */
const Snd = (() => {
  let ctx = null, bufs = {}, on = true, last = {};
  try { on = localStorage.getItem('magus_sound') !== '0'; } catch (e) {}
  function init() {
    if (ctx || !window.SND) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC();
      for (const k of Object.keys(window.SND)) {
        fetch(window.SND[k]).then(r => r.arrayBuffer()).then(ab => ctx.decodeAudioData(ab, b => { bufs[k] = b; }, () => {})).catch(() => {});   // Dateien aus assets/audio (oder data:-URIs im Einzeldatei-Build)
      }
    } catch (e) { ctx = null; }
  }
  function play(k, delay, vol) {
    if (!on || !ctx || !bufs[k]) return;
    if (ctx.state === 'suspended') ctx.resume();
    try { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[k]; g.gain.value = vol === undefined ? 0.55 : vol; s.connect(g); g.connect(ctx.destination); s.start(ctx.currentTime + (delay || 0)); } catch (e) {}
  }
  return {
    init, play, get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('magus_sound', on ? '1' : '0'); } catch (e) {} init(); return on; },
  };
})();
document.addEventListener('pointerdown', () => Snd.init(), { once: false, capture: true });
let sndQ = { flip: 0, place: 0, shuf: 0 };
function flushSound(quiet) {
  const q = sndQ; sndQ = { flip: 0, place: 0, shuf: 0 };
  if (quiet) return;
  if (q.shuf >= 2) { Snd.play('shuffle', 0, 0.5); q.place = 0; }
  for (let i = 0; i < Math.min(q.flip, 4); i++) Snd.play('flip', i * 0.09);
  for (let i = 0; i < Math.min(q.place, 4); i++) Snd.play('play', 0.05 + i * 0.09);
}
