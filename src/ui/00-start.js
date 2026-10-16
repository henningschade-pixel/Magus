Object.values(IMG).forEach(u => { const im = new Image(); im.src = u; });   // Bilder vorladen, damit Karten nicht nachflackern
document.documentElement.style.setProperty('--plus','url('+IMG.plus+')');document.documentElement.style.setProperty('--plush','url('+IMG.plush+')');document.documentElement.style.setProperty('--plusg','url('+IMG.plusg+')');document.documentElement.style.setProperty('--plushg','url('+IMG.plushg+')');
/* Magus – Oberfläche. Liest nur den Zustand des Regelkerns und sendet Aktionen.
   Die Dateien src/ui/*.js werden in dieser Reihenfolge zu einem Block zusammengesetzt (00 öffnet, 80 schließt ihn). */
(function () {
'use strict';
const M = Magus, AI = MagusAI;
let ME = 0, OPP = 1;   // Blickrichtung: im Mehrspielermodus sitzt der Gast auf Platz 1
const NAMES = M.NAMES;
const $ = id => document.getElementById(id);
const stage = $('stage'), layerPh = $('ph'), layerCards = $('cards'), panels = $('panels'), logEl = $('log'), toastEl = $('toast'), overlay = $('overlay');
let fxUntil = 0, lateN = 0;   // Zeitpunkt, bis zu dem eine Kampfanimation läuft (die Siegmeldung wartet darauf)
let sacN = 0, G = null, hold = 0, aiTimer = null, endView = null, modal = null, introSeen = -1, preStats = null, seenCombat = null, toastTimer = null, started = false;

