const fs = require('fs'), path = require('path');
const g = require('./golden-lib.js').all();
fs.writeFileSync(path.join(__dirname, 'golden.json'), JSON.stringify(g, null, 1) + '\n');
console.log('golden.json:', g.length, 'Partien');
