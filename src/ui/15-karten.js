/* ---------- Karten ---------- */
const L_MY = LAYOUT.hand.me, L_OP = LAYOUT.hand.opp;
const els = new Map(); let frame = 0, firstFrame = false;
function jit(uid, k) { const x = Math.sin(uid * 12.9898) * 43758.5453; return ((x - Math.floor(x)) - 0.5) * 2 * k; }
function createCard(card) {
  const d = document.createElement('div'); d.className = 'card';
  d.innerHTML = '<div class="inner"><div class="face front"></div><div class="face back"></div></div><div class="lockbtn"></div>';
  d.querySelector('.front').style.backgroundImage = 'url(' + (IMG[card.id] || IMG.back) + ')';
  d.querySelector('.back').style.backgroundImage = 'url(' + IMG.back + ')';
  d.querySelector('.lockbtn').style.backgroundImage = 'url(' + IMG.lock + ')';
  return d;
}
function isFirstAtk(deck, i) {   // goldener Rahmen auf allen markierten Karten der ersten Farbe (Angriffs- bzw. Verteidigungsfarbe); Kombokarten der zweiten Farbe bleiben ohne Rahmen
  if (!G || G.phase !== 'combat' || !G.combat || !['attack', 'defense'].includes(G.combat.action)) return false;
  const ids = deck.marks.filter(k => deck.hand[k]).map(k => M.parseCard(deck.hand[k].id)), first = ids.find(p => !p.curse), me = M.parseCard(deck.hand[i] && deck.hand[i].id);
  return !!first && !me.curse && me.el === first.el;
}
// Händler-Vorrat: Lage (Bühnenpixel) und Maßstab des Kartenbilds im Vorrat; null, wenn gerade kein Händler zu sehen ist
function stockSpot(id) {
  if (!G || G.phase !== 'world') return null;
  const t = stage.querySelector('.stk[data-stk="' + id + '"] .thumb');
  if (!t) return null;
  const r = t.getBoundingClientRect(), sr = stage.getBoundingClientRect(), k = sr.width / stage.offsetWidth;
  return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, sc: r.width / k / CW };
}
function place(card, s) {
  let rec = els.get(card.uid);
  if (!rec) {
    const d = createCard(card); layerCards.appendChild(d); rec = { el: d, id: card.id }; els.set(card.uid, rec);
    const vs = !firstFrame && s.zone === 'disc' && !M.parseCard(card.id).curse ? stockSpot(card.id) : null;   // beim Händler gekauft: die Karte fliegt verkleinert vom Vorrat auf den Ablagestapel
    const sp = vs || s.spawn || { x: s.x, y: s.y };
    d.style.transform = 'translate(' + sp.x + 'px,' + sp.y + 'px) scale(' + (vs ? vs.sc : s.sc) + ')';
    if (!vs) d.style.opacity = '0';
    void d.offsetWidth; d.style.opacity = '1';
  }
  const prevZone = rec.zone; rec.zone = s.zone;
  if (s.zone === 'disc' && prevZone !== 'disc') sndQ.place++;
  else if (s.zone === 'hand' && prevZone !== 'hand') sndQ.flip++;
  else if (s.zone === 'draw' && prevZone === 'disc') sndQ.shuf++;
  const d = rec.el; rec.frame = frame;
  d.style.transform = 'translate(' + s.x + 'px,' + s.y + 'px) rotate(' + (s.rot || 0) + 'deg) scale(' + s.sc + ')';
  d.style.zIndex = s.z;
  d.classList.toggle('down', !!s.down); d.classList.toggle('marked', !!s.marked); d.classList.toggle('first', !!s.first); d.classList.toggle('fd', !!s.fd); d.classList.toggle('locked', !!s.locked);
  d.classList.toggle('myhand', !!s.mine); d.dataset.slot = s.slot === undefined ? '' : s.slot;
  d.style.pointerEvents = s.mine ? 'auto' : 'none';
}
function slotX(i, n, L) {
  const w = CW * L.s, step = n > 1 ? Math.min(L.gap, (L.span - w) / (n - 1)) : 0, total = w + step * (n - 1);
  return L.cx - total / 2 + i * step;
}
function layoutDeck(deck, L, mine) {
  const spawn = { x: L.draw.x, y: L.draw.y };
  deck.draw.forEach((c, i) => place(c, { x: L.draw.x + Math.min(i, 5) * 0.8, y: L.draw.y - Math.min(i, 5) * 0.8, sc: L.ps, down: true, z: 1 + i, spawn, zone: 'draw' }));
  deck.discard.forEach((c, i) => place(c, { x: L.disc.x + jit(c.uid, 4), y: L.disc.y + jit(c.uid + 7, 3), rot: jit(c.uid + 3, 6), sc: L.ps, down: false, z: 1 + i, spawn, zone: 'disc' }));
  const n = deck.hand.length;
  deck.hand.forEach((c, i) => {
    if (!c) return;
    if (!forcedMe()) fdSel.clear();
    const fdm = mine && forcedMe() && fdSel.has(i), marked = deck.marks.includes(i) || fdm;
    place(c, { x: slotX(i, n, L), y: L.y + (marked ? L.raise : 0), sc: L.s, down: !mine, z: 20 + i + (marked ? 30 : 0), marked, fd: fdm, locked: mine && c.locked, mine, slot: i, spawn, zone: 'hand', first: mine && marked && !fdm && isFirstAtk(deck, i)});
  });
}
function renderCards() {
  frame++; const quiet = els.size === 0; firstFrame = quiet;
  const cx = ctx();
  layoutDeck(cx.myDeck, L_MY, true);
  layoutDeck(cx.oppDeck, L_OP, false);
  for (const [uid, rec] of els) if (rec.frame !== frame) {
    els.delete(uid); const d = rec.el, back = !M.parseCard(rec.id).curse && stockSpot(rec.id);   // nur Flüche werden zerstört; alle anderen Karten gehen verkleinert zurück auf ihren Stapel beim Händler
    if (back) { d.style.pointerEvents = 'none'; d.style.zIndex = 400; d.style.transform = 'translate(' + back.x + 'px,' + back.y + 'px) scale(' + back.sc + ')'; setTimeout(() => d.remove(), 520); }
    else { d.classList.add('fadeout'); setTimeout(() => d.remove(), 1200); }
  }
  flushSound(quiet);
  // Platzhalter, Stapel-Beschriftungen, Klickflächen
  let ph = '';
  const n = cx.myDeck.hand.length;
  for (let i = 0; i < n; i++) if (!cx.myDeck.hand[i]) ph += '<div class="slot-ph" style="left:' + slotX(i, n, L_MY) + 'px;top:' + L_MY.y + 'px"></div>';
  const lab = (L, d, mine) => {
    const w = CW * L.ps, y = L.draw.y + CH * L.ps + 3;
    return '<div class="pilelabel" style="left:' + (L.draw.x - 8) + 'px;top:' + y + 'px;width:' + (w + 16) + 'px">Stapel ' + d.draw.length + '</div>' +
      '<div class="pilelabel" style="left:' + (L.disc.x - 8) + 'px;top:' + y + 'px;width:' + (w + 16) + 'px">Ablage ' + d.discard.length + '</div>';
  };
  const emp = (L, d) => ['draw', 'disc'].map(k => (k === 'draw' ? d.draw : d.discard).length ? '' : '<div class="pile-ph" style="left:' + L[k].x + 'px;top:' + L[k].y + 'px;width:' + CW * L.ps + 'px;height:' + CH * L.ps + 'px"></div>').join('');   // leere Stapel: dezent gestrichelt
  ph += emp(L_MY, cx.myDeck) + emp(L_OP, cx.oppDeck);
  ph += lab(L_MY, cx.myDeck, true) + lab(L_OP, cx.oppDeck, false);
  const canDraw = canDrawNow();
  ph += '<div class="pilehit ' + (canDraw ? '' : 'off') + '" data-act="draw" title="Nachziehen: nicht gesperrte Karten ablegen und neu füllen" style="left:' + L_MY.draw.x + 'px;top:' + L_MY.draw.y + 'px;width:' + CW * L_MY.ps + 'px;height:' + CH * L_MY.ps + 'px"></div>';
  ph += '<div class="pilehit" data-act="deckview" title="Dein Deck als Balkendiagramm (Stufen der Karten)" style="left:' + L_MY.disc.x + 'px;top:' + L_MY.disc.y + 'px;width:' + CW * L_MY.ps + 'px;height:' + CH * L_MY.ps + 'px"></div>';
  $('dimdeck').classList.toggle('on', !!deckView);   // Deckübersicht: Spielfeld dahinter sanft abdunkeln
  if (deckView) ph += deckPopHTML(cx.myDeck);
  if (cx.combat && cx.myStats.freeDraws > 0) ph += '<div class="freedraw" data-act="freedraw" title="Gratis-Nachziehen: ' + cx.myStats.freeDraws + 'x (Klick)" style="left:' + L_MY.draw.x + 'px;top:' + (L_MY.draw.y - 52) + 'px"><img src="' + IMG.gratis + '">' + (cx.myStats.freeDraws > 1 ? '<b class="mul">×' + cx.myStats.freeDraws + '</b>' : '') + '</div>';
  if (cx.combat && cx.oppStats.freeDraws > 0) {   // gegnerische Nachziehtokens; im Läuterungs-Angriff anklickbar (werden zerstört, nicht gutgeschrieben)
    const lf = lfCtx(), sel = lf ? lf.picks.filter(p => p === 'ot').length : 0, pos = 'left:' + L_OP.draw.x + 'px;top:' + (L_OP.draw.y + CH * L_OP.ps + 22) + 'px', inner = '<img src="' + IMG.gratis + '">' + (cx.oppStats.freeDraws > 1 ? '<b class="mul">×' + cx.oppStats.freeDraws + '</b>' : '') + (sel ? '<i class="lfb">✓' + sel + '</i>' : '');
    ph += lf ? '<button class="freedraw opp lf' + (sel ? ' sel' : '') + '" data-act="lfm" data-k="ot" title="Läuterung: gegnerische Nachziehtokens zerstören (Klick: einen mehr, nach dem Maximum wieder alle weg). Sie werden nicht gutgeschrieben." style="' + pos + '">' + inner + '</button>' : '<div class="freedraw opp" title="Gratis-Nachziehen des Gegners: ' + cx.oppStats.freeDraws + 'x" style="' + pos + '">' + inner + '</div>';
  }
  const pnd = G.players[ME].stats.pending;
  if (!cx.combat && pnd > 0 && G.players[ME].slots < M.MAX_SLOTS) {
    const canSlot = myTurn();
    const stp = n > 1 ? Math.min(L_MY.gap, (L_MY.span - CW * L_MY.s) / (n - 1)) : L_MY.gap, nx = slotX(n - 1, n, L_MY) + stp;   // Platz des nächsten Handplatzes
    ph += '<div class="slotgh" style="left:' + nx + 'px;top:' + L_MY.y + 'px"></div>' +
      '<div class="upgpts" style="left:' + (nx + CW * L_MY.s / 2 - 17) + 'px;top:' + (L_MY.y + CH * L_MY.s / 2 - 19) + 'px">' + (canSlot ? '<button class="up pt" style="width:34px;height:38px;margin:0" data-act="spend" data-w="slot" title="+1 Handplatz (1 Upgrade-Punkt)"></button>' : '') + '</div>';
  }
  if (cx.combat) {
    ph += mirrorStack(cx.myStats, slotX(n - 1, n, L_MY) + CW * L_MY.s + 10, L_MY.y + 20, 's');
    const no = cx.oppDeck.hand.length;
    ph += mirrorStack(cx.oppStats, slotX(no - 1, no, L_OP) + CW * L_OP.s + 10, L_OP.y + 6, 'o');
  }
  layerPh.innerHTML = ph;
}
let deckView = false;
// Deckverteilung: je Kartenart (F1 … W3, Flüche) ein Balken über Stapel, Hand und Ablage
function deckPopHTML(deck) {
  const all = deck.draw.concat(deck.discard, deck.hand.filter(Boolean)), cnt = {};
  all.forEach(c => { cnt[c.id] = (cnt[c.id] || 0) + 1; });
  const ids = []; M.ELEMENTS.forEach(e => [1, 2, 3].forEach(l => ids.push(e + l)));
  Object.keys(cnt).filter(k => !ids.includes(k)).sort().forEach(k => ids.push(k));
  const mx = Math.max(1, ...ids.map(k => cnt[k] || 0)), col = { F: 'var(--fire)', E: 'var(--earth)', W: 'var(--water)' };
  let bars = '', labs = '';
  ids.forEach(k => {
    const n = cnt[k] || 0, e = k[0], zone = [['Stapel', deck.draw], ['Hand', deck.hand.filter(Boolean)], ['Ablage', deck.discard]].map(([nm, l]) => nm + ' ' + l.filter(c => c.id === k).length).join(', ');
    bars += '<div class="dkcol" title="' + k + ': ' + n + ' (' + zone + ')"><div class="dkn">' + n + '</div><div class="dkbar" style="height:' + Math.round(n / mx * 112) + 'px;background:' + (col[e] || 'var(--curse)') + (n ? '' : ';opacity:.25') + '"></div></div>';
    labs += '<span class="' + (col[e] ? e : 'C') + '">' + k + '</span>';
  });
  const L = L_MY;
  return '<div class="dkpop" data-act="deckclose" style="left:' + Math.max(10, L.disc.x - 330) + 'px;top:' + Math.max(10, L.y - 270) + 'px"><h4>Dein Deck: ' + all.length + ' Karten</h4><div class="dkbars">' + bars + '</div><div class="dklab">' + labs + '</div><small>Stapel ' + deck.draw.length + ' · Hand ' + deck.hand.filter(Boolean).length + ' · Ablage ' + deck.discard.length + '. Klicken zum Schließen.</small></div>';
}
function canDrawNow() {
  if (!myTurn()) return false;
  if (G.phase === 'combat') return G.combat.action === 'attack';
  return true;
}
