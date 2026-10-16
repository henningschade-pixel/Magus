const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const dir = path.join(__dirname, '..', 'assets', 'audio');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'assets-img2.js'), 'utf8');
const names = [...src.matchAll(/"([a-z_]+)": "assets\/audio\/([a-z_]+)\.mp3"/g)].map(m => m[1]);

test('Alle Sounds der Liste liegen als Datei vor und jede Datei ist eingebunden', () => {
  assert.ok(names.length >= 30, 'SND-Liste gefunden');
  names.forEach(n => assert.ok(fs.existsSync(path.join(dir, n + '.mp3')), n + '.mp3 fehlt'));
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4));
  files.forEach(f => assert.ok(names.includes(f), f + '.mp3 ist nicht in SND eingetragen'));
});

test('Sounds sind hörbar (mittlerer Pegel über -45 dB), nicht stumm', { skip: spawnSync('ffmpeg', ['-version']).status !== 0 && 'ffmpeg fehlt' }, () => {
  for (const n of names) {
    const r = spawnSync('ffmpeg', ['-nostats', '-i', path.join(dir, n + '.mp3'), '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /mean_volume: (-?[\d.]+) dB/.exec(r.stderr);
    assert.ok(m && +m[1] > -45, n + ' ist zu leise oder stumm: ' + (m && m[1]) + ' dB');
  }
});
