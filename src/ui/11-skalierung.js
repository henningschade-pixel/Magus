/* ---------- Skalierung: Höhe 800 fest, Breite füllt das Fenster (mindestens 1280) ---------- */
function fit() {
  const k = window.innerHeight / 800, W = Math.max(1280, Math.round(window.innerWidth / k));
  const changed = W !== SW;
  if (changed) layoutFor(W);
  stage.style.transform = 'scale(' + k + ')';
  if (changed && typeof render === 'function' && G) render();
}
window.addEventListener('resize', fit); fit();
