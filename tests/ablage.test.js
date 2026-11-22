// Ablagestapel (seit 0.15): Klick auf den eigenen Ablagestapel zeigt die Karten als Fächer (Reihenfolge des Stapels, Mausrad blättert), keine Auswertung als Diagramm.
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('path');
let chromium = null; try { ({ chromium } = require('playwright')); } catch (e) { /* nicht installiert */ }
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const url = 'file://' + path.join(__dirname, '..', 'index.html') + '?fast&prep=0';

test('Ablagestapel: Fächer mit allen Karten in Stapelreihenfolge, Mausrad blättert, Klick daneben schließt', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(1500);
    const uids = await p.evaluate(() => { const G = window.__magus.state, d = G.players[0].deck; for (let i = 0; i < 7; i++) { const c = d.draw.shift(); if (c) d.discard.push(c); } window.__magus.pump(); return d.discard.map(c => c.uid); });
    await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('[data-act="deckview"]').click()); await p.waitForTimeout(400);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('#discov .prepcard')].map(e => +e.dataset.uid)), uids, 'alle Karten in Stapelreihenfolge');
    assert.equal(await p.locator('.dkbars').count(), 0, 'kein Balkendiagramm');
    const z = () => p.evaluate(() => [...document.querySelectorAll('#discov .prepcard')].findIndex(e => e.style.filter === 'none'));
    assert.equal(await z(), 6, 'die zuletzt abgelegte Karte liegt zuerst in der Mitte');
    await p.mouse.move(600, 820); await p.mouse.wheel(0, -180); await p.waitForTimeout(600);
    assert.ok(await z() < 6, 'das Mausrad blättert');
    await p.mouse.click(1400, 100); await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('discov')).display), 'none', 'Klick daneben schließt');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
