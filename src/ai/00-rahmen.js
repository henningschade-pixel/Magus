/* Magus – einfacher Computergegner. Wählt nur Aktionen, die auch ein Mensch hätte. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.MagusAI = factory(root.Magus);
}(typeof self !== 'undefined' ? self : this, function (M) {
'use strict';

