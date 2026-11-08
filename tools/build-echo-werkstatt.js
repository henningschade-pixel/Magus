// Erzeugt werkstatt/echo-werkstatt.html: Vorlage tools/echo-werkstatt.template.html + EchoWave aus src/ui/12a-echo-welle.js + Brettgrafik als data:-URI (Einzeldatei, der Effekt läuft wie im Spiel).
// Aufruf: node tools/build-echo-werkstatt.js [--check]   (--check: nur prüfen, dass die Werkstatt zum Spiel passt)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/ui/12a-echo-welle.js'), 'utf8');
const kit = src.slice(src.indexOf('/* ECHOWAVE BEGIN */'), src.indexOf('/* ECHOWAVE END */') + '/* ECHOWAVE END */'.length);
if (!kit.includes('const EchoWave')) throw new Error('EchoWave nicht gefunden.');
const uri = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'assets/img/board.webp')).toString('base64');
const html = fs.readFileSync(path.join(root, 'tools/echo-werkstatt.template.html'), 'utf8').replace('/*ECHOWAVE*/', () => kit).split('__BOARD__').join(uri);
const out = path.join(root, 'werkstatt/echo-werkstatt.html');
if (process.argv.includes('--check')) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) { console.error('werkstatt/echo-werkstatt.html passt nicht zu src/ui/12a-echo-welle.js: node tools/build-echo-werkstatt.js'); process.exit(1); } }
else { fs.writeFileSync(out, html); console.log('werkstatt/echo-werkstatt.html:', (html.length / 1024).toFixed(0), 'KB'); }
