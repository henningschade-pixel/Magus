/* ---------- Vorschau-Blinken auf den Bögen von HP und Mana (seit 0.5.6.4) ----------
   Beim Überfahren eines Knopfes (Angriff, Verteidigen, Passen, Erholen, Nachziehen, Plus-Knöpfe) blendet auf dem HP- bzw. Mana-Bogen der betroffene Anteil aus und ein:
   ein Stück über dem Bogen zwischen altem und neuem Wert (bei nur geändertem Maximum der neu hinzukommende Teil). Die Werte selbst bleiben bei der alten Darstellung (30-eingaben.js: weniger = rot, mehr = grün). */
const ArcFx = (() => {
  const FLASH = ['hp', 'mana'];
  const num = t => { const m = /-?\d+/.exec(t); return m ? +m[0] : 0; };
  const max = t => { const m = /\/\s*(\d+)/.exec(t); return m ? +m[1] : null; };
  // betroffener Anteil als Bruchteil (0..1) der Bogenlänge
  function region(oldT, nowT) {
    const o = num(oldT), n = num(nowT), om = max(oldT), nm = max(nowT); if (om === null || !nm) return null;
    if (n !== o) return { a: Math.max(0, Math.min(o, n) / nm), b: Math.min(1, Math.max(o, n) / nm) };
    return om !== nm ? { a: Math.min(om, nm) / Math.max(om, nm), b: 1 } : null;
  }
  // el: der Wert (data-pv hp/mana) mit dem Vorschautext, oldText: der Text vor der Änderung („5/7“). Der Bogen zeigt noch den alten Stand:
  // liegt der Anteil im gefüllten Teil (Verlust), blendet ein Stück in Hintergrundfarbe darüber ein und aus; sonst ein Stück in der Farbe des Bogens (Zuwachs)
  function mark(el, oldText, undos) {
    const key = el.dataset.pv; if (FLASH.indexOf(key) < 0) return;
    const sb = el.closest('.sbody'), arc = sb && sb.querySelector('.arcv.' + key), reg = region(oldText, el.textContent);
    if (!arc || !reg || reg.b <= reg.a) return;
    const om = max(oldText), filled = om ? reg.b <= num(oldText) / om + 1e-6 : false;
    const n = arc.cloneNode(false); n.setAttribute('class', 'arcfx ' + key + (filled ? ' bg' : ''));
    n.setAttribute('stroke-dasharray', ((reg.b - reg.a) * 100).toFixed(2) + ' 100'); n.setAttribute('stroke-dashoffset', (-reg.a * 100).toFixed(2));
    arc.parentNode.insertBefore(n, arc.nextSibling);   // vor den Kerben, damit diese darüber liegen
    undos.push(() => n.remove());
  }
  return { mark };
})();
