#!/usr/bin/env node
// Einmalige Zerlegung von index.html in Quelldateien unter src/ (danach pflegt man src/ und baut index.html mit tools/build.js).
// Die Zerlegung ist verlustfrei: build.js setzt die Teile in der Reihenfolge der src/manifest.json wieder zu genau derselben Datei zusammen.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
fs.mkdirSync(path.join(root, 'src/ui'), { recursive: true });
const manifest = [];
const put = (name, text) => { fs.writeFileSync(path.join(root, 'src', name), text); };
const raw = (name, text) => { put(name, text); manifest.push({ file: name }); };
const lit = text => manifest.push({ literal: text });
// Reihenfolge der Skriptblöcke ohne src-Attribut
const re = /<script>([\s\S]*?)<\/script>/g;
let m, last = 0, idx = 0;
const names = ['assets-img.js', 'assets-img2.js', 'engine.js', 'ai.js', 'ui'];
const blocks = [];
while ((m = re.exec(html))) blocks.push({ start: m.index, end: m.index + m[0].length, content: m[1] });
if (blocks.length !== 5) throw new Error('Erwartet 5 Skriptblöcke, gefunden ' + blocks.length);
// Kopf bis <style>, CSS, Rumpf bis zum ersten Skript
const sOpen = html.indexOf('<style>\n'), sClose = html.indexOf('\n</style>');
raw('head.html', html.slice(0, sOpen));
lit('<style>\n'); put('style.css', html.slice(sOpen + 8, sClose)); manifest.push({ file: 'style.css' }); lit('\n</style>');
raw('body.html', html.slice(sClose + 9, blocks[0].start));
blocks.forEach((b, i) => {
  if (i > 0) lit(html.slice(blocks[i - 1].end, b.start));
  lit('<script>');
  if (names[i] === 'engine.js' || names[i] === 'ai.js') {   // Regelkern und KI: an den Teil-Kommentaren bzw. Abschnittsköpfen zerlegen
    const eng = names[i] === 'engine.js', dir = eng ? 'engine' : 'ai';
    const ENG = ['10-karten', '20-werte', '30-monster', '40-flueche', '50-haendler', '60-kampfberechnung', '65-kampfablauf', '70-weltphase', '80-start'], AIN = ['10-stellschrauben', '20-weltphase', '30-kampf'];
    const NM = eng ? ENG : AIN, hre = eng ? /\n(\/\* Magus – Regelkern \(Teil \d\)|\/\* ---------- Kampfablauf)/g : /\n(\/\* ---------- )/g;
    const cuts = [0]; let h; while ((h = hre.exec(b.content))) cuts.push(h.index + 1);
    // beim Regelkern liegt der erste Kopf (Teil 1) schon nach dem UMD-Rahmen; Teil 6 hat zwei Abschnitte (Berechnung, Ablauf)
    if (cuts.length - 1 !== NM.length) throw new Error(dir + ': ' + (cuts.length - 1) + ' Abschnitte statt ' + NM.length);
    cuts.push(b.content.length); fs.mkdirSync(path.join(root, 'src', dir), { recursive: true });
    for (let k = 0; k < cuts.length - 1; k++) { const fn = dir + '/' + (k === 0 ? '00-rahmen' : NM[k - 1]) + '.js'; put(fn, b.content.slice(cuts[k], cuts[k + 1])); manifest.push({ file: fn }); }
  } else if (names[i] !== 'ui') { put(names[i], b.content); manifest.push({ file: names[i] }); }
  else {
    const NAMES = ['10-layout', '11-skalierung', '12-hilfen', '13-zugwechsel', '14-sound', '15-karten', '16-seitenleisten', '17-weltphase', '18-kampf', '19-gesamtdarstellung', '20-todesfluch', '21-spiegelbruch', '22-lifeflow-aggro', '23-kampffunken', '24-funken', '25-aufloesung', '26-erde', '27-ablauf', '28-peerjs', '29-mehrspieler', '30-eingaben', '31-spiellog'];
    const cuts = [0]; const hre = /\n(\/\* -{5,} )/g; let h;
    while ((h = hre.exec(b.content))) cuts.push(h.index + 1);
    // Abschnitte ohne eigene Datei werden dem vorigen zugeschlagen: wir ordnen die Köpfe der Reihe nach den Namen zu
    if (cuts.length - 1 !== NAMES.length) throw new Error('UI-Abschnitte: ' + (cuts.length - 1) + ' statt ' + NAMES.length);
    cuts.push(b.content.length);
    for (let k = 0; k < cuts.length - 1; k++) { const fn = 'ui/' + (k === 0 ? '00-start' : NAMES[k - 1]) + '.js'; put(fn, b.content.slice(cuts[k], cuts[k + 1])); manifest.push({ file: fn }); }
  }
  lit('</script>');
});
lit(html.slice(blocks[4].end));
fs.writeFileSync(path.join(root, 'src/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('src/ geschrieben:', manifest.filter(x => x.file).length, 'Dateien');
