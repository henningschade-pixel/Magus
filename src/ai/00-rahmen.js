/* Magus – einfacher Computergegner. Wählt nur Aktionen, die auch ein Mensch hätte. */
/* Aufbau: 10 Stellschrauben, 20 Weltphase und 30 Kampf bilden die Basis-KI (bewertet jeden Zug einzeln mit festen Gewichten). Seit 0.13 plant 40 Suche im Kampf voraus: Jeder mögliche Zug wird in vielen möglichen Kampfverläufen durchgespielt, die Basis-KI führt darin beide Seiten. 90 Schnittstelle. (Die erste Zeile dient den Werkzeugen als Erkennungsmerkmal und bleibt, wie sie ist.) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.MagusAI = factory(root.Magus);
}(typeof self !== 'undefined' ? self : this, function (M) {
'use strict';

