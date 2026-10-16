/* ---------- Eingaben ---------- */
function onAct(d) {
  switch (d.act) {
    case 'newgame': newGame(); break;
    case 'home': homeMenu(); break;
    case 'stclose': overlay.style.display = 'none'; overlay.innerHTML = ''; pump(); break;
    case 'stfit': statsFitView(); break;
    case 'stwho': case 'stser': statsToggle(d.act, d.k); break;
    case 'resume': overlay.style.display = 'none'; overlay.innerHTML = ''; pump(); break;
    case 'restart': if (!MP) newGame(); break;
    case 'leave': clearTimeout(aiTimer); if (MP) { mpLeave(); G = null; started = false; } showStart(); break;
    case 'mphost': mpHost(); break;
    case 'mpjoin': mpJoin(); break;
    case 'mpexit': mpLeave(); showStart(); break;
    case 'deckview': deckView = !deckView; render(); break;
    case 'deckclose': deckView = false; render(); break;
    case 'dismiss':
      if (endView && endView.stage === 'result') { endView = null; hold = 0; if (G && G.stage > stageSeen) Snd.play('stage_start'); stageSeen = G ? G.stage : stageSeen; pump(); }
      else if (modal) { modal = null; hold = 0; pump(); }
      break;
    case 'combat': act({ type: 'combat', elem: d.e }); break;
    case 'vendor': { const o = M.vendorOffers(G, ME)[+d.i]; if (o) act({ type: 'vendor', result: o.result, cost: o.cost }); break; }
    case 'sacdn': sacN = Math.max(0, sacN - 1); render(); break;
    case 'sacup': sacN = Math.min(4, sacN + 1); render(); break;
    case 'temple': sacN = 0; act({ type: 'temple', amount: +d.n }); break;
    case 'spend': act({ type: 'spend', what: d.w }); break;
    case 'magic': act({ type: 'magic', elem: d.e }); break;
    case 'fd': act({ type: 'fd', slots: [...fdSel] }); fdSel.clear(); break;
    case 'draw': if (canDrawNow()) act({ type: 'draw' }); else if (myTurn()) toast('Jetzt ist kein Nachziehen möglich.'); break;
    case 'freedraw': act({ type: 'freeDraw' }); break;
    case 'attack': act({ type: 'attack' }); break;
    case 'defend': act({ type: 'defend' }); break;
    case 'pass': act({ type: 'pass' }); break;
    case 'recover': act({ type: 'recover' }); break;
    case 'lfm': {
      const L = lfCtx(); if (!L) break;
      const k = d.k, e = d.e || '', key = e ? k + ':' + e : k, have = lfHave(L.cx, k, e), n = L.picks.filter(x => x === key).length;
      let m = (e || k === 'ot') ? (n + 1 <= Math.min(have, L.lvl) ? n + 1 : 0) : (n > +d.i ? +d.i : +d.i + 1);   // Spiegelstein: einen mehr, nach dem Maximum alle weg; Totenkopf: bis hierhin wählen oder ab hier abwählen
      m = Math.min(m, have, L.lvl);
      const others = L.picks.filter(x => x !== key);
      while (others.length + m > L.lvl && others.length) others.shift();   // voll: die älteste andere Wahl weicht
      act({ type: 'lfp', pick: others.concat(Array(m).fill(key)) }); break;
    }
    case 'lfauto': act({ type: 'lfp', pick: null }); break;
  }
}
stage.addEventListener('click', e => {
  const lb = e.target.closest('.lockbtn');
  if (lb) { const c = lb.closest('.card'); act({ type: 'lock', slot: +c.dataset.slot }); e.stopPropagation(); return; }
  const t = e.target.closest('[data-act]');
  if (t) { if (t.tagName === 'INPUT') return; onAct(t.dataset); return; }
  const c = e.target.closest('.card.myhand');
  if (c) {
    if (G.phase === 'combat' && G.combat.forced) {   // Zerrüttung: Abwurfkarten wählen statt markieren
      if (!forcedMe()) { toast('Der Gegner wählt gerade seine Abwurfkarten.'); return; }
      const sl = +c.dataset.slot, need = Math.min(G.combat.forced.n, G.players[ME].deck.hand.filter(Boolean).length);
      if (fdSel.has(sl)) fdSel.delete(sl); else { if (fdSel.size >= need) fdSel.clear(); fdSel.add(sl); }
      render(); return;
    }
    if (G.phase === 'combat' && !myTurn()) { toast('Die Gegenseite ist am Zug.'); return; }
    act({ type: 'mark', slot: +c.dataset.slot });
  }
});
/* Vorschau beim Überfahren eines Plus-Knopfes: neue Werte in Grün, neue Magiestufe grün eingekreist */
let pvUndo = null;
function pvClear() { if (pvUndo) { pvUndo(); pvUndo = null; } }
let pvHover = false;   // true, solange die Maus auf einem Vorschau-Knopf liegt (dann hat dessen Vorschau Vorrang vor der Opfer-Vorschau)
function pvSticky() { if (pvHover || !G) return; pvClear(); const sb = stage.querySelector('.sacbtn:not([disabled])'); if (sb) pvShow(sb); }   // Opfer-Vorschau steht dauerhaft, passend zur Pfeil-Einstellung
stage.addEventListener('mouseover', e => {
  const b = e.target.closest('button.up, .sacbtn'); if (!b || b.disabled || b.classList.contains('off')) { if (!b) { pvHover = false; pvSticky(); } return; }
  pvHover = true; pvShow(b);
});
function pvShow(b) {
  pvClear();
  const st = G && G.players[ME].stats, w = b.dataset.w, act = b.dataset.act;
  if (!st) return;
  const undos = [], redo = (key, cost) => {   // sinkende Werte (Gold, Upgrade-Punkte) gleichzeitig rot markieren
    const el = stage.querySelector('[data-pv="' + key + '"]'); if (!el || !(cost > 0)) return;
    const old = el.innerHTML, cur = key === 'gold' ? st.gold : st.pending;
    el.innerHTML = '<span class="pvdn">' + Math.max(0, cur - cost) + '</span>'; undos.push(() => { el.innerHTML = old; });
  };
  if (act === 'temple') {   // Opfern: Gold sinkt (rot), Upgrade-Punkte steigen (grün)
    const n = +b.dataset.n, pv = M.previewTemple(G.players[ME], n);
    redo('gold', n);
    const el = stage.querySelector('[data-pv="pts"]');
    if (el && pv.gained > 0) { const old = el.innerHTML; el.innerHTML = '<span class="pvnew">' + (st.pending + pv.gained) + '</span>'; undos.push(() => { el.innerHTML = old; }); }
    const fr = stage.querySelector('[data-pv="frac"]');
    if (fr) { const old = fr.innerHTML; fr.innerHTML = '<span class="pvnew">' + fracHTML(pv.pool, pv.level) + '</span>'; undos.push(() => { fr.innerHTML = old; }); }
  } else if (act === 'magic') redo('gold', M.magicCost(G, st.mag[b.dataset.e]));
  else if (act === 'spend') redo('pts', w === 'limit' ? M.limitStepCost(G, st) : w === 'mana' ? M.manaStepCost(G, st) : 1);
  if (act === 'magic') {
    const el = b.dataset.e, dot = b.parentElement.querySelector('.rg[data-e="' + el + '"][data-lv="' + (st.mag[el] + 1) + '"]');
    if (dot) { dot.classList.add('pv'); undos.push(() => dot.classList.remove('pv')); }
  } else if (act === 'spend' && (w === 'hp' || w === 'mana' || w === 'limit')) {
    const v = b.closest('.statrow') && b.closest('.statrow').querySelector('[data-pv="' + w + '"]'); if (!v) return;
    const n = w === 'hp' ? (G.rules.hpPerPoint || 1) : 1, old = v.innerHTML;
    const g = x => '<span class="pvnew">' + x + '</span>';   // bei HP und Mana ändert sich nur das Maximum (Nenner)
    v.innerHTML = w === 'hp' ? Math.max(0, st.hp) + '/' + g(st.maxHp + n) : w === 'mana' ? st.mana + '/' + g(st.maxMana + 1) : g(st.limit + 1); undos.push(() => { v.innerHTML = old; });
  } else if (act === 'spend' && w === 'slot') {
    const gh = stage.querySelector('.slotgh'); if (gh) { gh.classList.add('on'); undos.push(() => gh.classList.remove('on')); }
  }
  pvUndo = () => { undos.forEach(u => u()); };
}
stage.addEventListener('mouseout', e => { const b = e.target.closest('button.up, .sacbtn'); if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) { pvHover = false; pvClear(); pvSticky(); } });
stage.addEventListener('contextmenu', e => { const c = e.target.closest('.card.myhand'); if (c) { e.preventDefault(); act({ type: 'lock', slot: +c.dataset.slot }); } });

/* Home-Knopf: Menü zum Fortsetzen, Neustarten oder Verlassen */
function homeMenu() {
  if (overlay.style.display === 'flex') return;
  clearTimeout(aiTimer);   // das Spiel pausiert, solange das Menü offen ist
  overlay.style.display = 'flex';
  overlay.innerHTML = '<div class="box start" style="width:420px"><h1 style="font-size:44px">Menü</h1>' + (MP ? '<div id="mproom" style="font-size:19px;color:var(--mute);margin-top:-4px"></div>' : '') + '<div style="display:flex;flex-direction:column;gap:10px;align-self:stretch;margin-top:10px">' +
    '<button class="btn primary" style="font-size:21px;padding:10px" data-act="resume">Fortsetzen</button>' +
    (MP ? '' : '<button class="btn" style="font-size:21px;padding:10px" data-act="restart" title="Beginnt eine neue Partie gegen den Computer">Neu starten</button>') +
    '<button class="btn" style="font-size:21px;padding:10px" data-act="leave">' + (MP ? 'Partie verlassen' : 'Spiel verlassen') + '</button></div></div>';
  mpChip();
}
// Klickton für Menü- und Bedienknöpfe (Aktionen mit eigenem Ton ausgenommen)
const CLICK_ACTS = new Set(['sacdn', 'sacup', 'deckview', 'home', 'resume', 'restart', 'leave', 'newgame', 'stclose', 'stfit', 'stwho', 'stser', 'dismiss']);
stage.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b && (b.id === 'homebtn' || b.id === 'statbtn' || b.classList.contains('logdl') || CLICK_ACTS.has(b.dataset.act))) Snd.play('ui_click'); }, true);
const homeBtn = document.createElement('button');
homeBtn.id = 'homebtn'; homeBtn.title = 'Menü: fortsetzen, neu starten, verlassen'; homeBtn.textContent = '⌂';
homeBtn.addEventListener('click', e => { e.stopPropagation(); if (G && started) homeMenu(); });
stage.appendChild(homeBtn);
const sndBtn = document.createElement('button');
sndBtn.id = 'sndbtn'; sndBtn.title = 'Ton an/aus'; sndBtn.textContent = Snd.on ? '🔊' : '🔇';
sndBtn.addEventListener('click', e => {
  e.stopPropagation(); const on = Snd.toggle(); sndBtn.textContent = on ? '🔊' : '🔇';
  if (on) { Snd.play('ui_click', 0, .8); setTimeout(() => { const i = Snd.info(); toast('Ton an · ' + i.loaded + '/' + i.total + ' Sounds geladen · Audio ' + i.state); }, 400); } else toast('Ton aus');   // Rückmeldung zum Zustand, hilft bei der Fehlersuche
});
stage.appendChild(sndBtn);
