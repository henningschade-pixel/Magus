// Browser-Test (Playwright, Chromium): Spiel starten, einen Kampf bis zum Ende spielen, Ergebnis-Bildschirm prüfen.
// Wird übersprungen, wenn Playwright oder Chromium fehlen. Aufruf mit NODE_PATH=$(npm root -g) falls Playwright global installiert ist.
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('path');
let chromium = null; try { ({ chromium } = require('playwright')); } catch (e) { /* nicht installiert */ }
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const url = 'file://' + path.join(__dirname, '..', 'index.html');

test('Spiel startet, Kampf endet mit Ergebnis-Bildschirm, Klick führt zurück in die Weltphase', { skip: !chromium && 'Playwright nicht installiert', timeout: 90000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    // Kampf gegen das Feuermonster mit angeschlagenem Gegner herbeiführen
    await p.evaluate(() => {
      const G = window.__magus.state, M = window.Magus;
      M.apply(G, { pid: 0, type: 'combat', elem: 'F' });
      const me = G.combat.sides.a, op = G.combat.sides.b; me.stats.limit = 2; me.stats.mag = { F: 3, E: 3, W: 3 }; op.stats.hp = 1;
      me.deck.hand[0] = Object.assign({}, me.deck.hand[0], { id: 'F3' });
      M.apply(G, { pid: 0, type: 'mark', slot: 0 }); window.__magus.pump();
    });
    await p.click('[data-act="attack"]');
    await p.waitForSelector('#endov .endbox', { timeout: 30000 });
    assert.match(await p.textContent('#endov .et'), /Sieg/);
    await p.click('#endov .endov');
    await p.waitForFunction(() => !document.querySelector('#endov .endbox') || document.getElementById('endov').style.display === 'none');
    assert.equal(await p.evaluate(() => window.__magus.state.phase), 'world');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Statistikseite öffnet, zeigt den Verlauf und lässt sich filtern und schließen; Export-Knopf sitzt im Log', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    assert.equal(await p.locator('#log .logdl').count(), 1);
    await p.click('#homebtn'); await p.click('text=Statistik');
    await p.waitForSelector('.box.stats svg');
    assert.ok(await p.locator('.box.stats polyline, .box.stats circle').count() > 0);
    await p.click('.stchip:has-text("Magie (Feuer")');
    assert.ok(await p.locator('.stchip.on:has-text("Magie (Feuer")').count() === 1);
    const bb = await p.locator('#stsvg').boundingBox(), before = await p.locator('#stsvg').innerHTML();
    await p.mouse.move(bb.x + 500, bb.y + 200); await p.mouse.wheel(0, -300);   // Zoomen ändert die Achsen
    assert.notEqual(await p.locator('#stsvg').innerHTML(), before);
    await p.dblclick('#stsvg'); assert.equal(await p.locator('#stsvg').innerHTML(), before);   // Doppelklick: zurück zur automatischen Ansicht
    await p.click('text=Schließen');
    await p.click('text=Fortsetzen');
    assert.equal(await p.evaluate(() => document.getElementById('overlay').style.display), 'none');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Zuschauermodus: zwei Computer spielen gegeneinander, Eingaben sind gesperrt', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Zwei Computern zuschauen'); await p.waitForTimeout(500);
    const n0 = await p.evaluate(() => window.__magus.state.logN);
    await p.evaluate(() => window.__magus.act({ type: 'temple', amount: 1 }));   // Eingabe eines Menschen: wird ignoriert
    await p.waitForTimeout(6000);
    const r = await p.evaluate(() => ({ n: window.__magus.state.logN, names: window.__magus.state.players.map(x => x.name) }));
    assert.ok(r.n > n0, 'die Partie schreitet von selbst voran');
    assert.deepEqual(r.names, ['Computer A', 'Computer B']);
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Am Partieende lassen sich Statistik und Protokoll öffnen und die Statistik führt zurück zum Endbildschirm', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(500);
    await p.evaluate(() => { const G = window.__magus.state; G.over = true; G.winner = 0; G.players[0].sp = 4; window.__magus.pump(); });
    await p.waitForSelector('#overlay [data-act="stend"]', { timeout: 5000 });
    assert.ok(await p.$('#overlay [data-act="logdl"]'), 'Protokoll-Knopf am Ende');
    await p.click('#overlay [data-act="stend"]'); await p.waitForSelector('#overlay [data-act="stclose"]', { timeout: 5000 });
    await p.click('#overlay [data-act="stclose"]'); await p.waitForSelector('#overlay [data-act="stend"]', { timeout: 5000 });
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Statistik: ein Kampf lässt sich anklicken und zeigt seinen Verlauf', { skip: !chromium && 'Playwright nicht installiert', timeout: 90000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url + '?fast'); await p.waitForTimeout(500);
    await p.click('text=Zwei Computern zuschauen');
    await p.waitForFunction(() => window.__magus.state.hist.some(h => h.ev && h.ev.trace), null, { timeout: 60000 });
    await p.evaluate(() => { window.__magus.stats(); });
    await p.waitForSelector('#overlay [data-act="stfight"]', { timeout: 5000 });
    await p.click('#overlay [data-act="stfight"]');
    await p.waitForSelector('#overlay [data-act="stfightback"]', { timeout: 5000 });
    assert.ok((await p.textContent('#overlay .stkey')).includes('Angriff'), 'Zusammenfassung sichtbar');
    await p.click('#overlay [data-act="stfightback"]'); await p.waitForSelector('#overlay [data-act="stfight"]', { timeout: 5000 });
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Fliehen: Knopf ist nur bei Monster ohne Mana bedienbar und beendet den Kampf ohne Beute', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await p.evaluate(() => { const G = window.__magus.state; window.Magus.apply(G, { pid: 0, type: 'combat', elem: 'F' }); window.__magus.pump(); });
    await p.waitForSelector('[data-act="fleeask"]');
    assert.equal(await p.getAttribute('[data-act="fleeask"]', 'disabled') !== null, true, 'mit Monster-Mana gesperrt');
    await p.evaluate(() => { const G = window.__magus.state; G.combat.sides.b.stats.mana = 0; window.__magus.pump(); });
    await p.waitForFunction(() => !document.querySelector('[data-act="fleeask"]').disabled);
    await p.click('[data-act="fleeask"]');
    await p.waitForSelector('.fleewarn');
    await p.click('[data-act="fleeno"]'); assert.equal(await p.$('.fleewarn'), null, 'Bleiben schließt die Warnung');
    assert.equal(await p.evaluate(() => window.__magus.state.phase), 'combat');
    await p.click('[data-act="fleeask"]'); await p.click('.fleewarn [data-act="flee"]');
    await p.waitForFunction(() => window.__magus.state.phase === 'world', null, { timeout: 15000 });
    assert.match(await p.evaluate(() => window.__magus.state.log.slice(-4).map(l => l.txt).join(' | ')), /flieht vor/);
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Läuterung: Todesmarker beider Seiten sind im Kampfbildschirm anklickbar', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(1000);
    await p.evaluate(() => {
      const G = window.__magus.state, M = window.Magus; G.turn = 0; M.apply(G, { pid: 0, type: 'combat', elem: 'F' });
      const me = G.combat.sides.a, op = G.combat.sides.b; me.stats.limit = 3; me.stats.mag = { F: 3, E: 3, W: 3 }; me.stats.mana = me.stats.maxMana = 9;
      me.stats.death = 2; op.stats.death = 3;
      ['E2', 'F2'].forEach((id, i) => { me.deck.hand[i] = Object.assign({}, me.deck.hand[i], { id }); });
      M.apply(G, { pid: 0, type: 'mark', slot: 0 }); M.apply(G, { pid: 0, type: 'mark', slot: 1 }); window.__magus.pump();
    });
    await p.waitForTimeout(300);
    const ks = await p.$$eval('button.mkb.lf', e => e.map(x => x.dataset.k));
    assert.equal(ks.filter(k => k === 'sd').length, 2, 'eigene Marker'); assert.equal(ks.filter(k => k === 'od').length, 3, 'gegnerische Marker');
    await p.locator('button.mkb.lf').nth(4).click();
    assert.deepEqual(await p.evaluate(() => window.__magus.state.combat.lfp), ['od', 'od']);
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
