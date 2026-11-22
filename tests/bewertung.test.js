// Monsterbewertung (seit 0.15, temporär): nach einem Monsterkampf als Angreifer fragt der Ergebnis-Bildschirm; die Antwort wird mit der Monsterkonfiguration gespeichert; im Menü abschaltbar.
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('path');
let chromium = null; try { ({ chromium } = require('playwright')); } catch (e) { /* nicht installiert */ }
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const url = 'file://' + path.join(__dirname, '..', 'index.html') + '?prep=0';

async function winFight(p) {
  await p.evaluate(() => {
    const G = window.__magus.state, M = window.Magus;
    M.apply(G, { pid: 0, type: 'combat', elem: 'F' });
    const me = G.combat.sides.a, op = G.combat.sides.b; me.stats.limit = 2; me.stats.mag = { F: 3, E: 3, W: 3 }; op.stats.hp = 1; op.deck.hand = op.deck.hand.map(() => null);
    me.deck.hand[0] = Object.assign({}, me.deck.hand[0], { id: 'F3' });
    M.apply(G, { pid: 0, type: 'mark', slot: 0 }); window.__magus.pump();
  });
  await p.click('[data-act="attack"]');
  await p.waitForSelector('#endov .endbox', { timeout: 30000 });
}
test('Monsterbewertung: Frage nach dem Kampf, Speicherung mit Monsterkonfiguration, Menüschalter', { skip: !chromium && 'Playwright nicht installiert', timeout: 90000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await winFight(p);
    assert.equal(await p.locator('#endov [data-act="rate"]').count(), 4, 'vier Antworten');
    await p.click('#endov [data-act="rate"][data-v="hard"]');
    assert.match(await p.textContent('#endov .rateq'), /zu schwer/i);
    const l = await p.evaluate(() => JSON.parse(localStorage.getItem('magus_monsterbewertung')));
    assert.equal(l.length, 1);
    assert.equal(l[0].rating, 'hard'); assert.equal(l[0].role, 'attacker'); assert.ok(l[0].key.startsWith(l[0].seed + ':1:')); assert.equal(l[0].stage, 1); assert.ok(l[0].monster.name && l[0].monster.variant && l[0].monster.stats.maxHp >= 1 && l[0].monster.deck.length === 9, 'Monsterkonfiguration gespeichert');
    assert.equal(l[0].fight.attackerWon, true); assert.ok(l[0].me.mag && l[0].me.deck);
    await p.click('#endov .endov');
    await p.waitForFunction(() => document.getElementById('endov').style.display === 'none');
    // abschalten: keine Frage mehr
    await p.evaluate(() => { localStorage.setItem('magus_bewertung_an', '0'); });
    await p.reload(); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await winFight(p);
    assert.equal(await p.locator('#endov [data-act="rate"]').count(), 0, 'ausgeschaltet: keine Frage');
    // Menü: Schalter und Anzahl
    await p.click('#endov .endov'); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('homebtn').click()); await p.waitForTimeout(400);
    await p.click('#overlay >> text=Einstellungen'); await p.waitForSelector('#overlay .setpage');
    const t = await p.evaluate(() => document.getElementById('overlay').innerText);
    assert.ok(/monsterbewertung/i.test(t) && t.includes('Gespeicherte Bewertungen: 1'));
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Monsterbewertung: der Monsterführer wird gefragt, wenn der Computer das Monster angreift', { skip: !chromium && 'Playwright nicht installiert', timeout: 90000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await p.evaluate(() => {   // der Computer (Platz 1) greift das Monster an; es hat 1 TP und keine Handkarten
      const G = window.__magus.state, M = window.Magus;
      G.turn = 1; M.apply(G, { pid: 1, type: 'combat', elem: 'F' });
      const att = G.combat.sides.a, mon = G.combat.sides.b; att.stats.limit = 2; att.stats.mag = { F: 3, E: 3, W: 3 }; mon.stats.hp = 1; mon.deck.hand = mon.deck.hand.map(() => null);
      att.deck.hand[0] = Object.assign({}, att.deck.hand[0], { id: 'F3' });
      M.apply(G, { pid: 1, type: 'mark', slot: 0 });
      window.__magus.act({ pid: 1, type: 'attack' });
    });
    await p.waitForTimeout(400);
    await p.evaluate(() => window.__magus.act({ type: 'defend' }));   // der Monsterführer (Platz 0, ohne Handkarten) verteidigt nicht mehr: das Monster fällt
    await p.waitForSelector('#endov .endbox', { timeout: 30000 });
    assert.match(await p.textContent('#endov .rateq'), /Monsterführer/);
    await p.click('#endov [data-act="rate"][data-v="abitEasy"]');
    assert.match(await p.textContent('#endov .rateq'), /Etwas schwach/);
    const l = await p.evaluate(() => JSON.parse(localStorage.getItem('magus_monsterbewertung')));
    assert.equal(l.length, 1); assert.equal(l[0].role, 'leader'); assert.equal(l[0].rating, 'abitEasy'); assert.equal(l[0].fight.attackerWon, true); assert.equal(l[0].vsHuman, false);
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
