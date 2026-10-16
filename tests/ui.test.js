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
    await p.click('text=Angriff ausführen');
    await p.waitForSelector('#endov .endbox', { timeout: 30000 });
    assert.match(await p.textContent('#endov .et'), /Sieg/);
    await p.click('#endov .endov');
    await p.waitForFunction(() => !document.querySelector('#endov .endbox') || document.getElementById('endov').style.display === 'none');
    assert.equal(await p.evaluate(() => window.__magus.state.phase), 'world');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
