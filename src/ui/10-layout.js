/* ---------- Layout: alle Maße der 1280×800-Bühne an einer Stelle ---------- */
const CW = 128, CH = 194;                                   // Kartengröße
const LAYOUT0 = {
  zoneLines: [166, 596],                                    // Trennlinien
  oppPanel:  { left: 920, top: 8,   w: 336, h: 160 },       // Gegner (oben rechts)
  mePanel:   { left: 920, top: 610, w: 336, h: 176 },       // eigener Spielerstatus (unten rechts)
  vendor:    { left: 920, top: 182, w: 336, h: 408 },       // Bibliothek
  logPanel:  { left: 24,  top: 182, w: 260, h: 408 },       // Protokoll (Weltphase)
  monsters:  { left: 296, top: 182, step: 212, w: 188, h: 408, diceY: 317 },   // diceY: Oberkante der Würfel, von der Kartenoberkante aus (direkt über dem Kämpfen-Knopf)
  banner:    { left: 372, top: 230, w: 536 },
  turnflag:  { left: 372, top: 126, w: 536 },
  combat:    { left: 372, top: 182, w: 536, h: 310 },       // Kampfmitte
  combo:     { left: 24,  top: 182, w: 336, h: 310 },
  oppInfo:   { left: 920, top: 182, w: 336, h: 310 },
  combatLog: { left: 372, top: 510, w: 536 },               // zwei letzte Protokollzeilen im Kampf
  combatSub: { left: 372, top: 490, w: 536 },               // Abschnitts-/Siegpunktzeile im Kampf
  boardMe: 118, boardOpp: 108,                              // Kantenlänge der Magie-Boards
  // Handkarten: y = Oberkante, cx = Mitte, gap = Abstand, span = Breite des Fächers, s = Maßstab, ps = Maßstab der Stapel
  hand: {
    me:  { y: 598, cx: 459, gap: 140, span: 680, s: 1,   draw: { x: 16,  y: 598 }, disc: { x: 812, y: 598 }, ps: 0.74, raise: -40 },
    opp: { y: 12,  cx: 469, gap: 76,  span: 700, s: 0.5, draw: { x: 209, y: 14  }, disc: { x: 665, y: 14  }, ps: 0.5,  raise: 30 },
  },
};
/* Breite der Bühne: Höhe fest 800, Breite folgt dem Seitenverhältnis des Fensters (mindestens 1280). Rechte Blöcke wandern mit dem rechten Rand, mittlere mit der Mitte. */
let SW = 1280;
const LAYOUT = JSON.parse(JSON.stringify(LAYOUT0));
function layoutFor(W) {
  SW = W; const dx = W - 1280, h = dx / 2, B = LAYOUT0;
  ['oppPanel', 'mePanel', 'vendor', 'oppInfo'].forEach(k => { LAYOUT[k].left = B[k].left + dx; });
  ['banner', 'turnflag', 'combat', 'combatLog', 'combatSub', 'monsters'].forEach(k => { LAYOUT[k].left = B[k].left + h; });
  LAYOUT.hand.me.cx = B.hand.me.cx + h; LAYOUT.hand.me.disc.x = B.hand.me.disc.x + dx;
  LAYOUT.hand.opp.cx = B.hand.opp.cx + h; LAYOUT.hand.opp.disc.x = B.hand.opp.disc.x + dx;
  stage.style.width = W + 'px'; stage.style.setProperty('--sw', W + 'px');
}
const box = (r, extra) => 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.w + 'px;' + (r.h ? 'height:' + r.h + 'px;' : '') + (extra || '');
LAYOUT.zoneLines.forEach(y => { const d = document.createElement('div'); d.className = 'zone-line'; d.style.top = y + 'px'; stage.insertBefore(d, stage.firstChild); });

