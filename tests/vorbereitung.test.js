// Vorbereitung (seit 0.15): Magie beginnt bei 0, beide wählen gleichzeitig verdeckt eine Karte, deren Farbe der kostenlose erste Magiepunkt ist.
const test = require('node:test'), assert = require('node:assert/strict');
const { M, AI } = require('./helpers.js');
const path = require('path');
let chromium = null; try { ({ chromium } = require('playwright')); } catch (e) { /* nicht installiert */ }
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const mk = seed => M.newGame({ seed, ai: [false, false], rules: { prep: 1 } });
const sum = p => p.stats.mag.F + p.stats.mag.E + p.stats.mag.W;

test('Vorbereitung: Start ohne Magie, ohne Hand, ganzes Deck zur Wahl', () => {
  const s = mk(7);
  assert.equal(s.phase, 'prep');
  s.players.forEach((p, i) => { assert.equal(sum(p), 0); assert.equal(p.deck.hand.filter(Boolean).length, 0); assert.equal(M.prepChoices(s, i).length, 12); assert.equal(p.stats.gold, 3); });
});
test('Vorbereitung: Wahl ist unabhängig von der Reihenfolge; Karte kommt auf die Ablage, Farbe beginnt auf 1, danach Hände und Spielbeginn', () => {
  const run = order => {
    const s = mk(11), pick = pid => M.prepChoices(s, pid)[pid];
    const uids = [pick(0), pick(1)].map(c => c.uid), els = [pick(0), pick(1)].map(c => c.id[0]);
    for (const pid of order) assert.ok(M.apply(s, { pid, type: 'prepPick', uid: uids[pid] }).ok);
    return { s, els };
  };
  const a = run([0, 1]), b = run([1, 0]);
  assert.equal(a.s.phase, 'world');
  assert.equal(JSON.stringify(a.s.players.map(p => p.stats.mag)), JSON.stringify(b.s.players.map(p => p.stats.mag)));
  assert.equal(JSON.stringify(a.s.players.map(p => p.deck.hand.map(c => c && c.id))), JSON.stringify(b.s.players.map(p => p.deck.hand.map(c => c && c.id))));
  a.s.players.forEach((p, i) => { assert.equal(sum(p), 1); assert.equal(p.stats.mag[a.els[i]], 1); assert.equal(p.deck.discard.length, 1); assert.equal(p.deck.hand.filter(Boolean).length, p.deck.hand.length); assert.equal(p.stats.gold, 3); });
});
test('Vorbereitung: doppelte Wahl, fremde Karte und andere Aktionen werden abgelehnt', () => {
  const s = mk(3), c = M.prepChoices(s, 0)[0];
  assert.ok(!M.apply(s, { pid: 0, type: 'draw' }).ok);
  assert.ok(!M.apply(s, { pid: 0, type: 'prepPick', uid: M.prepChoices(s, 1)[0].uid }).ok);
  assert.ok(M.apply(s, { pid: 0, type: 'prepPick', uid: c.uid }).ok);
  assert.ok(!M.apply(s, { pid: 0, type: 'prepPick', uid: c.uid }).ok);
  assert.equal(s.phase, 'prep');
  assert.equal(M.actor(s), 1);
});
test('Magiepreise: der Gratispunkt zählt nicht mit, der erste gekaufte Punkt kostet 1, dann 2, 3', () => {
  const s = mk(5); [0, 1].forEach(pid => M.apply(s, { pid, type: 'prepPick', uid: M.prepChoices(s, pid)[0].uid }));
  const p = s.players[s.turn], st = p.stats, e = M.ELEMENTS.find(x => st.mag[x] === 0);
  st.gold = 20; const costs = [];
  for (const el of [e, e, M.ELEMENTS.find(x => x !== e)]) { const g = st.gold; assert.ok(M.apply(s, { pid: s.turn, type: 'magic', elem: el }).ok); costs.push(g - st.gold); }
  assert.deepEqual(costs, [1, 2, 3]);
});
test('KI-Partien mit Vorbereitung enden', () => {
  for (let i = 0; i < 6; i++) {
    const s = M.newGame({ seed: 900 + i, ai: [true, true], first: i & 1, rules: { prep: 1 } });
    let n = 0; while (!s.over && n < 20000) { assert.ok(AI.runTurn(s, M.actor(s)).ok); n++; }
    assert.ok(s.over, 'Partie ' + i + ' beendet');
  }
});
test('Oberfläche: Vorbereitung zeigt das Deck, Wahl startet das Spiel mit gezogener Hand', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => window.__magus.state.phase), 'prep');
    assert.equal(await p.locator('#prepov .prepcard').count(), 12, 'zwölf Karten zur Wahl');
    assert.ok(await p.locator('.prepok').isDisabled());
    await p.locator('#prepov .prepcard').first().click();
    await p.locator('.prepok').click(); await p.waitForTimeout(1800);
    const r = await p.evaluate(() => { const g = window.__magus.state; return { ph: g.phase, mag: g.players[0].stats.mag, hand: g.players[0].deck.hand.filter(Boolean).length }; });
    assert.equal(r.ph, 'world'); assert.equal(r.mag.F + r.mag.E + r.mag.W, 1); assert.ok(r.hand > 0);
    assert.equal(await p.locator('#prepov').evaluate(e => getComputedStyle(e).display), 'none');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
