const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { all } = require('./golden-lib.js');

test('KI-Partien enden und liefern gültige Ergebnisse', () => {
  const g = all();
  for (const r of g) {
    assert.ok(r.over, 'Partie ' + r.seed + ' ist zu Ende');
    assert.ok(r.sp.every(x => x >= 0 && x <= 6), 'Siegpunkte im Rahmen');
  }
});

test('Verhalten unverändert (Vergleich mit golden.json)', () => {
  const gold = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden.json'), 'utf8')), cur = all();
  assert.equal(cur.length, gold.length);
  cur.forEach((r, i) => assert.deepEqual(r, gold[i], 'Partie ' + r.seed + ' weicht ab (absichtliche Änderung? dann npm run golden)'));
});
