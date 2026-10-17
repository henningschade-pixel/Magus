// Eröffnungsstrategien gegeneinander: node tools/balance/strat.js <Partien> ['{"fHand":3}'] — Kreuztabelle der Strategien 0 frei, 1 Limit zuerst, 2 Fokus, 3 zwei Richtungen, 4 Auswahl nach Starthand
const { match } = require('./tune.js');
const N = +process.argv[2] || 800, extra = JSON.parse(process.argv[3] || '{}'), names = ['frei', 'Limit', 'Fokus', 'Zwei', 'Auto'], list = (process.argv[4] || '0,1,2,3').split(',').map(Number);
const rows = [];
for (const a of list) {
  const row = [];
  for (const b of list) { if (a === b) { row.push('  –  '); continue; } const r = match(N, Object.assign({ strat: a }, extra), Object.assign({ strat: b }, extra)); row.push((100 * r.share).toFixed(1).padStart(5)); }
  rows.push(names[a].padEnd(6) + row.join(' '));
}
console.log('Siegquote der Zeile gegen die Spalte (' + N + ' Partien je Paar, Fehler ±' + (100 * Math.sqrt(0.25 / N)).toFixed(1) + ')\n       ' + list.map(a => names[a].padStart(5)).join(' ') + '\n' + rows.join('\n'));
