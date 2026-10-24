// Erzeugt werkstatt/wuerfel-werkstatt.html: Vorlage tools/wuerfel-werkstatt.template.html + DiceKit aus src/ui/31a-wuerfel.js (die Werkstatt ist eine Einzeldatei, die Würfel sind dieselben wie im Spiel).
// Aufruf: node tools/build-wuerfel-werkstatt.js [--check]   (--check: nur prüfen, dass die Werkstatt zum Spiel passt)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/ui/31a-wuerfel.js'), 'utf8');
const kit = src.slice(src.indexOf('/* DICEKIT BEGIN */'), src.indexOf('/* DICEKIT END */') + '/* DICEKIT END */'.length);
if (!kit.includes('const DiceKit')) throw new Error('DiceKit nicht gefunden.');
const html = fs.readFileSync(path.join(root, 'tools/wuerfel-werkstatt.template.html'), 'utf8').replace('/*KIT*/', () => kit);
const out = path.join(root, 'werkstatt/wuerfel-werkstatt.html');
if (process.argv.includes('--check')) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) { console.error('werkstatt/wuerfel-werkstatt.html passt nicht zu src/ui/31a-wuerfel.js: node tools/build-wuerfel-werkstatt.js'); process.exit(1); } console.log('Würfel-Werkstatt aktuell.'); }
else { fs.writeFileSync(out, html); console.log('werkstatt/wuerfel-werkstatt.html:', html.length, 'Zeichen'); }
