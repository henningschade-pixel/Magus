// Erzeugt werkstatt/kartendreh-werkstatt.html: Vorlage tools/kartendreh-werkstatt.template.html + eingebettete Bilder (Logo, drei Monster) aus assets/img.
// Aufruf: node tools/build-kartendreh-werkstatt.js [--check]   (--check: nur prüfen, dass die Werkstatt zur Vorlage passt)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const img = {}; for (const n of ['logo', 'm_f1', 'm_e1', 'm_w1']) img[n] = 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'assets/img', n + '.webp')).toString('base64');
const html = fs.readFileSync(path.join(root, 'tools/kartendreh-werkstatt.template.html'), 'utf8').replace('/*IMG*/', () => JSON.stringify(img));
const out = path.join(root, 'werkstatt/kartendreh-werkstatt.html');
if (process.argv.includes('--check')) { if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== html) { console.error('werkstatt/kartendreh-werkstatt.html passt nicht zur Vorlage: node tools/build-kartendreh-werkstatt.js'); process.exit(1); } console.log('Kartendreh-Werkstatt aktuell.'); }
else { fs.writeFileSync(out, html); console.log('werkstatt/kartendreh-werkstatt.html:', html.length, 'Zeichen'); }
