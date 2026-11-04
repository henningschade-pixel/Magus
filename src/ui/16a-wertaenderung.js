/* ---------- Wertänderungen (seit 0.5.6) ----------
   Ändert sich ein Wert in den Seitenleisten (Gold, HP, Mana, Limit, Upgrade-Punkte, Siegpunkte), steht die Änderung als Zahl dabei:
   grün mit „+“ bei Zuwachs, rot mit „−“ bei Verlust. HP und Mana blinken zusätzlich (Zahl und Bogen).
   - echte Änderungen: track() vergleicht nach jedem Zeichnen die angezeigten Zahlen mit dem letzten Stand; die Änderung steigt als Zahl aus dem Wert auf
   - Vorschau beim Überfahren der Knöpfe (30-eingaben.js): mark() hängt die Änderung an den Vorschauwert, HP und Mana blinken, solange die Maus auf dem Knopf liegt */
const Delta = (() => {
  const KEYS = ['gold', 'hp', 'mana', 'limit', 'pts', 'sp'], FLASH = ['hp', 'mana'], FLASH_MS = 1110;
  let snap = null;
  const flashes = {};   // laufende Blinker: Kennung -> { t: Startzeit, x: Änderung }; ein neues Zeichnen setzt sie fort, statt sie abzubrechen
  const rootOf = w => { const b = w === 'me' ? stage.querySelector('.sbody[data-lead]') : stage.querySelector('.sbody:not([data-lead])'); return b && (b.closest('.panel') || b); };
  const num = t => { const m = /-?\d+/.exec(t); return m ? +m[0] : 0; };
  const max = t => { const m = /\/\s*(\d+)/.exec(t); return m ? +m[1] : null; };
  const sign = x => (x > 0 ? '+' : '−') + Math.abs(x);
  const tag = x => '<span class="pvd ' + (x > 0 ? 'pos' : 'neg') + '">' + sign(x) + '</span>';
  const arcOf = el => { const sb = el.closest('.sbody'); return sb && FLASH.indexOf(el.dataset.pv) >= 0 ? sb.querySelector('.arcv.' + el.dataset.pv) : null; };
  // betroffener Anteil des Bogens als Bruchteil (0..1) der Bogenlänge: zwischen altem und neuem Wert; ändert sich nur das Maximum, der neu hinzugekommene bzw. weggefallene Teil
  const region = (oldT, nowT) => {
    const o = num(oldT), n = num(nowT), om = max(oldT), nm = max(nowT); if (om === null || !nm) return null;
    if (n !== o) return { a: Math.max(0, Math.min(o, n) / nm), b: Math.min(1, Math.max(o, n) / nm) };
    return om !== nm ? { a: Math.min(om, nm) / Math.max(om, nm), b: 1 } : null;
  };
  // Änderung zwischen zwei angezeigten Texten („5/7“ -> „3/7“); steht nur das Maximum anders da, zählt dessen Änderung
  const diff = (oldT, nowT) => { const d = num(nowT) - num(oldT), o = max(oldT), n = max(nowT); return d || (o !== null && n !== null ? n - o : 0); };
  const at = el => { const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth; return { x: (r.right - sr.left) / k + 22, y: (r.top + r.height / 2 - sr.top) / k }; };   // rechts neben dem Wert, damit die Zahlen der übereinanderliegenden Zeilen sich nicht überdecken
  function fly(el, x) {   // die Zahl steigt aus dem Wert auf und blendet aus
    const p = at(el), d = document.createElement('div');
    d.className = 'dlt ' + (x > 0 ? 'pos' : 'neg'); d.textContent = sign(x); d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    stage.appendChild(d); setTimeout(() => d.remove(), 1700);
  }
  function seg(el, x, reg, inf, delayMs) {   // legt über den betroffenen Anteil des Bogens ein blinkendes Stück in Grün (+) oder Rot (−)
    const arc = arcOf(el); if (!arc || !reg || reg.b <= reg.a) return () => {};
    const n = arc.cloneNode(false); n.setAttribute('class', 'arcfx ' + (x > 0 ? 'pos' : 'neg') + (inf ? ' inf' : ''));
    n.setAttribute('stroke-dasharray', ((reg.b - reg.a) * 100).toFixed(2) + ' 100'); n.setAttribute('stroke-dashoffset', (-reg.a * 100).toFixed(2));
    if (delayMs) n.style.animationDelay = (-delayMs) + 'ms';
    arc.parentNode.insertBefore(n, arc.nextSibling);   // vor den Kerben, damit diese darüber liegen
    if (!inf) setTimeout(() => n.remove(), Math.max(0, FLASH_MS - (delayMs || 0)));
    return () => n.remove();
  }
  function setFlash(list, x, inf, delayMs) {
    const add = x > 0 ? 'pos' : 'neg', del = x > 0 ? 'neg' : 'pos';
    list.forEach(t => { t.classList.remove(del); t.classList.add('dfl', add); if (inf) t.classList.add('inf'); t.style.animationDelay = delayMs ? (-delayMs) + 'ms' : ''; });
    return () => list.forEach(t => { t.classList.remove('dfl', 'inf', 'pos', 'neg'); t.style.animationDelay = ''; });
  }
  // Vorschau: Änderung als Zahl an den Vorschauwert hängen; bei HP und Mana blinken Zahl und Bogen, bis die Vorschau endet
  function mark(el, oldText, undos) {
    const x = diff(oldText, el.textContent); if (!x) return;
    el.insertAdjacentHTML('beforeend', tag(x));
    el.classList.add('pvb'); undos.push(() => el.classList.remove('pvb'));   // Vorschauwert in Normalfarbe: der zu erwartende Effekt blinkt, statt rot oder grün abgehoben zu stehen
    undos.push(setFlash([el], x, true, 0));
    if (FLASH.indexOf(el.dataset.pv) >= 0) undos.push(seg(el, x, region(oldText, el.textContent), true, 0));
  }
  function track() {   // nach jedem Zeichnen der Seitenleisten
    if (!G) { snap = null; return; }
    const cur = {};
    ['me', 'op'].forEach(w => { const r = rootOf(w); if (r) r.querySelectorAll('[data-pv]').forEach(el => { const k = el.dataset.pv; if (KEYS.indexOf(k) >= 0) cur[w + '.' + k] = { n: num(el.textContent), m: max(el.textContent), t: el.textContent, el }; }); });
    const same = snap && snap.g === G && snap.ph === G.phase && snap.c === G.combat && snap.ev === !!endView;   // neues Spiel, Phasen- oder Kampfwechsel: neuer Vergleichsstand statt falscher Änderungen
    if (same && !FAST) Object.keys(cur).forEach(id => {
      const o = snap.v[id]; if (!o) return;
      const x = diff(o.t, cur[id].t); if (!x) return;
      fly(cur[id].el, x);
      if (FLASH.indexOf(id.split('.')[1]) >= 0) flashes[id] = { t: Date.now(), x, reg: region(snap.v[id].t, cur[id].t) };
    });
    snap = { g: G, ph: G.phase, c: G.combat, ev: !!endView, v: Object.keys(cur).reduce((a, id) => { a[id] = { t: cur[id].t }; return a; }, {}) };
    Object.keys(flashes).forEach(id => {
      const age = Date.now() - flashes[id].t;
      if (age >= FLASH_MS || !cur[id]) { delete flashes[id]; return; }
      setFlash([cur[id].el], flashes[id].x, false, age); seg(cur[id].el, flashes[id].x, flashes[id].reg, false, age);
    });
  }
  return { track, mark, tag };
})();
