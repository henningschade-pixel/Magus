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
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    // Kampf gegen das Feuermonster mit angeschlagenem Gegner herbeiführen
    await p.evaluate(() => {
      const G = window.__magus.state, M = window.Magus;
      M.apply(G, { pid: 0, type: 'combat', elem: 'F' });
      const me = G.combat.sides.a, op = G.combat.sides.b; me.stats.limit = 2; me.stats.mag = { F: 3, E: 3, W: 3 }; op.stats.hp = 1; op.deck.hand = op.deck.hand.map(() => null);
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
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    assert.equal(await p.locator('#log .logdl').count(), 1);
    await p.click('#statsbtn');
    await p.waitForSelector('.box.stats svg');
    assert.ok(await p.locator('.box.stats polyline, .box.stats circle').count() > 0);
    await p.click('.stchip:has-text("Magie (Feuer")');
    assert.ok(await p.locator('.stchip.on:has-text("Magie (Feuer")').count() === 1);
    const bb = await p.locator('#stsvg').boundingBox(), before = await p.locator('#stsvg').innerHTML();
    await p.mouse.move(bb.x + 500, bb.y + 200); await p.mouse.wheel(0, -300);   // Zoomen ändert die Achsen
    assert.notEqual(await p.locator('#stsvg').innerHTML(), before);
    await p.dblclick('#stsvg'); assert.equal(await p.locator('#stsvg').innerHTML(), before);   // Doppelklick: zurück zur automatischen Ansicht
    await p.click('text=Schließen');   // direkt zurück ins Spiel (kein Menü dazwischen)
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
    await p.click('text=Einzelspieler'); await p.click('text=Zwei Computern zuschauen'); await p.waitForTimeout(500);
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
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(500);
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
    await p.click('text=Einzelspieler'); await p.click('text=Zwei Computern zuschauen');
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
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
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
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(1000);
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

test('Läuterung: eigene und gegnerische Spiegelmarker sind im Kampfbildschirm anklickbar und werden entfernt', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(1000);
    await p.evaluate(() => {
      const G = window.__magus.state, M = window.Magus; G.turn = 0; M.apply(G, { pid: 0, type: 'combat', elem: 'F' });
      const me = G.combat.sides.a, op = G.combat.sides.b; me.stats.limit = 3; me.stats.mag = { F: 3, E: 3, W: 3 }; me.stats.mana = me.stats.maxMana = 9;
      me.stats.mirrorEl = { F: 2, E: 1, W: 0 }; me.stats.mirror = 3; op.stats.mirrorEl = { F: 0, E: 1, W: 0 }; op.stats.mirror = 1;
      ['E2', 'F2'].forEach((id, i) => { me.deck.hand[i] = Object.assign({}, me.deck.hand[i], { id }); });
      M.apply(G, { pid: 0, type: 'mark', slot: 0 }); M.apply(G, { pid: 0, type: 'mark', slot: 1 }); window.__magus.pump();
    });
    await p.waitForTimeout(300);
    const ks = await p.$$eval('.msh.lf, .mtok.lf', e => e.map(x => x.dataset.k + ':' + x.dataset.e));
    assert.ok(ks.includes('sm:F') && ks.includes('sm:E'), 'eigene Spiegelmarker'); assert.ok(ks.includes('om:E'), 'gegnerischer Spiegelmarker');
    await p.locator('.msh.lf[data-k="sm"][data-e="F"]').first().click();
    assert.ok((await p.evaluate(() => window.__magus.state.combat.lfp)).includes('sm:F'));
    await p.click('[data-act="attack"]'); await p.waitForTimeout(600);
    assert.equal(await p.evaluate(() => window.__magus.state.players[0].stats.mirrorEl.F), 1, 'ein eigener Spiegelmarker Feuer wurde entfernt');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Nachziehlimit: drei Kreise am Stapel, Plus-Knopf erscheint erst mit Gold und kauft die nächste Stufe', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await p.evaluate(() => { const st = window.__magus.state.players[0].stats; st.gold = 0; st.pending = 3; window.__magus.pump(); });
    assert.equal(await p.locator('[data-act="drawlimit"]').count(), 0, 'ohne Gold kein Plus-Knopf, auch mit Upgrade-Punkten');
    await p.evaluate(() => { window.__magus.state.players[0].stats.gold = 3; window.__magus.pump(); });
    assert.equal(await p.locator('.dlc').count(), 6, 'drei Kreise je Spieler');
    assert.equal(await p.locator('.dlc.off').count(), 4, 'Stufen über dem Limit sind abgedunkelt');
    await p.click('[data-act="drawlimit"]'); await p.waitForTimeout(2500);
    assert.equal(await p.evaluate(() => window.__magus.state.players[0].stats.drawLimit), 2);
    assert.equal(await p.evaluate(() => window.__magus.state.players[0].stats.gold), 2, '1 Gold bezahlt');
    assert.equal(await p.evaluate(() => window.__magus.state.players[0].stats.pending), 3, 'Upgrade-Punkte bleiben');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Magie-Knöpfe: zu teure Stufen durchscheinend und gesperrt, ohne Upgrade-Punkte keine Knöpfe', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await p.evaluate(() => { const s = window.__magus.state.players[0].stats; s.pending = 1; s.buys = { mag: 1 }; s.mag = { F: 2, E: 1, W: 1 }; window.__magus.pump(); });
    assert.equal(await p.locator('[data-act="magic"].off[disabled]').count(), 3, 'zweiter Magie-Kauf kostet 2 Punkte: alle gesperrt');
    assert.equal(await p.locator('[data-act="magic"]:not(.off)').count(), 0);
    await p.evaluate(() => { window.__magus.state.players[0].stats.pending = 0; window.__magus.pump(); });
    assert.equal(await p.locator('[data-act="magic"]').count(), 0);
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Schild-Effekt: Der Rückwurf startet dort, wo das Schild angezeigt wurde, auch wenn es dabei verbraucht ist (nicht in der Ecke beim Nachziehstapel)', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => {
      const mg = window.__magus, G = mg.state, M = window.Magus, out = {}, wait = ms => new Promise(r => setTimeout(r, ms));
      M.apply(G, { pid: 0, type: 'combat', elem: 'F' });
      const me = G.combat.sides.a.stats; me.mirrorEl = { F: 1 }; me.mirror = 1; mg.pump(); await wait(400);
      const stg = document.querySelector('#stage') || document.querySelector('[data-shieldfx], .stage') || document.body, sh = document.querySelector('.mirstack[data-who="s"] .msh.F').getBoundingClientRect(), sr = (document.getElementById('stage') || stg).getBoundingClientRect(), k = sr.width / (document.getElementById('stage') || stg).offsetWidth;
      out.soll = [(sh.left + sh.width / 2 - sr.left) / k, (sh.top + sh.height / 2 - sr.top) / k];
      delete me.mirrorEl; delete me.mirror; mg.pump(); await wait(300);   // Schild aufgebraucht, nicht mehr in der Anzeige
      out.weg = !document.querySelector('.mirstack[data-who="s"] .msh.F');
      mg.MirrorFx.play({ who: 0, att: 1, to: 1, elem: 'F', r: 1, markers: 1, broken: 1, abs: 0 });
      out.ist = (document.getElementById('stage') || stg).dataset.shieldhome.split(',').map(Number);
      return out;
    });
    assert.ok(r.weg, 'das Schild ist aus der Anzeige verschwunden');
    assert.ok(Math.abs(r.ist[0] - r.soll[0]) < 3 && Math.abs(r.ist[1] - r.soll[1]) < 3, 'Effekt startet bei ' + r.ist + ', Schild stand bei ' + r.soll.map(Math.round));
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Lähmung: die Flüche erscheinen erst im Ablagestapel, wenn die Animation sie ankommen lässt', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    await p.evaluate(() => { const G = window.__magus.state; window.Magus.apply(G, { pid: 0, type: 'combat', elem: 'F' }); window.__magus.pump(); });
    await p.waitForTimeout(600);
    const ablage = () => p.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^Ablage \d+$/.test(e.textContent.trim())).map(e => +e.textContent.replace(/\D/g, '')));
    await p.evaluate(() => {
      const G = window.__magus.state, me = G.combat.sides.a; me.stats.mag = { F: 3, E: 3, W: 3 }; me.stats.limit = 3; me.stats.mana = me.stats.maxMana = 9;
      ['F2', 'E1', 'E1'].forEach((id, i) => { me.deck.hand[i] = Object.assign({}, me.deck.hand[i], { id }); window.Magus.apply(G, { pid: 0, type: 'mark', slot: i }); });
      window.__magus.act({ type: 'attack' });
    });
    await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => window.__magus.state.combat.sides.b.deck.discard.length), 4, 'die Engine hat die Flüche schon gelegt (Lähmung 2 = 4 Flüche)');
    assert.equal((await ablage()).length >= 2 && (await ablage()).includes(0), true, 'Anzeige: Ablagestapel des Gegners noch leer, solange die Funken fliegen');
    await p.waitForTimeout(2500);
    assert.equal((await ablage()).includes(4), true, 'nach der Ankunft liegen 4 Flüche auf dem Ablagestapel');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Monsterwürfel: je lebendem Monster ein grüner Pluswürfel und ein roter Minuswürfel über der Karte, nach dem Wurf mit der gewürfelten Seite oben', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(3500);   // Wurf (ca. 1,5 s + Versatz) ist vorbei
    const r = await p.evaluate(() => {
      const G = window.__magus.state, dice = [...document.querySelectorAll('#dicelayer .dk-die')];
      return { n: dice.length, visible: dice.every(d => d.style.visibility !== 'hidden' && d.offsetParent !== null), faces: dice.map(d => d.title.split(':')[0]), expect: G.monsters.F && ['F', 'E', 'W'].map(e => [G.monsters[e].variant.pl, G.monsters[e].variant.mi]).flat() };
    });
    assert.equal(r.n, 6); assert.equal(r.visible, true);
    assert.deepEqual(r.faces, ['Pluswürfel', 'Minuswürfel', 'Pluswürfel', 'Minuswürfel', 'Pluswürfel', 'Minuswürfel']);
    assert.equal(r.expect.length, 6);
    assert.equal(await p.evaluate(() => document.querySelectorAll('.mon .mlabel').length), 0, 'keine benannten Effekte mehr unter dem Namen');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Hauptmenü: Einzelspieler, Mehrspieler, Einstellungen, Beenden; Einstellungen mit Reglern; Haus-Knopf führt direkt ins Hauptmenü, Statistik-Knopf daneben', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1300, height: 820 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    const txt = () => p.evaluate(() => document.getElementById('overlay').innerText);
    let t = await txt();
    for (const w of ['Einzelspieler', 'Mehrspieler', 'Einstellungen', 'Beenden']) assert.ok(t.includes(w), w + ' fehlt im Hauptmenü');
    assert.ok(!t.includes('Gegen den Computer'), 'Spielstart gehört ins Untermenü');
    await p.click('text=Einstellungen'); assert.equal(await p.locator('input[data-vol]').count(), 2, 'zwei Regler');
    await p.click('text=Zurück'); await p.click('text=Mehrspieler'); assert.ok((await txt()).includes('Mehrspieler')); await p.click('text=Zurück');
    await p.click('text=Beenden'); await p.waitForTimeout(400); assert.ok((await txt()).includes('Danke fürs Spielen')); await p.click('text=Zurück');
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(800);
    assert.equal(await p.locator('#statsbtn').isVisible(), true, 'Statistik-Knopf neben dem Haus');
    await p.click('#homebtn'); t = await txt(); assert.ok(t.includes('Spiel fortsetzen') && t.includes('Einzelspieler') && t.includes('Einstellungen'), 'Haus führt direkt ins Hauptmenü');
    await p.click('text=Spiel fortsetzen'); assert.equal(await p.evaluate(() => document.getElementById('overlay').style.display), 'none');
    await p.click('#statsbtn'); assert.ok((await txt()).length > 0); await p.click('text=Schließen'); assert.equal(await p.evaluate(() => document.getElementById('overlay').style.display), 'none', 'Statistik schließt zurück ins Spiel');
    await p.click('#homebtn'); await p.click('text=Einstellungen'); assert.equal(await p.locator('input[data-vol]').count(), 2); await p.click('text=Zurück');
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});

test('Fenstergröße ändern (Vollbild): die Würfel wandern mit den Monsterkarten', { skip: !chromium && 'Playwright nicht installiert', timeout: 60000 }, async () => {
  const b = await chromium.launch({ executablePath: exe });
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(500);
    await p.click('text=Einzelspieler'); await p.click('text=Gegen den Computer spielen'); await p.waitForTimeout(4000);
    const rel = () => p.evaluate(() => { const sr = document.getElementById('stage').getBoundingClientRect(), k = sr.width / document.getElementById('stage').offsetWidth, d = document.querySelector('#dicelayer > *').getBoundingClientRect(), c = document.querySelector('.mon, .monster, [data-slot]'); return { dx: (d.left - sr.left) / k, sw: document.getElementById('stage').offsetWidth }; });
    const a = await rel();
    await p.setViewportSize({ width: 1920, height: 800 }); await p.waitForTimeout(600);
    const c = await rel();
    assert.ok(c.sw > a.sw, 'Bühne breiter');
    assert.ok(Math.abs((c.dx - a.dx) - (c.sw - a.sw) / 2) < 2, 'Würfel um die halbe Mehrbreite verschoben: ' + (c.dx - a.dx));
    assert.deepEqual(errs, []);
  } finally { await b.close(); }
});
