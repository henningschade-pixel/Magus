/* ---------- Skalierung ---------- */
function fit() {
  const k = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = 'scale(' + k + ')';
}
window.addEventListener('resize', fit); fit();

