#!/usr/bin/env node
// Erzeugt dist/ton-werkstatt.html: werkstatt/ton-werkstatt.html mit allen Sounds aus assets/audio als data:-URIs
// (läuft als einzelne Datei und als Artifact). Aufruf: node tools/build-werkstatt.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'assets/audio');
const map = {};
fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort().forEach(f => { map[f.slice(0, -4)] = 'data:audio/mpeg;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64'); });
let html = fs.readFileSync(path.join(root, 'werkstatt/ton-werkstatt.html'), 'utf8');
if (!html.includes('window.SND_DATA = null;')) throw new Error('Platzhalter window.SND_DATA = null; fehlt');
html = html.replace('window.SND_DATA = null;', () => 'window.SND_DATA = ' + JSON.stringify(map) + ';');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/ton-werkstatt.html'), html);
console.log('dist/ton-werkstatt.html:', (html.length / 1048576).toFixed(2), 'MB,', Object.keys(map).length, 'Sounds eingebettet');
