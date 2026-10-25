// Erzeugt werkstatt/runen-werkstatt.html: Vorlage tools/runen-werkstatt.template.html + RuneGlow aus src/ui/11a-runenleuchten.js + Stein und Runenmaske als data:-URIs (die Werkstatt ist eine Einzeldatei, die Runen leuchten wie im Spiel).
// Aufruf: node tools/build-runen-werkstatt.js [--check]   (--check: nur prüfen, dass die Werkstatt zum Spiel passt)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/ui/11a-runenleuchten.js'), 'utf8');
const kit = src.slice(src.indexOf('/* RUNEGLOW BEGIN */'), src.indexOf('/* RUNEGLOW END */') + '/* RUNEGLOW END */'.length);
if (!kit.includes('const RuneGlow')) throw new Error('RuneGlow nicht gefunden.');
const uri = f => 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'assets', f)).toString('base64');
const html = fs.readFileSync(path.join(root, 'tools/runen-werkstatt.template.html'), 'utf8').replace('/*RUNEGLOW*/', () => kit).split('__STEIN__').join(uri('stein.webp')).split('__MASKE__').join(uri('runen-maske.webp'));
const out = path.join(root, 'werkstatt/runen-werkstatt.html');
if (process.argv.includes('--check')) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) { console.error('werkstatt/runen-werkstatt.html passt nicht zu src/ui/11a-runenleuchten.js: node tools/build-runen-werkstatt.js'); process.exit(1); } }
else { fs.writeFileSync(out, html); console.log('werkstatt/runen-werkstatt.html:', (html.length / 1024).toFixed(0), 'KB'); }
