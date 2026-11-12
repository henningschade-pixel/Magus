#!/usr/bin/env node
// Baut die Werkstätten, die Code oder Bilder des Spiels einbetten (Einzeldateien unter werkstatt/):
// Vorlage tools/<name>-werkstatt.template.html + Baustein aus src/ui (derselbe Code wie im Spiel) + Bilder als data:-URIs.
// Aufruf: node tools/build-werkstaetten.js [name …] [--check]
//   ohne Namen: alle (echo, kartendreh, runen, wuerfel); --check: nur prüfen, dass die Werkstatt zu Spiel und Vorlage passt.
// (Die Ton-Werkstatt baut tools/build-werkstatt.js nach dist/, sie bettet die Sounds ein.)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const dataUri = f => 'data:image/webp;base64,' + fs.readFileSync(path.join(root, f)).toString('base64');
// Baustein zwischen /* TAG BEGIN */ und /* TAG END */ aus einer Quelldatei des Spiels
function kit(file, tag, name) {
  const src = read(file), end = '/* ' + tag + ' END */';
  const k = src.slice(src.indexOf('/* ' + tag + ' BEGIN */'), src.indexOf(end) + end.length);
  if (!k.includes('const ' + name)) throw new Error(name + ' nicht gefunden.');
  return k;
}
const WERKSTAETTEN = {
  echo: {
    quelle: 'src/ui/12a-echo-welle.js',
    html: t => t.replace('/*ECHOWAVE*/', () => kit('src/ui/12a-echo-welle.js', 'ECHOWAVE', 'EchoWave')).split('__BOARD__').join(dataUri('assets/img/board.webp')),
  },
  kartendreh: {
    quelle: 'der Vorlage',
    html: t => { const img = {}; for (const n of ['logo', 'm_f1', 'm_e1', 'm_w1']) img[n] = dataUri('assets/img/' + n + '.webp'); return t.replace('/*IMG*/', () => JSON.stringify(img)); },
  },
  runen: {
    quelle: 'src/ui/11a-runenleuchten.js',
    html: t => t.replace('/*RUNEGLOW*/', () => kit('src/ui/11a-runenleuchten.js', 'RUNEGLOW', 'RuneGlow')).split('__STEIN__').join(dataUri('assets/stein.webp')).split('__MASKE__').join(dataUri('assets/runen-maske.webp')),
  },
  wuerfel: {
    quelle: 'src/ui/31a-wuerfel.js',
    html: t => t.replace('/*KIT*/', () => kit('src/ui/31a-wuerfel.js', 'DICEKIT', 'DiceKit')),
  },
};
const check = process.argv.includes('--check');
const names = process.argv.slice(2).filter(a => !a.startsWith('--'));
let bad = false;
for (const name of names.length ? names : Object.keys(WERKSTAETTEN)) {
  const w = WERKSTAETTEN[name];
  if (!w) { console.error('Unbekannte Werkstatt: ' + name + ' (bekannt: ' + Object.keys(WERKSTAETTEN).join(', ') + ')'); process.exit(2); }
  const rel = 'werkstatt/' + name + '-werkstatt.html', out = path.join(root, rel);
  const html = w.html(read('tools/' + name + '-werkstatt.template.html'));
  if (check) {
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) { console.error(rel + ' passt nicht zu ' + w.quelle + ': node tools/build-werkstaetten.js ' + name); bad = true; }
    else console.log(rel + ' aktuell.');
  } else { fs.writeFileSync(out, html); console.log(rel + ':', (html.length / 1024).toFixed(0), 'KB'); }
}
if (bad) process.exit(1);
